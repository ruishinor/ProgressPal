import type { ProgrammeTerminology } from '../definition';

export const gitTerminology: ProgrammeTerminology = {
  shellBrand: 'ProgressPal',
  campaignOpensAtTask: true,
  unitNoun: { lowercase: 'modul', capitalized: 'Modul' },
  rpgIdentity: {
    guildLabel: 'Code Knights',
    classLabel: 'Generalist',
    pathLabel: 'Git & GitHub',
  },
  unitMapOrdinals: {
    'git-m01': '1',
    'git-m02': '2',
    'git-m03': '3',
    'git-m04': '4',
  },
  copy: {
    startupLoadingSummary:
      'Gjør klar Git & GitHub og den lokale framdriften din.',
    shellActiveSummary:
      'Git & GitHub: lær fra null, øv med virkelige filer og ta vare på egne sikkerhetskopier.',
    profileDescription:
      'Den samme lokale profilen brukes på tvers av programmer.',
    dashboardDescription:
      'Følg med på hvilke Git-leksjoner du har gått gjennom.',
    dashboardErrorDescription:
      'Git & GitHub bruker den lagrede framdriften på denne enheten.',
    courseMapEyebrow: 'Git & GitHub – begynn her',
    courseMapLoadingDescription: 'Åpner den første Git-modulen.',
    courseMapErrorDescription: 'Modulen og framdriften kunne ikke vises.',
    catalogueDescription:
      'Begynn med hvorfor utviklere trenger Git. M01 har fem leksjoner om commits, M02 har seks om historikk og feilretting, og M03 har seks om branches og merge, og M04 har sju om GitHub og remotes. M05–M07 er planlagt.',
    insightsDescription: 'Se når du har arbeidet med leksjonene.',
    insightsErrorDescription: 'Innsikt leser lagrede studieøkter og framdrift.',
    rpgRequiredCompleteNote:
      'Du har gått gjennom de tilgjengelige Git-leksjonene i M01–M04. M05–M07 er planlagt.',
    rpgHeroProgressNote:
      'Her finner du leksjonene og framdriften din. Du kan øve på nytt når som helst.',
    settingsBoundaryTitle: 'Git-praksis og lagring',
    settingsBoundaryText:
      'Appen lagrer svar og framdrift i nettleseren. Git-øvelsen bruker en separat mappe. Ta vare på begge; eksport fra appen tar ikke kopi av øvingsmappen. Eventuell manuell fjernbackup er et eget valg.',
    officialResourceOpenLabel: 'Åpne Git-dokumentasjonen (krever nett)',
    officialResourceReviewLabel: 'Les Git-dokumentasjonen (krever nett)',
    sharedMilestoneRewardNote: 'delt delmål',
  },
};
