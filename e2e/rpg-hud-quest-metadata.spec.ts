import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Epic D2 content-stress oracle for the persistent HUD's Current quest
 * metadata. Real course content with the longest unit titles was missed by the
 * short Week 0 states: a compound duration ("2h 30m") could break between its
 * parts and strand "30m" on its own line. This observes the actual rendered
 * line boxes rather than only the presence of the text.
 */

type SeedUnit = {
  items: { id: string; required: boolean }[];
  title: string;
};

// Real current-programme quests: the first is the reported Week 2 case; the
// second has the longest real unit title among quests with a 2h 30m duration.
const stressQuests = [
  {
    duration: '2h 30m',
    target: 'week-2-lecture',
    title: 'Lecture 2: Arrays',
    unit: 'Week 2: Arrays',
  },
  {
    duration: '2h 30m',
    target: 'week-8-lecture',
    title: 'Lecture 8: HTML, CSS, JavaScript',
    unit: 'Week 8: HTML, CSS, JavaScript',
  },
] as const;

const widths = [320, 360, 390, 430, 672, 673, 768, 1280] as const;

type Rect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
};

type TextNode = { textContent: string | null };
type MeasuredElement = {
  childNodes: ArrayLike<{ nodeType: number } & TextNode>;
  getBoundingClientRect: () => Rect;
  querySelector: (selector: string) => MeasuredElement | null;
};
type HudScope = {
  document: {
    createRange: () => {
      getBoundingClientRect: () => Rect & { width: number };
      setEnd: (node: unknown, offset: number) => void;
      setStart: (node: unknown, offset: number) => void;
    };
    documentElement: { scrollWidth: number };
    querySelector: (selector: string) => MeasuredElement | null;
  };
  innerWidth: number;
};

async function completeRequiredItemsBefore(page: Page, target: string) {
  const units = (
    JSON.parse(await readFile('src/seed/cs50x-2026.json', 'utf8')) as {
      units: SeedUnit[];
    }
  ).units;
  const completed: string[] = [];

  search: for (const unit of units) {
    for (const item of unit.items) {
      if (item.id === target) break search;
      if (item.required) completed.push(item.id);
    }
  }

  expect(completed.length).toBeGreaterThan(0);

  // Same IndexedDB progress-fixture technique as the B3 visual review spec.
  await page.evaluate(async (itemIds) => {
    await new Promise<void>((resolve, reject) => {
      const scope = globalThis as unknown as {
        indexedDB: {
          open: (name: string) => {
            onerror: (() => void) | null;
            onsuccess: (() => void) | null;
            result: {
              close: () => void;
              transaction: (
                stores: string[],
                mode: string,
              ) => {
                objectStore: (name: string) => {
                  put: (value: unknown) => void;
                };
                oncomplete: (() => void) | null;
                onerror: (() => void) | null;
              };
            };
          };
        };
      };
      const request = scope.indexedDB.open('progresspal-cs50-edition');

      request.onerror = () => reject(new Error('Could not open IndexedDB.'));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ['progress_entries'],
          'readwrite',
        );
        const store = transaction.objectStore('progress_entries');

        for (const itemId of itemIds) {
          store.put({
            completedAt: '2026-09-14T09:00:00.000Z',
            confidence: 4,
            createdAt: '2026-09-14T08:00:00.000Z',
            evidenceText: 'Content-stress fixture.',
            evidenceType: 'self_report',
            id: `hud-metadata-${itemId}`,
            itemId,
            startedAt: '2026-09-14T08:00:00.000Z',
            status: 'completed',
            updatedAt: '2026-09-14T09:00:00.000Z',
          });
        }

        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(new Error('Could not write progress fixtures.'));
        };
      };
    });
  }, completed);
}

