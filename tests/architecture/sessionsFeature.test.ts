import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function readWorkspaceFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('sessions feature boundaries', () => {
  it('keeps session flows free of xp and progress-engine write imports', () => {
    const sessionsPageSource = readWorkspaceFile(
      'src/features/sessions/routes/SessionsPage.tsx',
    );
    const sessionsModelSource = readWorkspaceFile(
      'src/features/sessions/model.ts',
    );
    const combinedSource = `${sessionsPageSource}\n${sessionsModelSource}`;

    expect(combinedSource).not.toMatch(/addXpTransaction/);
    expect(combinedSource).not.toMatch(/upsertProgress/);
    expect(combinedSource).not.toMatch(/logMediaProgress/);
  });
});
