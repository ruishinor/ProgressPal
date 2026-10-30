import type { MicroKanbanBoard, MicroSession } from '@/lib/domain';

import { source } from './source';

const k01 = source('K01');
const k02 = source('K02');
const k03 = source('K03');
const k04 = source('K04');
const k05 = source('K05');
const k06 = source('K06');

// One fictional board, before and after the same two tasks finish. The assessed
// cards reuse these exact states rather than asking learners to remember a list.
const festivalBefore: MicroKanbanBoard = {
  title: 'Tavla til festivalappen · Før',
  wipLimit: 4,
  items: [
    { id: 'kart', title: 'Kart over festivalområdet', status: 'ready' },
    { id: 'forside', title: 'Ny forside', status: 'ready' },
    {
      id: 'sok',
      title: 'Søk etter konserter',
      status: 'active',
      detail: 'Mira utvikler',
    },
    { id: 'billett', title: 'Billettkjøp', status: 'active', detail: 'I test' },
    {
      id: 'innlogging',
      title: 'Innlogging med skolekonto',
      status: 'active',
      blocked: 'Venter på tilgangsnøkkel fra et annet team',
    },
    {
      id: 'varsler',
      title: 'Varsler',
      status: 'active',
      detail: 'Venter på kodegjennomgang',
    },
  ],
};
const festivalAfter: MicroKanbanBoard = {
  ...festivalBefore,
  title: 'Tavla til festivalappen · Etter',
  change:
    'Billettkjøp og Varsler: Pågår → Ferdig. Begge er nå testet og lagt ut i appen. Resten av tavla er uendret.',
  items: festivalBefore.items.map((item) =>
    item.id === 'billett' || item.id === 'varsler'
      ? { ...item, status: 'done', detail: undefined }
      : item,
  ),
};

