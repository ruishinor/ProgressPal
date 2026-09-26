import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Epic C / C1 visual SOURCE-IDENTITY builder (test-only). Hashes the RPG
 * asset bytes and extracts the exact CSS custom properties of the token
 * files. Identity evidence only: equal bytes and token values do NOT prove
 * rendered visual parity (see C0_VISUAL_PRESERVATION_PLAN.md section 4).
 */

export const rpgAssetRoot = path.resolve('src/features/rpg/assets');
export const tokenFiles = [
  'src/styles/tokens.css',
  'src/styles/rpg-tokens.css',
];

export function sha256(bytes: Buffer | Uint8Array | string) {
  return createHash('sha256').update(bytes).digest('hex');
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(full) : [full];
    })
    .sort();
}

/** `relative/path` -> SHA-256 for every file under src/features/rpg/assets. */
export function hashRpgAssets(): Record<string, string> {
  return Object.fromEntries(
    listFiles(rpgAssetRoot).map((file) => [
      path.relative(rpgAssetRoot, file).split(path.sep).join('/'),
      sha256(readFileSync(file)),
    ]),
  );
}

function normalizeSvg(text: string) {
  return text.replace(/\s+/g, '').replace(/"/g, "'");
}

/**
 * Identify which asset file a rendered `data:` URI came from. Base64 URIs
 * (WebP) must match a file's bytes exactly. Vite's `?inline` SVG encoding
 * rewrites quotes and whitespace, so a URL-encoded SVG must match exactly one
 * file after quote/whitespace normalization.
 */
export function identifyArtFile(uri: string): string | null {
  const comma = uri.indexOf(',');
  const header = uri.slice(0, comma);
  const payload = uri.slice(comma + 1);
  const files = listFiles(rpgAssetRoot);
  const relative = (file: string) =>
    path.relative(rpgAssetRoot, file).split(path.sep).join('/');

  if (header.endsWith(';base64')) {
    const hash = sha256(Buffer.from(payload, 'base64'));
    const matches = files.filter((file) => sha256(readFileSync(file)) === hash);
    return matches.length === 1 ? relative(matches[0]!) : null;
  }

  const decoded = normalizeSvg(decodeURIComponent(payload));
  const matches = files.filter(
    (file) =>
      file.endsWith('.svg') &&
      normalizeSvg(readFileSync(file, 'utf8')) === decoded,
  );
  return matches.length === 1 ? relative(matches[0]!) : null;
}

const customPropertyPattern = /^(--[\w-]+)\s*:\s*([\s\S]+)$/;

/**
 * Custom properties grouped by `file | [@media ...] selector`, in source
 * order. The token files contain only flat rule blocks and one @media block.
 */
export function extractTokens(): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};

  for (const file of tokenFiles) {
    const text = readFileSync(path.resolve(file), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const stack: string[] = [];
    let buffer = '';

    for (const character of text) {
      if (character === '{') {
        stack.push(buffer.trim().replace(/\s+/g, ' '));
        buffer = '';
      } else if (character === '}') {
        stack.pop();
        buffer = '';
      } else if (character === ';') {
        const match = buffer.trim().match(customPropertyPattern);
        buffer = '';
        if (match !== null && stack.length > 0) {
          const key = `${file} | ${stack.join(' ')}`;
          result[key] ??= {};
          result[key][match[1]!] = match[2]!.trim().replace(/\s+/g, ' ');
        }
      } else {
        buffer += character;
      }
    }
  }

  return result;
}
