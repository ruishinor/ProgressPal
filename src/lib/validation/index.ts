export {
  SchemaValidationError,
  formatZodIssues,
  parseWithSchema,
} from './parse';
export { getDuplicateValues } from './collections';

/** Lowercase SHA-256 of the exact UTF-8 bytes of a string. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
