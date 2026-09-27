import { describe, expect, it } from 'vitest';

import { getCs50ItemLink, getCs50UnitLink } from '@/features/course/cs50Links';
import { getItemGuide, getUnitGuide } from '@/features/course/guideContent';
import {
  getActiveProgrammeDefinition,
  getProgrammeDefinition,
  listRegisteredDefinitionKeys,
  type ProgrammeDefinition,
} from '@/programmes';
import { validateProgrammeDefinition } from '@/programmes/definition';
import { bundledCourseSeed } from '@/seed';

/**
 * Epic C / C2 registry and definition boundary (C0 programme definition
 * contract §2–§3). The C1 link, guide and identity oracles
 * (`tests/preservation`) pin the content values; these tests pin ownership,
 * identity and fail-closed behaviour.
 */

describe('programme registry', () => {
  it('registers exactly one production definition, keyed cs50x-2026', () => {
    expect(listRegisteredDefinitionKeys()).toEqual(['cs50x-2026']);
    expect(getActiveProgrammeDefinition()).toBe(
      getProgrammeDefinition('cs50x-2026'),
    );
  });

  it('keys the CS50 definition by its catalogue identity and references the bundled catalogue in place', () => {
    const definition = getActiveProgrammeDefinition();

    expect(definition.definitionKey).toBe('cs50x-2026');
    expect(definition.catalogueId).toBe(definition.definitionKey);
    expect(definition.catalogue).toBe(bundledCourseSeed);
    expect(definition.catalogue.courseId).toBe(definition.catalogueId);
    expect(definition.title).toBe(bundledCourseSeed.title);
  });

  it('fails closed for an unregistered definition key', () => {
    for (const key of ['', 'cs50x', 'CS50X-2026', 'cs50x-2027']) {
      expect(() => getProgrammeDefinition(key)).toThrow(
        /Unregistered programme definition key/,
      );
    }
  });
});

describe('compatibility entrypoints', () => {
  it('serve links and guides owned by the active definition', () => {
    const { externalResources, studyGuides } =
      getActiveProgrammeDefinition().content;

    expect(getCs50UnitLink('week-0')).toBe(
      externalResources.unitLinks['week-0'],
    );
    expect(getCs50ItemLink('week-0-problem-set')).toBe(
      externalResources.itemLinks['week-0-problem-set'],
    );
    expect(getUnitGuide('week-1')).toBe(studyGuides.unitGuides['week-1']);
    expect(getItemGuide('week-0-lecture')).toBe(
      studyGuides.itemGuides['week-0-lecture'],
    );
    expect(getCs50UnitLink('not-a-unit')).toBeNull();
    expect(getItemGuide('not-an-item')).toBeNull();
  });

  it('declares the official CS50x prefix, and every link stays inside it', () => {
    const { allowedUrlPrefixes, unitLinks, itemLinks } =
      getActiveProgrammeDefinition().content.externalResources;

    expect(allowedUrlPrefixes).toEqual(['https://cs50.harvard.edu/x/']);
    for (const link of [
      ...Object.values(unitLinks),
      ...Object.values(itemLinks),
    ]) {
      expect(link.url.startsWith('https://cs50.harvard.edu/x/')).toBe(true);
    }
  });
});

describe('definition validation fails closed', () => {
  const valid = getActiveProgrammeDefinition();

  function variant(
    change: (content: {
      externalResources: ProgrammeDefinition['content']['externalResources'];
      studyGuides: ProgrammeDefinition['content']['studyGuides'];
      terminology: ProgrammeDefinition['content']['terminology'];
    }) => void,
    top: Partial<ProgrammeDefinition> = {},
  ): ProgrammeDefinition {
    const content = {
      externalResources: {
        ...valid.content.externalResources,
        unitLinks: { ...valid.content.externalResources.unitLinks },
        itemLinks: { ...valid.content.externalResources.itemLinks },
      },
      studyGuides: {
        unitGuides: { ...valid.content.studyGuides.unitGuides },
        itemGuides: { ...valid.content.studyGuides.itemGuides },
      },
      terminology: {
        ...valid.content.terminology,
        unitMapOrdinals: { ...valid.content.terminology.unitMapOrdinals },
        copy: { ...valid.content.terminology.copy },
      },
    };
    change(content);

    return { ...valid, content, ...top };
  }

  it('accepts the registered CS50 definition', () => {
    expect(validateProgrammeDefinition(valid)).toBe(valid);
  });

  it.each([
    [
      'a link keyed to a unit outside the catalogue',
      variant((content) => {
        (content.externalResources.unitLinks as Record<string, unknown>)[
          'week-99'
        ] = { label: 'Week 99', url: 'https://cs50.harvard.edu/x/weeks/99/' };
      }),
      /unit link "week-99" is not a catalogue unit/,
    ],
    [
      'a link outside the declared URL prefixes',
      variant((content) => {
        (content.externalResources.itemLinks as Record<string, unknown>)[
          'week-0-lecture'
        ] = { label: 'Elsewhere', url: 'https://example.com/lecture' };
      }),
      /item link "week-0-lecture" URL is outside the allowed prefixes/,
    ],
    [
      'a guide that embeds a URL',
      variant((content) => {
        (content.studyGuides.unitGuides as Record<string, unknown>)['week-2'] =
          { summary: 'See https://cs50.harvard.edu/x/weeks/2/' };
      }),
      /unit guide "week-2" embeds a URL/,
    ],
    [
      'a guide keyed to an item outside the catalogue',
      variant((content) => {
        (content.studyGuides.itemGuides as Record<string, unknown>)[
          'not-an-item'
        ] = { summary: 'Orphaned guide.' };
      }),
      /item guide "not-an-item" is not a catalogue item/,
    ],
    [
      'a catalogue identity that does not match the catalogue',
      variant(() => undefined, { catalogueId: 'cs50x-2027' }),
      /does not match catalogue courseId "cs50x-2026"/,
    ],
    [
      'an empty guide summary',
      variant((content) => {
        (content.studyGuides.unitGuides as Record<string, unknown>)['week-0'] =
          { summary: '   ' };
      }),
      /validation failed/,
    ],
    [
      'a catalogue unit without a map ordinal label',
      variant((content) => {
        delete (content.terminology.unitMapOrdinals as Record<string, string>)[
          'week-3'
        ];
      }),
      /catalogue unit "week-3" has no map ordinal label/,
    ],
    [
      'a map ordinal keyed to a unit outside the catalogue',
      variant((content) => {
        (content.terminology.unitMapOrdinals as Record<string, string>)[
          'week-99'
        ] = '99';
      }),
      /map ordinal "week-99" is not a catalogue unit/,
    ],
    [
      'a missing programme copy string',
      variant((content) => {
        delete (content.terminology.copy as Partial<Record<string, string>>)
          .courseMapEyebrow;
      }),
      /validation failed/,
    ],
    [
      'an empty unit noun',
      variant((content) => {
        content.terminology = {
          ...content.terminology,
          unitNoun: { lowercase: ' ', capitalized: 'Week' },
        };
      }),
      /validation failed/,
    ],
  ])('rejects %s', (_label, definition, message) => {
    expect(() => validateProgrammeDefinition(definition)).toThrow(message);
  });
});
