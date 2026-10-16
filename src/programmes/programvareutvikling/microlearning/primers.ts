import type { MicroCard, MicroPrimer, MicroSession } from '@/lib/domain';

import { feilmeldingerSession } from './feilmeldinger';
import { tenkForstSession } from './tenkForst';
import { typerOgInputSession } from './typerOgInput';
import { variablerSession } from './variabler';

/**
 * «Forbered deg»: short primers for the Campaign missions a learner is about
 * to start. A primer is an advance organizer, never a second curriculum: one
 * idea, one small example and one scaffolded check, two minutes at most, and
 * the Campaign mission is still where the material is learned and shown.
 *
 * Almost all of it is reused. The Learn card and the scaffolded check that
 * already open a reinforcement session are the same card objects here (the
 * Learn card's own bridge names the check that follows). Only the opening of
 * M01 had nothing to reuse, so six cards are new: the first learner has to
 * have something useful to do before they have worked on anything. Each new
 * card cites the authored M01 lessons it simplifies.
 *
 * `prepares` names the Campaign items (missions) a primer is for; the lookahead
 * rule in `selectPrimer` reads the Campaign's own order, so no module numbers
 * are written down here.
 */

function pick(session: MicroSession, ...ids: string[]): MicroCard[] {
  return ids.map((id) => {
    const card = session.cards.find((candidate) => candidate.id === id);

    if (card === undefined) {
      throw new Error(`primer card "${id}" is not in session "${session.id}"`);
    }

    return card;
  });
}

const oppsettKort: MicroCard[] = [
  {
    kind: 'learn',
    id: 'oppsett-tre-ting',
    title: 'Tre ting gjør arbeidsstedet ditt klart',
    role: 'explain',
    source: {
      moduleId: 's1-m01',
      lessonUnitIds: ['S1-M01-L01', 'S1-M01-L02'],
      skillIds: ['SK-ENV-01', 'SK-ENV-02'],
    },
    idea: 'Python leser og kjører koden din. Editoren er der du skriver den. Terminalen er et tekstvindu der du gir datamaskinen beskjeder, kalt kommandoer.',
    example: {
      code: 'py --version\nPython 3.14.4',
      note: 'En kommando i terminalen, og svaret på linjen under. Slik sjekker du at Python er installert.',
    },
    bridge: 'Neste: velg hva hver ting gjør.',
  },
  {
    kind: 'select',
    id: 'oppsett-hvem',
    title: 'Hva leser og kjører koden din?',
    role: 'scaffold',
    source: {
      moduleId: 's1-m01',
      lessonUnitIds: ['S1-M01-L01'],
      skillIds: ['SK-ENV-01'],
    },
    options: [
      { id: 'python', label: 'Python' },
      { id: 'editor', label: 'Editoren' },
      { id: 'terminal', label: 'Terminalen' },
    ],
    correctId: 'python',
    hint: 'Editoren er stedet du skriver. Hvem gjør jobben når programmet kjører?',
    explanation:
      'Python leser og kjører koden. Editoren er der du skriver den, terminalen der du gir kommandoer.',
  },
];

const printKort: MicroCard[] = [
  {
    kind: 'learn',
    id: 'print-forste',
    title: 'print() skriver ut tekst',
    role: 'explain',
    source: {
      moduleId: 's1-m01',
      lessonUnitIds: ['S1-M01-L03'],
      skillIds: ['SK-PRG-02'],
    },
    idea: 'Et program er en liste med instruksjoner som Python utfører ovenfra og ned. print("…") er den første: den skriver ut teksten mellom anførselstegnene, uten selve tegnene.',
    example: {
      code: 'print("Hei!")\nprint("Jeg lærer Python.")',
      note: 'To linjer, to utskrifter, i samme rekkefølge som i koden.',
    },
    bridge: 'Neste: forutsi utskriften.',
  },
  {
    kind: 'select',
    id: 'print-forutsi',
    title: 'Hva skrives ut?',
    role: 'scaffold',
    source: {
      moduleId: 's1-m01',
      lessonUnitIds: ['S1-M01-L03'],
      skillIds: ['SK-PRG-02'],
    },
    code: 'print("God dag")',
    options: [
      { id: 'riktig', label: 'God dag' },
      { id: 'tegn', label: '"God dag"' },
      { id: 'kode', label: 'print(God dag)' },
    ],
    correctId: 'riktig',
    hint: 'Hører anførselstegnene med i det som skrives ut?',
    explanation:
      'print skriver ut teksten mellom anførselstegnene, men ikke selve tegnene.',
  },
];

