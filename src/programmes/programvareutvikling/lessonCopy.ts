import type { LessonUiCopy } from '@/lib/domain';

/**
 * Bokmål interface copy of the lesson surface for Programvareutvikling.
 *
 * Labels and instructions that the authoring workspace's own learner
 * renderer already defines (`04_WORKING/pilot/render_learner.js`: surface,
 * unit-kind, callout and exercise-type labels, phase, recap, output,
 * diagnosis, program-example and how-to-answer wording) are copied verbatim.
 * The interactive strings (submit, pending, results, hints, retry, honest
 * unavailable states) are app copy authored by Epic E; like all Programme #2
 * text they await native-language review. Templates use {name} placeholders.
 */
export const programvareutviklingLessonCopy: LessonUiCopy = {
  surfaceLabels: {
    mission: 'Økt',
    lab: 'Lab',
    quest: 'Oppdrag',
    repetition: 'Repetisjon',
    checkpoint: 'Modulsjekk',
    reinforcement: 'Ekstra øving (valgfri)',
  },
  unitKindLabels: {
    L: 'Leksjon',
    W: 'Gjennomgått eksempel',
    P: 'Øvelser',
    B: 'Lab',
    Q: 'Oppdrag',
    R: 'Repetisjon',
    K: 'Modulsjekk',
  },
  calloutLabels: {
    tip: 'Tips',
    'pass-paa': 'Pass på',
    merk: 'Merk',
    veikart: 'Veikart',
    hjelp: 'Hjelp',
    norsk: 'Norsk',
  },
  exerciseTypeLabels: {
    mcq: 'Flervalg',
    predict: 'Forutsi utskriften',
    trace: 'Verditabell',
    program: 'Skriv eller endre program',
    fill: 'Fyll inn',
    sort: 'Sorter',
    cmd: 'Skriv kommandoen',
    evidence: 'Lim inn utskrift fra din maskin',
    diagnose: 'Les feilmeldingen',
    assemble: 'Sett sammen',
    testtable: 'Lag testtabell',
    reflect: 'Refleksjon',
    checklist: 'Sjekkliste',
  },
  text: {
    goalLabel: 'Mål:',
    minutes: 'ca. {minutes} min',
    optionalSuffix: '(valgfri)',
    noPointsSuffix: '(ingen poeng)',
    exerciseHeading: 'Oppgave {n}',
    howPrefix: 'Slik svarer du:',
    phaseIntro:
      'Denne delen er delt i {count} etapper. Du kan ta pause mellom etappene og fortsette senere.',
    phaseHeading: 'Etappe {n} av {count}: {title}',
    phaseMinutes: '(ca. {minutes} min). Her kan du ta pause.',
    nextPhase: 'Neste etappe',
    previousPhase: 'Forrige etappe',
    recapCan: 'Du har gått gjennom dette. Målet er at du kan:',
    recapNext: 'Neste:',
    output: 'Utskrift:',
    errorOutput: 'Feilmelding:',
    pythonAnswered: 'Python svarte:',
    unverifiedTranscript: 'Kilde: {source}',
    fileLabel: '# {file}',
    selectAll: 'Velg alle som passer.',
    traceInstruction:
      'Fyll ut tabellen med verdien til {vars} etter hver linje (skriv - hvis variabelen ikke finnes ennå).',
    traceLine: 'Linje',
    categoryLabel: 'Kategori',
    matchInstruction:
      'Koble hvert utsagn til riktig svar. Hvert svar kan bare brukes én gang, og noen svar passer ikke til noe.',
    orderInstruction:
      'Velg ett steg om gangen, i den rekkefølgen de kommer. Du kan fjerne et steg og velge det på nytt.',
    positionLabel: 'Plass',
    chooseOption: 'Velg …',
    diagnoseIntro: 'Svar på tre ting:',
    diagnoseType: '1. Hvilken feiltype?',
    diagnoseLine: '2. Hvilken linje?',
    diagnoseCause: '3. Hva er årsaken? Velg ett alternativ:',
    programExamples:
      'Eksempler på kjøring som sjekken også bruker ({compare}; ↵ betyr Enter):',
    compareLastLine: 'siste linje i samtalen sammenlignes',
    compareAll: 'hele samtalen sammenlignes',
    programToFix: 'Programmet som skal rettes:',
    programToChange:
      'Programmet du skal endre (det kjører, men gjør ikke det oppgaven ber om):',
    programRun: 'Dette skjer når det kjøres:',
    programRunWithInput: 'Dette skjer når det kjøres med inndata «{stdin}»:',
    cmdHow:
      'Skriv kommandoen som svar. Den kjøres ikke på maskinen din; den sammenlignes bare med riktig form.',
    predictHowNoInput: 'Skriv hver linje for seg.',
    predictHowInput:
      'Programmet leser inndata. Brukeren skriver «{stdin}» og trykker Enter. Skriv alt som står på skjermen, også spørsmålene og det brukeren skrev, hver linje for seg.',
    predictHowInputMulti:
      'Programmet leser inndata. Brukeren skriver «{stdin}» (↵ betyr at brukeren trykker Enter etter hvert svar). Skriv alt som står på skjermen, også spørsmålene og det brukeren skrev, hver linje for seg.',
    testtableHow:
      'Kolonner: {fields} | Forventet utskrift. Minst {minRows} rader. Forventet utskrift regner du ut selv, for hånd. Den automatiske sjekken regner ut riktig svar for hver rad og ser også at tabellen din har variasjon: {coverage}.',
    expectedOutputColumn: 'Forventet utskrift',
    addRow: 'Legg til rad',
    removeRow: 'Fjern rad {n}',
    answerLabel: 'Svaret ditt',
    submit: 'Sjekk svaret',
    saving: 'Lagrer og sjekker svaret …',
    hintButton: 'Vis hint {n} av {count}',
    hintHeading: 'Hint {n}',
    resultLabel: 'Resultat',
    correct: 'Riktig',
    incorrect: 'Ikke riktig ennå',
    notEvaluable: 'Svaret kunne ikke leses',
    evaluatorError: 'Sjekken kunne ikke fullføres',
    recorded: 'Lagret',
    notEvaluableBody:
      'Den automatiske sjekken klarte ikke å lese svaret. Det teller ikke mot deg.',
    evaluatorErrorBody:
      'Dette er et problem i appen, ikke i svaret ditt. Svaret er lagret og teller verken for eller mot deg.',
    recordedBody: 'Svaret er lagret på denne enheten. Det gir ingen poeng.',
    retry: 'Prøv igjen',
    gateNoRetry:
      'Denne oppgaven i modulsjekken kan ikke prøves på nytt ennå, fordi regelen for nye forsøk ikke er bestemt.',
    runtimeUnavailable:
      'Automatisk kjøring av Python er ikke tilgjengelig i denne nettleseren akkurat nå. Du kan skrive og kjøre programmet på din egen maskin, men appen kan ikke sjekke det her.',
    runtimeLoading: 'Gjør klar Python for den automatiske sjekken …',
    selfReported:
      'ProgressPal kan sjekke teksten du limer inn, men kan ikke se maskinen din.',
    privacy:
      'Lim bare inn utskriften fra kommandoen. Ikke lim inn passord eller nøkler.',
    incomplete: 'Fyll ut hele svaret før du sjekker det.',
    tooLarge: 'Svaret er for langt. Gjør det kortere og prøv igjen.',
    malformed:
      'Svaret har en form appen ikke kan lagre. Sjekk feltene og prøv igjen.',
    readOnly:
      'Denne fanen kan bare vise innhold. Lukk den andre ProgressPal-fanen for å svare eller se hint.',
    notSaved:
      'Svaret ble ikke lagret, så det ble heller ikke sjekket. Prøv igjen.',
    hintNotSaved:
      'Hintet ble ikke vist, fordi bruken av hint ikke kunne lagres. Prøv igjen.',
    unresolvedPending:
      'Svaret ditt er lagret, men sjekken er ikke ferdig. Den fullføres så snart det er mulig.',
    resumeHeading: 'Fortsett der du slapp',
    resumeReminder: 'Sist: {can}',
    continue: 'Fortsett',
    lessonLoading: 'Laster økta …',
    lessonUnavailable:
      'Innholdet i denne økta er ikke tilgjengelig akkurat nå.',
    lessonVersionMismatch:
      'Innholdet passer ikke med denne versjonen av appen. Last siden inn på nytt.',
    lessonInvalid:
      'Innholdet i denne økta kunne ikke kontrolleres, og vises derfor ikke.',
    checkpointNotice:
      'Svarene dine i modulsjekken lagres. Appen viser ikke om du har bestått eller ikke. Regelen for hvordan oppgavene avgjør det, er ikke fastsatt ennå.',
    checkpointHow:
      'Modulsjekken er fullført når du har svart riktig på hver oppgave som gir poeng, uten hint og uten å gå tilbake til leksjonene. Svarer du feil, kan du prøve igjen.',
    checkpointProgress: 'Fullførte deler: {done} av {count}.',
    checkpointCleared:
      'Modulsjekken er bestått: du har svart riktig uten hjelp i alle delene.',
    checkpointRuntimeNotice:
      'Noen oppgaver i denne modulsjekken trenger automatisk kjøring av Python, som ikke er tilgjengelig i denne nettleseren akkurat nå. Modulsjekken kan derfor ikke fullføres her.',
    closedLessonNotice:
      'Svar uten å slå opp i leksjonene. Det er slik du ser hva du husker.',
    alreadyCorrect:
      'Du har svart riktig på denne før, så den teller ikke som ny repetisjon.',
    remediation: 'Les om dette igjen: {title}',
    xpEarned: '+{xp} XP',
    completionDisclaimer:
      'Fullført betyr at du har gått gjennom økta. Det betyr ikke at du har vist at du mestrer ferdighetene.',
    // Shown at the manual completion action of a lesson. Marking a lesson
    // complete stores its status only: XP is earned by solving its tasks.
    localCompletionNote:
      'Dette markerer økta som gjennomgått. Det gir ikke XP og betyr ikke at ferdigheten er mestret. XP tjenes i oppgavene.',
    afterSubmitExplanation: 'Forklaring',
    revealedTests: 'Testene du ikke så før du leverte:',
    copyCode: 'Kopier',
    copied: 'Kopiert',
    blankLabel: 'Felt {n}',
    traceCellLabel: '{name} etter linje {line}',
    rowLabel: 'Rad {n}',
    sortOrderLabel: 'Sett i rekkefølge',
    sortMatchLabel: 'Koble',
    orderListLabel: 'Din rekkefølge',
    orderPoolLabel: 'Steg å plassere',
    orderEmptySlot: 'Tom plass',
    orderAdd: 'Legg til: {item}',
    orderRemove: 'Fjern: {item}',
    orderRemoveButton: 'Fjern',
    orderPlaced: '{item} er satt på plass {n}.',
    orderRemoved: '{item} er fjernet.',
    orderRight: 'Riktig plass',
    orderWrong: 'Feil plass',
    orderPlacedCount: 'Plassert: {placed} av {total}',
    orderMoveInstruction:
      'Med pilene flytter du et plassert steg én plass opp eller ned.',
    orderMoveUp: 'Flytt opp: {item}',
    orderMoveDown: 'Flytt ned: {item}',
    orderMoveUpButton: '↑',
    orderMoveDownButton: '↓',
    orderMoved: '{item} er flyttet til plass {n}.',
    progressCheckButton: 'Sjekk så langt',
    progressCheckRule:
      'Underveis kan du sjekke to ganger hvor mange av de plasserte stegene som står på riktig plass. Sjekken sier ikke hvilke, og den teller ikke som et svar.',
    progressCheckFirst: 'Første sjekk: når minst {n} steg er plassert.',
    progressCheckSecond:
      'Andre sjekk: når minst {n} steg er plassert og minst {changed} plasser har et annet steg enn ved første sjekk.',
    progressCheckLeft: 'Sjekker igjen: {left} av {max}.',
    progressCheckNearlyDone:
      'Når høyst ett steg gjenstår, sjekker du hele svaret med «Sjekk svaret».',
    progressCheckUsed:
      'Du har brukt begge sjekkene. Sjekk hele svaret med «Sjekk svaret» når du er klar.',
    progressCheckResult:
      'Da du sjekket, sto {correct} av {placed} plasserte steg på riktig plass.',
    progressCheckAllRight:
      'Så langt stemmer rekkefølgen. Fortsett med neste steg.',
    progressCheckSomeRight:
      'Les rekkefølgen fra start: følger hvert steg naturlig etter det forrige? Flytt det som ikke passer.',
    progressCheckNoneRight:
      'Begynn med det som må skje aller først, og bygg videre derfra.',
    matchRight: 'Riktig kobling',
    matchWrong: 'Feil kobling',
    whereNextHeading: 'Slik går du videre',
    whereNextEnd: 'Du har kommet til slutten av «{title}».',
    whereNextPosition: 'Dette er del {n} av {count} i modulen «{module}».',
    whereNextNext: 'Neste del:',
    whereNextLastInModule: 'Dette var siste del av modulen.',
    whereNextNextModule: 'Neste modul er «{module}». Første del:',
    whereNextNoMore:
      'Dette er det siste innholdet som er tilgjengelig i programmet akkurat nå. Flere moduler er ikke tilgjengelige ennå.',
    whereNextModuleRule:
      'Campaign-kartet viser modulen som fullført først når alle obligatoriske deler er markert som fullført. Modulsjekken viser separat om du har vist at du mestrer ferdighetene.',
    whereNextMark:
      'Når du er ferdig, kan du markere denne delen som fullført i panelet under.',
  },
  /**
   * The authoring workspace's learner-facing wording rules, verbatim from its
   * learner renderer (`scrub` in `04_WORKING/pilot/render_learner.js`): the
   * platform's evaluator is "den automatiske sjekken" for the learner, and a
   * build-machine note is not learner text. Applied to prose at display
   * time; the snapshot keeps the authored text unchanged.
   */
  learnerWording: [
    {
      pattern: String.raw`\bEvaluatoren\b`,
      flags: 'g',
      replacement: 'Den automatiske sjekken',
    },
    {
      pattern: String.raw`\bevaluatoren\b`,
      flags: 'g',
      replacement: 'den automatiske sjekken',
    },
    {
      pattern: String.raw` \(ikke kjørt på denne maskinen[^)]*\)`,
      flags: 'g',
      replacement: '',
    },
    {
      pattern: String.raw`\bDen automatiske sjekken sjekker\b`,
      flags: 'g',
      replacement: 'Den automatiske sjekken kontrollerer',
    },
  ],
};
