import { describe, expect, it } from 'vitest';

import { sharedAchievementDefinitions } from '@/lib/achievements';
import type { ProgrammeDefinition } from '@/programmes';
import { createProgrammeRegistry, getProgrammeRegistry } from '@/programmes';
import { cs50x2026Definition } from '@/programmes/cs50x-2026';
import { validateProgrammeDefinition } from '@/programmes/definition';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { p2Index as manifest } from './p2Content';

/**
 * Epic E §3 items 1–3 and 17: Programvareutvikling is the second production
 * programme, registered through the existing validated registry with CS50x
 * still the explicit default. Its catalogue is exactly 2 `module` units and
 * 25 `lesson` items mapped from the authoritative M01/M02 source (recorded
 * in the committed snapshot manifest, SHA-256-bound to `pilot.json`), and its
 * policy is the minimum neutral valid policy.
 */

const pilotSha256 =
  '5ece045cc6bea695d729b5ca974f0da1f96a3eff715d1a8e2c348874f4380ddd';

const definition: ProgrammeDefinition = programvareutviklingDefinition;
const units = definition.catalogue.units;
const items = units.flatMap((unit) => unit.items);

describe('registration', () => {
  it('registers CS50x and Programvareutvikling, with CS50x the explicit default', () => {
    const registry = getProgrammeRegistry();

    expect(registry.definitions.map((entry) => entry.programmeId)).toEqual([
      'cs50x',
      'programvareutvikling',
    ]);
    expect(registry.defaultProgrammeId).toBe('cs50x');
    expect(registry.getDefault()).toBe(cs50x2026Definition);
    expect(registry.getByProgrammeId('programvareutvikling')).toBe(definition);
  });

  it('uses the CS50 identity convention: definition key equals catalogue identity', () => {
    expect(definition.programmeId).toBe('programvareutvikling');
    expect(definition.definitionKey).toBe('programvareutvikling-2026');
    expect(definition.catalogueId).toBe('programvareutvikling-2026');
    expect(definition.catalogue.courseId).toBe('programvareutvikling-2026');
    expect(definition.title).toBe('Programvareutvikling');
  });

  it('passes the real definition validator', () => {
    expect(validateProgrammeDefinition(definition)).toBe(definition);
  });

  /** A valid copy of the real definition under another identity. */
  function renamedCopy(
    identity: string,
    renameItem: (itemId: string) => string,
    withLessons: boolean,
  ): ProgrammeDefinition {
    const renamedUnits = units.map((unit) => ({
      ...unit,
      id: `${identity}-${unit.id}`,
      items: unit.items.map((item) => ({ ...item, id: renameItem(item.id) })),
    }));

    return {
      ...definition,
      definitionKey: identity,
      programmeId: identity,
      catalogueId: identity,
      catalogue: {
        ...definition.catalogue,
        courseId: identity,
        units: renamedUnits,
      },
      content: {
        ...definition.content,
        lessons: withLessons
          ? {
              ...definition.content.lessons!,
              programmeId: identity,
              lessonItemIds: renamedUnits.flatMap((unit) =>
                unit.items.map((item) => item.id),
              ),
            }
          : undefined,
        terminology: {
          ...definition.content.terminology,
          unitMapOrdinals: Object.fromEntries(
            renamedUnits.map((unit, index) => [unit.id, String(index + 1)]),
          ),
        },
      },
    };
  }

  it('fails closed when another definition reuses a Programvareutvikling lesson item ID', () => {
    const colliding = renamedCopy(
      'collision-test',
      (itemId) => (itemId === 's1-m01-o01' ? itemId : `collision-${itemId}`),
      false,
    );

    expect(() =>
      createProgrammeRegistry({
        defaultProgrammeId: 'cs50x',
        definitions: [cs50x2026Definition, definition, colliding],
      }),
    ).toThrow(/course item "s1-m01-o01"/);
  });

  it('fails closed when another definition reuses Programvareutvikling exercise subject IDs', () => {
    const colliding = renamedCopy(
      'subject-collision',
      (itemId) => `subject-collision-${itemId}`,
      true,
    );

    expect(() =>
      createProgrammeRegistry({
        defaultProgrammeId: 'cs50x',
        definitions: [cs50x2026Definition, definition, colliding],
      }),
    ).toThrow(/exercise subject "s1-m01-p01-e01"/);
  });
});

