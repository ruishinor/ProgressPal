-- Epic G, Stage 1: remote backup slots (G3).
-- One row = one complete backup envelope, stored as exact text. Dexie stays the
-- only learner-state authority; this table is a recovery copy and nothing more.
-- No sync tables, no chunking, no payload parsing or normalisation.
--
-- Everything here belongs to Epic G. Nhost Auth's own schema is only referenced
-- (foreign key), never altered.

create table public.backup_slots (
  -- Ownership. Set by Hasura from the session (insert preset); never client-supplied.
  user_id uuid not null
    references auth.users (id) on update cascade on delete cascade,
  slot smallint not null,
  -- Client-generated identity: idempotency + inventory. Unique per account only,
  -- so a global key cannot reveal other accounts' ids.
  backup_id uuid not null,
  format_version integer not null,
  schema_version integer not null,
  app_version text not null,
  -- The uploading device's own claim: display only, never used for ordering.
  exported_at timestamptz not null,
  payload text not null,
  -- INSERT PRECONDITION supplied by the client: SHA-256 of the exact UTF-8 bytes
  -- it sent. Nullable on purpose: a missing value must fail the named
  -- exact-bytes gate below (not a generic NOT NULL error). Never selectable.
  expected_sha256 bytea,
  -- Server-owned (set by the trigger below; not insertable by any role):
  payload_bytes integer not null,
  payload_sha256 bytea not null,
  stored_at timestamptz not null,

  constraint backup_slots_pkey primary key (user_id, slot),
  constraint backup_slots_backup_id_key unique (user_id, backup_id),

  -- Five slots per account, by construction.
  constraint backup_slots_slot_range check (slot between 0 and 4),
  constraint backup_slots_app_version_length check (char_length(app_version) <= 80),

  -- Remote payload ceiling: 10 MiB of UTF-8 bytes (observed gateway limit sits
  -- between 10 and 17.5 MiB). The local 25 MiB file backup limit is unchanged.
  constraint backup_slots_payload_ceiling
    check (octet_length(payload) <= 10485760),

  -- CURRENT_GENERATION_WRITE_GATE. Deployment-controlled: changed only by a
  -- migration shipped together with the app release that changes the backup
  -- format or the database schema (see infra/nhost/README.md). Named so the
  -- refusal stays identifiable with Hasura devMode off.
  constraint backup_slots_generation_gate
    check (format_version = 1 and schema_version = 4),

  -- UPLOAD_EXACT_BYTES_COMMIT_GATE. One named constraint covers: hash missing,
  -- hash not 32 bytes, hash different from the server-computed hash of the
  -- stored text. coalesce() makes a NULL comparison fail instead of pass.
  constraint backup_slots_exact_bytes_gate
    check (
      coalesce(
        expected_sha256 is not null
        and octet_length(expected_sha256) = 32
        and expected_sha256 = sha256(convert_to(payload, 'UTF8')),
        false
      )
    )
);

comment on table public.backup_slots is
  'ProgressPal Epic G Stage-1 remote backup recovery copy (five slots per account). Not a source of truth.';

-- Server-owned metadata. The persisted hash is derived from the stored text and
-- never taken from a client value. stored_at uses clock_timestamp() on purpose:
-- it is the moment of the insert itself, not the transaction start, so the
-- oldest-first ring and the "older generation is always older" retention
-- argument follow insert order even for transactions that overlap a migration.
create function public.backup_slots_set_server_fields() returns trigger
language plpgsql as $$
begin
  new.payload_sha256 := sha256(convert_to(new.payload, 'UTF8'));
  new.payload_bytes := octet_length(convert_to(new.payload, 'UTF8'));
  new.stored_at := clock_timestamp();
  return new;
end
$$;

create trigger backup_slots_set_server_fields
  before insert on public.backup_slots
  for each row execute function public.backup_slots_set_server_fields();
