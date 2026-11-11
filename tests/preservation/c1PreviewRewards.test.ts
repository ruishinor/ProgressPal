import { describe, expect, it } from 'vitest';

import committedPreviewTable from '../fixtures/preservation/c1-preview-rewards.json';
import committedXpTable from '../fixtures/preservation/c1-xp-awards.json';
import { createSeededDatabase, readMaterializedCatalogue } from './c1Support';
import { buildC1PreviewRows, type C1XpRow } from './c1XpTable';

/**
 * Epic C / C1 evidence area 4 — completion preview and RPG reward labels.
 *
 * Family: SEMANTIC ORACLE (what the learner is shown before and after
 * earning a reward). Authority: the committed table was produced at the
 * product baseline and every preview is cross-checked against the XP award
 * table at the item's terminal status (`accepted` for problem sets,
 * `completed` otherwise). The single documented difference is the
 * final-project README/demo pair: the preview deliberately shows the shared
 * pair reward on both items. Owner after C3: CS50 XP configuration
 * (preview terminal status derives from the CS50 submission workflow).
 */

const pairItems = new Set(['final-project-readme', 'final-project-video-demo']);

describe('C1 completion preview (semantic)', () => {
  it('reproduces the committed baseline preview table exactly', async () => {
    const context = await createSeededDatabase('preview-table');
    try {
      const catalogue = await readMaterializedCatalogue(context);
      const rows = buildC1PreviewRows(catalogue);

      expect(rows).toHaveLength(68);
      expect(rows).toEqual(committedPreviewTable);
    } finally {
      await context.cleanup();
    }
  });

  it('previews exactly the terminal-status awards of the XP table', () => {
    const xpRows = committedXpTable as C1XpRow[];

    for (const preview of committedPreviewTable) {
      const isolated = xpRows.filter(
        (row) => row.context === 'isolated' && row.itemId === preview.itemId,
      );
      const terminalStatus = isolated.some((row) => row.status === 'accepted')
        ? 'accepted'
        : 'completed';
      const terminal = isolated.find((row) => row.status === terminalStatus)!;
      const expected = pairItems.has(preview.itemId)
        ? [
            ...terminal.awards,
            {
              policy: 'final_project_milestone',
              reason: 'Completed both final project README and video demo',
              sourceId: 'final-project-readme-demo-combined',
              sourceType: 'final_project_readme_demo_completed',
              transactionId:
                'xp-final_project_readme_demo_completed-final-project-readme-demo-combined',
              xp: 200,
            },
          ]
        : terminal.awards;

      expect(preview.awards, preview.itemId).toEqual(expected);
    }
  });
});
