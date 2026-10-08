import type { ProgrammeTerminology } from '../definition';

/**
 * Programvareutvikling terminology (Epic E). Programme-owned copy for the
 * shared surfaces, in Bokmål, authored by Epic E as app copy (not curriculum)
 * and pending native-language review with the rest of the programme. It
 * makes no competence claim for completed sessions and names no external
 * institution. The Windows toolchain statement is required by the
 * programme's delivery contract (DC-46, kernel gap K-7).
 *
 * The shell brand is the product name alone (owner decision OD-6,
 * 2026-10-03): no edition name of another programme shows while this
 * programme is active.
 */
export const programvareutviklingTerminology: ProgrammeTerminology = {
  shellBrand: 'ProgressPal',
  unitNoun: { lowercase: 'modul', capitalized: 'Modul' },
  // RPG identity (owner correction 2026-10-03): the guild and class are the
  // product's RPG identity, not the programme or a learner stage; the path
  // names the programme and its stage. Rank stays the shared rank engine's.
  rpgIdentity: {
    guildLabel: 'Code Knights',
    classLabel: 'Generalist',
    pathLabel: 'Programvareutvikling · Semester 1',
  },
  unitMapOrdinals: {
    's1-m01': '1',
    's1-m02': '2',
  },
  copy: {
    startupLoadingSummary:
      'Gjør klar den lokale profilen og innholdet i Programvareutvikling.',
    shellActiveSummary:
      'Programvareutvikling kjører lokalt. Økter, svar, framdrift, XP, prestasjoner og innsikt lagres på denne enheten. Du lager sikkerhetskopier selv.',
    profileDescription:
      'Den lokale profilen din lagrer studiemål, tema, valg for redusert bevegelse og læringsidentiteten din på denne enheten.',
    dashboardDescription:
      'Framdriften din i Programvareutvikling på denne enheten. Ingenting synkroniseres; du lager sikkerhetskopier selv.',
    dashboardErrorDescription:
      'Denne siden viser framdriften din i Programvareutvikling på denne enheten.',
    courseMapEyebrow: 'Programvareutvikling – moduler',
    courseMapLoadingDescription:
      'Appen åpner modulene og den lagrede framdriften din.',
    courseMapErrorDescription:
      'Denne siden bruker de innebygde modulene og den lagrede framdriften din.',
    catalogueDescription:
      'Modul 1 og 2 i semester 1 er innebygd. Verktøyene i modulene forutsetter Windows (PowerShell, py-startprogrammet og VS Code).',
    insightsDescription:
      'Studieaktiviteten din over tid. Lagrede økter og opptjent XP vises her. Dager og uker følger lokal tid på denne enheten.',
    insightsErrorDescription:
      'Denne siden viser studieaktiviteten din i Programvareutvikling.',
    rpgRequiredCompleteNote:
      'Alle påkrevde økter er markert som fullført lokalt. Det betyr ikke at du har vist at du mestrer ferdighetene.',
    rpgHeroProgressNote:
      'Lokal framdrift i ProgressPal. Det er ikke en vurdering av hva du kan.',
    rpgCourseBoundary:
      'Rangering, merker og profiloppsummeringer er lokale ProgressPal-tolkninger. De er ikke vurdering, karakter eller vitnemål.',
    officialResourceOpenLabel: 'Åpne ekstern ressurs',
    officialResourceReviewLabel: 'Se på ekstern ressurs igjen',
    sharedMilestoneRewardNote: 'delt med en annen oppgave',
  },
};
