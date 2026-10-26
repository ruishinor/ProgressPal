-- Owner-authorized local preparation only. Apply as part of a separately
-- approved release, immediately before the schema-5 client is promoted.
-- Existing schema-4 rows remain stored but cannot be restored by schema-5 clients.
begin;
alter table public.backup_slots drop constraint backup_slots_generation_gate;
alter table public.backup_slots add constraint backup_slots_generation_gate
  check (format_version = 1 and schema_version = 5) not valid;
commit;
