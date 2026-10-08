-- Rollback of Epic G Stage 1 (G3). Removes only the objects created by up.sql.
-- Never touches Nhost Auth's own schema or tables.
--
-- Order matters: first remove the Hasura permissions and untrack the table
-- (infra/nhost/hasura/rollback.json), then run this file. Dropping the table
-- also drops its trigger and constraints.

drop table if exists public.backup_slots;
drop function if exists public.backup_slots_set_server_fields();
