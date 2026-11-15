-- Daily physical cleanup of expired Guild Commons notes (decision D6).
-- Apply ONLY after guild-commons-v1.sql is installed, as the role that owns
-- progresspal_social.guild_notes; pg_cron runs the job as that role.
-- Repeat-safe: cron.schedule replaces an existing job of the same name.
-- It does not touch other jobs, such as progresspal-feedback-purge.
-- Remove with: SELECT cron.unschedule('progresspal-guild-notes-purge');
DO $check$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron is not installed in this database';
  END IF;
  IF to_regclass('progresspal_social.guild_notes') IS NULL THEN
    RAISE EXCEPTION 'progresspal_social.guild_notes is missing: apply guild-commons-v1.sql first';
  END IF;
  IF NOT has_table_privilege('progresspal_social.guild_notes', 'DELETE') THEN
    RAISE EXCEPTION 'the current role cannot delete from progresspal_social.guild_notes';
  END IF;
END
$check$;

-- 03:45 in cron.timezone (UTC unless configured), daily: a note is deleted
-- at most 24 hours after it expires. now() is the database server's time.
SELECT cron.schedule(
  'progresspal-guild-notes-purge',
  '45 3 * * *',
  $job$DELETE FROM progresspal_social.guild_notes WHERE expires_at < now()$job$
);
