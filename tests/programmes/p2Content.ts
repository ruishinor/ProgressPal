import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  parseProgrammeContentCatalogue,
  type LessonModuleContent,
  type ProgrammeContentIndex,
} from '@/lib/domain';
import catalogueJson from '@/programmes/programvareutvikling/content/catalogue.json';

/**
 * Programvareutvikling content as the tests read it (owner decision
 * 2026-10-03): the bundled catalogue, and the content-addressed assets it
 * names, read from `public/` exactly as the static host serves them.
 */

const publicRoot = join(process.cwd(), 'public');

export const p2Catalogue = parseProgrammeContentCatalogue(catalogueJson);

/** The text of a packaged asset, by its catalogue path. */
export function readP2Asset(path: string): string {
  return readFileSync(join(publicRoot, path), 'utf8');
}

/** The full content index (the former in-bundle manifest). */
export const p2Index = JSON.parse(
  readP2Asset(p2Catalogue.assets.index.path),
) as ProgrammeContentIndex;

/** The lesson content of each module, by source module ID. */
export const p2Modules: Readonly<Record<string, LessonModuleContent>> =
  Object.fromEntries(
    Object.entries(p2Catalogue.assets.modules).map(([moduleId, asset]) => [
      moduleId,
      JSON.parse(readP2Asset(asset.path)) as LessonModuleContent,
    ]),
  );