/** Utviklerblikk · Kanban: ACT 18 activities K01–K06, in authored order. */
export const kanbanSessions: readonly MicroSession[] = [
  {
    id: 'tsu-kanban-k01',
    title: 'Hva forteller arbeidstavlen?',
    summary: 'Skill det tavla viser fra det du tolker inn.',
    minutes: 4,
    takeaway:
      'En arbeidstavle viser hvor arbeidet er akkurat nå. For å tolke den trenger teamet en felles avtale om hva som skal på tavla, når noe er startet og ferdig, og hvilke regler som gjelder.\nKolonner alene er ikke Kanban – det er avtalen bak dem som gjør tavla til et verktøy.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-kanban-k01-forklart',
        title: 'Tavla og avtalen bak den',
        role: 'explain',
        source: k01,
        idea: 'Kanban er en strategi for å få verdi til å flyte best mulig gjennom arbeidet – altså at arbeidet beveger seg jevnt fra det blir startet til det er ferdig.\nFor å få til det må teamet først bli enige om hvordan arbeidsflyten deres ser ut. I Kanban kalles denne felles avtalen en Definition of Workflow. Den beskriver blant annet:',
        definitions: [
          {
            term: 'Arbeidselementer',
            text: 'hva det er som flyter gjennom arbeidet, for eksempel en oppgave eller en ny funksjon. Her kaller vi dem bare oppgaver.',
          },
          {
            term: 'Start og ferdig',
            text: 'når et element regnes som startet, og når det regnes som ferdig.',
          },
          {
            term: 'Tilstander',
            text: 'stegene et element går gjennom på veien, for eksempel «Utvikles» og «Testes».',
          },
          {
            term: 'Eksplisitte arbeidsregler',
            text: 'tydelige avtaler om hva som må være på plass før et element kan gå videre.',
          },
          {
            term: 'Grense og forventning',
            text: 'hvordan teamet begrenser hvor mye arbeid som er i gang samtidig, og en forventning om hvor lang tid en oppgave bør ta.',
          },
          {
            term: 'Kanban-tavle',
            text: 'en måte å gjøre denne avtalen synlig på. En tavle med «Å gjøre», «Pågår» og «Ferdig» kan være en god start. Men kolonner alene er ikke Kanban. Tavla blir først virkelig nyttig når alle er enige om hva den betyr.',
          },
        ],
        bridge: 'Neste: tavla til et team som lager en festivalapp.',
      },
      {
        kind: 'learn',
        id: 'tsu-kanban-k01-situasjon',
        title: 'Tavla til festivalappen',
        role: 'explain',
        source: k01,
        idea: 'Et team på fire lager en app til en musikkfestival. Tavla deres har tre kolonner:\nÅ gjøre: 7 kort.\nPågår: Billettkjøp, Kart over festivalområdet, Varsel når en konsert starter, Fiks feil i innloggingen og Ny forside.\nFerdig: 12 kort.\nDet står ingen datoer, navn eller regler på tavla.',
        bridge: 'Neste: Hva kan du lese av tavla?',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k01-sporsmal',
        title: 'Les tavla',
        role: 'scaffold',
        source: k01,
        context:
          'Tavla har tre kolonner. «Å gjøre» har 7 kort. «Pågår» har fem kort: Billettkjøp, Kart over festivalområdet, Varsel når en konsert starter, Fiks feil i innloggingen og Ny forside. «Ferdig» har 12 kort. Det står ingen datoer, navn eller regler på tavla.',
        question: 'Hvilken påstand støttes av tavla alene?',
        options: [
          {
            id: 'fullt-ut',
            label:
              'Teamet bruker Kanban fullt ut, fordi de har en tavle med kolonner for arbeidet sitt.',
            feedback:
              'En tavle med kolonner er bare én del av Kanban. Teamet trenger også felles avtaler om når noe er startet og ferdig, hvor mye som kan være i gang samtidig, og hvordan arbeidet skal flytte seg videre. Ingenting av dette står på tavla.',
          },
          {
            id: 'fem',
            label: 'Ifølge tavla står fem oppgaver i «Pågår» akkurat nå.',
          },
          {
            id: 'sakte',
            label:
              'Teamet jobber for sakte, siden hele fem oppgaver ligger i «Pågår».',
            feedback:
              'Fem oppgaver kan være mye eller lite. Det avhenger av hvor store oppgavene er, hvor lenge de har vært i gang, og hva teamet har avtalt. Tavla viser ingen av delene, så du kan ikke vite om noe går tregt.',
          },
          {
            id: 'overst',
            label:
              '«Billettkjøp» er nærmest ferdig, fordi kortet ligger øverst i kolonnen.',
            feedback:
              'Plasseringen i en kolonne betyr ikke nødvendigvis noe. Uten en avtale om hva rekkefølgen betyr, kan «Billettkjøp» like gjerne være den som er kommet kortest.',
          },
        ],
        correctId: 'fem',
        hint: 'Skill mellom det du kan se på tavla og det du må gjette. Står det noe om tid, regler eller hvor langt hver oppgave har kommet?',
        explanation:
          'Dette er det eneste du faktisk kan lese av tavla: Fem kort står i «Pågår», forutsatt at tavla er oppdatert. Tavla viser hvilke oppgaver som finnes, og hvilken kolonne hver av dem står i. Den viser ikke hvor lenge noe har vært i gang, om noe står fast, hvor mye som bør være i gang samtidig, eller hva «Pågår» og «Ferdig» egentlig betyr for teamet. For å trekke slike konklusjoner trenger du mer informasjon – og i Kanban skal mye av den være en del av den felles avtalen som tavla viser.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k01-ny',
        title: 'Ny situasjon: to betydninger av «Ferdig»',
        role: 'application',
        source: k01,
        context:
          'Teamet oppdager at «Ferdig» betyr forskjellige ting for dem. Lina flytter et kort til «Ferdig» når koden er skrevet. Omar flytter et kort til «Ferdig» først når koden er testet og lagt ut i appen.\nDerfor tror festivalen at flere funksjoner er klare enn det som faktisk er tilfellet.',
        question: 'Hva mangler teamet mest?',
        options: [
          {
            id: 'kolonner',
            label:
              'Flere kolonner, for eksempel «Kodet», «Testet» og «Lagt ut», slik at tavla blir mer detaljert og viser nøyaktig hvor hver oppgave er.',
            feedback:
              'Flere kolonner kan hjelpe, men bare hvis teamet også blir enige om hva som må være på plass for at et kort skal få stå i hver av dem. Uten den avtalen blir det bare flere steder å være uenige.',
          },
          {
            id: 'en-person',
            label:
              'En regel om at bare én person får flytte kort, slik at ingen flytter dem feil og tavla alltid er riktig oppdatert.',
            feedback:
              'Da er det én person som tolker tavla, men teamet har fortsatt ingen felles forståelse. Problemet blir skjult i stedet for å bli løst.',
          },
          {
            id: 'avtale',
            label:
              'En felles avtale om når en oppgave er ferdig, og hva som må være på plass før et kort flyttes videre.',
          },
        ],
        correctId: 'avtale',
        hint: 'Problemet er ikke at Lina eller Omar gjør noe galt. De har bare ikke den samme forståelsen av hva tavla betyr.',
        explanation:
          'Kanban krever at teamet har bestemt når en oppgave er ferdig, og har tydelige regler for hvordan arbeidet går videre. Når avtalen er felles og synlig, betyr «Ferdig» det samme for alle. En tavle er bare så pålitelig som avtalen bak den. En slik regel kan være så enkel som: «Et kort er ferdig når koden er testet og lagt ut i appen.» Skriv den gjerne rett på tavla, så alle ser den.',
      },
    ],
  },
  {
    id: 'tsu-kanban-k02',
    title: 'For mye arbeid samtidig',
    summary: 'Gjør ferdig før du starter noe nytt.',
    minutes: 5,
    takeaway:
      'Arbeid som er startet, men ikke ferdig, teller som arbeid i gang – også når det står fast.\nNår grensen er nådd, er det beste ofte å hjelpe det som allerede er startet og løse opp blokkeringer. Når det blir plass, kan teamet hente inn nytt arbeid.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-kanban-k02-forklart',
        title: 'WIP og WIP-grenser',
        role: 'explain',
        source: k02,
        idea: 'WIP står for work in progress, altså arbeid som er i gang. I Kanban regnes en oppgave som WIP fra den er startet til den er ferdig.\nMange tror at man får mer gjort ved å starte mange ting samtidig. Ofte skjer det motsatte. Når alle jobber på hver sin halvferdige oppgave, tar det lengre tid før noe blir ferdig, og problemer blir lettere liggende.\nDerfor må et team som bruker Kanban – en måte å styre og forbedre arbeidsflyten på – bestemme hvor mye arbeid som kan være i gang samtidig, og holde seg til det. Mange team gjør det med en WIP-grense, for eksempel «maks 4 oppgaver i gang».',
        definitions: [
          {
            term: 'Pull-system',
            text: 'grensen gjør at teamet henter inn nytt arbeid først når det er plass til det. Er grensen nådd, er det beste ofte å hjelpe noe som allerede er startet med å bli ferdig – for eksempel ved å teste, gjennomgå kode eller fjerne det som blokkerer en oppgave.',
          },
        ],
        bridge: 'Neste: Jonas er ledig, og festivalen har et ønske.',
      },
      {
        kind: 'learn',
        id: 'tsu-kanban-k02-situasjon',
        title: 'Les tavla til festivalappen',
        role: 'explain',
        source: k02,
        idea: 'Dette er et tenkt team som lager en festivalapp. Hvert kort er én oppgave. «Å gjøre» viser klare oppgaver som ikke er startet. Følg kortene fra venstre mot høyre, eller ovenfra og ned på mobil.',
        board: festivalBefore,
        bridge: 'Neste: Hva bør Jonas gjøre?',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k02-sporsmal',
        title: 'Starte kartet nå?',
        role: 'scaffold',
        source: k02,
        context:
          'Jonas har levert Billettkjøp til test og er ledig. Festivalen ber ham starte kartet. Det haster ikke, og teamet har ikke avtalt noe unntak fra grensen.',
        board: festivalBefore,
        question: 'Hva bør Jonas gjøre?',
        options: [
          {
            id: 'blokkert',
            label:
              'Starte kartet. Blokkert innlogging teller ikke som arbeid i gang.',
            feedback:
              'En blokkert oppgave er fortsatt startet og ikke ferdig. Avtalen sier dessuten rett ut at blokkerte oppgaver teller med. Ved å starte noe nytt i stedet for å løse blokkeringen, blir det bare enda mer som står halvferdig.',
          },
          {
            id: 'forslag',
            label: 'Starte kartet. Festivalens ønske overstyrer grensen.',
            feedback:
              'I Kanban er grensen en avtale teamet har gjort sammen, ikke et forslag. Kartet haster ikke, og avtalen åpner bare for unntak hvis hele teamet blir enige om det. Å bryte grensen hver gang noen spør, gjør den meningsløs.',
          },
          {
            id: 'hjelpe',
            label:
              'Vente med kartet og hjelpe med tilgangsnøkkelen eller kodegjennomgangen.',
          },
          {
            id: 'flytte',
            label: 'Flytte innlogging til «Å gjøre» for å få plass til kartet.',
            feedback:
              'Da ser tavla bedre ut, men virkeligheten er den samme: Arbeidet er startet og står fast. Tavla skal vise hvordan arbeidet faktisk går. Hvis blokkeringen blir skjult, er det enda mindre sannsynlig at noen løser den.',
          },
        ],
        correctId: 'hjelpe',
        hint: 'Les avtalen på tavla en gang til. Hvor mange oppgaver er startet og ikke ferdige?',
        explanation:
          'Alle fire teller, også innloggingen som står fast og billettkjøpet som testes. Å starte kartet gir fem i gang. Jonas kan hjelpe med nøkkelen eller kodegjennomgangen. Å fjerne en blokkering frigjør ikke i seg selv en plass: Oppgaven må bli ferdig først.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k02-ny',
        title: 'Ny situasjon: ledig plass',
        role: 'application',
        source: k02,
        context:
          'Noen dager senere har teamet gjort ferdig to oppgaver. Se hva som har flyttet seg på den samme tavla.',
        board: festivalAfter,
        question: 'Hva betyr dette for teamet?',
        options: [
          {
            id: 'plass',
            label:
              'Teamet kan hente kartet og deretter forsiden: inntil to nye oppgaver.',
          },
          {
            id: 'vente',
            label: 'Teamet må vente til alle oppgavene i «Pågår» er ferdige.',
            feedback:
              'Det finnes ingen regel om at antallet oppgaver alltid må ligge på WIP-grensen. Her er det ledig plass og klare oppgaver, så teamet kan hente inn nytt arbeid innenfor grensen. Å vente til alt er ferdig kan gi unødvendig tomgang.',
          },
          {
            id: 'tre',
            label: 'Teamet kan starte tre nye oppgaver for å ha noe i reserve.',
            feedback:
              'Da blir det fem oppgaver i gang, og grensen på 4 er brutt. Å starte mer arbeid «for sikkerhets skyld» er akkurat det WIP-grensen skal hindre.',
          },
        ],
        correctId: 'plass',
        hint: 'WIP-grensen sier noe om både når du ikke skal starte noe, og når du kan starte noe.',
        explanation:
          'Billettkjøp og Varsler har flyttet til «Ferdig». Bare Søk og Innlogging er fortsatt i gang: 4 − 2 = 2 ledige plasser. Teamet kan starte kartet og deretter forsiden, men trenger ikke fylle grensen. I en skoleavis kan samme regel hjelpe: Tell også en påbegynt artikkel som venter på intervju, og start en ny når det er plass.',
      },
    ],
  },
  {
    id: 'tsu-kanban-k03',
    title: 'Hvor stopper arbeidet opp?',
    summary: 'Bruk alder til å oppdage arbeid som trenger hjelp.',
    minutes: 5,
    takeaway:
      'Alder forteller hvor lenge en oppgave har vært i gang. Syklustid forteller hvor lang tid en ferdig oppgave tok.\nBruk alderen til å oppdage oppgaver som trenger hjelp nå. Se etter mønstre før du konkluderer om hele arbeidsflyten – og let etter årsaker i systemet, ikke etter noen å skylde på.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-kanban-k03-forklart',
        title: 'Alder og syklustid',
        role: 'explain',
        source: k03,
        idea: 'Kanban er en måte å styre og forbedre flyten av arbeid på. Der følger teamet med på hvor lang tid arbeidet tar. To mål er lette å blande sammen.\nAlder er nyttig fordi den varsler teamet mens arbeidet pågår. Når en oppgave blir eldre enn forventet, er det et tegn på at teamet bør se på den: Står den fast? Venter den på noe? Er den større enn de trodde?',
        definitions: [
          {
            term: 'Alder (Work Item Age)',
            text: 'hvor lenge en oppgave har vært i gang, fra den ble startet til i dag. Alder brukes på oppgaver som ikke er ferdige ennå.',
          },
          {
            term: 'Syklustid (Cycle Time)',
            text: 'hvor lang tid en oppgave tok fra den ble startet til den ble ferdig. Syklustid kan bare måles når oppgaven er ferdig.',
          },
          {
            term: 'Forventning om tid (service level expectation, SLE)',
            text: 'bygger på hvor lang tid oppgavene har tatt tidligere. Et eksempel: «85 % av oppgavene blir ferdige på 8 dager eller mindre.»',
          },
        ],
        bridge: 'Neste: én oppgave har vært i test lenge.',
      },
      {
        kind: 'learn',
        id: 'tsu-kanban-k03-situasjon',
        title: 'Betalingssiden er 12 dager gammel',
        role: 'explain',
        source: k03,
        idea: 'Et team har denne forventningen: «85 % av oppgavene blir ferdige på 8 dager eller mindre.» Den siste måneden ble 20 oppgaver ferdige, og de fleste tok mellom 3 og 7 dager.\nAkkurat nå ser tavla slik ut:\n• Betalingsside: Test, 12 dager.\n• Søkefilter: Test, 2 dager.\n• Profilbilde: Utvikles, 3 dager.\n• Glemt passord: Utvikles, 5 dager.\nEn i teamet, Kim, ser på tavla og sier: «Test er flaskehalsen vår. Testeren jobber for sakte.»',
        bridge: 'Neste: to spørsmål om betalingssiden.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k03-sporsmal-1',
        title: 'Betalingssiden: 12 dager',
        role: 'scaffold',
        source: k03,
        context:
          '«Betalingsside» ble startet for 12 dager siden og er ikke ferdig.',
        question: 'Hva kalles de 12 dagene?',
        options: [
          {
            id: 'syklustid',
            label: 'Syklustid',
            feedback:
              'Syklustid måles først når oppgaven er ferdig. «Betalingsside» er fortsatt i gang.',
          },
          {
            id: 'gjennomstromning',
            label: 'Gjennomstrømning',
            feedback:
              'Gjennomstrømning (throughput) er antall oppgaver som blir ferdige per tidsperiode, for eksempel per uke. Det sier ingenting om én bestemt oppgave.',
          },
          { id: 'alder', label: 'Alder' },
        ],
        correctId: 'alder',
        hint: 'Er oppgaven ferdig eller ikke?',
        explanation:
          'Alder er tiden fra en oppgave ble startet til i dag, for oppgaver som ikke er ferdige.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k03-sporsmal-2',
        title: 'Er test flaskehalsen?',
        role: 'application',
        source: k03,
        context:
          'Teamets forventning er at 85 % av oppgavene blir ferdige på 8 dager eller mindre. Tavla viser fire oppgaver i gang: Betalingsside (Test, 12 dager), Søkefilter (Test, 2 dager), Profilbilde (Utvikles, 3 dager) og Glemt passord (Utvikles, 5 dager).\nKim sier: «Test er flaskehalsen vår. Testeren jobber for sakte.»',
        question: 'Hva er det beste neste steget for teamet?',
        options: [
          {
            id: 'enig',
            label:
              'Si seg enig med Kim. Test er flaskehalsen, og testeren må få beskjed om å jobbe raskere, slik at køen blir kortere.',
            feedback:
              'Bare én oppgave er gammel. Den andre oppgaven i test er bare 2 dager gammel. Én forsinket oppgave er ikke bevis på at test er flaskehalsen, og enda mindre på at noen jobber for sakte. Kanskje venter oppgaven på en avklaring, eller den er blokkert av noe utenfor test.',
          },
          {
            id: 'normalt',
            label:
              'Ikke gjøre noe. Forventningen gjelder 85 % av oppgavene, så det er normalt at noen oppgaver tar lengre tid.',
            feedback:
              'Forventningen er ikke en tillatelse til at oppgaver kan bli liggende. Den er et sammenligningsgrunnlag som hjelper teamet å oppdage når noe trenger oppmerksomhet. En oppgave som allerede er eldre enn 8 dager, bør teamet se på.',
          },
          {
            id: 'vente',
            label:
              'Vente til «Betalingsside» er ferdig. Da kan teamet måle syklustiden og se om den faktisk ble for lang.',
            feedback:
              'Syklustiden kan teamet først se når oppgaven er ferdig – og da er det for sent å hjelpe akkurat den oppgaven. Alderen er nyttig fordi den varsler mens oppgaven pågår.',
          },
          {
            id: 'undersoke',
            label:
              'Finne ut nå hvorfor «Betalingsside» har tatt så lang tid, og hjelpe den videre. Sjekke etterpå om flere blir liggende i test.',
          },
        ],
        correctId: 'undersoke',
        hint: 'Hva vet teamet sikkert – og hva vet de ikke ennå? Hvor mange oppgaver i test er faktisk gamle?',
        explanation:
          'Oppgaven er eldre enn forventningen på 8 dager. Det er et tydelig signal om at teamet bør undersøke den nå: Står den fast, venter den på noe, eller er den større enn ventet? Én slik oppgave er nok til å undersøke den og hjelpe den videre, men ikke nok til å si at noen er trege, eller at test er et problem for hele arbeidsflyten. Først når teamet også ser om andre oppgaver blir liggende, vet de om problemet ligger i selve arbeidsflyten.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k03-ny',
        title: 'Ny situasjon: venter på godkjenning',
        role: 'application',
        source: k03,
        context:
          'Et annet team har en tilstand som heter «Venter på godkjenning». Der venter oppgavene på at kunden skal se på dem. De siste tre ukene ble 6 av 8 oppgaver liggende mer enn 4 dager i denne tilstanden. Ellers i arbeidsflyten går det stort sett raskt.',
        question: 'Hva er den beste tolkningen?',
        options: [
          {
            id: 'tilfeldig',
            label:
              'Hver oppgave har sin egen forklaring. Teamet bør håndtere dem én og én og ikke lete etter et mønster, for slikt er bare tilfeldigheter.',
            feedback:
              'Hver oppgave kan ha sin egen historie. Men når de fleste oppgavene blir liggende lenge på det samme stedet, er det sannsynlig at noe i selve arbeidsflyten skaper ventetid. Det er verdt å undersøke.',
          },
          {
            id: 'flere',
            label:
              'Utviklerne bør starte flere nye oppgaver, slik at de har noe å gjøre mens de venter på kunden, og slik at ingen sitter uten arbeid.',
            feedback:
              'Da blir det mer arbeid i gang, men ventetiden hos kunden blir ikke kortere. Oppgavene blir bare enda eldre. Det løser ikke problemet med flyten.',
          },
          {
            id: 'monster',
            label:
              'Det ser ut som et mønster i én del av flyten. Teamet bør finne ut hvorfor godkjenningen tar tid, og vurdere å endre en arbeidsregel.',
          },
        ],
        correctId: 'monster',
        hint: 'Gjelder det én oppgave eller mange? Skjer det samme sted hver gang?',
        explanation:
          'Når mange oppgaver venter lenge i samme tilstand, er det et mønster. Da er det fornuftig å se på arbeidsflyten og vurdere å endre den, for eksempel med faste tider for godkjenning sammen med kunden, og følge med på om ventetiden blir kortere. Én gammel oppgave er en grunn til å se på den oppgaven. Når det samme skjer gang på gang på samme sted, er det en grunn til å se på arbeidsflyten. Teamet trenger ikke å vente på et fast møte for å gjøre endringer.',
      },
    ],
  },
  {
    id: 'tsu-kanban-k04',
    title: 'Hva forteller tallene om arbeidsflyten?',
    summary: 'Velg det tallet som svarer på spørsmålet.',
    minutes: 5,
    takeaway:
      'Å starte mange oppgaver er ikke det samme som å levere mange. Gjennomstrømning teller det som blir ferdig, og WIP teller det som er i gang.\nAlder og syklustid er tid – alder for oppgaver som pågår, og syklustid for oppgaver som er ferdige.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-kanban-k04-forklart',
        title: 'Fire flytmål',
        role: 'explain',
        source: k04,
        idea: 'Kanban er en måte å styre og forbedre flyten av arbeid på – fra en oppgave blir startet til den er ferdig. Kanban-team følger med på fire tall, såkalte flytmål. To av dem er antall (WIP og gjennomstrømning). To er tid (alder og syklustid).\nTallene er bare nyttige hvis de hjelper teamet å styre og forbedre arbeidet. Husk forskjellen: Å starte arbeid er ikke det samme som å levere det.',
        definitions: [
          {
            term: 'WIP (work in progress)',
            text: 'hvor mange oppgaver som er startet, men ikke ferdige, akkurat nå.',
          },
          {
            term: 'Gjennomstrømning (throughput)',
            text: 'hvor mange oppgaver som ble ferdige i en periode, for eksempel per uke.',
          },
          {
            term: 'Alder (Work Item Age)',
            text: 'hvor lenge en oppgave som ikke er ferdig, har vært i gang.',
          },
          {
            term: 'Syklustid (Cycle Time)',
            text: 'hvor lang tid en ferdig oppgave brukte fra start til ferdig.',
          },
        ],
        bridge: 'Neste: tallene for forrige uke.',
      },
      {
        kind: 'learn',
        id: 'tsu-kanban-k04-situasjon',
        title: '«For en uke!»',
        role: 'explain',
        source: k04,
        idea: 'Et Kanban-team ser på tallene for forrige uke:\n• I gang mandag morgen: 6 oppgaver.\n• Startet i løpet av uka: 12 oppgaver.\n• Ferdige i løpet av uka: 5 oppgaver.\n• I gang fredag ettermiddag: 13 oppgaver.\nEn i teamet sier fornøyd: «For en uke! Vi fikk 12 oppgaver i gang. Gjennomstrømningen vår har aldri vært høyere.»',
        bridge: 'Neste: Hva viser tallene egentlig?',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k04-sporsmal',
        title: 'Les ukens tall',
        role: 'scaffold',
        source: k04,
        context:
          'Teamet hadde 6 oppgaver i gang mandag morgen. I løpet av uka startet de 12 oppgaver og ble ferdige med 5. På fredag ettermiddag var 13 oppgaver i gang.\nEn i teamet sier: «Vi fikk 12 oppgaver i gang. Gjennomstrømningen vår har aldri vært høyere.»',
        question: 'Hva viser tallene egentlig?',
        options: [
          {
            id: 'tolv',
            label:
              'Gjennomstrømningen var 12, fordi teamet startet 12 nye oppgaver i løpet av uka.',
            feedback:
              '12 er antall oppgaver som ble startet. Gjennomstrømning teller bare oppgaver som ble ferdige. Å starte en oppgave betyr ikke at den er levert.',
          },
          {
            id: 'tretten',
            label:
              'Gjennomstrømningen var 13, fordi 13 oppgaver var i gang da uka var slutt.',
            feedback:
              '13 er WIP – antall oppgaver som var startet, men ikke ferdige, på fredag. Det sier hvor mye som er i gang, ikke hvor mye som ble levert.',
          },
          {
            id: 'fem',
            label:
              'Gjennomstrømningen var 5. WIP økte, fordi teamet startet mer enn det fullførte.',
          },
          {
            id: 'syklustid',
            label:
              'Syklustiden var 5 dager, fordi 5 oppgaver ble ferdige i løpet av fem arbeidsdager.',
            feedback:
              'Syklustid er en tid, ikke et antall. Den måles for hver ferdige oppgave, fra den ble startet til den ble ferdig. Tallene sier ingenting om hvor lang tid hver oppgave tok.',
          },
        ],
        correctId: 'fem',
        hint: 'Gjennomstrømning handler om det som ble ferdig. Hvor mange oppgaver ble ferdige i løpet av uka?',
        explanation:
          'Teamet ble ferdig med 5 oppgaver, men startet 12. Derfor vokste mengden arbeid i gang med 7, fra 6 til 13. Kollegaen blandet sammen å starte og å bli ferdig. Hvis tempoet holder seg rundt 5 ferdige per uke, tilsvarer 13 pågående oppgaver mer enn to ukers ferdigstilling. Det er ikke en sikker leveringsdato for én bestemt oppgave, men mye påbegynt arbeid kan føre til mer venting.',
      },
      {
        kind: 'match',
        leftPresentation: 'text',
        id: 'tsu-kanban-k04-ny',
        title: 'Ny situasjon: tre spørsmål fra en kunde',
        role: 'application',
        source: k04,
        context:
          'En kunde stiller teamet tre spørsmål. Du kan bruke hvert mål én gang, og ett av målene blir ikke brukt.\nWIP: hvor mange oppgaver som er startet, men ikke ferdige.\nGjennomstrømning: hvor mange oppgaver som blir ferdige i en periode.\nAlder: hvor lenge en oppgave som ikke er ferdig, har vært i gang.\nSyklustid: hvor lang tid en ferdig oppgave brukte, fra den ble startet til den var ferdig.',
        question: 'Hvilket flytmål passer best til hvert spørsmål?',
        leftLabel: 'Kundens spørsmål',
        rightLabel: 'Flytmål',
        pairs: [
          {
            id: 'gjennomstromning',
            left: '«Hvor mange oppgaver pleier dere å bli ferdige med i løpet av en uke?»',
            right: 'Gjennomstrømning',
          },
          {
            id: 'alder',
            left: '«Dere startet på oppgaven min for en stund siden. Hvor lenge har den holdt på nå?»',
            right: 'Alder',
          },
          {
            id: 'syklustid',
            left: '«Hvor lang tid pleier en oppgave å ta, fra dere starter til den er ferdig?»',
            right: 'Syklustid',
          },
        ],
        unusedRight: [{ id: 'wip', label: 'WIP' }],
        rightOrder: ['wip', 'syklustid', 'gjennomstromning', 'alder'],
        hint: 'For hvert spørsmål: Handler det om et antall eller en tid? Og gjelder det oppgaver som er ferdige eller i gang?',
        explanation:
          'Hvor mange som blir ferdige per uke, er gjennomstrømning. WIP sier hvor mange som er i gang nå: Et team kan ha mye i gang og likevel bli ferdig med lite. Kundens oppgave holder fortsatt på, så det er alderen som svarer, ikke syklustiden. Hvor lang tid oppgaver pleier å ta totalt, finner du i syklustiden til oppgaver som allerede er ferdige. WIP – «Hvor mye har dere i gang nå?» – spurte ikke kunden om. Velg det tallet som faktisk svarer på spørsmålet.',
      },
    ],
  },
  {
    id: 'tsu-kanban-k05',
    title: 'Hvor lang tid vil arbeidet ta?',
    summary: 'Gi et ærlig anslag med tid og sannsynlighet.',
    minutes: 5,
    takeaway:
      'En tidsforventning har to deler: hvor lang tid og hvor sannsynlig. Den bygger på hvor lang tid tidligere oppgaver tok, og regnes fra oppgaven blir startet.\nDet er en forventning – ikke en frist eller et løfte.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-kanban-k05-forklart',
        title: 'Tidsforventning: tid og sannsynlighet',
        role: 'explain',
        source: k05,
        idea: 'Ingen kan vite sikkert hvor lang tid én bestemt oppgave vil ta. Men et team kan se på hvor lang tid tidligere oppgaver tok fra start til ferdig – syklustiden – og bruke det til å si noe om hva som er sannsynlig.\nI Kanban – en måte å styre og forbedre flyten av arbeid på – kalles dette en tidsforventning (service level expectation, SLE). Den har alltid to deler: en tid, for eksempel «8 dager eller mindre», og en sannsynlighet, for eksempel «85 % av oppgavene». Til sammen: «85 % av oppgavene blir ferdige på 8 dager eller mindre.»\nTre ting er viktige:\n• Forventningen bygger på hvordan det faktisk har gått før, ikke på hva man håper.\n• Tiden regnes fra oppgaven blir startet til den er ferdig. Tiden før teamet starter, er ikke med.\n• Det er en forventning, ikke et løfte. Noen oppgaver vil ta lengre tid.',
        bridge: 'Neste: syklustiden til teamets 20 siste oppgaver.',
      },
      {
        kind: 'learn',
        id: 'tsu-kanban-k05-situasjon',
        title: '20 oppgaver',
        role: 'explain',
        source: k05,
        idea: 'Et team har sett på syklustiden til de 20 siste oppgavene de fullførte. Her er antall dager for hver oppgave, sortert fra kortest til lengst:\n2 · 3 · 3 · 4 · 4 · 4 · 5 · 5 · 5 · 6 · 6 · 6 · 7 · 7 · 7 · 8 · 8 · 9 · 12 · 15\nGjennomsnittet er 6,3 dager.',
        bridge: 'Neste: to spørsmål om tallene.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k05-sporsmal-1',
        title: 'Hva sier tallene?',
        role: 'scaffold',
        source: k05,
        context:
          'Syklustiden til teamets 20 siste oppgaver (dager), sortert: 2 · 3 · 3 · 4 · 4 · 4 · 5 · 5 · 5 · 6 · 6 · 6 · 7 · 7 · 7 · 8 · 8 · 9 · 12 · 15. Gjennomsnittet er 6,3 dager. 17 av 20 tok 8 dager eller mindre; tre tok lengre tid.',
        question:
          'Hvilken tolkning gir en nyttig og ærlig tidsforventning (SLE)?',
        options: [
          {
            id: 'femten',
            label:
              '«Gjennomsnittet er 6,3 dager, så neste oppgave blir ferdig etter omtrent 6 dager.»',
            feedback:
              'Et gjennomsnitt er ikke en frist for neste oppgave. Åtte av de 20 oppgavene tok mer enn 6,3 dager, og noen tok helt opp til 15 dager.',
          },
          {
            id: 'sytten',
            label:
              '«17 av 20 ble ferdige innen 8 dager fra start. Hvis nye oppgaver ligner, kan vi foreløpig forvente rundt 85 % innen 8 dager.»',
          },
          {
            id: 'atten',
            label:
              '«Siden 85 % tok høyst 8 dager, kan vi love at neste oppgave blir ferdig innen 8 dager.»',
            feedback:
              '85 % beskriver disse 20 oppgavene, ikke en garanti for den neste. Tre av oppgavene tok 9, 12 og 15 dager.',
          },
        ],
        correctId: 'sytten',
        hint: 'Se etter både tid og sannsynlighet. Hva kan teamet si uten å love for mye?',
        explanation:
          'I dette utvalget tok 17 av 20 oppgaver (85 %) høyst 8 dager fra start til ferdig. Det kan gi en foreløpig SLE: rundt 85 % innen 8 dager, hvis nye oppgaver ligner og teamet jobber omtrent som før. Med bare 20 observasjoner er anslaget usikkert, og det er ingen garanti for én bestemt oppgave.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k05-sporsmal-2',
        title: '«Når blir den ferdig?»',
        role: 'application',
        source: k05,
        context:
          'Av teamets 20 siste oppgaver ble 17 ferdige på 8 dager eller mindre (85 %). Gjennomsnittet er 6,3 dager.\nEn kunde ber om en ny oppgave som ligner på dem teamet har gjort før, og spør: «Når blir den ferdig?» Teamet har mye i gang og regner med å kunne starte på oppgaven om omtrent tre dager.',
        question: 'Hvilket svar er best?',
        options: [
          {
            id: 'atte',
            label:
              '«Den blir ferdig om 8 dager. Så lang tid bruker oppgavene våre.»',
            feedback:
              'To ting blir feil. For det første regnes de 8 dagene fra oppgaven blir startet, og den er ikke startet ennå. For det andre betyr 85 % at omtrent 15 av 100 oppgaver tar lengre tid. «Om 8 dager» høres ut som et løfte teamet ikke kan holde hver gang.',
          },
          {
            id: 'snitt',
            label:
              '«Oppgavene våre tar i gjennomsnitt 6,3 dager, så vi kan love at den blir ferdig om seks dager.»',
            feedback:
              'Gjennomsnittet sier lite om hva kunden kan regne med. Av teamets 20 oppgaver tok 8 lengre tid enn 6,3 dager. Et tall som bommer så ofte, er et dårlig grunnlag for et løfte.',
          },
          {
            id: 'ingenting',
            label:
              '«Det kan vi dessverre ikke si noe om. Hver oppgave er forskjellig, så tidligere tall hjelper ikke.»',
            feedback:
              'Det stemmer at ingen kan vite det sikkert. Men teamet har nyttig erfaring fra 20 oppgaver. Å si hva som er sannsynlig, er både ærligere og mer nyttig enn å ikke si noe.',
          },
          {
            id: 'start',
            label:
              '«Vi starter trolig om tre dager. Før har 85 % av lignende oppgaver blitt ferdige innen 8 dager etter start.»',
          },
        ],
        correctId: 'start',
        hint: 'Når begynner de 8 dagene å telle? Og hva betyr 85 % for de siste 15 %?',
        explanation:
          'Svaret skiller venting før start fra tid etter start og bruker faktisk historikk, med tydelig usikkerhet. At 17 av 20 tidligere ble ferdige innen 8 dager, er ikke en garanti for neste oppgave. Svaret hviler på to forutsetninger: at den nye oppgaven ligner på de tidligere, og at teamet jobber omtrent som før. Hvis oppgaven er mye større enn vanlig, bør teamet si det.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k05-ny',
        title: 'Ny situasjon: nesten ingen data',
        role: 'application',
        source: k05,
        context:
          'Et helt nytt team har bare fullført to oppgaver så langt. De tok 5 og 6 dager. En interessent vil vite hvor lang tid oppgavene deres vanligvis tar.',
        question: 'Hva bør teamet gjøre?',
        options: [
          {
            id: 'anslag',
            label:
              'Gi et beste anslag, si tydelig at det er usikkert, og oppdatere det når teamet vet mer.',
          },
          {
            id: 'vente',
            label:
              'Ikke si noe til interessenten før teamet har fullført minst 20 oppgaver, slik at tallet blir helt riktig.',
            feedback:
              'Interessenten får ingenting å planlegge etter i lang tid. Det finnes heller ingen regel om at det må være 20 oppgaver. Et ærlig anslag er bedre enn ingenting.',
          },
          {
            id: 'alle',
            label:
              'Si at alle oppgavene deres tar 6 dager eller mindre, siden begge de to oppgavene gjorde det.',
            feedback:
              'To oppgaver er altfor lite til å si noe om «alle». Teamet vet ikke ennå hvor mange som tar lengre tid, og et tall uten sannsynlighet blir lett tatt som et løfte. Tar neste oppgave 9 dager, er svaret feil, og interessenten mister tilliten til teamet.',
          },
        ],
        correctId: 'anslag',
        hint: 'Hva er mest ærlig – og mest nyttig – når teamet nesten ikke har data?',
        explanation:
          'Kanban Guide, den offisielle beskrivelsen av Kanban, sier at et beste anslag holder til teamet har nok historikk. Uansett hvor mye data teamet har, er prinsippet det samme: Si det dere faktisk vet, vær åpen om usikkerheten, og la tallene bli bedre etter hvert som dere lærer mer.',
      },
    ],
  },
  {
    id: 'tsu-kanban-k06',
    title: 'Hvordan forbedrer vi flyten?',
    summary: 'Finn årsaken før dere endrer reglene.',
    minutes: 6,
    takeaway:
      'Når arbeid hoper seg opp, undersøk årsaken før dere endrer noe. At alle er travle, betyr ikke at mer blir ferdig.\nHa kontroll på alt som er i gang fra start til ferdig, og sjekk etterpå om tiltaket hjalp.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-kanban-k06-forklart',
        title: 'Forbedre flyten i fire steg',
        role: 'explain',
        source: k06,
        idea: 'Når arbeid hoper seg opp, trenger teamet å finne årsaken før det endrer reglene. I Kanban kan teamet:\n1. Se hvor arbeidet venter.\n2. Undersøke hvorfor.\n3. Prøve en tydelig endring.\n4. Sjekke om den hjalp.\nWIP (work in progress) betyr arbeid som er startet, men ikke ferdig. Teamet må ha kontroll på alt som er startet, men ikke ferdig – ikke bare det som ligger i én kolonne. Det kan for eksempel gjøres med en samlet grense, men en grense som passer i ett steg, kan ikke automatisk gjenbrukes for hele flyten.',
        bridge: 'Neste: en lang kø før test.',
      },
      {
        kind: 'learn',
        id: 'tsu-kanban-k06-situasjon',
        title: 'Køen før test',
        role: 'explain',
        source: k06,
        idea: 'Et team på fire har denne arbeidsflyten: Klar → Utvikling → Venter på test → Test → Ferdig.\nTeamet har én regel for hvor mye som kan være i gang: «Maks 3 oppgaver i Utvikling.» Det finnes ingen andre grenser.\nSlik ser tavla ut i dag:\n• Utvikling: 3 oppgaver – tre utviklere, én oppgave hver.\n• Venter på test: 7 oppgaver – har ventet mellom 4 og 9 dager.\n• Test: 1 oppgave – Nora tester.\n• Ferdig de siste to ukene: 4 oppgaver.\nTil sammen er 11 oppgaver startet, men ikke ferdige. Hver gang en utvikler flytter en oppgave til «Venter på test», blir det plass i «Utvikling», og utvikleren starter på en ny oppgave.',
        bridge: 'Neste: to spørsmål om køen.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k06-sporsmal-1',
        title: 'Før dere endrer reglene',
        role: 'scaffold',
        source: k06,
        context:
          'Tre oppgaver utvikles, sju venter 4–9 dager på test, én testes. Bare fire ble ferdige de siste to ukene. Den eneste grensen er maks tre i «Utvikling».',
        question: 'Hva bør teamet finne ut før det endrer reglene?',
        options: [
          {
            id: 'tregest',
            label:
              'Hvem som jobber tregest, slik at den personen kan øke tempoet.',
            feedback: 'Køen er ikke bevis på at én person arbeider for sakte.',
          },
          {
            id: 'starte',
            label: 'Hvor mange nye oppgaver utviklerne kan starte neste uke.',
            feedback: 'Flere starter gjør ikke testkøen kortere.',
          },
          {
            id: 'hvorfor',
            label:
              'Hvorfor oppgavene venter på test, for eksempel kapasitet, feil eller uklare krav.',
          },
          {
            id: 'kolonner',
            label: 'Hvor mange nye kolonner tavla trenger for å vise køen.',
            feedback:
              'Ventingen er allerede synlig; en ny kolonne forklarer ikke hvorfor den skjer.',
          },
        ],
        correctId: 'hvorfor',
        hint: 'Tavla viser hvor ventingen skjer. Hva mangler dere fortsatt kunnskap om?',
        explanation:
          'Teamet kjenner symptomet, men må undersøke årsaken før det velger tiltak. Kø kan skyldes kapasitet, store oppgaver, feil eller andre hindringer. En endring uten undersøkelse kan treffe feil problem.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k06-sporsmal-2',
        title: 'Hva prøver dere først?',
        role: 'application',
        source: k06,
        context:
          'Nå vet teamet mer: Nora er den eneste som utfører testingen, feil er sjeldne, og flere oppgaver kommer til test enn Nora rekker. Utviklerne starter nye oppgaver når det blir plass i «Utvikling», men ingen regel kontrollerer hele flyten.\n11 oppgaver er allerede i gang: 3 utvikles, 7 venter på test og 1 testes.',
        question: 'Hvilken endring er best å prøve først?',
        options: [
          {
            id: 'fem',
            label:
              'Øke grensen i Utvikling fra 3 til 5, så utviklerne alltid har noe å starte.',
            feedback: 'Da kan enda flere oppgaver bli stående i testkøen.',
          },
          {
            id: 'hele-flyten',
            label:
              'Bli enige om hvordan de skal ha kontroll på oppgavene fra start til ferdig, og hjelpe til med testing der det er faglig forsvarlig.',
          },
          {
            id: 'nora',
            label:
              'Be Nora teste flere oppgaver samtidig og jobbe raskere, uten å endre arbeidsflyten.',
            feedback:
              'Å legge mer press på Nora avklarer ikke hvordan køen skal håndteres.',
          },
          {
            id: 'tester',
            label:
              'Be om en tester til og la reglene være uendret mens teamet venter.',
            feedback:
              'En tester til kan hjelpe senere, men teamet kan forbedre reglene allerede nå.',
          },
        ],
        correctId: 'hele-flyten',
        hint: 'Hva skjer når nye oppgaver stadig startes, men testingen ikke rekker å få dem ferdige?',
        explanation:
          'Grensen på 3 gjelder bare Utvikling, ikke de 11 oppgavene som er startet totalt. Teamet kan for eksempel prøve en samlet WIP-grense, men må velge den ut fra egen kapasitet. De kan også avlaste testingen der det er faglig forsvarlig. En ny grense gjør ikke de 11 oppgavene ferdige: Hvis antallet i gang er over den nye grensen, må teamet få oppgaver ferdige før det starter flere. Følg med på om køen og ventetiden faktisk blir kortere. Tallene alene sier ikke hvilken grense som passer, eller om tiltaket vil virke.',
      },
      {
        kind: 'select',
        id: 'tsu-kanban-k06-ny',
        title: 'Ny situasjon: skisser i kø',
        role: 'application',
        source: k06,
        context:
          'En designer har laget skisser til 15 skjermbilder som venter på utvikling. Utviklerne rekker omtrent 3 skjermbilder i uken. Flere skisser har måttet tegnes om fordi behovene endret seg mens de ventet.',
        question: 'Hva vil trolig hjelpe mest?',
        options: [
          {
            id: 'plass',
            label:
              'Lage nye skisser når det er plass i køen, og ellers hjelpe til med avklaringer.',
          },
          {
            id: 'tempo',
            label:
              'Fortsette å lage skisser i samme tempo, så utviklerne ikke går tomme.',
            feedback:
              'Køen tilsvarer omtrent fem ukers utviklingsarbeid (15 ÷ 3). Mer design kan øke omarbeidingen.',
          },
          {
            id: 'samtidig',
            label:
              'Starte å programmere flere skisser samtidig, så køen blir kortere.',
            feedback:
              'Flere starter betyr ikke at utviklerne får flere skjermbilder ferdige per uke.',
          },
        ],
        correctId: 'plass',
        hint: 'Hvor mye arbeid ligger i kø allerede? Hva skjer mens det venter?',
        explanation:
          'Mindre ventende arbeid kan gi færre utdaterte skisser, men effekten må undersøkes etterpå. Et raskt steg hjelper ikke hvis neste steg ikke har kapasitet. Hjelp arbeidet videre i stedet for bare å produsere mer arbeid som må vente.',
      },
    ],
  },
];
