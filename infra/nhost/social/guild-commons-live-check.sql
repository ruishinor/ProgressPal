-- ProgressPal Guild Commons live contract check (progresspal-g0).
-- It always ends by raising an exception, so the whole run is rolled back and
-- no synthetic row is ever committed. Read the message:
--   "PASS: ..." = every expectation held;  "FAIL: ..." = the first one that did not.
DO $check$
DECLARE
  a constant uuid := '00000000-0000-4000-8000-00000000c0a1';
  b constant uuid := '00000000-0000-4000-8000-00000000c0b2';
  c constant uuid := '00000000-0000-4000-8000-00000000c0c3';
  social constant text := 'SELECT result FROM progresspal_social.social_week($1::json,$2,$3::jsonb)';
  commons constant text := 'SELECT result FROM progresspal_social.guild_commons_v1($1::json,$2,$3::jsonb)';
  r jsonb;
  am text; bm text; cm text; code text; note text;
BEGIN
  SET LOCAL lock_timeout = '5s';
  INSERT INTO auth.users (id, email, locale, display_name) VALUES
    (a, 'probe-a@example.invalid', 'en', 'probe'),
    (b, 'probe-b@example.invalid', 'en', 'probe'),
    (c, 'probe-c@example.invalid', 'en', 'probe');

  EXECUTE social INTO r USING json_build_object('x-hasura-role','user','x-hasura-user-id',a), 'create', '{"name":"Probe A","nickname":"Ada"}';
  am := r->'group'->>'membership';
  EXECUTE social INTO r USING json_build_object('x-hasura-role','user','x-hasura-user-id',a), 'invite', jsonb_build_object('membership',am);
  code := r->>'invite';
  EXECUTE social INTO r USING json_build_object('x-hasura-role','user','x-hasura-user-id',b), 'join', jsonb_build_object('code',code,'nickname','Bo');
  bm := r->'group'->>'membership';
  EXECUTE social INTO r USING json_build_object('x-hasura-role','user','x-hasura-user-id',c), 'create', '{"name":"Probe C","nickname":"Cai"}';
  cm := r->'group'->>'membership';
  IF am IS NULL OR bm IS NULL OR cm IS NULL THEN RAISE EXCEPTION 'FAIL: setup %', r; END IF;

  EXECUTE commons INTO r USING json_build_object('x-hasura-role','anonymous','x-hasura-user-id',a), 'read', jsonb_build_object('membership',am);
  IF r->>'status' <> 'unauthenticated' THEN RAISE EXCEPTION 'FAIL: anonymous %', r; END IF;
  EXECUTE commons INTO r USING json_build_object('x-hasura-role','user','x-hasura-user-id',c), 'read', jsonb_build_object('membership',am);
  IF r->>'status' <> 'membership-changed' THEN RAISE EXCEPTION 'FAIL: cross-Guild read %', r; END IF;

  EXECUTE commons INTO r USING json_build_object('x-hasura-role','user','x-hasura-user-id',a), 'post', jsonb_build_object('membership',am,'kind','help','body','Probe 🚀');
  IF r->>'status' <> 'ok' THEN RAISE EXCEPTION 'FAIL: post %', r; END IF;
  note := r->'group'->'notes'->0->>'id';
  EXECUTE commons INTO r USING json_build_object('x-hasura-role','user','x-hasura-user-id',b), 'edit', jsonb_build_object('membership',bm,'note',note,'body','x');
  IF r->>'status' <> 'not-owner' THEN RAISE EXCEPTION 'FAIL: foreign edit %', r; END IF;
  EXECUTE commons INTO r USING json_build_object('x-hasura-role','user','x-hasura-user-id',c), 'read', jsonb_build_object('membership',cm);
  IF r->>'status' <> 'ok' OR jsonb_array_length(r->'group'->'notes') <> 0 THEN RAISE EXCEPTION 'FAIL: isolation %', r; END IF;

  EXECUTE commons INTO r USING json_build_object('x-hasura-role','user','x-hasura-user-id',a), 'transfer', jsonb_build_object('membership',am,'target',bm);
  IF r->>'status' <> 'ok' OR (r->'group'->>'isAdmin')::boolean THEN RAISE EXCEPTION 'FAIL: transfer %', r; END IF;
  EXECUTE social INTO r USING json_build_object('x-hasura-role','user','x-hasura-user-id',b), 'read', '{}';
  IF NOT (r->'group'->>'canInvite')::boolean OR (r->'group'->>'hasInvite')::boolean THEN RAISE EXCEPTION 'FAIL: social_week after transfer %', r; END IF;

  RAISE EXCEPTION 'PASS: anonymous refused, cross-Guild refused, foreign edit refused, isolation held, handover visible in both RPCs, invite cleared. Everything above is rolled back.';
END
$check$;
