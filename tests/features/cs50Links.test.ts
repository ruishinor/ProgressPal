import { describe, expect, it } from 'vitest';

import { getCs50ItemLink, getCs50UnitLink } from '@/features/course/cs50Links';

const EXPECTED_BASE = 'https://cs50.harvard.edu/x/';

/** Guard against accidental reintroduction of /x/2026/ in any URL. */
function assertNoBadBase(url: string) {
  expect(url).not.toContain('/x/2026/');
  expect(url).toContain(EXPECTED_BASE);
}

describe('getCs50UnitLink', () => {
  it('returns links for all main week units with correct URL shape', () => {
    for (let week = 0; week <= 10; week++) {
      const link = getCs50UnitLink(`week-${week}`);
      expect(link).not.toBeNull();
      assertNoBadBase(link!.url);
      expect(link!.url).toContain(`/weeks/${week}/`);
      expect(link!.label).toBeTruthy();
    }
  });

  it('returns a link for the artificial-intelligence unit', () => {
    const link = getCs50UnitLink('artificial-intelligence');
    expect(link).not.toBeNull();
    assertNoBadBase(link!.url);
    expect(link!.url).toContain('/weeks/ai/');
  });

  it('returns a link for the additional-practice unit', () => {
    const link = getCs50UnitLink('additional-practice');
    expect(link).not.toBeNull();
    assertNoBadBase(link!.url);
    expect(link!.url).toContain('/practice/');
  });

  it('returns a link for the final-project unit', () => {
    const link = getCs50UnitLink('final-project');
    expect(link).not.toBeNull();
    assertNoBadBase(link!.url);
    expect(link!.url).toContain('/project/');
  });

  it('returns null for unknown unit IDs', () => {
    expect(getCs50UnitLink('not-a-real-unit')).toBeNull();
    expect(getCs50UnitLink('')).toBeNull();
  });

  it('all returned URLs use https and the /x/ base, not /x/2026/', () => {
    const unitIds = [
      'week-0',
      'week-5',
      'week-10',
      'artificial-intelligence',
      'additional-practice',
      'final-project',
    ];
    for (const id of unitIds) {
      const url = getCs50UnitLink(id)!.url;
      expect(url).toMatch(/^https:\/\//);
      assertNoBadBase(url);
    }
  });
});

describe('getCs50ItemLink', () => {
  it('returns links for all problem set items with correct URL shape', () => {
    for (let week = 0; week <= 9; week++) {
      const link = getCs50ItemLink(`week-${week}-problem-set`);
      expect(link).not.toBeNull();
      assertNoBadBase(link!.url);
      expect(link!.url).toContain(`/psets/${week}/`);
      expect(link!.label).toBeTruthy();
    }
  });

  it('returns links for final-project item IDs', () => {
    const finalIds = [
      'final-project-build',
      'final-project-video-demo',
      'final-project-readme',
      'final-project-submit50',
      'final-project-gradebook-check',
    ];
    for (const id of finalIds) {
      const link = getCs50ItemLink(id);
      expect(link).not.toBeNull();
      assertNoBadBase(link!.url);
      expect(link!.url).toContain('/project/');
    }
  });

  it('returns null for items without a dedicated link', () => {
    expect(getCs50ItemLink('week-1-lecture')).toBeNull();
    expect(getCs50ItemLink('week-1-shorts')).toBeNull();
    expect(getCs50ItemLink('week-1-section')).toBeNull();
    expect(getCs50ItemLink('practice-debug')).toBeNull();
    expect(getCs50ItemLink('not-a-real-item')).toBeNull();
  });

  it('all returned URLs use https and the /x/ base, not /x/2026/', () => {
    const link = getCs50ItemLink('week-5-problem-set');
    expect(link!.url).toMatch(/^https:\/\//);
    assertNoBadBase(link!.url);
  });
});
