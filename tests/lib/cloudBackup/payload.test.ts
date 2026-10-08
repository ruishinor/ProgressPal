import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  buildBackupEnvelope,
  parseBackupFile,
  serializeBackupEnvelope,
} from '@/lib/backup';
import { produceBackupPayload, sha256Hex } from '@/lib/cloudBackup';

import {
  appVersion,
  createLearnerDevice,
  schemaVersion,
  sha256,
} from './support';

describe('sha256Hex: WebCrypto over the exact UTF-8 bytes of the string', () => {
  it.each([
    ['empty', ''],
    ['ascii', 'abc'],
    ['two-byte characters', 'blåbærsyltetøy é'],
    ['astral characters', '😀 𝒳'],
    ['an escaped NUL, as JSON writes it', '{"k":"a\\u0000b"}'],
    ['newlines and quotes', '{\n  "k": "x \\"y\\""\n}'],
    ['a long text', 'x'.repeat(1024 * 1024 + 7)],
  ])('equals the reference digest for %s', async (_label, text) => {
    expect(await sha256Hex(text)).toBe(sha256(text));
  });

  it('is lowercase hex of 64 characters', async () => {
    expect(await sha256Hex('x')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes bytes, not characters: a two-byte letter is the two bytes C3 A9', async () => {
    expect(await sha256Hex('é')).toBe(
      createHash('sha256')
        .update(Buffer.from([0xc3, 0xa9]))
        .digest('hex'),
    );
    expect(await sha256Hex('é')).not.toBe(await sha256Hex('e'));
  });
});

describe('produceBackupPayload: the exact bytes the local file backup would contain', () => {
  const exportedAt = '2026-10-08T10:00:00.000Z';

  it('equals the existing export of the same snapshot, byte for byte', async () => {
    const device = await createLearnerDevice('payload-bytes');

    try {
      const data = await device.readSnapshot();
      const expected = serializeBackupEnvelope(
        buildBackupEnvelope(data, { appVersion, schemaVersion, exportedAt }),
      );
      const produced = await produceBackupPayload({
        data,
        appVersion,
        schemaVersion,
        exportedAt,
      });

      expect(produced.contents).toBe(expected.contents);
      expect(produced.byteLength).toBe(expected.byteLength);
      expect(produced.byteLength).toBe(
        Buffer.byteLength(produced.contents, 'utf8'),
      );
      expect(produced.exportedAt).toBe(exportedAt);
    } finally {
      await device.cleanup();
    }
  });

  it('is hashed over that very string, not over a re-serialisation of it', async () => {
    const device = await createLearnerDevice('payload-hash');

    try {
      const data = await device.readSnapshot();
      const produced = await produceBackupPayload({
        data,
        appVersion,
        schemaVersion,
        exportedAt,
      });

      expect(produced.sha256).toBe(sha256(produced.contents));
      expect(produced.sha256).not.toBe(
        sha256(JSON.stringify(JSON.parse(produced.contents))),
      );
    } finally {
      await device.cleanup();
    }
  });

  it("keeps the file export's two-space indentation (no compact form, no normalisation)", async () => {
    const device = await createLearnerDevice('payload-indent');

    try {
      const produced = await produceBackupPayload({
        data: await device.readSnapshot(),
        appVersion,
        schemaVersion,
        exportedAt,
      });

      expect(
        produced.contents.startsWith('{\n  "format": "progresspal-backup"'),
      ).toBe(true);
    } finally {
      await device.cleanup();
    }
  });

  it('is a valid backup the existing parser accepts (it is a restorable file)', async () => {
    const device = await createLearnerDevice('payload-parse');

    try {
      const data = await device.readSnapshot();
      const produced = await produceBackupPayload({
        data,
        appVersion,
        schemaVersion,
        exportedAt,
      });
      const envelope = parseBackupFile(produced.contents, {
        expectedSchemaVersion: schemaVersion,
        migrationContext: device.migrationContext,
      });

      expect(envelope.data).toEqual(JSON.parse(JSON.stringify(data)));
    } finally {
      await device.cleanup();
    }
  });

  it('does not change the snapshot it was given', async () => {
    const device = await createLearnerDevice('payload-pure');

    try {
      const data = await device.readSnapshot();
      const copy = structuredClone(data);

      await produceBackupPayload({
        data,
        appVersion,
        schemaVersion,
        exportedAt,
      });

      expect(data).toEqual(copy);
    } finally {
      await device.cleanup();
    }
  });
});