const tenkKort: MicroCard[] = [
  {
    kind: 'learn',
    id: 'tenk-kart',
    title: 'Koden er bare ett steg',
    role: 'explain',
    source: {
      moduleId: 's1-m01',
      lessonUnitIds: ['S1-M01-L05'],
      skillIds: ['SK-PRC-01'],
    },
    idea: 'Før du koder, må du vite hva problemet er og hva løsningen må gjøre. Koden er ett steg i en lengre kjede, og du tester den til slutt.',
    example: {
      code: 'hvorfor → hva → hvordan → virker det?',
      note: 'Problemet svarer på hvorfor, kravene på hva, planen på hvordan, og koding og testing på om det virker.',
    },
    bridge: 'Neste: sett stegene i rekkefølge.',
  },
];

const commitKort: MicroCard[] = [
  {
    kind: 'learn',
    id: 'commit-versjon',
    title: 'En commit lagrer en versjon',
    role: 'explain',
    source: {
      moduleId: 's1-m01',
      lessonUnitIds: ['S1-M01-L08'],
      skillIds: ['SK-GIT-01'],
    },
    idea: 'Git lar deg lagre versjoner av arbeidet ditt, så du kan gå tilbake til noe som virket. Hver lagrede versjon kalles en commit.',
    example: {
      code: 'git add hei.py\ngit commit -m "Legg til hei-program"',
      note: 'Først klargjør du filen, så lagrer du en versjon med en melding som sier hva den gjør.',
    },
    bridge: 'Neste: koble hver kommando med jobben den gjør.',
  },
];

/** The primers, in Campaign order, with the missions each one is for. */
export const programvareutviklingPrimers: readonly MicroPrimer[] = [
  {
    id: 'forb-oppsett',
    title: 'Python, editor og terminal',
    summary: 'Tre ting du setter opp, og et tekstvindu for kommandoer.',
    minutes: 2,
    prepares: ['s1-m01-o01', 's1-m01-o02'],
    cards: oppsettKort,
  },
  {
    id: 'forb-print',
    title: 'Ditt første program',
    summary: 'print() skriver ut tekst, linje for linje.',
    minutes: 2,
    prepares: ['s1-m01-o03'],
    cards: printKort,
  },
  {
    id: 'forb-tenk',
    title: 'Koden er bare ett steg',
    summary: 'Fra problem til løsning, i riktig rekkefølge.',
    minutes: 2,
    prepares: ['s1-m01-o04'],
    cards: [...tenkKort, ...pick(tenkForstSession, 'tenk-kjede')],
  },
  {
    id: 'forb-feil',
    title: 'Slik leser du en feilmelding',
    summary: 'Les nedenfra, finn linjen og endre én ting.',
    minutes: 2,
    prepares: ['s1-m01-o06'],
    cards: pick(feilmeldingerSession, 'feil-les-nedenfra', 'feil-rutine'),
  },
  {
    id: 'forb-commit',
    title: 'Lagre en versjon med Git',
    summary: 'Hva en commit er, og hva kommandoene gjør.',
    minutes: 2,
    prepares: ['s1-m01-o07'],
    cards: [...commitKort, ...pick(tenkForstSession, 'git-koble')],
  },
  {
    id: 'forb-variabler',
    title: 'En variabel husker en verdi',
    summary: 'Lagre en verdi og følg den linje for linje.',
    minutes: 2,
    prepares: ['s1-m02-o01'],
    cards: pick(variablerSession, 'variabler-lagre', 'variabler-forutsi'),
  },
  {
    id: 'forb-typer',
    title: 'Tall og tekst er ulike typer',
    summary: 'Typen bestemmer hva + gjør.',
    minutes: 2,
    prepares: ['s1-m02-o03'],
    cards: pick(typerOgInputSession, 'typer-forskjell', 'typer-type-av'),
  },
  {
    id: 'forb-input',
    title: 'input() gir tekst',
    summary: 'Alt brukeren skriver inn, er tekst.',
    minutes: 2,
    prepares: ['s1-m02-o04'],
    cards: pick(typerOgInputSession, 'input-gir-tekst', 'input-uten-int'),
  },
  {
    id: 'forb-test',
    title: 'Forventet svar først',
    summary: 'Regn ut svaret selv, før du kjører.',
    minutes: 2,
    prepares: ['s1-m02-o07'],
    cards: pick(tenkForstSession, 'test-forventet-forst', 'test-rad'),
  },
];
