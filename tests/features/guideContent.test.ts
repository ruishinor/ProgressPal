import { describe, expect, it } from 'vitest';

import {
  getItemGuide,
  getUnitGuide,
  type ItemGuide,
  type UnitGuide,
} from '@/features/course/guideContent';
import { bundledCourseSeed } from '@/seed';

/**
 * Guide content is a representative first pass: it covers Week 0 and Week 1
 * only. These tests verify the correctness of the guide keys that DO exist
 * (they must map to real bundled seed IDs, have non-empty strings, avoid
 * learner-facing forbidden terms, and avoid non-allowed URLs). They must NOT
 * require guide coverage for the full course.
 */

const seedUnitIds = new Set(bundledCourseSeed.units.map((unit) => unit.id));
const seedItemIds = new Set(
  bundledCourseSeed.units.flatMap((unit) => unit.items.map((item) => item.id)),
);

/**
 * Learner-facing internal vocabulary that must never surface in rendered guide
 * copy. Matched as whole words/phrases, case-insensitively. (This list is the
 * intentional inverse of the allowed learner vocabulary for this feature.)
 */
const FORBIDDEN_LEARNER_TERMS: readonly string[] = [
  'course item',
  'content detail',
  'progress record',
  'evidence',
  'confidence',
  'watched range',
  'slice',
  'local derived state',
  'item context',
  'asset tracking',
  'granular asset timeline',
  'mutable surface',
  'study ledger',
  'local ledger',
  'route',
  'schema-backed',
  'ledger',
  'audit',
];

/** Only official CS50 course links are permitted if any URL appears at all. */
const ALLOWED_URL_PREFIXES: readonly string[] = ['https://cs50.harvard.edu/'];
const URL_PATTERN = /https?:\/\/[^\s'"`)<>]+/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectUnitStrings(guide: UnitGuide): string[] {
  return [
    guide.summary,
    ...(guide.whatToDo ?? []),
    ...(guide.doneLooksLike ?? []),
    ...(guide.reflectionPrompt ? [guide.reflectionPrompt] : []),
  ];
}

function collectItemStrings(guide: ItemGuide): string[] {
  return [
    guide.summary,
    ...(guide.whatToDo ?? []),
    ...(guide.doneLooksLike ?? []),
    ...(guide.checklist ?? []),
    ...(guide.reflectionPrompt ? [guide.reflectionPrompt] : []),
  ];
}

const KNOWN_UNIT_GUIDE_IDS = ['week-0', 'week-1'] as const;
const KNOWN_ITEM_GUIDE_IDS = [
  'week-0-lecture',
  'week-0-problem-set',
  'week-1-lecture',
  'week-1-problem-set',
] as const;

describe('getUnitGuide', () => {
  it('resolves the Week 0 and Week 1 unit guides', () => {
    for (const unitId of KNOWN_UNIT_GUIDE_IDS) {
      const guide = getUnitGuide(unitId);
      expect(guide).not.toBeNull();
      expect(guide!.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it('returns null for unknown unit IDs', () => {
    expect(getUnitGuide('not-a-real-unit')).toBeNull();
    expect(getUnitGuide('week-7')).toBeNull();
    expect(getUnitGuide('')).toBeNull();
  });
});

describe('getItemGuide', () => {
  it('resolves the Week 0 and Week 1 lecture and problem-set item guides', () => {
    for (const itemId of KNOWN_ITEM_GUIDE_IDS) {
      const guide = getItemGuide(itemId);
      expect(guide).not.toBeNull();
      expect(guide!.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it('returns null for unknown item IDs', () => {
    expect(getItemGuide('not-a-real-item')).toBeNull();
    expect(getItemGuide('week-7-problem-set')).toBeNull();
    expect(getItemGuide('')).toBeNull();
  });
});

describe('guide content integrity', () => {
  it('keys every unit guide to a real bundled seed unit ID', () => {
    for (const unitId of KNOWN_UNIT_GUIDE_IDS) {
      expect(seedUnitIds.has(unitId)).toBe(true);
    }
  });

  it('keys every item guide to a real bundled seed item ID', () => {
    for (const itemId of KNOWN_ITEM_GUIDE_IDS) {
      expect(seedItemIds.has(itemId)).toBe(true);
    }
  });

  it('allows missing guide content for later weeks/items without failing', () => {
    // Representative first pass: later weeks intentionally have no guide yet.
    expect(getUnitGuide('week-2')).toBeNull();
    expect(getItemGuide('week-2-problem-set')).toBeNull();
    // The seed still legitimately contains those IDs.
    expect(seedUnitIds.has('week-2')).toBe(true);
    expect(seedItemIds.has('week-2-problem-set')).toBe(true);
  });

  it('uses only non-empty guide strings', () => {
    for (const unitId of KNOWN_UNIT_GUIDE_IDS) {
      for (const value of collectUnitStrings(getUnitGuide(unitId)!)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }

    for (const itemId of KNOWN_ITEM_GUIDE_IDS) {
      for (const value of collectItemStrings(getItemGuide(itemId)!)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('contains no forbidden learner-facing terms', () => {
    const allStrings = [
      ...KNOWN_UNIT_GUIDE_IDS.flatMap((id) =>
        collectUnitStrings(getUnitGuide(id)!),
      ),
      ...KNOWN_ITEM_GUIDE_IDS.flatMap((id) =>
        collectItemStrings(getItemGuide(id)!),
      ),
    ];

    const violations: string[] = [];

    for (const term of FORBIDDEN_LEARNER_TERMS) {
      const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');

      for (const value of allStrings) {
        if (pattern.test(value)) {
          violations.push(`"${term}" in: ${value}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('contains no non-allowed URLs', () => {
    const allStrings = [
      ...KNOWN_UNIT_GUIDE_IDS.flatMap((id) =>
        collectUnitStrings(getUnitGuide(id)!),
      ),
      ...KNOWN_ITEM_GUIDE_IDS.flatMap((id) =>
        collectItemStrings(getItemGuide(id)!),
      ),
    ];

    const violations: string[] = [];

    for (const value of allStrings) {
      for (const url of value.match(URL_PATTERN) ?? []) {
        const allowed = ALLOWED_URL_PREFIXES.some((prefix) =>
          url.startsWith(prefix),
        );

        if (!allowed) {
          violations.push(url);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
