import type { MicroSession } from '@/lib/domain';

/**
 * Økt 3: M01 «Feilmeldinger» (S1-M01-L07) and M02 «Når typene ikke stemmer»
 * (S1-M02-L06). The reading routine first, then the same routine on a typo, a
 * syntax error, an error whose cause sits on an earlier line, and a value the
 * type cannot take. Every error text is one the lessons already show.
 */
export const feilmeldingerSession: MicroSession = {
  id: 'feilmeldinger',
  title: 'Les feilmeldingen',
  summary: 'Les feilen nedenfra, finn linjen og finn årsaken.',
  minutes: 6,
  cards: [
    {
      kind: 'learn',
      id: 'feil-les-nedenfra',
      title: 'Les feilmeldingen nedenfra',
      role: 'explain',
      source: {
        moduleId: 's1-m01',
        lessonUnitIds: ['S1-M01-L07'],
        skillIds: ['SK-DBG-01'],
      },
      idea: 'Les siste linje først. Finn så linjen Python peker på, endre én ting og kjør på nytt.',
      example: {
        code: 'pritn("Hei")\nNameError: name \'pritn\' is not defined',
        note: 'Python kjenner ikke navnet pritn. Feilen står på linje 1.',
      },
      bridge: 'Neste: sett feilsøkingen i rekkefølge.',
    },
    {
      kind: 'order',
      id: 'feil-rutine',
      title: 'Sett feilsøkingen i riktig rekkefølge',
      role: 'scaffold',
      source: {
        moduleId: 's1-m01',
        lessonUnitIds: ['S1-M01-L07'],
        skillIds: ['SK-DBG-01'],
      },
      context: 'Programmet krasjet med en feilmelding.',
      items: [
        { id: 'endre', label: 'Endre én ting' },
        { id: 'kjor', label: 'Kjør programmet på nytt' },
        { id: 'finn', label: 'Finn linjen Python peker på' },
        { id: 'les', label: 'Les siste linje' },
      ],
      correctOrder: ['les', 'finn', 'endre', 'kjor'],
      hint: 'Du må vite hva feilen sier og hvor den står, før du endrer noe.',
      explanation:
        'Les, finn, endre én ting og kjør på nytt. Endrer du flere ting samtidig, vet du ikke hva som hjalp.',
    },
    {
      kind: 'tap',
      id: 'feil-skrivefeil',
      title: 'Trykk på ordet som er skrevet feil',
      role: 'scaffold',
      source: {
        moduleId: 's1-m01',
        lessonUnitIds: ['S1-M01-L07'],
        skillIds: ['SK-DBG-01'],
      },
      error: "NameError: name 'pritn' is not defined",
      lines: [
        {
          number: 1,
          tokens: [
            { id: 'l1-print', text: 'print' },
            { id: 'l1-open', text: '(', name: 'venstre parentes' },
            { id: 'l1-tekst', text: '"Velkommen"' },
            { id: 'l1-close', text: ')', name: 'høyre parentes' },
          ],
        },
        {
          number: 2,
          tokens: [
            { id: 'l2-pritn', text: 'pritn' },
            { id: 'l2-open', text: '(', name: 'venstre parentes' },
            { id: 'l2-tekst', text: '"Pris: 45"' },
            { id: 'l2-close', text: ')', name: 'høyre parentes' },
          ],
        },
      ],
      correctTokenId: 'l2-pritn',
      hint: 'Siste linje i feilmeldingen nevner navnet Python ikke kjenner.',
      explanation:
        'pritn er en skrivefeil for print. Feilmeldingen peker på navnet Python ikke kjenner.',
    },
    {
      kind: 'select',
      id: 'feil-anforselstegn',
      title: 'Hva er feil på linjen?',
      role: 'retrieval',
      source: {
        moduleId: 's1-m01',
        lessonUnitIds: ['S1-M01-L07'],
        skillIds: ['SK-DBG-01'],
      },
      code: 'print("Hei, verden!)',
      options: [
        { id: 'navn', label: 'Navnet print er ukjent' },
        { id: 'tegn', label: 'Sluttanførselstegn mangler' },
        { id: 'rykk', label: 'Feil innrykk' },
      ],
      correctId: 'tegn',
      hint: 'Se på anførselstegnene: åpner og lukker de teksten?',
      explanation:
        'Sluttanførselstegnet mangler. Det gir SyntaxError, og da kjører ingenting i det hele tatt.',
    },
    {
      kind: 'tap',
      id: 'feil-arsak',
      title: 'Trykk på det som forårsaker feilen',
      role: 'application',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L06'],
        skillIds: ['SK-TYP-03'],
      },
      context:
        'Brukeren skriver 45. Feilen kom på linje 2, men årsaken kan ligge tidligere.',
      error: 'TypeError: can only concatenate str (not "int") to str',
      lines: [
        {
          number: 1,
          tokens: [
            { id: 'l1-pris', text: 'pris' },
            { id: 'l1-eq', text: '=', name: 'lik-tegn' },
            { id: 'l1-input', text: 'input("Pris: ")' },
          ],
        },
        {
          number: 2,
          tokens: [{ id: 'l2-print', text: 'print(pris + 2)' }],
        },
      ],
      correctTokenId: 'l1-input',
      hint: 'Feilen sier at tekst og tall ble blandet. Hvilken linje gir tekst?',
      explanation:
        'input() gir tekst, så pris er tekst, og + kan ikke legge 2 til tekst. Bruk int(input(...)).',
    },
    {
      kind: 'select',
      id: 'feil-verdi',
      title: 'Hva skjer når brukeren skriver 12.5?',
      role: 'retrieval',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L06'],
        skillIds: ['SK-TYP-03'],
      },
      code: 'pris = int(input("Pris: "))',
      options: [
        { id: 'type', label: 'TypeError' },
        { id: 'verdi', label: 'ValueError' },
        { id: 'tolv', label: 'pris blir 12' },
      ],
      correctId: 'verdi',
      hint: 'Typen er riktig: tekst. Kan int() gjøre «12.5» om til et heltall?',
      explanation:
        'Typen er riktig, men innholdet passer ikke i et heltall. Det gir ValueError, ikke TypeError.',
    },
  ],
};
