-- Never lower the generation while higher-generation backups exist.
begin;
lock table public.backup_slots in access exclusive mode;
do $$
begin
  if exists (select 1 from public.backup_slots where schema_version >= 5) then
    raise exception 'Cannot lower backup generation while schema-5 backups exist';
  end if;
end $$;
alter table public.backup_slots drop constraint backup_slots_generation_gate;
alter table public.backup_slots add constraint backup_slots_generation_gate
  check (format_version = 1 and schema_version = 4) not valid;
commit;
