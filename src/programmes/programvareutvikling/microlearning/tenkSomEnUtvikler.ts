import type { MicroSource, MicroTrack } from '@/lib/domain';

/**
 * «Tenk som en utvikler»: a voluntary track of six short activities about how
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
  title: 'Tenk som en utvikler',
  summary:
    'Seks korte aktiviteter om behov, krav, data, systemer og samarbeid.',
  sessions: [
    {
      id: 'tsu-behov-eller-losning',
      title: 'Behov eller løsning?',
      summary: 'Finn behovet bak et løsningsforslag.',
      minutes: 3,
      takeaway:
        'Når noen sier «vi trenger X», spør: Hvilket problem skal X løse? Hvem har behovet? Hva tar vi for gitt?\nDa kan du vurdere om X er den beste løsningen – eller bare den første ideen.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a1-ord',
          title: 'Fire ord som hjelper deg',
          role: 'explain',
          source: a1,
          idea: 'Problem: det som ikke fungerer godt i dag.\nBehov: det noen trenger å få til.\nLøsningsforslag: én mulig måte å dekke behovet på.\nAntakelse: noe vi tror, men ikke har sjekket.',
          bridge: 'Neste: et treningssenter vil ha en app.',
        },
        {
          kind: 'select',
          id: 'tsu-a1-behov',
          title: 'Hva er det egentlige behovet?',
          role: 'scaffold',
          source: a1,
          context:
            'Et treningssenter sier: «Vi trenger en app med QR-kode for innsjekk.» Grunnen er lang kø om morgenen, fordi de ansatte skriver inn hvert medlem for hånd.',
          options: [
            {
              id: 'app',
              label: 'En app med QR-kode.',
              feedback:
                'Dette er løsningen de foreslår. Hva skal QR-koden hjelpe medlemmene med?',
            },
            {
              id: 'rask',
              label: 'Rask innsjekk uten kø.',
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
              left: 'Innsjekk på sekunder',
              right: 'Behov',
            },
            {
              id: 'losning',
              left: 'En app med QR-kode',
              right: 'Løsningsforslag',
            },
            {
              id: 'antakelse',
              left: 'Alle har smarttelefon',
              right: 'Antakelse',
            },
          ],
          rightOrder: ['losning', 'antakelse', 'problem', 'behov'],
          hint: 'Hvilket utsagn tar noe for gitt uten at det er sjekket?',
          explanation:
            'Køen er problemet. Rask innsjekk er behovet. Appen er ett forslag. At alle har mobil, er en antakelse som bør sjekkes.',
        },
        {
          kind: 'select',
          id: 'tsu-a1-hvorfor',
          title: 'Hvorfor finne behovet før du lager appen?',
          role: 'application',
          source: a1,
          options: [
            {
              id: 'darlig',
              label: 'QR-kode er alltid dårlig.',
              feedback:
                'QR-kode kan godt være et godt valg. Poenget er å vite hvilket behov den skal dekke.',
            },
            {
              id: 'sammenligne',
              label: 'For å se flere løsninger.',
            },
            {
              id: 'feil',
              label: 'Kunden tar som regel feil.',
              feedback:
                'Kunden kjenner ofte problemet godt. Forslaget er nyttig, men ikke nødvendigvis det eneste.',
            },
          ],
          correctId: 'sammenligne',
          hint: 'Hva kan gå galt hvis en antakelse viser seg å være feil?',
          explanation:
            'Kjenner du behovet, kan du vurdere flere løsninger – og unngå å løse feil problem.',
        },
        {
          kind: 'select',
          id: 'tsu-a1-bibliotek',
          title: 'Ny situasjon: Hva trenger lånerne?',
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
      summary: 'Skill funksjon, egenskap og regel.',
      minutes: 4,
      takeaway:
        'Spør om hvert krav: Sier det hva systemet skal gjøre, hvor godt det skal fungere, eller er det en konkret regel?\nOrdet «sikkerhet» avgjør ikke svaret. Et vagt krav må gjøres konkret før du kan teste det.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a2-typer',
          title: 'Tre slags krav',
          role: 'explain',
          source: a2,
          idea: 'Et krav beskriver noe systemet skal gjøre eller oppfylle.\nFunksjonelt krav: hva systemet skal kunne gjøre.\nIkke-funksjonelt krav: hvor godt det skal fungere, for eksempel fart eller sikkerhet. Vi kaller det en egenskap.\nRegel: hva systemet konkret skal tillate eller avvise.',
          bridge: 'Neste: to krav om innlogging.',
        },
        {
          kind: 'select',
          id: 'tsu-a2-innlogging',
          title: 'Hvilket krav beskriver en egenskap?',
          context:
            'A: «Brukeren skal kunne logge inn.» B: «Innloggingen skal beskytte mot uvedkommende tilgang.»',
          role: 'scaffold',
          source: a2,
          options: [
            {
              id: 'logge-inn',
              label: 'Krav A',
              feedback:
                'Krav A sier hva systemet skal kunne gjøre. Det er en funksjon.',
            },
            {
              id: 'beskytte',
              label: 'Krav B',
            },
            {
              id: 'begge',
              label: 'Begge er funksjoner.',
              feedback:
                'Det ene kravet sier ikke hva systemet gjør, men hvor trygt det skal være.',
            },
          ],
          correctId: 'beskytte',
          hint: 'Hvilket krav sier hvor godt, ikke hva?',
          explanation:
            'Å beskytte mot uvedkommende er en egenskap: hvor trygg løsningen skal være. Den sier ikke nøyaktig hva systemet skal gjøre.',
        },
        {
          kind: 'match',
          id: 'tsu-a2-bibliotek',
          title: 'Bibliotekapp: koble kravet til typen',
          role: 'representation',
          source: a2,
          leftLabel: 'Krav',
          rightLabel: 'Type',
          pairs: [
            {
              id: 'funksjon',
              left: 'Forlenge et lån',
              right: 'Funksjon',
            },
            {
              id: 'egenskap',
              left: 'Svar innen 2 sekunder',
              right: 'Egenskap',
            },
            {
              id: 'regel',
              left: 'Sperr etter 5 feil passord',
              right: 'Regel',
            },
          ],
          rightOrder: ['regel', 'funksjon', 'egenskap'],
          hint: 'Hvilket krav sier nøyaktig hva systemet gjør i en bestemt situasjon?',
          explanation:
            'Lån er en funksjon, svartid en egenskap, og sperringen en konkret regel.',
        },
        {
          kind: 'select',
          id: 'tsu-a2-sikkerhet',
          title: 'Er sperringen et ikke-funksjonelt krav?',
          role: 'retrieval',
          source: a2,
          context:
            '«Sperr kontoen i 15 min etter fem feil passord.» Det handler om sikkerhet.',
          options: [
            {
              id: 'ja',
              label: 'Ja, alt om sikkerhet er det.',
              feedback:
                'Ordet «sikkerhet» avgjør ikke typen. Sier kravet hva systemet gjør, eller hvor godt det skal fungere?',
            },
            {
              id: 'regel',
              label: 'Nei, det er en konkret regel.',
            },
            {
              id: 'ikke-krav',
              label: 'Nei, det er ikke et krav.',
              feedback:
                'Det er et krav: Du kan sjekke om systemet faktisk gjør det.',
            },
          ],
          correctId: 'regel',
          hint: 'Kan du teste kravet ved å gjøre noe og se hva systemet svarer?',
          explanation:
            'Sikkerhet er en egenskap. Sperringen er en konkret regel som gjør systemet sikrere.',
        },
        {
          kind: 'select',
          id: 'tsu-a2-testbart',
          title: 'Hvilken omskriving kan du teste?',
          role: 'application',
          source: a2,
          context: '«Systemet skal være sikkert» er vanskelig å teste.',
          options: [
            {
              id: 'svaert',
              label: 'Svært sikkert system.',
              feedback:
                '«Svært sikkert» er fortsatt uklart. Hvordan skulle du sjekke det?',
            },
            {
              id: 'egen',
              label: 'Låneren ser bare egne lån.',
            },
            {
              id: 'ny',
              label: 'Bruk den nyeste teknologien.',
              feedback:
                'Ny teknologi gjør ikke et system sikkert av seg selv, og kravet sier ikke hva som skal sjekkes.',
            },
          ],
          correctId: 'egen',
          hint: 'Velg kravet der du kan si: «Jeg gjør … og forventer at …».',
          explanation:
            'Test: Logg inn som én låner og åpne en annens historikk. Systemet skal si nei.',
        },
        {
          kind: 'match',
          id: 'tsu-a2-billett',
          title: 'Billettapp: koble kravet til typen',
          role: 'application',
          source: a2,
          leftLabel: 'Krav',
          rightLabel: 'Type',
          pairs: [
            {
              id: 'funksjon',
              left: 'Kjøpe enkeltbillett',
              right: 'Funksjon',
            },
            {
              id: 'egenskap',
              left: 'Åpner på under 3 sek.',
              right: 'Egenskap',
            },
            {
              id: 'regel',
              left: 'Utløpt billett avvises',
              right: 'Regel',
            },
          ],
          rightOrder: ['egenskap', 'regel', 'funksjon'],
          hint: 'Hvilket krav handler om hvor raskt, ikke om hva?',
          explanation:
            'Kjøpe billett er en funksjon. Åpningstid er en egenskap. At utløpte billetter avvises, er en regel.',
        },
      ],
    },
    {
      id: 'tsu-informasjon-funksjon',
      title: 'Informasjon eller funksjon?',
      summary: 'Skill det systemet vet fra det det gjør.',
      minutes: 3,
      takeaway:
        'For hver funksjon: Hvilken informasjon trenger den?\nFor hver opplysning: Hvilke funksjoner bruker den, og hvilke endrer den?\nDa ser du hvordan delene henger sammen – uten å skrive kode.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a3-begreper',
          title: 'Det systemet vet, og det systemet gjør',
          role: 'explain',
          source: a3,
          idea: 'Informasjon er det systemet må vite og huske. «Gruppetime» med tid, sal og antall plasser er informasjon.\nEn funksjon er noe som gjøres med informasjonen. «Bestille gruppetime» er en funksjon.\nTips: Informasjon er ofte et substantiv, en funksjon ofte et verb.',
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
              id: 'time',
              label: 'Gruppetime: tid, sal, plasser',
            },
            {
              id: 'melde',
              label: 'Melde seg på en time',
              feedback:
                '«Melde seg på» er en handling. Den bruker og endrer informasjon.',
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
              right: 'Medlemmer: e-post og passord',
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
            'Timeplanen bygger på gruppetimene, innloggingen på medlemmene, og deltakerlisten på påmeldingene.',
        },
        {
          kind: 'select',
          id: 'tsu-a3-pamelding',
          title: 'Hva må påmeldingen vite?',
          role: 'retrieval',
          source: a3,
          context: 'Funksjonen «Melde seg på en time».',
          options: [
            {
              id: 'bare-time',
              label: 'Bare hvilken time.',
              feedback:
                'Da vet ikke systemet hvem som meldte seg på, eller om timen er full.',
            },
            {
              id: 'alt',
              label: 'Time, medlem og påmeldte.',
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
            'Én funksjon trenger ofte flere opplysninger. Uten antall påmeldte kan systemet ikke vite om det er plass.',
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
              id: 'beskrivelse',
              label: 'Beskrivelsen av timen.',
              feedback:
                'Beskrivelsen hører til timen og endrer seg ikke når noen melder seg på.',
            },
            {
              id: 'ledige',
              label: 'Antall ledige plasser.',
            },
            {
              id: 'apningstid',
              label: 'Åpningstidene.',
              feedback: 'Åpningstider har ikke noe med påmeldinger å gjøre.',
            },
          ],
          correctId: 'ledige',
          hint: 'Hvilket tall endrer seg når noen melder seg på?',
          explanation:
            'Ledige plasser = antall plasser minus antall påmeldte. Derfor er den funksjonen avhengig av påmeldingene.',
        },
        {
          kind: 'select',
          id: 'tsu-a3-konsert',
          title: 'Ny situasjon: Hvilket av disse er en funksjon?',
          role: 'application',
          source: a3,
          context: 'En app for konsertbilletter.',
          options: [
            {
              id: 'konsert',
              label: 'Konsert',
              feedback:
                'Artist, sted og dato er opplysninger systemet må kjenne.',
            },
            {
              id: 'sete',
              label: 'Sitteplass',
              feedback:
                'Rad, sete og om plassen er solgt, er informasjon systemet holder rede på.',
            },
            { id: 'kjope', label: 'Kjøpe billett' },
          ],
          correctId: 'kjope',
          hint: 'Se etter en handling, ikke en ting.',
          explanation:
            'Å kjøpe billett er en funksjon. Den bruker informasjon om konserten og sitteplassene, og endrer om en plass er solgt.',
        },
      ],
    },
    {
      id: 'tsu-data-mangler',
      title: 'Hva skjer når data mangler?',
      summary: 'Undersøk hvilke funksjoner som påvirkes.',
      minutes: 4,
      takeaway:
        'Når noe mangler, ikke anta at alt eller ingenting virker. Gå gjennom funksjonene: Hvilken informasjon trenger den? Virker den, eller gir den feil svar? Hva bør brukeren få vite?\nEt feil tall som ser riktig ut, er ofte farligere enn en tydelig melding.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a4-situasjon',
          title: 'En morgen mangler noe',
          role: 'explain',
          source: a4,
          idea: 'Treningsappen henter to ting:\nTimeplanen: navn, tid, sal og antall plasser.\nPåmeldingene: hvem som er meldt på hvilken time.\nEn morgen får appen hentet timeplanen, men ikke påmeldingene.',
          bridge: 'Neste: Hva tror du skjer?',
        },
        {
          kind: 'select',
          id: 'tsu-a4-hva-skjer',
          title: 'Hva tror du skjer med appen?',
          role: 'scaffold',
          source: a4,
          options: [
            {
              id: 'alt-stopper',
              label: 'Hele appen stopper.',
              feedback:
                'Timeplanen er hentet. Det som bare trenger timeplanen, kan fortsatt vises.',
            },
            {
              id: 'som-vanlig',
              label: 'Alt virker som vanlig.',
              feedback:
                'Noen funksjoner trenger påmeldingene. De kan ikke regne riktig nå.',
            },
            {
              id: 'delvis',
              label: 'Noe virker, noe gir feil svar.',
            },
          ],
          correctId: 'delvis',
          hint: 'Hvilke funksjoner må vite hvem som er påmeldt?',
          explanation:
            'Systemer svikter sjelden «alt eller ingenting». Undersøk hver funksjon: Hvilken informasjon trenger den, og har vi den nå?',
        },
        {
          kind: 'match',
          id: 'tsu-a4-pavirkes',
          title: 'Koble funksjonen til hvordan den påvirkes',
          role: 'representation',
          source: a4,
          context: 'Påmeldingene mangler.',
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
              right: 'Bør vente til data er tilbake',
            },
          ],
          rightOrder: ['ledige', 'melde', 'tid'],
          hint: 'Hvilken informasjon trenger hver funksjon?',
          explanation:
            'Tid og sal står i timeplanen. Ledige plasser trenger påmeldingene. En påmelding nå kan gi for mange deltakere.',
        },
        {
          kind: 'select',
          id: 'tsu-a4-feil-tall',
          title: 'Hva har mest sannsynlig skjedd?',
          role: 'retrieval',
          source: a4,
          context:
            'Appen viser «20 ledige plasser» på en time som egentlig er full.',
          options: [
            {
              id: 'null',
              label: 'Null påmeldte ble antatt.',
            },
            {
              id: 'flere',
              label: 'Timen fikk flere plasser.',
              feedback:
                'Antall plasser står i timeplanen, og den er uendret. Se på det som mangler.',
            },
            {
              id: 'avmeldt',
              label: 'Alle meldte seg av.',
              feedback:
                'Mulig, men lite sannsynlig. Vi vet allerede at påmeldingene ikke ble hentet.',
            },
          ],
          correctId: 'null',
          hint: 'Hva blir «plasser minus påmeldte» hvis appen tror at ingen er påmeldt?',
          explanation:
            'Manglende data ble behandlet som null påmeldte. Tallet ser riktig ut, men er feil. Det kan være verre enn ingen tall.',
        },
        {
          kind: 'select',
          id: 'tsu-a4-best',
          title: 'Hvordan bør appen oppføre seg nå?',
          role: 'application',
          source: a4,
          options: [
            {
              id: 'skjul',
              label: 'Skjule hele timeplanen.',
              feedback:
                'Da mister medlemmene også det som virker. Timeplanen er jo riktig.',
            },
            {
              id: 'aerlig',
              label: 'Vise timeplanen, si fra.',
            },
            {
              id: 'null',
              label: 'Vise 0 ledige plasser.',
              feedback:
                '0 er også et feil tall. Da tror alle at timene er fulle.',
            },
          ],
          correctId: 'aerlig',
          hint: 'Hvilket svar gir riktig informasjon og ingen falske tall?',
          explanation:
            'Vis det som er riktig, si fra om det som mangler, og stopp handlinger som kan gi feil resultat.',
        },
        {
          kind: 'select',
          id: 'tsu-a4-reiseapp',
          title: 'Ny situasjon: Hva stemmer?',
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
              label: 'Planlagt tid, ikke forsinkelser.',
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
            'Planlagte tider bygger på ruteplanen, forsinkelser på sanntidsdata. En god app sier fra at tidene er planlagte.',
        },
      ],
    },
    {
      id: 'tsu-handling-atferd',
      title: 'Brukerhandling eller systematferd?',
      summary: 'Skill det brukeren gjør fra det systemet gjør.',
      minutes: 4,
      takeaway:
        'Bak hver knapp ligger spørsmål: Hva må systemet sjekke? Hva skal lagres? Hva skal brukeren få vite – både når det går bra og når det ikke gjør det?\nEt tydelig avslag kan være helt riktig oppførsel.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a5-begreper',
          title: 'Ett trykk – mange steg',
          role: 'explain',
          source: a5,
          idea: 'Biblioteket har et gratis kveldsforedrag med 40 plasser. Ali trykker «Meld meg på».\nTrykket er en brukerhandling. Det systemet gjør etterpå, er systematferd: det sjekker, lagrer og gir beskjed. Det meste ser Ali aldri.',
          bridge: 'Neste: koble Alis handlinger til systemets svar.',
        },
        {
          kind: 'match',
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
              left: 'Skriver feil e-post',
              right: 'Ber om gyldig e-post',
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
            'Hver brukerhandling utløser systematferd: kontroll, lagring eller sletting, og en beskjed tilbake.',
        },
        {
          kind: 'order',
          id: 'tsu-a5-rekkefolge',
          title: 'Sett systemets steg i riktig rekkefølge',
          role: 'representation',
          source: a5,
          context: 'Ali har trykket «Meld meg på».',
          items: [
            { id: 'lagre', label: 'Lagre påmeldingen' },
            { id: 'motta', label: 'Ta imot påmeldingen' },
            { id: 'bekrefte', label: 'Vise «Du er påmeldt»' },
            { id: 'sjekke', label: 'Sjekke at det er ledig plass' },
          ],
          correctOrder: ['motta', 'sjekke', 'lagre', 'bekrefte'],
          hint: 'Hva må være sikkert før systemet sier «Du er påmeldt»?',
          explanation:
            'Først kontroll, så lagring, så bekreftelse. Lagres det før kontrollen, kan foredraget bli overbooket.',
        },
        {
          kind: 'select',
          id: 'tsu-a5-samtidig',
          title: 'Hva bør systemet gjøre?',
          role: 'retrieval',
          source: a5,
          context:
            'Det er én plass igjen. Ali og Sara trykker «Meld meg på» nesten samtidig.',
          options: [
            {
              id: 'begge',
              label: 'Bekrefte begge.',
              feedback:
                'Da brytes regelen om 40 plasser, og én får et løfte som ikke holder.',
            },
            {
              id: 'forst',
              label: 'Én får plassen, én får et nei.',
            },
            {
              id: 'ingen',
              label: 'Avvise begge.',
              feedback: 'Det er en plass ledig. Én av dem bør få den.',
            },
          ],
          correctId: 'forst',
          hint: 'Hva sier regelen om antall plasser?',
          explanation:
            'Bare én skal få den siste plassen. Den andre skal få et tydelig avslag. Også et avslag er riktig systematferd.',
        },
        {
          kind: 'select',
          id: 'tsu-a5-avslag',
          title: 'Er dette en feil i systemet?',
          role: 'application',
          source: a5,
          context: 'Sara får beskjeden «Foredraget er fullt».',
          options: [
            {
              id: 'alltid-ja',
              label: 'Ja, systemet skal si ja.',
              feedback:
                'Systemet skal følge regelen om 40 plasser. Et ja ville vært feil.',
            },
            {
              id: 'riktig',
              label: 'Nei, avslaget er riktig.',
            },
            {
              id: 'sara',
              label: 'Ja, Sara gjorde noe galt.',
              feedback:
                'Sara gjorde ingenting galt. Plassene var bare brukt opp.',
            },
          ],
          correctId: 'riktig',
          hint: 'Hva forventer du skal skje når alle plassene er tatt?',
          explanation:
            'Forventet oppførsel gjelder også når noe ikke går. Når du tester, sjekk at systemet sier nei når det skal.',
        },
        {
          kind: 'select',
          id: 'tsu-a5-kantine',
          title: 'Ny situasjon: Hvilken liste er bare systematferd?',
          role: 'application',
          source: a5,
          context: 'Sara trykker «Betal» i kantine-appen.',
          options: [
            {
              id: 'bruker',
              label: 'Velge mat, betale, vente.',
              feedback: 'Alt dette gjør Sara selv. Det er brukerhandlinger.',
            },
            {
              id: 'system',
              label: 'Sjekke, registrere, gi beskjed.',
            },
            {
              id: 'blandet',
              label: 'Betale, sjekke, gi beskjed.',
              feedback: 'Å betale gjør Sara. Resten gjør systemet.',
            },
          ],
          correctId: 'system',
          hint: 'Hvem gjør handlingen – Sara eller appen?',
          explanation:
            'Systemet sjekker, registrerer og gir beskjed. Avvises betalingen, skal Sara få vite det, og ingen bestilling registreres.',
        },
      ],
    },
    {
      id: 'tsu-rolle-fase',
      title: 'Rolle, fase, oppgave eller status?',
      summary: 'Se hvordan utviklingsarbeid organiseres.',
      minutes: 5,
      takeaway:
        'Rolle = hvem har ansvar. Fase = hvor i prosjektet. Oppgave = hva som skal gjøres. Status = hvor langt det har kommet.\nAnsvar betyr ikke å jobbe alene. Når delene henger sammen, må de som har ansvar for dem, snakke sammen.',
      cards: [
        {
          kind: 'learn',
          id: 'tsu-a6-begreper',
          title: 'Fire ord om hvordan arbeid organiseres',
          role: 'explain',
          source: a6,
          idea: 'Rolle: hvem som har ansvar for noe.\nFase: et trinn i prosjektet, for eksempel kravarbeid.\nOppgave: et konkret arbeid som kan bli ferdig.\nStatus: hvor langt en oppgave har kommet.',
          bridge: 'Neste: et team lager en bestillingsapp.',
        },
        {
          kind: 'match',
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
              left: 'Kravarbeid (trinn 1 i planen)',
              right: 'Fase',
            },
            {
              id: 'oppgave',
              left: 'Beskrive bestillingsflyten',
              right: 'Oppgave',
            },
            { id: 'status', left: 'Under arbeid', right: 'Status' },
          ],
          rightOrder: ['status', 'oppgave', 'rolle', 'fase'],
          hint: 'Hvilket ord sier hvor langt noe har kommet?',
          explanation:
            'Teknisk ansvarlig er et ansvar. Kravarbeid er et trinn. Å beskrive flyten er et konkret arbeid. Under arbeid er en status.',
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
            'Samme ord kan bety ulike ting. På en oppgavetavle kan «Testing» til og med være en kolonne – en status.',
        },
        {
          kind: 'select',
          id: 'tsu-a6-samarbeid',
          title: 'Hva bør Jonas gjøre?',
          role: 'application',
          source: a6,
          context:
            'Mia er teknisk ansvarlig. Jonas har ansvar for brukeropplevelsen. Han vil at bestillingsknappen skal vise ledige plasser.',
          options: [
            {
              id: 'alene',
              label: 'Bestemme det alene.',
              feedback:
                'Ledige plasser krever data og logikk som Mia har ansvaret for. Ideen påvirker begge.',
            },
            {
              id: 'sammen',
              label: 'Ta det opp med Mia.',
            },
            {
              id: 'vente',
              label: 'Vente til Mia er ferdig.',
              feedback:
                'Da kan det bli dyrt å endre senere. Snakk sammen tidlig.',
            },
          ],
          correctId: 'sammen',
          hint: 'Hvilken informasjon trenger knappen? Hvem har ansvar for den?',
          explanation:
            'Ansvar sier hvem som sørger for at noe blir gjort. Samarbeid er hvordan dere jobber sammen når delene påvirker hverandre.',
        },
        {
          kind: 'select',
          id: 'tsu-a6-kanban',
          title: 'Hva tyder dette på?',
          role: 'application',
          source: a6,
          context:
            'Teamet har oppgavene som kort på en tavle, et Kanban-brett. Mange kort står i «Under arbeid», men nesten ingenting blir ferdig.',
          options: [
            {
              id: 'kolonner',
              label: 'De trenger flere kolonner.',
              feedback:
                'Flere kolonner gjør ikke at noe blir ferdig. Problemet er hvor mye som er påbegynt.',
            },
            {
              id: 'for-mye',
              label: 'De har startet for mye.',
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
            'Kanban er mer enn kolonner. Teamet følger med på flyten og begrenser hvor mye som er påbegynt. Da blir mer ferdig.',
        },
        {
          kind: 'learn',
          id: 'tsu-a6-scrum',
          title: 'Egne roller er ikke Scrum-roller',
          role: 'explain',
          source: a6,
          idea: 'Scrum er en kjent måte å organisere utviklingsarbeid på. Den har tre faste ansvarsområder: Product Owner, Scrum Master og Developers. Scrum Master er ikke prosjektleder, men hjelper teamet å jobbe godt.\n«Teknisk ansvarlig» er en rolle dere velger selv. Den er nyttig, men ikke en Scrum-rolle.',
          bridge: 'Neste: en ny situasjon.',
        },
        {
          kind: 'match',
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
            'Designansvarlig er en rolle, skjemaet en oppgave og «Klar til testing» en status.',
        },
      ],
    },
  ],
};
