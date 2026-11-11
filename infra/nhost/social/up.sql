-- Apply as the Hasura source database role. This migration adds no backup
-- permission and exposes only the response type and RPC through metadata.
BEGIN;

CREATE SCHEMA progresspal_social;
REVOKE ALL ON SCHEMA progresspal_social FROM PUBLIC;

CREATE TABLE progresspal_social.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  invite_digest bytea UNIQUE
);

CREATE TABLE progresspal_social.members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES progresspal_social.groups(id),
  nickname text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 24),
  member_order bigint GENERATED ALWAYS AS IDENTITY,
  membership_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 8),
  UNIQUE (group_id, user_id),
  UNIQUE (group_id, slot)
);

CREATE INDEX social_members_order ON progresspal_social.members (group_id, member_order);

CREATE TABLE progresspal_social.learning_days (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  study_date date NOT NULL,
  PRIMARY KEY (group_id, user_id, study_date),
  FOREIGN KEY (group_id, user_id)
    REFERENCES progresspal_social.members(group_id, user_id) ON DELETE CASCADE
);

-- Hasura requires a tracked table return type. It can never contain data.
CREATE TABLE progresspal_social.response (result jsonb NOT NULL, CHECK (false));

-- Membership transitions are short and serialized. Take the same lock before
-- Auth deletes accounts so FK cascades use the same lock order as the RPC.
CREATE FUNCTION progresspal_social.lock_account_removal()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(1794384000, 763);
  RETURN NULL;
END;
$$;

CREATE TRIGGER progresspal_social_account_removal
BEFORE DELETE ON auth.users
FOR EACH STATEMENT EXECUTE FUNCTION progresspal_social.lock_account_removal();

-- The first remaining member becomes the administrator. Remove an outgoing
-- administrator's code, and remove the group when its final member leaves.
-- Cascades from Auth may run as a different role from the Hasura source.
CREATE FUNCTION progresspal_social.after_member_removal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM progresspal_social.members WHERE group_id = OLD.group_id
  ) THEN
    DELETE FROM progresspal_social.groups WHERE id = OLD.group_id;
  ELSIF NOT EXISTS (
    SELECT 1 FROM progresspal_social.members
    WHERE group_id = OLD.group_id AND member_order < OLD.member_order
  ) THEN
    UPDATE progresspal_social.groups SET invite_digest = NULL WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER progresspal_social_member_removal
AFTER DELETE ON progresspal_social.members
FOR EACH ROW EXECUTE FUNCTION progresspal_social.after_member_removal();

CREATE FUNCTION progresspal_social.social_week(
  hasura_session json, operation text, input jsonb
)
RETURNS SETOF progresspal_social.response
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = pg_catalog AS $$
DECLARE
  actor uuid;
  group_key uuid;
  owner_key uuid;
  membership_key uuid;
  member_slot smallint := 1;
  oslo_today date;
  monday date;
  label text;
  alias text;
  invite text;
  dates date[];
  board jsonb;
  result_status text := 'ok';