async function measureQuestMetadata(page: Page) {
  return page.evaluate(() => {
    const scope = globalThis as unknown as HudScope;
    const hud = scope.document.querySelector(
      '[aria-label="Persistent hero HUD"]',
    )!;
    const copy = hud.querySelector('.rpg-hero-hud__quest-copy')!;
    const context = hud.querySelector('.rpg-hero-hud__quest-context')!;
    const link = hud.querySelector('.rpg-hero-hud__quest-link')!;
    const lines: { text: string; top: number }[] = [];

    // Group every rendered character of the metadata by its line box.
    const collect = (node: MeasuredElement['childNodes'][number]) => {
      if (node.nodeType === 3) {
        const text = node.textContent ?? '';

        for (let index = 0; index < text.length; index++) {
          const range = scope.document.createRange();

          range.setStart(node, index);
          range.setEnd(node, index + 1);
          const box = range.getBoundingClientRect();

          if (box.width === 0 && box.height === 0) continue;
          const top = Math.round(box.top);
          const last = lines[lines.length - 1];

          if (last && Math.abs(last.top - top) < 4) last.text += text[index];
          else lines.push({ text: text[index]!, top });
        }
        return;
      }

      for (const child of Array.from(
        (node as unknown as MeasuredElement).childNodes,
      )) {
        collect(child);
      }
    };

    for (const child of Array.from(context.childNodes)) collect(child);

    const copyBox = copy.getBoundingClientRect();
    const contextBox = context.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    const hudBox = hud.getBoundingClientRect();
    const intersects =
      linkBox.left < copyBox.right - 0.5 &&
      copyBox.left < linkBox.right - 0.5 &&
      linkBox.top < copyBox.bottom - 0.5 &&
      copyBox.top < linkBox.bottom - 0.5;

    return {
      contextRight: contextBox.right,
      copyRight: copyBox.right,
      horizontalOverflow:
        scope.document.documentElement.scrollWidth - scope.innerWidth,
      hudInViewport: hudBox.left >= 0 && hudBox.right <= scope.innerWidth,
      lines: lines.map((line) => line.text.trim()),
      linkHeight: linkBox.height,
      linkInsideHud:
        linkBox.left >= hudBox.left - 0.5 &&
        linkBox.right <= hudBox.right + 0.5,
      linkOverlapsCopy: intersects,
    };
  });
}

for (const quest of stressQuests) {
  test(`HUD Current quest metadata keeps "${quest.duration}" whole for ${quest.unit}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 390 });
    await completeOnboarding(page);
    await page.goto('/rpg');
    await completeRequiredItemsBefore(page, quest.target);

    for (const width of widths) {
      await page.setViewportSize({ height: 900, width });
      await page.goto('/rpg/map');
      await expect(
        page.getByRole('heading', { exact: true, name: 'Campaign' }),
      ).toBeVisible();

      const hud = page.getByRole('region', { name: 'Persistent hero HUD' });

      // Required HUD text stays visible.
      await expect(
        hud.getByText('Current quest', { exact: true }),
      ).toBeVisible();
      await expect(hud.getByText(quest.title, { exact: true })).toBeVisible();
      await expect(hud.getByText(/^Up to \+\d+ XP$/)).toBeVisible();
      await expect(
        hud.getByRole('link', { exact: true, name: 'Start quest' }),
      ).toBeVisible();
      await expect(hud.locator('.rpg-hero-hud__quest-context')).toHaveText(
        `${quest.unit} / ${quest.duration}`,
      );

      const label = `${quest.unit} at ${width}px`;
      const measured = await measureQuestMetadata(page);

      expect(
        measured.horizontalOverflow,
        `${label} overflow`,
      ).toBeLessThanOrEqual(1);
      expect(measured.hudInViewport, `${label} HUD in viewport`).toBe(true);
      expect(
        measured.contextRight,
        `${label} metadata contained`,
      ).toBeLessThanOrEqual(measured.copyRight + 0.5);
      expect(
        measured.linkOverlapsCopy,
        `${label} action overlaps metadata`,
      ).toBe(false);
      expect(measured.linkInsideHud, `${label} action inside HUD`).toBe(true);
      expect(measured.linkHeight, `${label} tap target`).toBeGreaterThanOrEqual(
        44,
      );

      // The failure mechanism: the whole duration sits on exactly one rendered
      // line, so "30m" is never stranded or separated from "2h".
      expect(
        measured.lines.filter((line) => line.includes(quest.duration)),
        `${label} duration split across lines: ${JSON.stringify(measured.lines)}`,
      ).toHaveLength(1);
      expect(
        measured.lines.filter((line) => /^\d+[hm]$/.test(line)),
        `${label} stranded duration fragment: ${JSON.stringify(measured.lines)}`,
      ).toEqual([]);
    }
  });
}
