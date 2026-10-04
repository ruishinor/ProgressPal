import {
  composeAchievementCatalogue,
  defineAchievement,
  sharedAchievementDefinitions,
  type AchievementDefinitionInput,
} from '@/lib/achievements';

/**
 * These achievements describe specific exercises and checkpoints of one
 * Programvareutvikling content version, so every definition is bound to it.
 * The evidence planner awards nothing when the live content version differs
 * (fail closed: an unlock must never describe content the learner did not
 * do). When the content version changes, re-review every definition below
 * against the new content and then bump this number; the unit test
 * `programvareutviklingAchievements.test.ts` fails until you do.
 *
 * Ids are global (unlocks are keyed by achievement id alone), so every
 * Programvareutvikling-specific id carries the `p2-` namespace.
 */
export const programvareutviklingAchievementContentVersion = 2;
export const programvareutviklingAchievementIdPrefix = 'p2-';

const contentVersion = programvareutviklingAchievementContentVersion;

const programmeDefinitions = [
  {
    id: 'p2-code-reader',
    title: 'Les før du kjører',
    description: 'Løs de kontrollerbare oppgavene i «Les og forutsi kode».',
    category: 'course_progress',
    ruleType: 'evidence_subjects_solved',
    ruleConfig: {
      contentVersion,
      triggerSourceId: 's1-m01-o05',
      subjectIds: [
        's1-m01-p06-e01',
        's1-m01-p06-e02',
        's1-m01-p06-e03',
        's1-m01-p06-e04',
        's1-m01-p06-e05',
        's1-m01-p06-e06',
        's1-m01-p06-e07',
        's1-m01-p06-e08',
        's1-m01-p06-e09',
        's1-m01-p06-e10',
        's1-m01-p06-e11',
        's1-m01-p06-e12',
      ],
    },
  },
  {
    id: 'p2-error-reader',
    title: 'Feilen på sporet',
    description: 'Løs de kontrollerbare oppgavene i «Feilmeldinger».',
    category: 'debugging',
    ruleType: 'evidence_subjects_solved',
    ruleConfig: {
      contentVersion,
      triggerSourceId: 's1-m01-o06',
      subjectIds: [
        's1-m01-p07-e01',
        's1-m01-p07-e02',
        's1-m01-p07-e03',
        's1-m01-p07-e04',
        's1-m01-p07-e05',
        's1-m01-p07-e06',
        's1-m01-p07-e07',
        's1-m01-p07-e08',
        's1-m01-p07-e09',
        's1-m01-p07-e10',
        's1-m01-p07-e11',
      ],
    },
  },
  {
    id: 'p2-foundation-checkpoint',
    title: 'Kjør, rett og lagre',
    description: 'Bestå modulsjekken i «Kom i gang: kjør, les feil, commit».',
    category: 'course_progress',
    ruleType: 'checkpoint_cleared',
    ruleConfig: {
      contentVersion,
      moduleId: 'S1-M01',
      triggerSourceId: 's1-m01',
    },
  },
  {
    id: 'p2-change-calculator',
    title: 'Veksel som stemmer',
    description: 'Løs krav-, test- og kodeoppgavene i «Lab: Vekselkalkulator».',
    category: 'course_progress',
    ruleType: 'evidence_subjects_solved',
    ruleConfig: {
      contentVersion,
      triggerSourceId: 's1-m02-lab2',
      subjectIds: [
        's1-m02-lab2-e01',
        's1-m02-lab2-e02',
        's1-m02-lab2-e03',
        's1-m02-lab2-e05',
        's1-m02-lab2-e07',
      ],
    },
  },
  {
    id: 'p2-coffee-change',
    title: 'Kaffekassa vokser',
    description:
      'Løs krav-, test- og kodeoppgavene i «Oppdrag: Kaffekassa vokser».',
    category: 'course_progress',
    ruleType: 'evidence_subjects_solved',
    ruleConfig: {
      contentVersion,
      triggerSourceId: 's1-m02-q01',
      subjectIds: [
        's1-m02-q01-e01',
        's1-m02-q01-e02',
        's1-m02-q01-e03',
        's1-m02-q01-e05',
        's1-m02-q01-e06',
        's1-m02-q01-e07',
      ],
    },
  },
  {
    id: 'p2-recall-foundations',
    title: 'Tilbake til grunnlaget',
    description:
      'Løs repetisjonsoppgavene fra forrige modul. Hjelp er tillatt.',
    category: 'course_progress',
    ruleType: 'evidence_subjects_solved',
    ruleConfig: {
      contentVersion,
      triggerSourceId: 's1-m02-ret',
      subjectIds: [
        's1-m02-ret-e01',
        's1-m02-ret-e02',
        's1-m02-ret-e03',
        's1-m02-ret-e04',
        's1-m02-ret-e05',
        's1-m02-ret-e06',
        's1-m02-ret-e07',
      ],
    },
  },
  {
    id: 'p2-values-checkpoint',
    title: 'Verdier i samspill',
    description: 'Bestå modulsjekken i «Verdier, typer og input».',
    category: 'course_progress',
    ruleType: 'checkpoint_cleared',
    ruleConfig: {
      contentVersion,
      moduleId: 'S1-M02',
      triggerSourceId: 's1-m02',
    },
  },
] as const satisfies readonly AchievementDefinitionInput[];

export const programvareutviklingAchievementDefinitions =
  programmeDefinitions.map((definition) => defineAchievement(definition));

export const programvareutviklingAchievements = composeAchievementCatalogue({
  programmeDefinitions: programvareutviklingAchievementDefinitions,
  order: [
    ...sharedAchievementDefinitions.map((definition) => definition.id),
    ...programvareutviklingAchievementDefinitions.map(
      (definition) => definition.id,
    ),
  ],
});