BEGIN
  IF hasura_session->>'x-hasura-role' IS DISTINCT FROM 'user'
     OR nullif(hasura_session->>'x-hasura-user-id', '') IS NULL THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'unauthenticated');
    RETURN;
  END IF;

  actor := (hasura_session->>'x-hasura-user-id')::uuid;
  PERFORM pg_advisory_xact_lock(1794384000, 763);
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = actor) THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'unauthenticated');
    RETURN;
  END IF;

  oslo_today := (clock_timestamp() AT TIME ZONE 'Europe/Oslo')::date;
  monday := oslo_today - (extract(isodow FROM oslo_today)::int - 1);
  SELECT group_id, membership_id INTO group_key, membership_key
    FROM progresspal_social.members WHERE user_id = actor;

  IF jsonb_typeof(input) IS DISTINCT FROM 'object' OR
     (CASE operation
       WHEN 'create' THEN input - ARRAY['name', 'nickname']
       WHEN 'join' THEN input - ARRAY['code', 'nickname']
       WHEN 'share' THEN input - ARRAY['days', 'membership']
       WHEN 'leave' THEN input - 'membership'
       WHEN 'invite' THEN input - 'membership'
       WHEN 'revoke' THEN input - 'membership'
       ELSE input
     END) <> '{}'::jsonb THEN
    RETURN QUERY SELECT jsonb_build_object('status', 'invalid-input');
    RETURN;
  END IF;

  IF operation IN ('create', 'join') THEN
    alias := btrim(input->>'nickname');
    label := btrim(input->>'name');
    IF group_key IS NOT NULL THEN
      result_status := 'already-member';
    ELSIF jsonb_typeof(input->'nickname') IS DISTINCT FROM 'string'
       OR char_length(alias) NOT BETWEEN 1 AND 24
       OR alias ~ '[[:cntrl:]]' OR alias !~ '[^[:space:]]' THEN
      result_status := 'invalid-input';
    ELSIF operation = 'create' THEN
      IF jsonb_typeof(input->'name') IS DISTINCT FROM 'string'
         OR char_length(label) NOT BETWEEN 1 AND 40
         OR label ~ '[[:cntrl:]]' OR label !~ '[^[:space:]]' THEN
        result_status := 'invalid-input';
      ELSE
        INSERT INTO progresspal_social.groups(name) VALUES (label) RETURNING id INTO group_key;
      END IF;
    ELSE
      IF input->>'code' ~ '^[0-9a-f]{64}$' THEN
        SELECT id INTO group_key FROM progresspal_social.groups
        WHERE invite_digest = sha256(convert_to(input->>'code', 'UTF8'));
      END IF;
      IF group_key IS NULL THEN
        result_status := 'invalid-code';
      ELSE
        SELECT min(n) INTO member_slot FROM generate_series(1, 8) AS candidate(n)
        WHERE NOT EXISTS (
          SELECT 1 FROM progresspal_social.members WHERE group_id = group_key AND slot = n
        );
        IF member_slot IS NULL THEN
          result_status := 'group-full';
        END IF;
      END IF;
    END IF;

    IF result_status = 'ok' THEN
      INSERT INTO progresspal_social.members(user_id, group_id, nickname, slot)
        VALUES (actor, group_key, alias, member_slot) RETURNING membership_id INTO membership_key;
    END IF;
  ELSIF operation IN ('share', 'leave', 'invite', 'revoke') THEN
    IF group_key IS NULL THEN
      result_status := 'no-group';
    ELSIF input->>'membership' IS DISTINCT FROM membership_key::text THEN
      result_status := 'membership-changed';
    ELSIF operation = 'leave' THEN
      DELETE FROM progresspal_social.members WHERE user_id = actor;
      group_key := NULL;
    ELSIF operation IN ('invite', 'revoke') THEN
      SELECT user_id INTO owner_key FROM progresspal_social.members
        WHERE group_id = group_key ORDER BY member_order LIMIT 1;
      IF owner_key <> actor THEN
        result_status := 'not-admin';
      ELSE
        IF operation = 'invite' THEN
          -- Two independent UUIDv4 values contribute 244 random bits.
          invite := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
        END IF;
        UPDATE progresspal_social.groups
        SET invite_digest = sha256(convert_to(invite, 'UTF8'))
        WHERE id = group_key;
      END IF;
    ELSE
      IF jsonb_typeof(input->'days') IS DISTINCT FROM 'array' THEN
        result_status := 'invalid-input';
      ELSIF jsonb_array_length(input->'days') > 7 THEN
        result_status := 'invalid-input';
      ELSE
        -- Compare strings with the server's bounded calendar before casting.
        IF EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(input->'days') AS supplied(day)
          WHERE day IS NULL OR NOT EXISTS (
            SELECT 1 FROM generate_series(0, oslo_today - monday) AS offset_day(n)
            WHERE day = to_char(monday + n, 'YYYY-MM-DD')
          )
        ) THEN
          result_status := 'invalid-days';
        ELSE
          SELECT ARRAY(SELECT day::date FROM jsonb_array_elements_text(input->'days') AS supplied(day))
            INTO dates;
          DELETE FROM progresspal_social.learning_days
            WHERE group_id = group_key AND user_id = actor AND study_date < monday;
          INSERT INTO progresspal_social.learning_days(group_id, user_id, study_date)
            SELECT group_key, actor, day FROM unnest(dates) AS shared(day)
            ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  ELSIF operation IS DISTINCT FROM 'read' THEN
    result_status := 'invalid-input';
  END IF;

  IF result_status <> 'ok' THEN
    RETURN QUERY SELECT jsonb_build_object('status', result_status);
    RETURN;
  END IF;

  IF group_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'name', g.name,
      'membership', membership_key,
      'hasInvite', g.invite_digest IS NOT NULL,
      'canInvite', (SELECT m.user_id FROM progresspal_social.members m
                    WHERE m.group_id = g.id ORDER BY m.member_order LIMIT 1) = actor,
      'members', (
        SELECT jsonb_agg(jsonb_build_object(
          'nickname', m.nickname,
          'days', (SELECT count(*) FROM progresspal_social.learning_days d
                   WHERE d.group_id = g.id AND d.user_id = m.user_id
                     AND d.study_date BETWEEN monday AND oslo_today),
          'self', m.user_id = actor
        ) ORDER BY m.member_order)
        FROM progresspal_social.members m WHERE m.group_id = g.id
      )
    ) INTO board FROM progresspal_social.groups g WHERE g.id = group_key;
  END IF;

  RETURN QUERY SELECT jsonb_build_object(
    'status', 'ok', 'weekStart', to_char(monday, 'YYYY-MM-DD'),
    'group', board, 'invite', invite
  );
END;
$$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA progresspal_social FROM PUBLIC;

COMMIT;
