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
  unitMapOrdinals: { 'git-m01': '1' },
  copy: {
    startupLoadingSummary:
      'Gjør klar Git & GitHub og den lokale framdriften din.',
    shellActiveSummary:
      'Git & GitHub: lær fra null, øv med virkelige filer og ta vare på egne sikkerhetskopier.',
    profileDescription:
      'Den samme lokale profilen brukes på tvers av programmer.',
    dashboardDescription:
      'Framdriften din i Git & GitHub. Piloten gir ingen XP.',
    dashboardErrorDescription:
      'Git & GitHub bruker den lagrede framdriften på denne enheten.',
    courseMapEyebrow: 'Git & GitHub – begynn her',
    courseMapLoadingDescription: 'Åpner den første Git-modulen.',
    courseMapErrorDescription: 'Modulen og framdriften kunne ikke vises.',
    catalogueDescription:
      'Begynn med «Start her: hvorfor bruke Git?». Fem tilgjengelige deler tar deg fra null til en bevisst lokal commit. Veikartet i første del forklarer senere temaer; de er ikke leksjoner ennå. Windows PowerShell 5.1, uten GitHub-konto.',
    insightsDescription:
      'Studieaktivitet over tid. Dette dokumenterer aktivitet, ikke Git-kompetanse.',
    insightsErrorDescription: 'Innsikt leser lagrede studieøkter og framdrift.',
    rpgRequiredCompleteNote:
      'Du har markert de fem tilgjengelige delene gjennomgått. Videre Git- og GitHub-innhold er planlagt.',
    rpgHeroProgressNote:
      'Gjennomgåtte deler og egenrapport er ikke bekreftet praktisk ferdighet. Piloten gir ingen XP.',
    settingsBoundaryTitle: 'Git-praksis og lagring',
    settingsBoundaryText:
      'Appen lagrer svar og framdrift i nettleseren. Git-øvelsen bruker en separat mappe. Ta vare på begge; eksport fra appen tar ikke kopi av øvingsmappen. Eventuell manuell fjernbackup er et eget valg.',
    officialResourceOpenLabel: 'Åpne Git-dokumentasjonen (krever nett)',
    officialResourceReviewLabel: 'Les Git-dokumentasjonen (krever nett)',
    sharedMilestoneRewardNote: 'delt delmål',
  },
};
