import type { MicroSession, MicroSource, MicroTrack } from '@/lib/domain';

import { kanbanSessions } from './utviklerblikk/kanban';
import { scrumSessions } from './utviklerblikk/scrum';
import { sqlMysqlSessions } from './utviklerblikk/sqlMysql';
import { smidigSamarbeidSessions } from './utviklerblikk/smidigSamarbeid';

const ids = (sessions: readonly MicroSession[]) =>
  sessions.map((session) => session.id);

/**
 * «Utviklerblikk»: a voluntary track with additive categories. Generelt holds the
 * six activities below; Scrum, Kanban and Smidig samarbeid hold six each from
 * the finalized ACT 18 package (see `utviklerblikk/`).
 *
 * Generelt: six short activities about how
 * developers think before and around the code: need versus solution,
 * requirement types, information versus function, partial failure when data
 * is missing, user action versus system behaviour, and how work is organised.
 * No code is required and nothing depends on M08/M09 or the Campaign.
 *
 * Authored content: package 25 in the Programvareutvikling curriculum
 * workspace (`05_OUTPUT/25_TENK_SOM_EN_UTVIKLER_PILOT`, activities TSU-A1 to
 * TSU-A6), adapted to the card rules here (two or three options, one-to-one
 * pairs, Learn followed by practice, takeaway on the finished screen). Skill
 * IDs are the curriculum's own.
 */
const trackId = 'tenk-som-en-utvikler';

const source = (activity: string, ...skillIds: string[]): MicroSource => ({
  moduleId: trackId,
  lessonUnitIds: [activity],
  skillIds,
});

const a1 = source('TSU-A1', 'SK-THK-01', 'SK-PRC-03');
const a2 = source('TSU-A2', 'SK-REQ-02', 'SK-REQ-01');
const a3 = source('TSU-A3', 'SK-MOD-02');
const a4 = source('TSU-A4', 'SK-MOD-02', 'SK-THK-01');
const a5 = source('TSU-A5', 'SK-PRC-01', 'SK-REQ-04');
const a6 = source('TSU-A6', 'SK-METH-01', 'SK-REQ-05');

