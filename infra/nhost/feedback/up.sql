-- Prepared migration only. Do not run against live Nhost without reviewed authorization.
-- Apply under the verified source database role. Private, unlinked to learner data.
BEGIN;
CREATE SCHEMA IF NOT EXISTS progresspal_feedback;
REVOKE ALL ON SCHEMA progresspal_feedback FROM PUBLIC;

CREATE TABLE progresspal_feedback.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid UNIQUE NOT NULL,
  payload_digest text NOT NULL CHECK (length(payload_digest) = 64),
  category text NOT NULL CHECK (category IN ('technical','content','idea','other')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 4000),
  reply_email text CHECK (reply_email IS NULL OR char_length(reply_email) BETWEEN 3 AND 254),
  technical_context jsonb,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  state text NOT NULL DEFAULT 'new' CHECK (state IN ('new','triaged','resolved'))
);
CREATE INDEX reports_received_at_idx ON progresspal_feedback.reports(received_at);
CREATE INDEX reports_triage_idx ON progresspal_feedback.reports(state,received_at);

CREATE TABLE progresspal_feedback.daily_count (
  day date PRIMARY KEY,
  submissions integer NOT NULL CHECK (submissions BETWEEN 0 AND 200)
);

-- Hasura table-return wrapper cannot contain real data.
CREATE TABLE progresspal_feedback.response (result jsonb NOT NULL CHECK (false));

CREATE FUNCTION progresspal_feedback.submit_feedback(payload jsonb)
RETURNS SETOF progresspal_feedback.response
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  requested_id uuid;
  digest_hex text;
  prior_id uuid;
  prior_digest text;
  quota_count integer;
  category_text text;
  message_text text;
  email_text text;
  context_json jsonb;
BEGIN
  IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
     OR payload IS NULL THEN
    RETURN QUERY SELECT jsonb_build_object('status','invalid');
    RETURN;
  END IF;
  -- Defense in depth beyond HTTP: require the exact server-to-DB contract.
  IF (SELECT COUNT(*) FROM jsonb_object_keys(payload)) <> 6 THEN
    RETURN QUERY SELECT jsonb_build_object('status','invalid');
    RETURN;
  END IF;
  IF NOT (payload ?& ARRAY['schemaVersion','requestId','category','message','replyEmail','technicalContext'])
     OR payload->>'schemaVersion' IS DISTINCT FROM '1' THEN
    RETURN QUERY SELECT jsonb_build_object('status','invalid');
    RETURN;
  END IF;
  BEGIN
    requested_id := (payload->>'requestId')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN QUERY SELECT jsonb_build_object('status','invalid');
    RETURN;
  END;
  category_text := payload->>'category';
  message_text := payload->>'message';
  email_text := payload->>'replyEmail';
  context_json := payload->'technicalContext';
  IF category_text IS NULL OR category_text NOT IN ('technical','content','idea','other')
     OR message_text IS NULL OR char_length(message_text) NOT BETWEEN 10 AND 4000
     OR (email_text IS NOT NULL AND char_length(email_text) NOT BETWEEN 3 AND 254)
     OR (context_json IS NOT NULL AND context_json <> 'null'::jsonb
        AND jsonb_typeof(context_json) <> 'object') THEN
    RETURN QUERY SELECT jsonb_build_object('status','invalid');
    RETURN;
  END IF;

  digest_hex := encode(sha256(convert_to(payload::text,'UTF8')), 'hex');
  -- Same transaction lock protects idempotent retries and the global daily cap,
  -- across concurrent workers/instances. Not an IP-based anti-spam substitute.
  PERFORM pg_advisory_xact_lock(1702411, 20261113);
  SELECT id,payload_digest INTO prior_id,prior_digest
    FROM progresspal_feedback.reports WHERE request_id = requested_id;
  IF FOUND THEN
    IF prior_digest <> digest_hex THEN
      RETURN QUERY SELECT jsonb_build_object('status','conflict');
    ELSE
      RETURN QUERY SELECT jsonb_build_object('status','already_received','receipt',prior_id);
    END IF;
    RETURN;
  END IF;

  INSERT INTO progresspal_feedback.daily_count(day,submissions)
    VALUES ((clock_timestamp() AT TIME ZONE 'UTC')::date, 1)
    ON CONFLICT (day) DO UPDATE SET
      submissions = progresspal_feedback.daily_count.submissions + 1
    WHERE progresspal_feedback.daily_count.submissions < 200
    RETURNING submissions INTO quota_count;
  IF quota_count IS NULL THEN
    RETURN QUERY SELECT jsonb_build_object('status','rate_limited');
    RETURN;
  END IF;

  INSERT INTO progresspal_feedback.reports(
    request_id,payload_digest,category,message,reply_email,technical_context
  ) VALUES (requested_id,digest_hex,category_text,message_text,email_text,context_json)
    RETURNING id INTO prior_id;
  RETURN QUERY SELECT jsonb_build_object('status','received','receipt',prior_id);
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA progresspal_feedback FROM PUBLIC;
REVOKE ALL ON FUNCTION progresspal_feedback.submit_feedback(jsonb) FROM PUBLIC;
REVOKE ALL ON SCHEMA progresspal_feedback FROM PUBLIC;
-- Function is reachable only from Hasura's verified admin-secret context.
-- No public/user Hasura permissions must be installed on either object.
GRANT USAGE ON SCHEMA progresspal_feedback TO nhost_hasura;
GRANT EXECUTE ON FUNCTION progresspal_feedback.submit_feedback(jsonb) TO nhost_hasura;

CREATE FUNCTION progresspal_feedback.purge_expired()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE n bigint;
BEGIN
  DELETE FROM progresspal_feedback.reports
   WHERE received_at < clock_timestamp() - interval '90 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM progresspal_feedback.daily_count
   WHERE day < (clock_timestamp() AT TIME ZONE 'UTC')::date - 3;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION progresspal_feedback.purge_expired() FROM PUBLIC;
COMMIT;
