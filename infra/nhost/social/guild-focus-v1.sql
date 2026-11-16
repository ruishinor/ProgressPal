-- Guild weekly focus (S2): one optional administrator-set line per Oslo week.
-- Upgrade for an installed guild-commons-v1.sql; never reapply that file.
-- Apply ONLY after the disposable probe passes, as the owner of
-- progresspal_social.guild_commons_v1, with "Track this" OFF. Hasura metadata
-- is unchanged: the function keeps its signature, return type, owner and
-- grants, so the tracked mutation and its `user` permission stay as they are.
-- The whole file is one transaction; a wrong installed body aborts it.
BEGIN;

DO $guard$
DECLARE
  target regprocedure :=
    to_regprocedure('progresspal_social.guild_commons_v1(json,text,jsonb)');
BEGIN
  IF target IS NULL THEN
    RAISE EXCEPTION 'guild_commons_v1 is missing: install guild-commons-v1.sql first';
  END IF;
  -- The installed S1 body (guild-commons-inventory-expected.tsv).
  IF (SELECT encode(sha256(convert_to(replace(prosrc, E'\r\n', E'\n'), 'UTF8')), 'hex')
      FROM pg_proc WHERE oid = target)
     IS DISTINCT FROM 'd51b6de293f511ef1423bb47e2ef5524bb001d69120c75006b3c15b4fe35fbf6' THEN
    RAISE EXCEPTION 'Unexpected guild_commons_v1 body. Compare the installed function with guild-commons-v1.sql before applying this upgrade.';
  END IF;
END
$guard$;

-- Current focus only: no history. focus_week is the Oslo Monday it was set
-- for; a stale focus is hidden at once and erased by the Guild's next
-- Commons call. A dormant Guild keeps its last line until then or until the
-- Guild is deleted.
ALTER TABLE progresspal_social.groups
  ADD COLUMN focus_text text NOT NULL DEFAULT ''
    CONSTRAINT groups_focus_text_length CHECK (char_length(focus_text) <= 120),
  ADD COLUMN focus_week date,
  ADD CONSTRAINT groups_focus_week_set CHECK ((focus_text = '') = (focus_week IS NULL));

-- Monday of the Europe/Oslo calendar week that contains the instant.
CREATE FUNCTION progresspal_social.oslo_week_start(instant timestamptz)
RETURNS date
LANGUAGE sql STABLE SET search_path = pg_catalog AS $function$
  SELECT local_day - (extract(isodow FROM local_day)::int - 1)
  FROM (SELECT (instant AT TIME ZONE 'Europe/Oslo')::date AS local_day) oslo
$function$;
REVOKE ALL ON FUNCTION progresspal_social.oslo_week_start(timestamptz) FROM PUBLIC;

-- Full replacement of the S1 body. Changes: the `focus` operation, the
-- stale-focus erase, and a top-level `focus` beside `group` in every ok
-- result (S1 clients ignore it; `group` keeps its exact S1 keys).
CREATE OR REPLACE FUNCTION progresspal_social.guild_commons_v1(
  hasura_session json, operation text, input jsonb
)
RETURNS SETOF progresspal_social.response
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = pg_catalog AS $function$
DECLARE
  actor uuid;
  group_key uuid;
  membership_key uuid;
  current_admin uuid;
  note_key uuid;
  note_author uuid;
  target_member uuid;
  note_kind text;
  note_body text;
  proposed_ethos text;
  proposed_about text;
  proposed_focus text;
  week_start date;
  snapshot jsonb;
  focus_snapshot jsonb;
  now_at timestamptz;
  remaining bigint;
