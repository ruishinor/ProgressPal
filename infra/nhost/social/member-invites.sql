-- Apply as the owner of the installed Guild rename function.
BEGIN;

DO $migration$
DECLARE
  target regprocedure := to_regprocedure('progresspal_social.social_week(json,text,jsonb)');
  body_hash text;
BEGIN
  SELECT encode(sha256(convert_to(replace(prosrc, E'\r\n', E'\n'), 'UTF8')), 'hex')
    INTO body_hash FROM pg_proc WHERE oid = target;

  -- Match the installed rename-guild.sql body before changing its two clauses.
  IF body_hash IS DISTINCT FROM 'ef22146e25efc3fb3009cc1e0803bea89bd24ce3ce488d85c973dffdc68cdd06' THEN
    RAISE EXCEPTION 'Unexpected social_week body. Compare the installed function with rename-guild.sql before applying this migration.';
  END IF;

  EXECUTE replace(
    replace(pg_get_functiondef(target),
      $old$IF owner_key <> actor THEN$old$,
      $new$IF operation <> 'invite' AND owner_key <> actor THEN$new$),
    $old$'canInvite', (SELECT$old$,
    $new$'canCreateInvite', true,
      'canInvite', (SELECT$new$);
END;
$migration$;

COMMIT;