export const tenkSomEnUtviklerTrack: MicroTrack = {
  id: trackId,
  title: 'Utviklerblikk',
  summary:
    'Øv på å stille gode spørsmål, forstå krav og se hvordan valgene dine påvirker systemet og andre.',
  about:
    'I Utviklerblikk øver du på å stille gode spørsmål og se sammenhenger gjennom korte oppgaver uten å skrive kode.',
  categories: [
    {
      id: 'generelt',
      title: 'Generelt',
      summary: 'Bred utviklerforståelse',
      sessionIds: [
        'tsu-behov-eller-losning',
        'tsu-kravtyper',
        'tsu-informasjon-funksjon',
        'tsu-data-mangler',
        'tsu-handling-atferd',
        'tsu-rolle-fase',
      ],
    },
    {
      id: 'scrum',
      title: 'Scrum',
      summary: 'Rammeverk og ansvar',
      sessionIds: ids(scrumSessions),
    },
    {
      id: 'smidig-samarbeid',
      title: 'Smidig samarbeid',
      summary: 'Team og koordinering',
      sessionIds: ids(smidigSamarbeidSessions),
    },
    {
      id: 'kanban',
      title: 'Kanban',
      summary: 'Arbeidsflyt og oversikt',
      sessionIds: ids(kanbanSessions),
    },
    {
      id: 'sql-mysql',
      title: 'Databaser – SQL/MySQL',
      summary:
        'Øv på SQL: hent, endre og koble data. Forutsi resultater og finn feil.',
      sessionIds: ids(sqlMysqlSessions),
    },
  ],
  sessions: [
    {
      id: 'tsu-behov-eller-losning',
      title: 'Behov eller løsning?',
      summary: 'Finn behovet bak et løsningsforslag.',
      minutes: 3,
      takeaway:
        'Når noen foreslår en løsning: Hvilket problem skal den løse?\nHvem trenger hjelp?\nHva vet vi ikke ennå?\nUndersøk behovet før du bestemmer løsningen.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a1-ord',
          title: 'Fire stikkord som hjelper deg',
          role: 'explain',
          source: a1,
          idea: 'Disse fire stikkordene hjelper deg å holde ting fra hverandre.',
          definitions: [
            { term: 'Problem', text: 'det som ikke fungerer godt i dag.' },
            { term: 'Behov', text: 'det noen trenger å få til.' },
            {
              term: 'Løsningsforslag',
              text: 'én mulig måte å dekke behovet på.',
            },
            { term: 'Antakelse', text: 'noe vi tror, men ikke har sjekket.' },
          ],
          bridge: 'Neste: et treningssenter vil ha en app.',
        },
        {
          kind: 'select',
          id: 'tsu-a1-behov',
          title: 'Et treningssenter',
          question: 'Hva er det egentlige behovet?',
          role: 'scaffold',
          source: a1,
          context:
            'Et treningssenter sier: «Vi trenger en app med QR-kode for innsjekk.» Det er lang kø om morgenen, fordi de ansatte skriver inn hvert medlem.',
          options: [
            {
              id: 'rask',
              label: 'Rask innsjekk uten kø.',
            },
            {
              id: 'app',
              label: 'En app med QR-kode.',
              feedback:
                'Dette er løsningen de foreslår. Hva skal QR-koden hjelpe medlemmene med?',
            },
            {
              id: 'liker',
              label: 'At medlemmene liker QR-koder.',
              feedback:
                'Dette er en antakelse. Ingen har sagt at medlemmene ønsker QR-kode.',
            },
          ],
          correctId: 'rask',
          hint: 'Spør hvorfor de vil ha appen. Hva skal bli bedre for medlemmene?',
          explanation:
            'Behovet er rask innsjekk uten kø. QR-kode er én måte. Et kort som leses ved døra, kan dekke samme behov.',
        },
        {
          kind: 'match',
          leftPresentation: 'text',
          id: 'tsu-a1-sorter',
          title: 'Koble hvert utsagn til riktig ord',
          role: 'representation',
          source: a1,
          leftLabel: 'Utsagn',
          rightLabel: 'Ord',
          pairs: [
            {
              id: 'problem',
              left: 'Kø i resepsjonen',
              right: 'Problem',
            },
            {
              id: 'behov',
              left: 'Rask innsjekk',
              right: 'Behov',
            },
            {
              id: 'losning',
              left: 'App med QR-kode',
              right: 'Forslag',
            },
            {
              id: 'antakelse',
              left: 'Alle har mobil',
              right: 'Antakelse',
            },
          ],
          rightOrder: ['losning', 'antakelse', 'problem', 'behov'],
          hint: 'Hvilket utsagn tar noe for gitt uten at det er sjekket?',
          explanation:
            'Køen er problemet, rask innsjekk behovet, appen ett forslag og «Alle har mobil» en antakelse.',
        },
        {
          kind: 'select',
          id: 'tsu-a1-hvorfor',
          title: 'Før dere velger løsning',
          role: 'application',
          source: a1,
          context: 'Teamet på treningssenteret vurderer QR-appen for innsjekk.',
          question: 'Hva bør dere undersøke først?',
          options: [
            {
              id: 'darlig',
              label: 'Hvilken QR-app er billigst.',
              feedback:
                'Pris er viktig, men først må dere forstå hvorfor det blir kø.',
            },
            {
              id: 'feil',
              label: 'Om folk vil bruke appen.',
              feedback:
                'Det tar for gitt at appen er løsningen. Først må dere forstå hvorfor det blir kø.',
            },
            {
              id: 'sammenligne',
              label: 'Hvorfor det blir kø.',
            },
          ],
          correctId: 'sammenligne',
          hint: 'Hva må dere vite før dere velger løsning?',
          explanation:
            'Undersøk hvor køen oppstår og hvem den rammer. Da kan dere vurdere om QR-kode faktisk hjelper.',
        },
        {
          kind: 'select',
          id: 'tsu-a1-bibliotek',
          title: 'Ny situasjon: biblioteket',
          question: 'Hva trenger lånerne?',
          role: 'application',
          source: a1,
          context:
            'Et bibliotek sier: «Vi trenger en chatbot på nettsiden.» Mange ringer for å spørre om en bok er ledig.',
          options: [
            {
              id: 'chatbot',
              label: 'En chatbot på nettsiden.',
              feedback:
                'Chatboten er forslaget. Hva prøver lånerne egentlig å finne ut?',
            },
            {
              id: 'ledig',
              label: 'Å se raskt om en bok er ledig.',
            },
            {
              id: 'telefon',
              label: 'Flere telefonlinjer.',
              feedback:
                'Flere telefonlinjer er også en løsning – bare en annen.',
            },
          ],
          correctId: 'ledig',
          hint: 'Hva spør de som ringer om?',
          explanation:
            'Lånerne vil vite om boka er ledig. Det kan løses med en chatbot, men kanskje enklere med status ved hver bok i søket.',
        },
      ],
    },
    {
      id: 'tsu-kravtyper',
      title: 'Funksjonelle og ikke-funksjonelle krav',
      summary:
        'Skill hva systemet gjør fra kvaliteter som svartid og brukervennlighet.',
      minutes: 4,
      takeaway:
        'Funksjonelle krav sier hva appen skal gjøre, som å sperre kontoen etter fem mislykkede innloggingsforsøk.\nIkke-funksjonelle krav gjelder egenskaper som svartid, sikkerhet, brukervennlighet og stabilitet.\n«Svar innen to sekunder» er et målbart kvalitetskrav. Ikke alle kvalitetskrav trenger tall, men teamet må vite hvordan de skal sjekkes.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a2-typer',
          title: 'To typer krav',
          role: 'explain',
          source: a2,
          idea: 'Et krav beskriver noe et system må gjøre eller oppfylle.',
          definitions: [
            {
              term: 'Funksjonelt krav (functional requirement)',
              text: 'hva systemet skal gjøre. Eksempel: «Kunden skal kunne betale med kort.»',
            },
            {
              term: 'Ikke-funksjonelt krav (non-functional requirement)',
              text: 'egenskaper som svartid, sikkerhet, brukervennlighet og stabilitet. Eksempel: «Betalingen skal være ferdig innen fem sekunder.» Krav må kunne sjekkes, men trenger ikke alltid tall.',
            },
          ],
          bridge: 'Neste: to krav om innlogging.',
        },
        {
          kind: 'select',
          id: 'tsu-a2-innlogging',
          title: 'To krav om innlogging',
          context:
            'A: «Brukeren skal kunne logge inn.»\nB: «Innloggingen skal gi svar innen to sekunder.»',
          question: 'Hvilket krav beskriver en egenskap?',
          role: 'scaffold',
          source: a2,
          options: [
            {
              id: 'logge-inn',
              label: 'Krav A',
              feedback:
                'Krav A sier hva brukeren skal kunne gjøre. Det er en handling, altså et funksjonelt krav.',
            },
            {
              id: 'begge',
              label: 'Begge kravene',
              feedback:
                'Begge handler om innlogging, men bare B stiller krav til svartiden. A sier hva brukeren skal kunne gjøre.',
            },
            {
              id: 'beskytte',
              label: 'Krav B',
            },
          ],
          correctId: 'beskytte',
          hint: 'Hvilket krav sier noe om svartiden, ikke bare handlingen?',
          explanation:
            'B beskriver en egenskap: hvor raskt løsningen svarer. «To sekunder» gjør kravet målbart, så teamet kan teste det.',
        },
        {
          kind: 'learn',
          id: 'tsu-a2-sider',
          title: 'Tre sider ved et krav',
          role: 'explain',
          source: a2,
          idea: 'Handling, regel og kvalitet er ikke tre egne typer krav, men sider ved et krav. Handling og regel hører til funksjonelle krav, kvalitet til ikke-funksjonelle.',
          definitions: [
            { term: 'Handling', text: 'hva systemet skal gjøre.' },
            {
              term: 'Regel for handling',
              text: 'når eller under hvilke betingelser handlingen skjer.',
            },
            {
              term: 'Kvalitet',
              text: 'egenskaper som svartid, sikkerhet, brukervennlighet og stabilitet.',
            },
          ],
          bridge: 'Neste: tre krav til en bibliotekapp.',
        },
        {
          kind: 'match',
          leftPresentation: 'text',
          id: 'tsu-a2-bibliotek',
          title: 'Tre krav til en bibliotekapp',
          question: 'Hva beskriver hvert krav?',
          role: 'representation',
          source: a2,
          leftLabel: 'Krav',
          rightLabel: 'Beskrivelse',
          pairs: [
            {
              id: 'funksjon',
              left: 'Forlenge et lån',
              right: 'Handling',
            },
            {
              id: 'egenskap',
              left: 'Svar innen 2 sekunder',
              right: 'Kvalitet',
            },
            {
              id: 'regel',
              left: 'Sperr etter 5 mislykkede forsøk',
              right: 'Regel for handling',
            },
          ],
          rightOrder: ['regel', 'funksjon', 'egenskap'],
          hint: 'Hvilket krav sier hvor raskt, ikke hva?',
          explanation:
            'Å forlenge et lån er en handling. Sperringen er også en handling, og regelen sier når den skjer. Begge er funksjonelle. Svartiden er en kvalitet.',
        },
        {
          kind: 'select',
          id: 'tsu-a2-sikkerhet',
          title: 'Et sikkerhetskrav',
          role: 'retrieval',
          source: a2,
          context:
            'Et sikkerhetskrav sier at kontoen skal sperres i 15 minutter etter fem mislykkede innloggingsforsøk.',
          question: 'Hvilken type krav beskriver selve sperringen?',
          options: [
            {
              id: 'regel',
              label: 'Funksjonelt krav',
            },
            {
              id: 'ja',
              label: 'Ikke-funksjonelt krav',
              feedback:
                'Målet er sikkerhet, men kravet sier hva systemet skal gjøre: sperre kontoen.',
            },
            {
              id: 'ikke-krav',
              label: 'Et ytelseskrav',
              feedback:
                'Tallene sier når og hvor lenge, ikke hvor raskt. Kravet beskriver noe systemet gjør.',
            },
          ],
          correctId: 'regel',
          hint: 'Se på hva kravet ber systemet om å gjøre.',
          explanation:
            'Sperringen er noe systemet gjør, med sikkerhet som mål. Sikkerhet kan også være en egenskap, men da må den gjøres konkret.',
        },
        {
          kind: 'select',
          id: 'tsu-a2-testbart',
          title: 'Biblioteket og lånedata',
          role: 'application',
          source: a2,
          context:
            'Biblioteket vil beskytte lånernes opplysninger. «Systemet skal være sikkert» er for uklart til at teamet kan sjekke det.',
          question: 'Hvilken formulering kan teamet teste?',
          options: [
            {
              id: 'svaert',
              label: 'Lånedata skal lagres trygt.',
              feedback:
                'Det høres konkret ut, men hva betyr «trygt»? Teamet vet ikke hva de skal sjekke.',
            },
            {
              id: 'ny',
              label: 'Følg god sikkerhetspraksis.',
              feedback:
                'Det høres riktig ut, men sier ikke hva som skal skje. «God praksis» kan ikke testes direkte.',
            },
            {
              id: 'egen',
              label: 'Låneren ser bare egne lån.',
            },
          ],
          correctId: 'egen',
          hint: 'Hvilket krav kan du sjekke med ett konkret forsøk?',
          explanation:
            'Test: Logg inn som én låner og prøv å åpne en annens lån. Systemet skal si nei. Kravet sier hva som skal skje.',
        },
        {
          kind: 'match',
          leftPresentation: 'text',
          id: 'tsu-a2-billett',
          title: 'En billettapp',
          question:
            'Appen selger og sjekker billetter. Hva beskriver hvert krav?',
          role: 'application',
          source: a2,
          leftLabel: 'Krav',
          rightLabel: 'Beskrivelse',
          pairs: [
            {
              id: 'funksjon',
              left: 'Kjøpe enkeltbillett',
              right: 'Handling',
            },
            {
              id: 'egenskap',
              left: 'Åpner på under 3 sek.',
              right: 'Kvalitet',
            },
            {
              id: 'regel',
              left: 'Utløpt billett avvises',
              right: 'Regel for handling',
            },
          ],
          rightOrder: ['egenskap', 'regel', 'funksjon'],
          hint: 'Hvilket krav handler om hvor raskt, ikke om hva?',
          explanation:
            'Kjøp og avvisning er handlinger, og en regel styrer avvisningen. Åpningstiden er en kvalitet.',
        },
      ],
    },
    {
      id: 'tsu-informasjon-funksjon',
      title: 'Informasjon eller funksjon?',
      summary: 'Skill det systemet vet fra det det gjør.',
      minutes: 3,
      takeaway:
        'For hver funksjon: Hvilken informasjon trenger den?\nFor hver opplysning: Hvilke funksjoner bruker den?\nHva skjer med disse funksjonene hvis opplysningen mangler eller er feil?\nDa ser du hvordan delene henger sammen – uten å skrive kode.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a3-begreper',
          title: 'Det systemet vet, og det systemet gjør',
          role: 'explain',
          source: a3,
          idea: 'Informasjon er det systemet må vite og huske. «Gruppetime» med tid, sal og antall plasser er informasjon.\nEn funksjon er noe som gjøres med informasjonen. «Bestille gruppetime» er en funksjon.\nSpør: Hva må systemet vite? Og hva skal det gjøre med opplysningene?',
          bridge: 'Neste: en app for gruppetimer.',
        },
        {
          kind: 'select',
          id: 'tsu-a3-hva-er-info',
          title: 'Hvilket av disse er informasjon?',
          role: 'scaffold',
          source: a3,
          context: 'Et treningssenter lager en app for gruppetimer.',
          options: [
            {
              id: 'melde',
              label: 'Melde seg på en time',
              feedback:
                '«Melde seg på» er en handling. Den bruker og endrer informasjon.',
            },
            {
              id: 'time',
              label: 'Gruppetime: tid, sal, plasser',
            },
            {
              id: 'se',
              label: 'Se ledige plasser',
              feedback:
                '«Se» er en handling: systemet regner ut svaret fra plasser og påmeldinger.',
            },
          ],
          correctId: 'time',
          hint: 'Se etter noe systemet må huske, ikke noe som gjøres.',
          explanation:
            'Gruppetimen med tid, sal og plasser er opplysninger systemet må kjenne. De to andre er funksjoner som bruker dem.',
        },
        {
          kind: 'match',
          leftPresentation: 'text',
          id: 'tsu-a3-koble',
          title: 'Koble funksjonen til informasjonen den trenger',
          role: 'representation',
          source: a3,
          leftLabel: 'Funksjon',
          rightLabel: 'Informasjon',
          pairs: [
            {
              id: 'timeplan',
              left: 'Vise timeplanen',
              right: 'Gruppetimer: tid og sal',
            },
            {
              id: 'logge-inn',
              left: 'Logge inn',
              right: 'E-postadresse og opplysninger for innlogging',
            },
            {
              id: 'deltakere',
              left: 'Vise hvem som kommer',
              right: 'Påmeldinger',
            },
          ],
          rightOrder: ['deltakere', 'timeplan', 'logge-inn'],
          hint: 'Hva må systemet slå opp for å gjøre hver handling?',
          explanation:
            'Timeplanen bruker tid og sal. Innlogging bruker e-postadresse og innloggingsopplysninger for å kontrollere hvem du er. Deltakerlisten bruker påmeldingene.',
        },
        {
          kind: 'select',
          id: 'tsu-a3-pamelding',
          title: 'Hva trenger systemet ved påmelding?',
          role: 'retrieval',
          source: a3,
          context:
            'Et medlem vil melde seg på en gruppetime. Systemet må sjekke om det er plass og registrere hvem som deltar.',
          options: [
            {
              id: 'alt',
              label: 'Time, medlem, antall plasser og påmeldinger.',
            },
            {
              id: 'bare-time',
              label: 'Bare hvilken time.',
              feedback:
                'Da vet ikke systemet hvem som meldte seg på, eller om timen er full.',
            },
            {
              id: 'musikk',
              label: 'Musikken på timen.',
              feedback:
                'Musikk kan være fin å vise, men påmeldingen trenger den ikke.',
            },
          ],
          correctId: 'alt',
          hint: 'Hva må systemet sjekke før det sier «Du er påmeldt»?',
          explanation:
            'Systemet trenger timen som velges og medlemmet som melder seg på. Antall plasser er kapasiteten. Sammen med antall eksisterende påmeldinger brukes den til å sjekke om det er plass.',
        },
        {
          kind: 'select',
          id: 'tsu-a3-avhengig',
          title: 'Hvilken funksjon trenger påmeldingene?',
          role: 'application',
          source: a3,
          context: 'Påmeldinger: hvem som er meldt på hvilken time.',
          options: [
            {
              id: 'ledige',
              label: 'Vise antall ledige plasser.',
            },
            {
              id: 'beskrivelse',
              label: 'Vise beskrivelsen av timen.',
              feedback:
                'Beskrivelsen hører til timen og endrer seg ikke når noen melder seg på.',
            },
            {
              id: 'apningstid',
              label: 'Vise åpningstidene.',
              feedback: 'Åpningstider har ikke noe med påmeldinger å gjøre.',
            },
          ],
          correctId: 'ledige',
          hint: 'Hvilken handling krever at systemet teller påmeldingene?',
          explanation:
            'For å vise ledige plasser må systemet regne ut kapasiteten minus antall registrerte påmeldinger. Påmeldingene er informasjon; å beregne og vise ledige plasser er en funksjon.',
        },
        {
          kind: 'select',
          id: 'tsu-a3-konsert',
          title: 'Ny situasjon: konsertbilletten',
          question: 'Hva mangler appen?',
          role: 'application',
          source: a3,
          context:
            'En kunde har betalt for en konsertbillett, men appen mangler informasjon om setet.',
          options: [
            {
              id: 'konsert',
              label: 'En kvittering for betalingen.',
              feedback:
                'Kvitteringen viser betaling, men ikke hvilket sete kunden har fått.',
            },
            {
              id: 'sete',
              label: 'Bekreftelse på et ledig sete.',
              feedback:
                'At et sete er ledig, betyr ikke at kunden har fått akkurat det setet.',
            },
            { id: 'kjope', label: 'Hvilket sete kunden har fått.' },
          ],
          correctId: 'kjope',
          hint: 'Hva må appen vite for å vise riktig billett?',
          explanation:
            'Betaling alene er ikke nok. Appen må vite hvilket sete kunden har fått, før den kan vise riktig billett.',
        },
      ],
    },
    {
      id: 'tsu-data-mangler',
      title: 'Hva skjer når data mangler?',
      summary: 'Undersøk hvilke funksjoner som påvirkes.',
      minutes: 4,
      takeaway:
        'Når data mangler: Hva kan hver funksjon fortsatt vise?\nHvilke funksjoner trenger flere opplysninger?\nHva bør brukeren få vite?\nVis heller en tydelig beskjed enn et tall dere ikke kan stole på.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a4-situasjon',
          title: 'Treningsappen mangler påmeldinger',
          role: 'explain',
          source: a4,
          idea: 'Et treningssenter bruker en app som viser gruppetimer og lar medlemmer melde seg på.\nAppen henter timeplanen med navn, tid, sal og antall plasser. Påmeldingene, som viser hvem som deltar på hver time, hentes separat.\nEn morgen får appen hentet timeplanen, men ikke påmeldingene.',
          bridge: 'Neste: Hva tror du skjer?',
        },
        {
          kind: 'select',
          id: 'tsu-a4-hva-skjer',
          title: 'Hva kan fortsatt fungere i appen?',
          role: 'scaffold',
          source: a4,
          context:
            'Treningsappen har timeplanen med tid, sal og antall plasser, men får ikke hentet påmeldingene.',
          options: [
            {
              id: 'alt-stopper',
              label: 'Hele appen stopper.',
              feedback:
                'Timeplanen er hentet. Det som bare trenger timeplanen, kan fortsatt vises.',
            },
            {
              id: 'delvis',
              label: 'Deler av appen virker.',
            },
            {
              id: 'som-vanlig',
              label: 'Alt virker som vanlig.',
              feedback:
                'Appen trenger påmeldingene for å finne ledige plasser. Timeplanen alene er ikke nok.',
            },
          ],
          correctId: 'delvis',
          hint: 'Hvilke funksjoner må vite hvem som er påmeldt?',
          explanation:
            'Tid og sal kan fortsatt vises. Ledige plasser krever kapasitet og påmeldinger, så det antallet er ukjent nå.',
        },
        {
          kind: 'match',
          leftPresentation: 'text',
          id: 'tsu-a4-pavirkes',
          title: 'Koble funksjonen til hvordan den påvirkes',
          role: 'representation',
          source: a4,
          context:
            'Treningsappen har timeplanen med tid, sal og antall plasser, men får ikke hentet påmeldingene.',
          leftLabel: 'Funksjon',
          rightLabel: 'Hva skjer',
          pairs: [
            {
              id: 'tid',
              left: 'Vise tid og sal',
              right: 'Virker som før',
            },
            {
              id: 'ledige',
              left: 'Vise ledige plasser',
              right: 'Kan ikke regnes ut',
            },
            {
              id: 'melde',
              left: 'Melde seg på',
              right: 'Må vente til ledige plasser kan sjekkes',
            },
          ],
          rightOrder: ['ledige', 'melde', 'tid'],
          hint: 'Hvilken informasjon trenger hver funksjon?',
          explanation:
            'Tid og sal finnes i timeplanen. Uten påmeldingene er ledige plasser ukjent. Her må nye påmeldinger vente til appen kan sjekke at det er plass.',
        },
        {
          kind: 'select',
          id: 'tsu-a4-feil-tall',
          title: 'Et tall som ikke stemmer',
          question: 'Hvilken mulig regnefeil kan forklare tallet?',
          role: 'retrieval',
          source: a4,
          context:
            'Timeplanen viser 20 plasser. Timen er full. Appen får ikke hentet påmeldingene, men viser «20 ledige».',
          options: [
            {
              id: 'flere',
              label: 'Appen la de 20 påmeldte til kapasiteten.',
              feedback:
                'Med 20 plasser og 20 påmeldte ville summen blitt 40, ikke 20.',
            },
            {
              id: 'avmeldt',
              label: 'Appen trakk kapasiteten fra de 20 påmeldte.',
              feedback:
                '20 påmeldte minus 20 plasser blir 0, ikke 20. Appen har dessuten ikke fått hentet antall påmeldte.',
            },
            {
              id: 'null',
              label: 'Appen satte ukjent antall påmeldte til 0.',
            },
          ],
          correctId: 'null',
          hint: 'Tenk på forskjellen mellom en verdi på null og en opplysning appen ikke har.',
          explanation:
            'Hvis manglende påmeldinger regnes som null, blir 20 − 0 = 20. Det kan forklare tallet, men må undersøkes: ukjent betyr ikke ingen.',
        },
        {
          kind: 'select',
          id: 'tsu-a4-best',
          title: 'Hvordan bør appen oppføre seg nå?',
          role: 'application',
          source: a4,
          context:
            'Treningsappen har riktig timeplan, men får ikke hentet påmeldingene. Derfor vet den ikke hvor mange plasser som er ledige.',
          options: [
            {
              id: 'aerlig',
              label:
                'Vise timeplanen og si at antall ledige plasser er ukjent.',
            },
            {
              id: 'skjul',
              label: 'Skjule hele timeplanen.',
              feedback:
                'Da mister medlemmene også det som virker. Timeplanen er jo riktig.',
            },
            {
              id: 'null',
              label: 'Vise 0 ledige plasser.',
              feedback:
                '0 betyr at timen er full. Uten påmeldingene vet appen ikke om det stemmer. Den bør si at antallet er ukjent.',
            },
          ],
          correctId: 'aerlig',
          hint: 'Hvilket svar gir riktig informasjon og ingen falske tall?',
          explanation:
            'Vis timeplanen, og si at ledige plasser er ukjent. Bekreft påmeldinger først når plassen kan kontrolleres. Appen skal ikke gjette.',
        },
        {
          kind: 'select',
          id: 'tsu-a4-reiseapp',
          title: 'Ny situasjon: reiseappen',
          question: 'Hva kan appen fortsatt vise uten sanntidsdata?',
          role: 'application',
          source: a4,
          context:
            'En reiseapp har ruteplanen for bussene, men får ikke sanntidsdata om hvor bussene er nå.',
          options: [
            {
              id: 'ingen',
              label: 'Ingen avganger kan vises.',
              feedback:
                'Ruteplanen finnes. Planlagte tider kan fortsatt vises.',
            },
            {
              id: 'planlagt',
              label: 'Planlagte avganger.',
            },
            {
              id: 'noyaktig',
              label: 'Nøyaktig når bussen kommer.',
              feedback: 'Til det trenger appen sanntidsdata – og de mangler.',
            },
          ],
          correctId: 'planlagt',
          hint: 'Hvilken informasjon trenger hver av funksjonene?',
          explanation:
            'Ruteplanen gir planlagte avganger. Oppdaterte forsinkelser krever sanntidsdata. Appen må merke tidene som planlagte.',
        },
      ],
    },
    {
      id: 'tsu-handling-atferd',
      title: 'Brukerhandling eller systematferd?',
      summary: 'Skill det brukeren gjør fra det systemet gjør.',
      minutes: 4,
      takeaway:
        'Bak hver knapp: Hva må systemet sjekke?\nHva skal lagres?\nHva skal brukeren få vite – både når det går bra og når det ikke gjør det?\nEt tydelig avslag kan være helt riktig oppførsel.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a5-begreper',
          title: 'Ett trykk – mange steg',
          role: 'explain',
          source: a5,
          idea: 'Biblioteket har et gratis kveldsforedrag med 40 plasser. Ali trykker «Meld meg på».\nTrykket er en brukerhandling. Her sjekker appen plass og registrerer påmeldingen før den svarer. Dette er systematferd. Ali ser handlingen sin og svaret på skjermen, men ikke sjekken og registreringen bak.',
          bridge: 'Neste: koble Alis handlinger til systemets svar.',
        },
        {
          kind: 'match',
          leftPresentation: 'text',
          id: 'tsu-a5-svar',
          title: 'Koble handlingen til systemets svar',
          role: 'scaffold',
          source: a5,
          leftLabel: 'Ali gjør',
          rightLabel: 'Systemet gjør',
          pairs: [
            {
              id: 'meld-pa',
              left: 'Melder seg på',
              right: 'Sjekker plass, lagrer',
            },
            {
              id: 'feil-epost',
              left: 'Skriver e-postadresse uten @',
              right: 'Ber om gyldig e-postformat',
            },
            {
              id: 'meld-av',
              left: 'Melder seg av',
              right: 'Frigjør plassen',
            },
          ],
          rightOrder: ['meld-av', 'meld-pa', 'feil-epost'],
          hint: 'Hva må systemet gjøre for at Alis handling skal få riktig resultat?',
          explanation:
            'Systemet sjekker plass før en påmelding lagres, ber om gyldig e-postformat når @ mangler, og frigjør plassen ved avmelding. Formatkontroll viser ikke om adressen tilhører riktig person.',
        },
        {
          kind: 'order',
          id: 'tsu-a5-rekkefolge',
          title: 'Sett systemets steg i riktig rekkefølge',
          role: 'representation',
          source: a5,
          context:
            'Ali har trykket «Meld meg på» for et foredrag. Opplysningene er gyldige, og det er ledig plass.',
          items: [
            { id: 'lagre', label: 'Lagre påmeldingen' },
            { id: 'motta', label: 'Motta forespørselen' },
            { id: 'bekrefte', label: 'Vise «Du er påmeldt»' },
            { id: 'sjekke', label: 'Sjekke at det er ledig plass' },
          ],
          correctOrder: ['motta', 'sjekke', 'lagre', 'bekrefte'],
          hint: 'Hva trenger systemet å motta før det kan sjekke noe? Hva må være avklart før påmeldingen lagres?',
          explanation:
            'Motta forespørselen, sjekk plass, lagre påmeldingen og vis bekreftelsen. Rekkefølgen alene hindrer ikke dobbeltbooking ved samtidige forsøk.',
        },
        {
          kind: 'select',
          id: 'tsu-a5-samtidig',
          title: 'Én plass igjen',
          question: 'Hva bør systemet gjøre?',
          role: 'retrieval',
          source: a5,
          context:
            'Et foredrag har 40 plasser, og bare én er ledig. Ali og Sara trykker «Meld meg på» nesten samtidig.',
          options: [
            {
              id: 'begge',
              label: 'Bekrefte begge.',
              feedback:
                'Da brytes regelen om 40 plasser, og én får et løfte som ikke holder.',
            },
            {
              id: 'ingen',
              label: 'Avvise begge.',
              feedback: 'Det er en plass ledig. Én av dem bør få den.',
            },
            {
              id: 'forst',
              label: 'Én får plassen, én får et nei.',
            },
          ],
          correctId: 'forst',
          hint: 'Hva sier regelen om antall plasser?',
          explanation:
            'Bare én påmelding kan godtas for den siste plassen. Systemet må håndtere avgjørelsen pålitelig også når forsøkene skjer samtidig. Den andre må få beskjed om at plassen er tatt.',
        },
        {
          kind: 'select',
          id: 'tsu-a5-avslag',
          title: 'Appen gir to ulike svar',
          role: 'application',
          source: a5,
          question: 'Hva bør utviklingsteamet undersøke først?',
          context:
            'Sara får beskjeden «Foredraget er fullt». Samtidig viser appen «1 plass ledig».',
          options: [
            {
              id: 'riktig',
              label: 'Sjekke kapasitet og påmeldinger.',
            },
            {
              id: 'alltid-ja',
              label: 'Endre appen så den alltid bekrefter påmelding.',
              feedback:
                'En bekreftelse lover en plass. Hvis det er fullt, er løftet feil. Undersøk først hvorfor appen gir ulike svar.',
            },
            {
              id: 'sara',
              label: 'Be Sara prøve igjen til hun får en bekreftelse.',
              feedback:
                'Flere forsøk forklarer ikke hvorfor appen viser to ulike svar. Teamet må finne ut om det faktisk er plass.',
            },
          ],
          correctId: 'riktig',
          hint: 'Hvilke opplysninger kan vise om det faktisk er plass?',
          explanation:
            'Avslaget kan være riktig og tallet utdatert. Påmeldingslogikken kan også være feil. Sjekk kapasitet, påmeldinger og oppførsel før dere retter.',
        },
        {
          kind: 'select',
          id: 'tsu-a5-kantine',
          title: 'Betalingen avvises',
          role: 'application',
          source: a5,
          context: 'Sara trykker «Betal», men banken avviser kortet.',
          question: 'Hva bør kantine-appen gjøre?',
          options: [
            {
              id: 'bruker',
              label: 'Si at den er betalt.',
              feedback:
                'Betalingen ble avvist. Appen må ikke si at bestillingen er betalt.',
            },
            {
              id: 'system',
              label: 'Vise «Betaling avvist».',
            },
            {
              id: 'blandet',
              label: 'Trekke beløpet på nytt.',
              feedback:
                'Et nytt forsøk bør ikke skje uten at brukeren forstår hva som skjer. Ellers kan betaling bli forsøkt flere ganger.',
            },
          ],
          correctId: 'system',
          hint: 'Hva bør appen vise når betalingen ikke gikk gjennom?',
          explanation:
            'Appen skal vise at betalingen ikke gikk gjennom og ikke markere bestillingen som betalt. Sara kan velge hva hun vil gjøre videre.',
        },
      ],
    },
    {
      id: 'tsu-rolle-fase',
      title: 'Rolle, fase, oppgave eller status?',
      summary: 'Se hvordan utviklingsarbeid organiseres.',
      minutes: 5,
      takeaway:
        'Rolle = hvem har ansvar. Fase = hvor i prosjektet.\nOppgave = hva som skal gjøres. Status = hvor langt det har kommet.\nAnsvar betyr ikke å jobbe alene. Når delene henger sammen, må de som har ansvar for dem, snakke sammen.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a6-begreper',
          title: 'Fire stikkord om hvordan arbeid organiseres',
          role: 'explain',
          source: a6,
          idea: 'Disse fire stikkordene hjelper deg å holde arbeidet i et team fra hverandre.',
          definitions: [
            { term: 'Rolle', text: 'hvem som har ansvar for noe.' },
            {
              term: 'Fase',
              text: 'en større del av et prosjekt, for eksempel planlegging eller testing.',
            },
            { term: 'Oppgave', text: 'et konkret arbeid som kan bli ferdig.' },
            { term: 'Status', text: 'hvor langt en oppgave har kommet.' },
          ],
          bridge: 'Neste: et team lager en bestillingsapp.',
        },
        {
          kind: 'match',
          leftPresentation: 'text',
          id: 'tsu-a6-ord',
          title: 'Koble hvert ord til riktig type',
          role: 'scaffold',
          source: a6,
          leftLabel: 'Fra prosjektet',
          rightLabel: 'Type',
          pairs: [
            { id: 'rolle', left: 'Teknisk ansvarlig', right: 'Rolle' },
            {
              id: 'fase',
              left: 'Planlegging',
              right: 'Fase',
            },
            {
              id: 'oppgave',
              left: 'Beskrive bestillingen',
              right: 'Oppgave',
            },
            { id: 'status', left: 'Under arbeid', right: 'Status' },
          ],
          rightOrder: ['status', 'oppgave', 'rolle', 'fase'],
          hint: 'Hvilket ord sier hvor langt noe har kommet?',
          explanation:
            'Teknisk ansvarlig har en rolle. Planlegging er en fase. Å beskrive bestillingen er en oppgave. «Under arbeid» viser status.',
        },
        {
          kind: 'select',
          id: 'tsu-a6-testing',
          title: 'Er «testing» en fase eller en aktivitet?',
          role: 'retrieval',
          source: a6,
          options: [
            {
              id: 'slutt',
              label: 'Alltid en fase til slutt.',
              feedback:
                'I en plan med faste trinn kan det stemme. Men mange team tester i hver korte runde, ikke bare til slutt.',
            },
            {
              id: 'sammenheng',
              label: 'Kommer an på sammenheng.',
            },
            {
              id: 'rolle',
              label: 'Det er en rolle.',
              feedback: 'En tester er en rolle. Testing er noe man gjør.',
            },
          ],
          correctId: 'sammenheng',
          hint: 'Tenk på team som planlegger, utvikler og tester i korte runder.',
          explanation:
            'Testing kan være en fase eller en aktivitet. På et Kanban-brett kan «Testing» være en kolonne som viser hvor oppgaven er i arbeidet.',
        },
        {
          kind: 'select',
          id: 'tsu-a6-samarbeid',
          title: 'Jonas og Mia',
          question: 'Hva må Jonas avklare med Mia?',
          role: 'application',
          source: a6,
          context:
            'Jonas lager skjermen for bestilling. Mia lager funksjonen som finner ledige plasser. Jonas vet ikke når tallet oppdateres.',
          options: [
            {
              id: 'alene',
              label: 'Vise et fast tall på skjermen.',
              feedback:
                'Et fast tall kan villede brukeren. Tallet må komme fra informasjon om plasser og bestillinger.',
            },
            {
              id: 'vente',
              label: 'Hvilken farge knappen skal ha.',
              feedback:
                'Fargen kan diskuteres senere. Først må de vite hva som faktisk skal vises.',
            },
            {
              id: 'sammen',
              label: 'Hvor tallet kommer fra og når det oppdateres.',
            },
          ],
          correctId: 'sammen',
          hint: 'Hvilken informasjon mangler Jonas for å lage skjermen riktig?',
          explanation:
            'De må avklare hvor tallet kommer fra, når det endres og hvordan det vises, før de bygger hver sin del.',
        },
        {
          kind: 'select',
          id: 'tsu-a6-kanban',
          title: 'Kanban-brettet',
          question: 'Hva tyder dette på?',
          role: 'application',
          source: a6,
          context:
            'Teamet har oppgavene som kort på en tavle, et Kanban-brett. Mange kort står i «Under arbeid», men nesten ingenting blir ferdig.',
          options: [
            {
              id: 'for-mye',
              label: 'De har startet for mye.',
            },
            {
              id: 'kolonner',
              label: 'De trenger flere kolonner.',
              feedback:
                'Flere kolonner gjør ikke at noe blir ferdig. Problemet er hvor mye som er påbegynt.',
            },
            {
              id: 'i-orden',
              label: 'Alt er i orden.',
              feedback:
                'Kanban handler ikke bare om å flytte kort, men om å få arbeid jevnt gjennom til ferdig.',
            },
          ],
          correctId: 'for-mye',
          hint: 'Hva skjer når alle starter noe nytt i stedet for å gjøre ferdig?',
          explanation:
            'Kanban handler om flyt, ikke bare kolonner. Færre samtidige oppgaver kan gjøre det lettere å finne stopp og gjøre arbeid ferdig.',
        },
        {
          kind: 'learn',
          id: 'tsu-a6-scrum',
          title: 'Når en oppgave venter på et svar',
          role: 'explain',
          source: a6,
          idea: 'Et team lager en app for en nabolagsforening. Nora skal teste aldersgrensen for turpåmelding. Oppgaven står som «Venter på avklaring»: Gjelder grensen ved påmelding eller på turdagen?\nNora kan ikke vurdere testresultatet før regelen er tydelig. Teamet må avtale hvem som avklarer regelen med foreningen og gir svaret videre til Nora. Statusen viser at arbeidet venter, men sier ikke alene hvem som skal svare.',
          bridge: 'Neste: bruk stikkordene i et prosjekt for en festival.',
        },
        {
          kind: 'match',
          leftPresentation: 'text',
          id: 'tsu-a6-festival',
          title: 'Festivalnettside: koble ordene',
          role: 'application',
          source: a6,
          leftLabel: 'Fra prosjektet',
          rightLabel: 'Type',
          pairs: [
            { id: 'rolle', left: 'Designansvarlig', right: 'Rolle' },
            {
              id: 'oppgave',
              left: 'Lage skjema for frivillige',
              right: 'Oppgave',
            },
            { id: 'status', left: 'Klar til testing', right: 'Status' },
          ],
          rightOrder: ['oppgave', 'status', 'rolle'],
          hint: 'Ett av dem sier hvor langt en oppgave har kommet.',
          explanation:
            'Designansvarlig er en rolle. Å lage skjemaet for frivillige er en oppgave. «Klar til testing» viser status.',
        },
      ],
    },
    ...scrumSessions,
    ...smidigSamarbeidSessions,
    ...kanbanSessions,
    ...sqlMysqlSessions,
  ],
};
