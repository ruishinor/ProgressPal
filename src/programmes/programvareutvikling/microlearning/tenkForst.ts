import type { MicroSession } from '@/lib/domain';

/**
 * Økt 4: developer reasoning across M01 and M02. Expected behaviour before the
 * run (S1-M02-L09), the chain from problem to tested solution (S1-M01-L05), a
 * bug that raises no error (S1-M02-L07), and the first small, safe commit
 * (S1-M01-L08).
 */
export const tenkForstSession: MicroSession = {
  id: 'tenk-forst',
  title: 'Tenk først, så kode',
  summary: 'Forventet svar, riktig rekkefølge og små commits.',
  minutes: 5,
  cards: [
    {
      kind: 'learn',
      id: 'test-forventet-forst',
      title: 'Skriv ned forventet svar før du kjører',
      role: 'explain',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L09'],
        skillIds: ['SK-TST-01'],
      },
      idea: 'Regn ut svaret selv først. Kjører du først og skriver av, ser du aldri en feil. Velg også varierte eksempler.',
      example: {
        code: 'antall  pris  forventet\n3       45    135\n0       45    0',
        note: 'Du fyller ut «forventet» selv, før programmet kjører.',
      },
      bridge: 'Neste: finn raden som avslører en feil.',
    },
    {
      kind: 'select',
      id: 'test-rad',
      title: 'Velg raden som avslører feilen',
      role: 'scaffold',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L09'],
        skillIds: ['SK-TST-01'],
      },
      context: 'Programmet skal regne antall * pris, men noen skrev +.',
      code: 'print(antall + pris)',
      options: [
        { id: 'to', label: 'antall 2, pris 2' },
        { id: 'null', label: 'antall 0, pris 0' },
        { id: 'tre', label: 'antall 3, pris 45' },
      ],
      correctId: 'tre',
      hint: 'Regn ut både + og * for hver rad. Hvilken rad gir ulikt svar?',
      explanation:
        'Med 2 og 2 gir både + og * 4, og med 0 og 0 gir begge 0. Bare 3 og 45 viser feilen: 48 mot 135.',
    },
    {
      kind: 'order',
      id: 'tenk-kjede',
      title: 'Sett stegene fra problem til løsning i rekkefølge',
      role: 'representation',
      source: {
        moduleId: 's1-m01',
        lessonUnitIds: ['S1-M01-L05'],
        skillIds: ['SK-PRC-01'],
      },
      items: [
        { id: 'kode', label: 'Skriv koden' },
        { id: 'problem', label: 'Beskriv problemet' },
        { id: 'test', label: 'Test løsningen' },
        { id: 'krav', label: 'Skriv kravene' },
      ],
      correctOrder: ['problem', 'krav', 'kode', 'test'],
      hint: 'Husk: hvorfor, hva, hvordan, og til slutt: virker det?',
      explanation:
        'Først hvorfor (problem), så hva (krav), så koden, og til slutt om det virker (testing).',
    },
    {
      kind: 'select',
      id: 'test-stille-feil',
      title: 'Hva skrives ut?',
      role: 'retrieval',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L07'],
        skillIds: ['SK-VAR-03'],
      },
      code: 'x = 1\nx == 5\nprint(x)',
      options: [
        { id: 'en', label: '1' },
        { id: 'fem', label: '5' },
        { id: 'usann', label: 'False' },
      ],
      correctId: 'en',
      hint: 'Linje 2 spør bare om x er 5. Lagrer den noe?',
      explanation:
        'x == 5 sammenligner og kaster svaret. Ingenting lagres, så x er fortsatt 1, uten feilmelding.',
    },
    {
      kind: 'match',
      id: 'git-koble',
      title: 'Koble Git-kommando og jobb',
      role: 'representation',
      source: {
        moduleId: 's1-m01',
        lessonUnitIds: ['S1-M01-L08'],
        skillIds: ['SK-GIT-01'],
      },
      leftLabel: 'Kommando',
      rightLabel: 'Jobb',
      pairs: [
        { id: 'status', left: 'git status', right: 'se hva Git ser' },
        { id: 'add', left: 'git add', right: 'klargjør filen' },
        { id: 'commit', left: 'git commit', right: 'lagrer en versjon' },
        { id: 'log', left: 'git log', right: 'viser historikken' },
      ],
      rightOrder: ['commit', 'status', 'log', 'add'],
      hint: 'Hva klargjør, hva lagrer, og hva viser bare noe?',
      explanation:
        'status viser hva Git ser, add klargjør, commit lagrer en versjon, og log viser historikken.',
    },
    {
      kind: 'assemble',
      id: 'git-commit-bygg',
      title: 'Bygg commit-kommandoen',
      role: 'application',
      source: {
        moduleId: 's1-m01',
        lessonUnitIds: ['S1-M01-L08'],
        skillIds: ['SK-GIT-01'],
      },
      context: 'Filen hei.py er klargjort.',
      // The pool order packs into two rows at the narrowest phone width.
      tokens: [
        {
          id: 'melding',
          text: '"Legg til hei-program"',
          name: 'meldingen Legg til hei-program',
        },
        { id: 'git', text: 'git' },
        { id: 'commit', text: 'commit' },
        { id: 'fix', text: '"fix"', name: 'meldingen fix' },
        { id: 'm', text: '-m', name: 'bindestrek m' },
        { id: 'add', text: 'add' },
      ],
      correctOrder: ['git', 'commit', 'm', 'melding'],
      hint: 'Du vil lagre en versjon. Meldingen skal si hva som ble gjort.',
      explanation:
        'git commit -m lagrer en versjon. «fix» sier ingenting om en uke, så meldingen må beskrive endringen.',
    },
  ],
};
