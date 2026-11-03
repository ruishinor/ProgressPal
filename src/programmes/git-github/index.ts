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
  dataVersion: content.contentVersion,
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
        recordSelfReportLabel: 'Lagre egenrapport',
        learnerWording: [],
        text: {
          ...programvareutviklingLessonCopy.text,
          minutes: 'Eget tempo',
          sourceLabel: 'Kommando – PowerShell 5.1',
          fileLabel: '{file}',
          output: 'Forventet utskrift eller utdrag (ikke en kommando):',
          correct: 'Svaret passer',
          selfReported:
            'Bare den innsendte teksten sjekkes. ProgressPal kan ikke se repositoryet eller bekrefte at du har kjørt Git.',
          privacy:
            'Ingen passord, tokens, personopplysninger, private repoer eller personlige stier. Lagrede svar følger med sikkerhetskopier.',
          recordedBody:
            'Din egenrapport er lagret, uten vurdering av riktighet eller praktisk kompetanse. Ingen XP.',
          localCompletionNote:
            'Dette markerer delen som gjennomgått, uten XP. Svar og egenrapport er ikke bekreftet ekstern Git-praksis.',
          completionDisclaimer:
            'Gjennomgått innhold og innsendte svar dokumenterer ikke Git-mestring. Denne piloten gir ingen XP.',
          whereNextModuleRule:
            'Modulen vises som gjennomgått når du selv har markert alle fem delene fullført. Dette er framdrift, ikke en bestått ferdighetsprøve.',
        },
      },
    }),
  },
});