describe('catalogue mapping (2 modules, 25 lessons, from the bound source)', () => {
  it('binds the snapshot to the authoritative pilot source hash', () => {
    expect(manifest.source.sha256).toBe(pilotSha256);
    expect(manifest.source.bytes).toBe(1_121_807);
    expect(manifest.programmeId).toBe('programvareutvikling');
  });

  it('maps exactly two module units in source order', () => {
    expect(
      units.map((unit) => [unit.id, unit.type, unit.order, unit.required]),
    ).toEqual([
      ['s1-m01', 'module', 0, true],
      ['s1-m02', 'module', 1, true],
    ]);
    expect(units.map((unit) => unit.title)).toEqual(
      manifest.modules.map((module) => module.title),
    );
    expect(units[0]!.title).toBe('Kom i gang: kjør, les feil, commit');
    expect(units[1]!.title).toBe('Verdier, typer og input');
  });

  it('maps 25 lesson items (12 and 13) with deterministic lowercase IDs in source order', () => {
    expect(units.map((unit) => unit.items.length)).toEqual([12, 13]);
    expect(items.every((item) => item.type === 'lesson')).toBe(true);

    const missions = manifest.modules.flatMap((module) => module.missions);
    expect(items.map((item) => item.id)).toEqual(
      missions.map((mission) => mission.missionId.toLowerCase()),
    );
    expect(items.map((item) => item.title)).toEqual(
      missions.map((mission) => mission.title),
    );
    expect(new Set(items.map((item) => item.id)).size).toBe(25);
  });

  it('keeps 24 required lessons and the one optional reinforcement mission', () => {
    expect(
      items.filter((item) => !item.required).map((item) => item.id),
    ).toEqual(['s1-m02-o08']);
  });

  it('uses the authored minutes, showing the optional mission at its optional length', () => {
    const missions = manifest.modules.flatMap((module) => module.missions);

    for (const [index, mission] of missions.entries()) {
      const expected =
        mission.surface === 'reinforcement'
          ? (mission.optionalMinutes ?? mission.minutes)
          : mission.minutes;
      expect(items[index]!.estimatedMinutes, mission.missionId).toBe(expected);
    }
    expect(
      items
        .filter((item) => item.required)
        .reduce((total, item) => total + item.estimatedMinutes, 0),
    ).toBe(1_980);
  });

  it('has no ID collision with the CS50 catalogue', () => {
    const cs50Ids = new Set([
      ...cs50x2026Definition.catalogue.units.map((unit) => unit.id),
      ...cs50x2026Definition.catalogue.units.flatMap((unit) =>
        unit.items.map((item) => item.id),
      ),
    ]);

    for (const id of [
      ...units.map((unit) => unit.id),
      ...items.map((item) => item.id),
    ]) {
      expect(cs50Ids.has(id), id).toBe(false);
    }
  });
});

describe('minimum neutral valid policy (§3 item 17)', () => {
  it('awards no XP for opening, reading or completing lessons', () => {
    expect(definition.policy.xp).toEqual({
      completionAwards: [],
      statusMilestones: [],
      unitCompletionBonuses: [],
      itemMilestones: [],
    });
  });

  it('uses no CS50 submission workflow and requires no unit type', () => {
    expect(definition.policy.workflow).toEqual({
      sequenceItemTypes: [],
      correctionItemTypes: [],
    });
    expect(definition.policy.catalogueRules.requiredUnitTypes).toEqual([]);
  });

  it('carries the six shared achievements followed by the seven p2- evidence achievements', () => {
    const ids = definition.policy.achievements.map((entry) => entry.id);

    expect(ids.slice(0, 6)).toEqual(
      sharedAchievementDefinitions.map((entry) => entry.id),
    );
    expect(ids).toHaveLength(13);
    expect(ids.slice(6).every((id) => id.startsWith('p2-'))).toBe(true);
  });

  it('keeps optional lesson minutes out of module length', () => {
    expect(definition.policy.catalogueRules.optionalItemsInUnitLength).toBe(
      false,
    );
    expect(
      cs50x2026Definition.policy.catalogueRules.optionalItemsInUnitLength,
    ).toBe(true);
  });
});

describe('programme-owned content and language identity', () => {
  it('declares Bokmål for the programme and English for CS50, in metadata', () => {
    expect(definition.content.language).toBe('nb');
    expect(cs50x2026Definition.content.language).toBe('en');
    expect(definition.content.lessons?.language).toBe('nb');
    expect(definition.content.lessons?.technicalLanguage).toBe('en');
  });

  it('links nothing and declares no external host', () => {
    expect(definition.content.externalResources).toEqual({
      allowedUrlPrefixes: [],
      unitLinks: {},
      itemLinks: {},
    });
  });

  it('authors its terminology in Bokmål without CS50 wording', () => {
    const terminology = definition.content.terminology;

    expect(terminology.unitNoun).toEqual({
      lowercase: 'modul',
      capitalized: 'Modul',
    });
    expect(terminology.unitMapOrdinals).toEqual({
      's1-m01': '1',
      's1-m02': '2',
    });

    for (const [key, text] of Object.entries(terminology.copy)) {
      expect(text, key).not.toMatch(
        /CS50|Harvard|edX|OpenCourseWare|\bweek\b/i,
      );
    }
    for (const text of Object.values(terminology.rpgIdentity)) {
      expect(text).not.toMatch(/CS50/i);
    }
  });

  // Owner correction 2026-10-03: the guild and class are the product's RPG
  // identity (not the programme name or a learner stage); the path names the
  // programme and its stage.
  it('uses the owner-given RPG identity: Code Knights, Generalist, Programvareutvikling · Semester 1', () => {
    expect(definition.content.terminology.rpgIdentity).toEqual({
      guildLabel: 'Code Knights',
      classLabel: 'Generalist',
      pathLabel: 'Programvareutvikling · Semester 1',
    });
  });

  it('serves every lesson item through the content provider and nothing else', () => {
    expect(definition.content.lessons?.programmeId).toBe(
      'programvareutvikling',
    );
    expect([...(definition.content.lessons?.lessonItemIds ?? [])]).toEqual(
      items.map((item) => item.id),
    );
    expect(cs50x2026Definition.content.lessons).toBeUndefined();
  });
});

describe('external-resource validation stays strict', () => {
  it('still rejects a link when no URL prefix is declared', () => {
    expect(() =>
      validateProgrammeDefinition({
        ...definition,
        content: {
          ...definition.content,
          externalResources: {
            allowedUrlPrefixes: [],
            unitLinks: {
              's1-m01': { label: 'Ekstern', url: 'https://example.test/x' },
            },
            itemLinks: {},
          },
        },
      }),
    ).toThrow(/outside the allowed prefixes/);
  });
});