BEGIN
  IF hasura_session->>'x-hasura-role' IS DISTINCT FROM 'user'
     OR coalesce(hasura_session->>'x-hasura-user-id','')
       !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN QUERY SELECT jsonb_build_object('status','unauthenticated');
    RETURN;
  END IF;

  actor := (hasura_session->>'x-hasura-user-id')::uuid;
  PERFORM pg_advisory_xact_lock(1794384000, 763);
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = actor) THEN
    RETURN QUERY SELECT jsonb_build_object('status','unauthenticated');
    RETURN;
  END IF;
  SELECT group_id, membership_id INTO group_key, membership_key
  FROM progresspal_social.members WHERE user_id = actor;
  IF group_key IS NULL THEN
    RETURN QUERY SELECT jsonb_build_object('status','no-group');
    RETURN;
  END IF;

  IF jsonb_typeof(input) IS DISTINCT FROM 'object'
     OR (CASE operation
       WHEN 'read' THEN input - 'membership'
       WHEN 'profile' THEN input - ARRAY['membership','ethos','about']
       WHEN 'focus' THEN input - ARRAY['membership','text']
       WHEN 'post' THEN input - ARRAY['membership','kind','body']
       WHEN 'edit' THEN input - ARRAY['membership','note','body']
       WHEN 'remove' THEN input - ARRAY['membership','note']
       WHEN 'resolve' THEN input - ARRAY['membership','note']
       WHEN 'transfer' THEN input - ARRAY['membership','target']
       ELSE input
     END) <> '{}'::jsonb THEN
    RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
    RETURN;
  END IF;
  IF input->>'membership' IS DISTINCT FROM membership_key::text THEN
    RETURN QUERY SELECT jsonb_build_object('status','membership-changed');
    RETURN;
  END IF;

  SELECT user_id INTO current_admin FROM progresspal_social.members
    WHERE group_id = group_key ORDER BY member_order LIMIT 1;
  now_at := clock_timestamp();
  week_start := progresspal_social.oslo_week_start(now_at);
  -- Read and all writes opportunistically discard logically expired notes.
  -- A dormant Guild still needs separately reviewed retention housekeeping.
  DELETE FROM progresspal_social.guild_notes
    WHERE group_id=group_key AND expires_at <= now_at;
  -- A focus set for an earlier week is never current; erase it.
  UPDATE progresspal_social.groups SET focus_text='', focus_week=NULL
    WHERE id=group_key AND focus_week IS NOT NULL AND focus_week <> week_start;

  IF operation = 'profile' THEN
    IF actor IS DISTINCT FROM current_admin THEN
      RETURN QUERY SELECT jsonb_build_object('status','not-admin');
      RETURN;
    END IF;
    IF jsonb_typeof(input->'ethos') IS DISTINCT FROM 'string'
      OR jsonb_typeof(input->'about') IS DISTINCT FROM 'string' THEN
      RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
      RETURN;
    END IF;
    proposed_ethos := btrim(input->>'ethos');
    proposed_about := btrim(input->>'about');
    IF char_length(proposed_ethos) > 120 OR char_length(proposed_about) > 600
      OR proposed_ethos ~ '[[:cntrl:]]'
      OR replace(proposed_about, E'\n', '') ~ '[[:cntrl:]]' THEN
      RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
      RETURN;
    END IF;
    UPDATE progresspal_social.groups
      SET ethos = proposed_ethos, about_text = proposed_about
      WHERE id = group_key;

  ELSIF operation = 'focus' THEN
    -- One line for the current Oslo week; an empty line clears it.
    IF actor IS DISTINCT FROM current_admin THEN
      RETURN QUERY SELECT jsonb_build_object('status','not-admin');
      RETURN;
    END IF;
    IF jsonb_typeof(input->'text') IS DISTINCT FROM 'string' THEN
      RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
      RETURN;
    END IF;
    proposed_focus := btrim(input->>'text');
    IF char_length(proposed_focus) > 120 OR proposed_focus ~ '[[:cntrl:]]' THEN
      RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
      RETURN;
    END IF;
    UPDATE progresspal_social.groups
      SET focus_text = proposed_focus,
          focus_week = CASE WHEN proposed_focus = '' THEN NULL ELSE week_start END
      WHERE id = group_key;

  ELSIF operation = 'post' THEN
    IF jsonb_typeof(input->'kind') IS DISTINCT FROM 'string'
      OR jsonb_typeof(input->'body') IS DISTINCT FROM 'string' THEN
      RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
      RETURN;
    END IF;
    note_kind := input->>'kind';
    note_body := btrim(input->>'body');
    IF note_kind NOT IN ('help','offer','notice','win')
      OR char_length(note_body) NOT BETWEEN 1 AND 280
      OR replace(note_body, E'\n', '') ~ '[[:cntrl:]]' THEN
      RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
      RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM progresspal_social.members
      WHERE user_id=actor AND last_guild_note_at > now_at - interval '2 minutes') THEN
      RETURN QUERY SELECT jsonb_build_object('status','rate-limited');
      RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM progresspal_social.guild_notes
       WHERE group_id=group_key AND author_id=actor) THEN
      RETURN QUERY SELECT jsonb_build_object('status','already-posted');
      RETURN;
    END IF;
    SELECT count(*) INTO remaining FROM progresspal_social.guild_notes
      WHERE group_id=group_key;
    IF remaining >= 3 THEN
      RETURN QUERY SELECT jsonb_build_object('status','full');
      RETURN;
    END IF;
    INSERT INTO progresspal_social.guild_notes(group_id,author_id,kind,body)
      VALUES (group_key,actor,note_kind,note_body);
    UPDATE progresspal_social.members
      SET last_guild_note_at=now_at WHERE user_id=actor;

  ELSIF operation IN ('edit','remove','resolve') THEN
    IF jsonb_typeof(input->'note') IS DISTINCT FROM 'string'
      OR (input->>'note') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
      RETURN;
    END IF;
    note_key := (input->>'note')::uuid;
    SELECT author_id, kind INTO note_author, note_kind
      FROM progresspal_social.guild_notes
      WHERE group_id=group_key AND id=note_key AND expires_at > now_at;
    IF note_author IS NULL THEN
      RETURN QUERY SELECT jsonb_build_object('status','not-found');
      RETURN;
    END IF;
    IF operation='resolve' AND note_kind IS DISTINCT FROM 'help' THEN
      RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
      RETURN;
    END IF;
    IF operation='edit' OR operation='resolve' THEN
      IF note_author IS DISTINCT FROM actor THEN
        RETURN QUERY SELECT jsonb_build_object('status','not-owner');
        RETURN;
      END IF;
    ELSIF note_author IS DISTINCT FROM actor AND current_admin IS DISTINCT FROM actor THEN
      RETURN QUERY SELECT jsonb_build_object('status','not-admin');
      RETURN;
    END IF;
    IF operation='edit' THEN
      IF jsonb_typeof(input->'body') IS DISTINCT FROM 'string' THEN
        RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
        RETURN;
      END IF;
      note_body := btrim(input->>'body');
      IF char_length(note_body) NOT BETWEEN 1 AND 280
        OR replace(note_body, E'\n', '') ~ '[[:cntrl:]]' THEN
        RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
        RETURN;
      END IF;
      UPDATE progresspal_social.guild_notes SET body=note_body,
        updated_at=now_at WHERE id=note_key AND group_id=group_key;
    ELSE
      -- Resolution closes a request and releases the slot. No help-XP is issued.
      DELETE FROM progresspal_social.guild_notes
        WHERE id=note_key AND group_id=group_key;
    END IF;

  ELSIF operation = 'transfer' THEN
    IF actor IS DISTINCT FROM current_admin THEN
      RETURN QUERY SELECT jsonb_build_object('status','not-admin');
      RETURN;
    END IF;
    IF jsonb_typeof(input->'target') IS DISTINCT FROM 'string'
      OR (input->>'target') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
      RETURN;
    END IF;
    SELECT user_id INTO target_member FROM progresspal_social.members
      WHERE group_id=group_key
        AND membership_id=(input->>'target')::uuid
        AND user_id<>actor;
    IF target_member IS NULL THEN
      RETURN QUERY SELECT jsonb_build_object('status','not-found');
      RETURN;
    END IF;
    -- Existing social_week derives admin from member_order. Reorder the
    -- selected member so both old and new RPCs agree, invalidating old invites.
    UPDATE progresspal_social.members
      SET member_order=(SELECT min(member_order)-1 FROM progresspal_social.members
                        WHERE group_id=group_key)
      WHERE group_id=group_key AND user_id=target_member;
    UPDATE progresspal_social.groups SET invite_digest=NULL WHERE id=group_key;
    current_admin := target_member;

  ELSIF operation IS DISTINCT FROM 'read' THEN
    RETURN QUERY SELECT jsonb_build_object('status','invalid-input');
    RETURN;
  END IF;

  SELECT jsonb_build_object(
    'ethos', g.ethos,
    'about', g.about_text,
    'isAdmin', current_admin=actor,
    'members', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'nickname',m.nickname,
        'membership',m.membership_id,
        'self',m.user_id=actor
      ) ORDER BY m.member_order), '[]'::jsonb)
      FROM progresspal_social.members m WHERE m.group_id=group_key
    ),
    'notes', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id',n.id,
        'kind',n.kind,
        'body',n.body,
        'author',m.nickname,
        'createdAt',to_char(n.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'own',n.author_id=actor,
        'canRemove',n.author_id=actor OR current_admin=actor
      ) ORDER BY n.created_at,n.id), '[]'::jsonb)
      FROM progresspal_social.guild_notes n
      JOIN progresspal_social.members m ON m.group_id=n.group_id AND m.user_id=n.author_id
      WHERE n.group_id=group_key AND n.expires_at > now_at
    )
  ),
  jsonb_build_object(
    'text', CASE WHEN g.focus_week = week_start THEN g.focus_text ELSE '' END,
    'weekStart', to_char(week_start, 'YYYY-MM-DD')
  ) INTO snapshot, focus_snapshot
  FROM progresspal_social.groups g WHERE g.id=group_key;

  RETURN QUERY SELECT jsonb_build_object(
    'status','ok','group',snapshot,'focus',focus_snapshot);
END;
$function$;

COMMIT;
