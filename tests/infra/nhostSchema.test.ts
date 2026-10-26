import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  acceptedBackupGeneration,
  backupConstraintNames,
  backupTableName,
  remoteBackupPayloadCeilingBytes,
} from '@/lib/cloud/nhost/backupConstraints';
import { nhostAuthUrl } from '@/lib/cloud/nhost/endpoints';

/**
 * Static and adversarial checks of the reviewable Stage-1 schema artifacts under
 * infra/nhost. They prove the files say what the contract requires; they do NOT
 * prove behaviour on a live Postgres/Hasura stack (that is the owner-run
 * infra/nhost/validation/validate-live.mjs step).
 */

const infra = path.join(process.cwd(), 'infra/nhost');
const migrationName = '1791417600000_epic_g_backup_slots';
const migrationDir = path.join(infra, 'migrations/default', migrationName);
const up = readFileSync(path.join(migrationDir, 'up.sql'), 'utf8');
const down = readFileSync(path.join(migrationDir, 'down.sql'), 'utf8');
const stripSqlComments = (sql: string) => sql.replace(/--.*$/gm, '');
const code = stripSqlComments(up).replace(/\s+/g, ' ').toLowerCase();

interface Permission {
  type: string;
  args: {
    source: string;
    table?: { schema: string; name: string };
    role?: string;
    cascade?: boolean;
    permission?: {
      check?: unknown;
      set?: Record<string, string>;
      columns?: string[];
      filter?: unknown;
      allow_aggregations?: boolean;
    };
  };
}

const readBundle = (file: string) =>
  JSON.parse(readFileSync(path.join(infra, 'hasura', file), 'utf8')) as {
    type: string;
    args: Permission[];
  };
const apply = readBundle('apply.json');
const rollback = readBundle('rollback.json');
const permissionOf = (type: string) =>
  apply.args.find((entry) => entry.type === type)?.args.permission;

describe('migration layout', () => {
  it('uses the native Hasura/Nhost migration folder shape with a down path', () => {
    expect(migrationName).toMatch(/^\d{13}_epic_g_/);
    expect(readdirSync(migrationDir).sort()).toEqual(['down.sql', 'up.sql']);
  });

  it('creates exactly one table, one function and one trigger, all in public', () => {
    expect(code.match(/create table/g)).toHaveLength(1);
    expect(code.match(/create function/g)).toHaveLength(1);
    expect(code.match(/create trigger/g)).toHaveLength(1);
    expect(code).toContain(`create table public.${backupTableName}`);
    expect(code).not.toMatch(/create (schema|extension|role|policy|index)/);
  });

  it('only references Nhost Auth (foreign key); never alters it', () => {
    expect(code).not.toMatch(
      /(alter|drop|truncate|insert into|update|delete from)\s+(table\s+)?auth\./,
    );
    expect(code).not.toMatch(/\bgrant\b|\brevoke\b|security definer/);
  });

  it('introduces no sync, outbox, chunk, queue or second data table', () => {
    expect(code).not.toMatch(
      /outbox|sync|chunk|queue|manifest|revision|dirty|jsonb?\b/,
    );
  });
});

describe('table shape (G3)', () => {
  it('is five slots per account by construction', () => {
    expect(code).toContain(
      `constraint ${backupConstraintNames.primaryKey} primary key (user_id, slot)`,
    );
    expect(code).toContain(
      `constraint ${backupConstraintNames.slotRange} check (slot between 0 and 4)`,
    );
    expect(code).toContain('slot smallint not null');
  });

  it('keeps backup ids unique per account only', () => {
    expect(code).toContain(
      `constraint ${backupConstraintNames.backupIdUnique} unique (user_id, backup_id)`,
    );
    expect(code).not.toMatch(/backup_id uuid not null (primary key|unique)/);
  });

  it('owns rows through a cascading foreign key to auth.users', () => {
    expect(code).toMatch(
      /user_id uuid not null references auth\.users \(id\) on update cascade on delete cascade/,
    );
  });

  it('bounds the app version at 80 characters', () => {
    expect(code).toContain('char_length(app_version) <= 80');
  });

  it('stores the payload as exact text', () => {
    expect(code).toContain('payload text not null');
  });
});

describe('remote payload ceiling', () => {
  it('is exactly octet_length(payload) <= 10485760 under a stable name', () => {
    expect(remoteBackupPayloadCeilingBytes).toBe(10485760);
    expect(code).toContain(
      `constraint ${backupConstraintNames.payloadCeiling} check (octet_length(payload) <= 10485760)`,
    );
  });

  it('does not change the local 25 MiB file-backup limit', () => {
    const envelope = readFileSync(
      path.join(process.cwd(), 'src/lib/backup/envelope.ts'),
      'utf8',
    );

    expect(envelope).toContain(
      'export const maxBackupBytes = 25 * 1024 * 1024;',
    );
    expect(remoteBackupPayloadCeilingBytes).toBeLessThan(25 * 1024 * 1024);
  });
});

