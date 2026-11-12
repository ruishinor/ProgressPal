-- Apply as the Hasura source role, on the existing project only.
BEGIN;

CREATE SCHEMA progresspal_sync;
REVOKE ALL ON SCHEMA progresspal_sync FROM PUBLIC;

CREATE TABLE progresspal_sync.snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
  payload text NOT NULL CHECK (octet_length(payload) <= 4194304),
  payload_hash bytea NOT NULL CHECK (payload_hash = sha256(convert_to(payload, 'UTF8')))
);
REVOKE ALL ON progresspal_sync.snapshots FROM PUBLIC;

-- Only the response type is tracked, with all direct roots disabled.
CREATE TABLE progresspal_sync.response (result jsonb NOT NULL CHECK (false));

CREATE FUNCTION progresspal_sync.sync_learning_v1(
  hasura_session json, operation text, input jsonb
)
RETURNS SETOF progresspal_sync.response
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = pg_catalog AS $$
DECLARE
  actor uuid;
  current_revision bigint;
  current_hash bytea;
  expected_revision bigint;
  snapshot text;
  parsed json;
  learner json;
  array_keys constant text[] := ARRAY[
    'activityEntries', 'activityDefinitions', 'activitySettings', 'activityDays',
    'progressEntries', 'mediaProgressEvents', 'resumePoints', 'studySessions',
    'xpTransactions', 'achievementUnlocks', 'programmeEnrolments', 'learnerEvidence',
    'lessonPositions'
  ];
BEGIN
  IF hasura_session->>'x-hasura-role' IS DISTINCT FROM 'user'
    OR coalesce(hasura_session->>'x-hasura-user-id', '') !~
      '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'unauthenticated');
    RETURN;
  END IF;
  actor := (hasura_session->>'x-hasura-user-id')::uuid;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = actor) THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'unauthenticated');
    RETURN;
  END IF;

  IF operation = 'head' AND input = '{}'::jsonb THEN
    SELECT s.revision, s.payload_hash INTO current_revision, current_hash
      FROM progresspal_sync.snapshots AS s WHERE s.user_id = actor;
    RETURN QUERY SELECT jsonb_build_object('status', 'ok',
      'revision', coalesce(current_revision, 0), 'hash', encode(current_hash, 'hex'));
    RETURN;
  END IF;

  IF jsonb_typeof(input) IS DISTINCT FROM 'object'
    OR jsonb_typeof(input->'expectedRevision') IS DISTINCT FROM 'number'
    OR (input->>'expectedRevision') !~ '^(0|[1-9][0-9]{0,15})$' THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'invalid-input');
    RETURN;
  END IF;
  expected_revision := (input->>'expectedRevision')::bigint;

  IF operation = 'read' AND (input - 'expectedRevision') = '{}'::jsonb
    AND expected_revision BETWEEN 1 AND 9007199254740991 THEN
    SELECT s.revision, s.payload_hash, s.payload INTO current_revision, current_hash, snapshot
      FROM progresspal_sync.snapshots AS s WHERE s.user_id = actor AND s.revision = expected_revision;
    IF current_revision IS NULL THEN
      RETURN QUERY SELECT jsonb_build_object('status', 'conflict');
    ELSE
      RETURN QUERY SELECT jsonb_build_object('status', 'ok', 'revision', current_revision,
        'hash', encode(current_hash, 'hex'), 'payload', snapshot);
    END IF;
    RETURN;
  END IF;

  IF operation IS DISTINCT FROM 'write'
    OR expected_revision >= 9007199254740991
    OR (input - ARRAY['expectedRevision', 'payload', 'hash']) <> '{}'::jsonb
    OR jsonb_typeof(input->'payload') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'hash') IS DISTINCT FROM 'string'
    OR (input->>'hash') !~ '^[0-9a-f]{64}$' THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'invalid-input');
    RETURN;
  END IF;

  snapshot := input->>'payload';
  IF octet_length(snapshot) > 4194304 THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'too-large');
    RETURN;
  END IF;
  current_hash := sha256(convert_to(snapshot, 'UTF8'));
  IF encode(current_hash, 'hex') <> input->>'hash' THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'integrity-mismatch');
    RETURN;
  END IF;

  -- Check wire generation and outer structure here. The receiving client
  -- validates the domain rows and relational invariants before any local write.
  BEGIN
    -- PostgreSQL JSON field extraction decodes strings, including strings
    -- outside the selected fields. For the structural check only, replace
    -- escaped NULs and UTF-16 surrogate code units that PostgreSQL text cannot
    -- represent. Store and hash the untouched payload.
    parsed := regexp_replace(snapshot,
      $escape$\\u(?:0000|[dD][89a-fA-F][0-9a-fA-F]{2})$escape$,
      chr(92) || chr(92) || 'ufffd', 'g')::json;
    learner := parsed->'data';
    IF json_typeof(parsed) IS DISTINCT FROM 'object'
      OR (SELECT count(*) FROM json_object_keys(parsed)) <> 3
      OR (parsed->'version')::text IS DISTINCT FROM '1'
      OR (parsed->'schema')::text IS DISTINCT FROM '5'
      OR json_typeof(learner) IS DISTINCT FROM 'object'
      OR (SELECT count(*) FROM json_object_keys(learner)) <> cardinality(array_keys) + 2
      OR json_typeof(learner->'appMeta') IS DISTINCT FROM 'object'
      OR json_typeof(learner->'learnerProfile') IS DISTINCT FROM 'object'
      OR EXISTS (SELECT 1 FROM unnest(array_keys) AS k WHERE json_typeof(learner->k) IS DISTINCT FROM 'array') THEN
      RETURN QUERY SELECT jsonb_build_object('status', 'incompatible');
      RETURN;
    END IF;
  EXCEPTION WHEN data_exception THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'invalid-input');
    RETURN;
  END;

  IF expected_revision = 0 THEN
    INSERT INTO progresspal_sync.snapshots (user_id, revision, payload, payload_hash)
      VALUES (actor, 1, snapshot, current_hash)
      ON CONFLICT (user_id) DO NOTHING RETURNING revision INTO current_revision;
  ELSE
    UPDATE progresspal_sync.snapshots AS s SET revision = s.revision + 1,
      payload = snapshot, payload_hash = current_hash
      WHERE s.user_id = actor AND s.revision = expected_revision
      RETURNING s.revision INTO current_revision;
  END IF;

  IF current_revision IS NULL THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'conflict');
  ELSE
    RETURN QUERY SELECT jsonb_build_object('status', 'ok',
      'revision', current_revision, 'hash', encode(current_hash, 'hex'));
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION progresspal_sync.sync_learning_v1(json, text, jsonb) FROM PUBLIC;
COMMIT;
