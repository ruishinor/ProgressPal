import type { ProgrammeTerminology } from '../definition';

/**
 * The learner-facing name of the programme (owner decision 2026-10-11),
 * written once: the definition's title, the Hero path and every sentence
 * below take it from here. The stable programme ID, catalogue identity and
 * routes are unchanged.
 */
export const programvareutviklingDisplayName = 'Programvareutvikling 1';

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
  notesOnDemand: true,
  unitNoun: { lowercase: 'modul', capitalized: 'Modul' },
  // RPG identity (owner correction 2026-10-03): the guild and class are the
  // product's RPG identity, not the programme or a learner stage; the path
  // names the programme and its stage. Rank stays the shared rank engine's.
  rpgIdentity: {
    guildLabel: 'Code Knights',
    classLabel: 'Generalist',
    pathLabel: programvareutviklingDisplayName,
  },
  unitMapOrdinals: {
    's1-m01': '1',
    's1-m02': '2',
  },
  copy: {
    startupLoadingSummary: `Gjør klar den lokale profilen og innholdet i ${programvareutviklingDisplayName}.`,
    shellActiveSummary: `${programvareutviklingDisplayName} kjører lokalt. Økter, svar, framdrift, XP, prestasjoner og innsikt lagres på denne enheten. Du lager sikkerhetskopier selv.`,
    profileDescription:
      'Den lokale profilen din lagrer studiemål, tema, valg for redusert bevegelse og læringsidentiteten din på denne enheten.',
    dashboardDescription: `Framdriften din i ${programvareutviklingDisplayName} på denne enheten. Ingenting synkroniseres; du lager sikkerhetskopier selv.`,
    dashboardErrorDescription: `Denne siden viser framdriften din i ${programvareutviklingDisplayName} på denne enheten.`,
    courseMapEyebrow: `${programvareutviklingDisplayName} – moduler`,
    courseMapLoadingDescription:
      'Appen åpner modulene og den lagrede framdriften din.',
    courseMapErrorDescription:
      'Denne siden bruker de innebygde modulene og den lagrede framdriften din.',
    catalogueDescription: `Modul 1 og 2 i ${programvareutviklingDisplayName} er innebygd. Verktøyene i modulene forutsetter Windows (PowerShell, py-startprogrammet og VS Code).`,
    insightsDescription:
      'Studieaktiviteten din over tid. Lagrede økter og opptjent XP vises her. Dager og uker følger lokal tid på denne enheten.',
    insightsErrorDescription: `Denne siden viser studieaktiviteten din i ${programvareutviklingDisplayName}.`,
    rpgRequiredCompleteNote:
      'Alle påkrevde økter er markert som fullført lokalt. Det betyr ikke at du har vist at du mestrer ferdighetene.',
    rpgHeroProgressNote:
      'Lokal framdrift i ProgressPal. Det er ikke en vurdering av hva du kan.',
    rpgCourseBoundary:
      'Rangering, merker og profiloppsummeringer er lokale ProgressPal-tolkninger. De er ikke vurdering, karakter eller vitnemål.',
    settingsBoundaryTitle: 'Lagring og framdrift',
    settingsBoundaryText:
      'ProgressPal lagrer arbeidet ditt i denne nettleseren, på denne enheten. Du trenger ikke konto for å lære, ingenting synkroniseres, og appen samler ikke inn bruksstatistikk. Den valgfrie eksterne sikkerhetskopien (Alpha) er manuell: ingen data lastes opp før du selv starter en sikkerhetskopi. Du, nettleseren eller enheten kan tømme lagringen i nettleseren, så lag en sikkerhetskopi før du tømmer data eller bytter enhet.',
    officialResourceOpenLabel: 'Åpne ekstern ressurs',
    officialResourceReviewLabel: 'Se på ekstern ressurs igjen',
    sharedMilestoneRewardNote: 'delt med en annen oppgave',
  },
};
