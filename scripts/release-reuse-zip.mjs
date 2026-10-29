import { createHash } from 'node:crypto';
import { crc32, inflateRawSync } from 'node:zlib';

export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');
export const MAX_ARCHIVE = 16 * 1024 * 1024;

// Read data only. No extraction, path resolution, or execution. Unsupported ZIP
// features are an optional reuse miss, never a reason to reject the full gate.
export function readZip(bytes, digest) {
  const fail = () => {
    throw new Error('SOURCE_ZIP_INVALID');
  };
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length > MAX_ARCHIVE ||
    bytes.length < 22 ||
    digest !== `sha256:${sha256(bytes)}`
  )
    fail();
  const end = bytes.length - 22;
  if (
    bytes.readUInt32LE(end) !== 0x06054b50 ||
    bytes.readUInt16LE(end + 20) !== 0 ||
    bytes.readUInt32LE(end + 4) !== 0
  )
    fail();
  const count = bytes.readUInt16LE(end + 10);
  const size = bytes.readUInt32LE(end + 12);
  const start = bytes.readUInt32LE(end + 16);
  if (
    count === 0 ||
    count > 128 ||
    count !== bytes.readUInt16LE(end + 8) ||
    start + size !== end
  )
    fail();
  const entries = new Map();
  const ranges = [];
  let cursor = start;
  let total = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) fail();
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const crc = bytes.readUInt32LE(cursor + 16);
    const packed = bytes.readUInt32LE(cursor + 20);
    const unpacked = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const local = bytes.readUInt32LE(cursor + 42);
    const mode = bytes.readUInt32LE(cursor + 38) >>> 16;
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (
      next > end ||
      flags & ~0x808 ||
      ![0, 8].includes(method) ||
      bytes.readUInt16LE(cursor + 34) !== 0 ||
      (mode & 0xf000) === 0xa000 ||
      unpacked > 32 * 1024 * 1024 ||
      (total += unpacked) > 64 * 1024 * 1024
    )
      fail();
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = nameBytes.toString('utf8');
    if (
      !/^[a-zA-Z0-9_./-]+$/.test(name) ||
      name.startsWith('/') ||
      name.split('/').some((part) => !part || part === '.' || part === '..') ||
      entries.has(name)
    )
      fail();
    if (
      local + 30 > start ||
      bytes.readUInt32LE(local) !== 0x04034b50 ||
      bytes.readUInt16LE(local + 6) !== flags ||
      bytes.readUInt16LE(local + 8) !== method ||
      bytes.readUInt16LE(local + 26) !== nameLength ||
      !bytes.subarray(local + 30, local + 30 + nameLength).equals(nameBytes)
    )
      fail();
    const data = local + 30 + nameLength + bytes.readUInt16LE(local + 28);
    if (
      data + packed > start ||
      ranges.some(([a, b]) => local < b && data + packed > a)
    )
      fail();
    ranges.push([local, data + packed]);
    const compressed = bytes.subarray(data, data + packed);
    const content =
      method === 0
        ? compressed
        : inflateRawSync(compressed, {
            maxOutputLength: Math.max(1, unpacked),
          });
    if (content.length !== unpacked || crc32(content) !== crc) fail();
    entries.set(name, content);
    cursor = next;
  }
  if (cursor !== end) fail();
  return entries;
}
