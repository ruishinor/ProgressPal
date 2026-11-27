import { sharedAchievementDefinitions } from '@/lib/achievements';
import { loadSameOriginText } from '@/lib/assets';
import {
  createContentAssetProvider,
  lessonEvaluatorContractVersion,
  parseProgrammeContentCatalogue,
  type CourseSeed,
} from '@/lib/domain';

import { validateProgrammeDefinition } from '../definition';
import { programvareutviklingLessonCopy } from '../programvareutvikling/lessonCopy';
import catalogueJson from './content/catalogue.json';
import { gitTerminology } from './terminology';

const content = parseProgrammeContentCatalogue(catalogueJson);
const catalogue: CourseSeed = {
  courseId: 'git-github-2026',
  title: 'Git & GitHub',
  dataVersion: 7, // M07 catalogue expansion; preserve M01–M06 IDs, contentVersion and progression.
  sourceCheckedDate: '2026-11-03',
  units: content.modules.map((module) => ({
    id: module.catalogueUnitId,
    title: module.title,
    type: 'module',
    order: module.order,
    sourceYear: 2026,
    required: true,
    items: module.missions.map((mission) => ({
      id: mission.itemId,
      title: mission.title,
      type: 'lesson',
      estimatedMinutes: mission.minutes,
      required: true,
      order: mission.order,
    })),
  })),
};
export const gitGithubDefinition = validateProgrammeDefinition({
  definitionKey: catalogue.courseId,
  catalogueId: catalogue.courseId,
  programmeId: 'git-github',
  title: 'Git & GitHub',
  catalogue,
  policy: {
    catalogueRules: { requiredUnitTypes: [], optionalItemsInUnitLength: false },
    xp: {
      completionAwards: [],
      statusMilestones: [],
      unitCompletionBonuses: [],
      itemMilestones: [],
    },
    workflow: { sequenceItemTypes: [], correctionItemTypes: [] },
    achievements: sharedAchievementDefinitions,
  },
  content: {
    language: 'nb',
    terminology: gitTerminology,
    externalResources: {
      allowedUrlPrefixes: ['https://git-scm.com/'],
      unitLinks: {
        'git-m01': {
          label: 'Installer Git for Windows',
          url: 'https://git-scm.com/install/windows',
        },
      },
      itemLinks: {},
    },
    studyGuides: { unitGuides: {}, itemGuides: {} },
    lessons: createContentAssetProvider({
      catalogue: content,
      loadText: loadSameOriginText,
      evaluatorContractVersion: lessonEvaluatorContractVersion,
      copy: {
        ...programvareutviklingLessonCopy,
        recordSelfReportLabel: 'Lagre svaret mitt',
        exerciseTypeLabels: {
          ...programvareutviklingLessonCopy.exerciseTypeLabels,
          evidence: 'Sjekk filvalget',
          reflect: 'Skriv med egne ord',
        },
        learnerWording: [],
        text: {
          ...programvareutviklingLessonCopy.text,
          minutes: 'Eget tempo',
          sourceLabel: 'Kommando – PowerShell 5.1',
          fileLabel: '{file}',
          output: 'Forventet utskrift (ikke en kommando):',
          noPointsSuffix: '',
          correct: 'Svaret passer',
          selfReported: '',
          privacy: 'Ikke lim inn passord, tokens eller private opplysninger.',
          recordedBody:
            'Svaret ditt er lagret. Du kan gå videre eller komme tilbake senere.',
          localCompletionNote:
            'Denne delen er markert som gjennomgått. Du kan åpne den igjen når du vil.',
          completionDisclaimer: '',
          whereNextModuleRule: '',
          whereNextMark: '',
        },
      },
    }),
  },
});