describe('current-generation gate', () => {
  it('retains the historical schema-4 creation migration unchanged', () => {
    expect(code).toContain(
      `constraint ${backupConstraintNames.generationGate} check (format_version = 1 and schema_version = 4)`,
    );
  });

  it('matches the live app constants, so a schema bump cannot ship without this migration changing', () => {
    const envelope = readFileSync(
      path.join(process.cwd(), 'src/lib/backup/envelope.ts'),
      'utf8',
    );
    const db = readFileSync(
      path.join(process.cwd(), 'src/lib/db/constants.ts'),
      'utf8',
    );

    expect(envelope).toContain(
      `export const currentBackupFormatVersion = ${acceptedBackupGeneration.formatVersion};`,
    );
    expect(db).toContain(
      `export const currentDatabaseSchemaVersion = ${acceptedBackupGeneration.schemaVersion};`,
    );
  });

  it('is deployment-controlled: never read from a client value, a setting or a table', () => {
    expect(code).not.toMatch(
      /current_setting|session_user|from public\.\w*gate|new\.format_version\s*(<>|=)/,
    );
  });
});

describe('exact-bytes gate', () => {
  it('is ONE named CHECK covering missing, wrong-length and mismatched hashes', () => {
    const gate =
      code.match(
        /constraint backup_slots_exact_bytes_gate check \((.*?)\) \)/,
      )?.[1] ?? '';

    expect(gate).toContain('coalesce(');
    expect(gate).toContain('expected_sha256 is not null');
    expect(gate).toContain('octet_length(expected_sha256) = 32');
    expect(gate).toContain(
      "expected_sha256 = sha256(convert_to(payload, 'utf8'))",
    );
    expect(gate).toMatch(/, false\s*$/); // coalesce(..., false): NULL can never pass
    expect(code.match(/backup_slots_exact_bytes_gate/g)).toHaveLength(1);
  });

  it('keeps the precondition column nullable so absence fails the NAMED gate, not a generic NOT NULL', () => {
    expect(code).toMatch(/expected_sha256 bytea,/);
    expect(code).not.toMatch(/expected_sha256 bytea not null/);
    expect(code).not.toMatch(/octet_length\(expected_sha256\) = 32\)\s*,/); // no second, unnamed length check
  });

  it('hashes the UTF-8 bytes of the stored text, never a client value', () => {
    expect(code).toMatch(
      /new\.payload_sha256 := sha256\(convert_to\(new\.payload, 'utf8'\)\)/,
    );
    expect(code).not.toMatch(/new\.payload_sha256 := new\./);
  });
});

