import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { acceptedBackupGeneration } from '@/lib/cloud/nhost/backupConstraints';
import { currentDatabaseSchemaVersion } from '@/lib/db';
import { isCompatible } from '@/lib/cloudBackup/inventory';

const root =
  'infra/nhost/migrations/default/1792886400000_activity_generation_5/';
const up = readFileSync(`${root}up.sql`, 'utf8')
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')
  .toLowerCase();
const down = readFileSync(`${root}down.sql`, 'utf8')
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')
  .toLowerCase();
describe('Activity generation migration prepared for a later provider rollout', () => {
  it('binds the schema-5 candidate to a non-destructive, single-generation SQL gate', () => {
    expect(currentDatabaseSchemaVersion).toBe(5);
    expect(acceptedBackupGeneration).toEqual({
      formatVersion: 1,
      schemaVersion: 5,
    });
    expect(up).toContain(
      'check (format_version = 1 and schema_version = 5) not valid',
    );
    expect(up).toContain('begin;');
    expect(up).toContain('commit;');
    expect(up).not.toMatch(/delete|truncate|drop table|update public/);
  });
  it('prevents lowering the generation while higher-generation rows exist', () => {
    expect(down).toContain(
      'lock table public.backup_slots in access exclusive mode',
    );
    expect(down).toContain('where schema_version >= 5');
    expect(down).toContain('raise exception');
    expect(down).not.toMatch(/delete|truncate|drop table|update public/);
  });
  it('refuses schema-4 remote restore without changing the row', () => {
    const slot = {
      slot: 0,
      backupId: 'older',
      formatVersion: 1,
      schemaVersion: 4,
      appVersion: '1.8.0',
      exportedAt: '',
      storedAt: '',
      payloadBytes: 1,
    };
    expect(isCompatible(slot, acceptedBackupGeneration)).toBe(false);
    expect(slot.schemaVersion).toBe(4);
  });
});
