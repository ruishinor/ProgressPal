import type { MicroSession } from '@/lib/domain';

/**
 * Økt 2: M02 «Typer» og «Spør brukeren» (lessons S1-M02-L04 and L05). The
 * type idea first, then the input idea, each followed by practice. Two
 * topics («Navn og typer», «Spør brukeren»), so each opens on its own.
 */
export const typerOgInputSession: MicroSession = {
  id: 'typer-og-input',
  title: 'Tall eller tekst?',
  summary: 'Hva en verdi er, og hva input() gir deg.',
  minutes: 5,
  parts: [
    {
      cardIds: ['typer-forskjell', 'typer-type-av', 'typer-koble'],
      summary: 'Hva slags verdi er det: tall eller tekst?',
    },
    {
      cardIds: ['input-gir-tekst', 'input-uten-int', 'input-bygg'],
      summary: 'Hva input() gir deg, og hvordan du får et tall.',
    },
  ],
  cards: [
    {
      kind: 'learn',
      id: 'typer-forskjell',
      title: '45 og «45» er ikke det samme',
      role: 'explain',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L04'],
        skillIds: ['SK-TYP-01'],
      },
      idea: "Hver verdi har en type. 45 er et heltall, men «45» i anførselstegn er tekst. Typen bestemmer hva + gjør. Python-funksjonen type() viser typen: print(type(45)) skriver <class 'int'>. Hvis en beregning gir et uventet svar, kan du bruke type() til å sjekke om verdien er tekst.",
      example: {
        code: 'print(3 + 4)\nprint("3" + "4")',
        note: 'Tall legges sammen: 7. Tekster settes sammen: 34.',
      },
      bridge: 'Neste: avgjør typen på nesten samme verdier.',
    },
    {
      kind: 'select',
      id: 'typer-type-av',
      title: 'Hva skrives ut?',
      role: 'scaffold',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L04'],
        skillIds: ['SK-TYP-01'],
      },
      code: 'print(type("7"))',
      options: [
        { id: 'int', label: "<class 'int'>" },
        { id: 'str', label: "<class 'str'>" },
        { id: 'sju', label: '7' },
      ],
      correctId: 'str',
      hint: 'Anførselstegn betyr tekst, uansett hva som står inni.',
      explanation:
        "«7» står i anførselstegn, så det er tekst. type() gir derfor <class 'str'>.",
    },
    {
      kind: 'match',
      id: 'typer-koble',
      title: 'Koble hver verdi med typen',
      role: 'retrieval',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L04'],
        skillIds: ['SK-TYP-01'],
      },
      leftLabel: 'Verdi',
      rightLabel: 'Type',
      pairs: [
        { id: 'a', left: '45', right: 'heltall' },
        { id: 'b', left: '"45"', right: 'tekst' },
        { id: 'c', left: '2.5', right: 'desimaltall' },
        { id: 'd', left: 'True', right: 'sann/usann' },
      ],
      rightOrder: ['c', 'a', 'd', 'b'],
      hint: 'Se på hvordan hver verdi er skrevet: anførselstegn? punktum?',
      explanation:
        '45 er heltall, «45» er tekst, 2.5 er desimaltall og True er sann/usann.',
    },
    {
      kind: 'learn',
      id: 'input-gir-tekst',
      title: 'input() gir alltid tekst',
      role: 'explain',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L05'],
        skillIds: ['SK-TYP-02'],
      },
      idea: 'Det brukeren skriver, kommer inn som tekst, også sifre. Skal du regne med svaret, gjør du det om med int().',
      example: {
        code: 'antall = int(input("Antall kopper: "))',
        note: 'input spør, int() gjør svaret til et heltall, og antall lagrer det.',
      },
      bridge: 'Neste: se hva som skjer når int() mangler.',
    },
    {
      kind: 'select',
      id: 'input-uten-int',
      title: 'Hva skrives ut?',
      role: 'scaffold',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L05'],
        skillIds: ['SK-TYP-02'],
      },
      context: 'Brukeren skriver 4.',
      code: 'antall = input("Antall: ")\nprint(antall + antall)',
      options: [
        { id: 'atte', label: '8' },
        { id: 'fireogfire', label: '44' },
        { id: 'feil', label: 'Feilmelding' },
      ],
      correctId: 'fireogfire',
      hint: 'input() gir tekst. Hva gjør + med to tekster?',
      explanation:
        '4 kommer inn som tekst, og + setter tekster sammen: 44. Ingen feilmelding, men feil svar.',
    },
    {
      kind: 'assemble',
      id: 'input-bygg',
      title: 'Bygg linjen som leser inn et heltall',
      role: 'application',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L05'],
        skillIds: ['SK-TYP-02'],
      },
      tokens: [
        { id: 'tekst', text: 'str(' },
        { id: 'sporsmal', text: '"Antall kopper: "', name: 'spørsmålet' },
        { id: 'lukk', text: '))', name: 'to høyre parenteser' },
        { id: 'lik', text: '=', name: 'lik-tegn' },
        { id: 'input', text: 'input(' },
        { id: 'antall', text: 'antall' },
        { id: 'int', text: 'int(' },
      ],
      correctOrder: ['antall', 'lik', 'int', 'input', 'sporsmal', 'lukk'],
      hint: 'Det innerste kjører først. Hva må skje før svaret kan bli et tall?',
      explanation:
        'input() spør og gir tekst, og int() utenpå gjør svaret til et heltall som lagres i antall.',
    },
  ],
};