describe('server-owned metadata trigger', () => {
  it('is a single BEFORE INSERT row trigger (no update trigger, no payload parsing)', () => {
    expect(code).toMatch(
      /create trigger backup_slots_set_server_fields before insert on public\.backup_slots for each row/,
    );
    expect(code).not.toMatch(/before update|after (insert|update)|instead of/);
    expect(code).not.toMatch(
      /::json|to_json|jsonb|regexp|replace\(|translate\(|normalize\(/,
    );
  });

  it('sets exactly the three server-owned fields and nothing else', () => {
    const assigned = [...code.matchAll(/new\.(\w+) :=/g)]
      .map((match) => match[1])
      .sort();

    expect(assigned).toEqual(['payload_bytes', 'payload_sha256', 'stored_at']);
    expect(code).toContain('payload_bytes integer not null');
    expect(code).toContain('payload_sha256 bytea not null');
    expect(code).toContain('stored_at timestamptz not null');
  });

  it('chooses clock_timestamp() deliberately, with the reason recorded in the migration', () => {
    expect(code).toContain('new.stored_at := clock_timestamp()');
    expect(code).not.toMatch(
      /new\.stored_at := (now\(\)|statement_timestamp\(\)|transaction_timestamp\(\))/,
    );
    expect(up).toMatch(/clock_timestamp\(\)[\s\S]*not the transaction start/i);
  });

  it('adds no second timestamp column', () => {
    expect(code.match(/timestamptz/g)).toHaveLength(2); // exported_at (client claim) + stored_at
  });
});

describe('rollback path', () => {
  it('drops only the Epic G table and function', () => {
    const body = stripSqlComments(down)
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

    expect(body).toBe(
      'drop table if exists public.backup_slots; drop function if exists public.backup_slots_set_server_fields();',
    );
  });

  it('the metadata rollback removes every permission and untracks the table, nothing else', () => {
    expect(rollback.args.map((entry) => entry.type)).toEqual([
      'pg_drop_delete_permission',
      'pg_drop_select_permission',
      'pg_drop_insert_permission',
      'pg_untrack_table',
    ]);
    for (const entry of rollback.args) {
      expect(entry.args.table).toEqual({
        schema: 'public',
        name: backupTableName,
      });
    }
  });
});

describe('Hasura permission matrix (role user only)', () => {
  const clientColumns = [
    'slot',
    'backup_id',
    'format_version',
    'schema_version',
    'app_version',
    'exported_at',
    'payload',
    'expected_sha256',
  ];
  const serverOwned = [
    'payload_bytes',
    'payload_sha256',
    'stored_at',
    'user_id',
  ];

  it('is a bulk of exactly: track, insert, select, delete (no update, no relationship, no aggregate)', () => {
    expect(apply.type).toBe('bulk');
    expect(apply.args.map((entry) => entry.type)).toEqual([
      'pg_track_table',
      'pg_create_insert_permission',
      'pg_create_select_permission',
      'pg_create_delete_permission',
    ]);
    expect(JSON.stringify(apply)).not.toMatch(
      /update_permission|relationship|computed_field|remote/i,
    );
    expect(JSON.stringify(apply).match(/aggregat/gi)).toHaveLength(1); // only "allow_aggregations": false
    expect(JSON.stringify(apply)).toContain('"allow_aggregations":false');
  });

  it('touches only public.backup_slots, only role user, never an auth table', () => {
    for (const entry of apply.args) {
      expect(entry.args.table).toEqual({
        schema: 'public',
        name: backupTableName,
      });
      if (entry.args.role !== undefined) {
        expect(entry.args.role).toBe('user');
      }
    }
    expect(JSON.stringify(apply)).not.toMatch(/"auth"|auth\.users|"users"/);
  });

  it('insert: only client-owned columns; user_id is a session preset', () => {
    const insert = permissionOf('pg_create_insert_permission');

    expect([...(insert?.columns ?? [])].sort()).toEqual(
      [...clientColumns].sort(),
    );
    expect(insert?.set).toEqual({ user_id: 'x-hasura-user-id' });
    expect(insert?.check).toEqual({ user_id: { _eq: 'X-Hasura-User-Id' } });
    for (const column of serverOwned) {
      expect(insert?.columns).not.toContain(column);
    }
  });

  it('select: own rows, server hash visible, expected hash and user_id hidden, no aggregates', () => {
    const select = permissionOf('pg_create_select_permission');

    expect(select?.filter).toEqual({ user_id: { _eq: 'X-Hasura-User-Id' } });
    expect(select?.allow_aggregations).toBe(false);
    expect(select?.columns).toContain('payload_sha256');
    expect(select?.columns).not.toContain('expected_sha256');
    expect(select?.columns).not.toContain('user_id');
  });

  it('delete: own rows only', () => {
    expect(permissionOf('pg_create_delete_permission')?.filter).toEqual({
      user_id: { _eq: 'X-Hasura-User-Id' },
    });
  });

  it('does not add the unproven auth.users self-delete permission (U-5 is carried to G7)', () => {
    expect(JSON.stringify(apply)).not.toMatch(/delete.*users|auth/i);
  });
});

describe('owner-run apply helper', () => {
  const source = readFileSync(path.join(infra, 'apply.mjs'), 'utf8');

  it('targets the same project as the application endpoints', () => {
    const host = new URL(nhostAuthUrl).host.replace('.auth.', '.hasura.');
    const project = source.match(/subdomain: '([^']+)', region: '([^']+)'/);

    expect(`${project?.[1]}.hasura.${project?.[2]}.nhost.run`).toBe(host);
  });

  it('reads the admin secret only from the environment and never prints it', () => {
    expect(source).toContain('process.env.NHOST_ADMIN_SECRET');
    // Printing the secret itself is forbidden; the one error print redacts it first.
    expect(source).not.toMatch(
      /console\.(log|error)\(\s*secret\s*\)|\$\{secret\}/,
    );
    expect(source).toContain("replaceAll(secret, '[REDACTED]')");
    expect(source).not.toMatch(/NHOST_ADMIN_SECRET\s*=\s*['"]/);
  });

  it.each(['schema', 'permissions', 'rollback'])(
    '--dry-run of "%s" sends nothing and needs no secret',
    (command) => {
      const result = spawnSync(
        process.execPath,
        [path.join(infra, 'apply.mjs'), command, '--dry-run'],
        {
          encoding: 'utf8',
          env: { PATH: process.env.PATH ?? '' },
        },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        '[dry-run] POST https://enuikiiweoscywaixedr.hasura.eu-north-1.nhost.run/',
      );
      expect(result.stdout).not.toMatch(/secret/i);
    },
  );

  it('refuses to run for real without the secret', () => {
    const result = spawnSync(
      process.execPath,
      [path.join(infra, 'apply.mjs'), 'schema'],
      {
        encoding: 'utf8',
        env: { PATH: process.env.PATH ?? '' },
      },
    );

    expect(result.status).toBe(2);
  });
});

describe('no credential is stored in the infra tree', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(infra);

  it('contains no secret-looking assignment, token, or connection string', () => {
    const offenders = files.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return /eyJ[A-Za-z0-9_-]{20,}\.|postgres(ql)?:\/\/|(admin[_-]?secret|password)\s*[:=]\s*['"][^'"\s]{6,}/i.test(
        text,
      );
    });

    expect(offenders.map((file) => path.relative(infra, file))).toEqual([]);
  });
});
