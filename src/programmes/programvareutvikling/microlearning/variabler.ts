import type { MicroSession } from '@/lib/domain';

/**
 * Økt 1: M02 «Verdier og variabler» (lesson S1-M02-L01). Learn, then the same
 * idea on nearly the same code, then the same idea in other forms.
 */
export const variablerSession: MicroSession = {
  id: 'variabler',
  title: 'Følg variablene',
  summary: 'Lagre, endre og følg en verdi linje for linje.',
  minutes: 5,
  cards: [
    {
      kind: 'learn',
      id: 'variabler-lagre',
      title: 'En variabel husker en verdi',
      role: 'explain',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L01'],
        skillIds: ['SK-VAR-01'],
      },
      idea: 'Tegnet = betyr «lagre», ikke «er lik». Python regner ut høyresiden først og lagrer svaret under navnet til venstre.',
      example: {
        code: 'antall = 3\nantall = antall + 2\nprint(antall)',
        note: 'Linje 2: ta 3, legg til 2 og lagre 5 i antall. Utskriften blir 5.',
      },
      bridge: 'Neste: prøv det på nesten samme kode.',
    },
    {
      kind: 'select',
      id: 'variabler-forutsi',
      title: 'Hva skrives ut?',
      role: 'scaffold',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L01'],
        skillIds: ['SK-VAR-01'],
      },
      code: 'kopper = 4\nkopper = kopper + 3\nprint(kopper)',
      options: [
        { id: 'fire', label: '4' },
        { id: 'syv', label: '7' },
        { id: 'tre', label: '3' },
      ],
      correctId: 'syv',
      hint: 'Regn ut høyresiden først. Hva er kopper før linje 2 kjører?',
      explanation:
        'Linje 2 tar 4, legger til 3 og lagrer 7 under kopper. Derfor skrives 7 ut.',
    },
    {
      kind: 'order',
      id: 'variabler-trinn',
      title: 'Sett trinnene i den rekkefølgen Python gjør dem',
      role: 'representation',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L01'],
        skillIds: ['SK-VAR-01'],
      },
      context: 'Slik behandler Python antall = antall + 2, når antall er 3.',
      items: [
        { id: 'legg', label: 'Legg til 2' },
        { id: 'lagre', label: 'Lagre 5 under navnet antall' },
        { id: 'hent', label: 'Hent verdien 3 fra antall' },
      ],
      correctOrder: ['hent', 'legg', 'lagre'],
      hint: 'Hvilken side av = regner Python ut først?',
      explanation:
        'Først hentes 3, så legges 2 til, og til slutt lagres svaret 5 under antall.',
    },
    {
      kind: 'match',
      id: 'variabler-spor',
      title: 'Koble hver linje med verdien x har etterpå',
      role: 'retrieval',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L01'],
        skillIds: ['SK-VAR-01'],
      },
      context: 'Linjene kjører ovenfra og ned.',
      leftLabel: 'Linje',
      rightLabel: 'x etterpå',
      pairs: [
        { id: 'a', left: 'x = 4', right: '4' },
        { id: 'b', left: 'x = x + 1', right: '5' },
        { id: 'c', left: 'x = x * 2', right: '10' },
        { id: 'd', left: 'x = x - 3', right: '7' },
      ],
      rightOrder: ['c', 'a', 'd', 'b'],
      hint: 'Hver linje starter med verdien forrige linje lagret i x.',
      explanation:
        'x går fra 4 til 5, så 10, så 7. Hver linje bruker verdien den forrige lagret.',
    },
    {
      kind: 'tap',
      id: 'variabler-navnefeil',
      title: 'Trykk på navnet Python ikke kjenner ennå',
      role: 'application',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L01'],
        skillIds: ['SK-VAR-01'],
      },
      error: "NameError: name 'antall' is not defined",
      lines: [
        {
          number: 1,
          tokens: [
            { id: 'l1-print', text: 'print(' },
            { id: 'l1-antall', text: 'antall' },
            { id: 'l1-close', text: ')', name: 'parentes' },
          ],
        },
        {
          number: 2,
          tokens: [
            { id: 'l2-antall', text: 'antall' },
            { id: 'l2-eq', text: '=', name: 'lik-tegn' },
            { id: 'l2-tre', text: '3' },
          ],
        },
      ],
      correctTokenId: 'l1-antall',
      hint: 'Python leser ovenfra og ned. Hva er laget når linje 1 kjører?',
      explanation:
        'Linje 1 bruker antall før linje 2 lager det. Lag variabelen først og bruk den etterpå.',
    },
    {
      kind: 'assemble',
      id: 'variabler-bygg',
      title: 'Bygg linjen som legger 3 til kopper',
      role: 'application',
      source: {
        moduleId: 's1-m02',
        lessonUnitIds: ['S1-M02-L01'],
        skillIds: ['SK-VAR-01'],
      },
      tokens: [
        { id: 'pluss', text: '+', name: 'pluss' },
        { id: 'kopper-hoyre', text: 'kopper' },
        { id: 'tre', text: '3' },
        { id: 'dobbel', text: '==', name: 'dobbelt lik-tegn' },
        { id: 'lik', text: '=', name: 'lik-tegn' },
        { id: 'kopper-venstre', text: 'kopper' },
        { id: 'tekst', text: '"kopper"', name: 'teksten kopper' },
      ],
      correctOrder: ['kopper-venstre', 'lik', 'kopper-hoyre', 'pluss', 'tre'],
      hint: 'Variabelen skal få en ny verdi, regnet ut fra den gamle.',
      explanation:
        'Høyresiden bruker den gamle verdien: kopper = kopper + 3 lagrer 3 mer i kopper.',
    },
  ],
};
