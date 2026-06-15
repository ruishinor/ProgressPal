import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function readWorkspaceFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('achievements engine boundaries', () => {
  it('keeps the pure engine and definitions free of any database imports', () => {
    const engineSource = readWorkspaceFile('src/lib/achievements/engine.ts');
    const definitionsSource = readWorkspaceFile(
      'src/lib/achievements/definitions.ts',
    );
    const combinedSource = `${engineSource}\n${definitionsSource}`;

    // No Dexie or database-layer imports — the engine is pure.
    expect(combinedSource).not.toMatch(/from ['"]dexie['"]/i);
    expect(combinedSource).not.toMatch(/from ['"]@\/lib\/db/);
  });

  it('keeps the achievements page read-only (no evaluation or write APIs)', () => {
    const pageSource = readWorkspaceFile(
      'src/features/achievements/routes/AchievementsPage.tsx',
    );

    // The page may only read via getAchievementsView; it must never evaluate or
    // run any XP-aware save wrapper that could create unlocks.
    expect(pageSource).not.toMatch(/evaluateAchievements/);
    expect(pageSource).not.toMatch(/AndAwardXp/);
    expect(pageSource).not.toMatch(/upsertProgress\b/);
    expect(pageSource).not.toMatch(/addStudySession\b/);
    expect(pageSource).not.toMatch(/logMediaProgress\b/);
  });
});
