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

  it('keeps the achievements page and shared surface read-only (no evaluation or write APIs)', () => {
    // The classic page and the RPG route both render the shared surface, so the
    // read-only guarantee must hold across both the route file and the surface.
    const pageSource = readWorkspaceFile(
      'src/features/achievements/routes/AchievementsPage.tsx',
    );
    const surfaceSource = readWorkspaceFile(
      'src/features/achievements/components/AchievementsSurface.tsx',
    );
    const combinedSource = `${pageSource}\n${surfaceSource}`;

    // The surface may only read via getAchievementsView; it must never evaluate
    // or run any XP-aware save wrapper that could create unlocks.
    expect(combinedSource).not.toMatch(/evaluateAchievements/);
    expect(combinedSource).not.toMatch(/AndAwardXp/);
    expect(combinedSource).not.toMatch(/upsertProgress\b/);
    expect(combinedSource).not.toMatch(/addStudySession\b/);
    expect(combinedSource).not.toMatch(/logMediaProgress\b/);
  });
});
