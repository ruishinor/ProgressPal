import type { MicroSession, MicroSource } from '@/lib/domain';

// Original UXUU authoring, 2026-10-26. Sources and coverage: docs/utviklerblikk-ux-uu.md.
// Like ACT 18, these track-owned activities cite the existing method skill;
// they do not invent Campaign units or skills.
const source = (id: string): MicroSource => ({
  moduleId: 'tenk-som-en-utvikler',
  lessonUnitIds: [`UXUU-${id}`],
  skillIds: ['SK-METH-01'],
});
const u1 = source('U01');
const u2 = source('U02');
const u3 = source('U03');
const u4 = source('U04');
const u5 = source('U05');
const u6 = source('U06');

export const uxUuSessions: readonly MicroSession[] = [
  {
    id: 'tsu-ux-uu-u01',
    title: 'Hvor stopper brukeren opp?',
    summary: 'Finn bruddet i reisen.',
    minutes: 3,
    takeaway:
      'Følg hele oppgaven. Skill observasjon fra antatt årsak. Prøv tiltak der reisen stopper opp.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u01-forklart',
        title: 'Se hele reisen',
        role: 'explain',
        source: u1,
        idea: 'Brukeropplevelse (UX) handler om hvordan tjenesten oppleves i bruk. En brukerreise følger oppgaven før, under og etter bruk. Se etter manglende informasjon og unødvendig arbeid.\n«Jeg ønsker en snarvei» er en preferanse og et forslag. Gjentatt retur er en observasjon; årsaken må undersøkes.',
        bridge: 'Neste: bestille en legetime.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u01-reise',
        title: 'Prisen kommer sent',
        role: 'scaffold',
        source: u1,
        context:
          'Reisen: Velg time → fyll inn opplysninger → se pris → bekreft. Tre deltakere går tilbake og velger ny time når de ser prisen. Prisene varierer mellom timene.',
        question: 'Hva bør prøves først?',
        options: [
          {
            id: 'snarvei',
            label: 'Legg en snarvei til timevalget.',
            feedback: 'Kortere retur hjelper, men prisen kommer fortsatt sent.',
          },
          { id: 'pris', label: 'Vis prisen når timen velges.' },
          {
            id: 'hjelp',
            label: 'Forklar alle stegene før utfylling.',
            feedback: 'Forklaringen gir ikke prisen de trenger for valget.',
          },
        ],
        correctId: 'pris',
        hint: 'Hva kunne endret timevalget?',
        explanation:
          'Tidlig pris kan spare utfylling. Prøv reisen igjen; årsaken til returen er ennå usikker.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u01-antakelse',
        title: 'Hva vet dere?',
        role: 'retrieval',
        source: u1,
        context:
          'En kollega sier: «De gikk tilbake fordi alle vil ha den billigste timen.»',
        question: 'Hvordan bruker dere utsagnet?',
        options: [
          {
            id: 'krav',
            label: 'Som et krav: velg billigst automatisk.',
            feedback: 'En usjekket forklaring blir da en beslutning for alle.',
          },
          { id: 'antakelse', label: 'Som en antakelse som må undersøkes.' },
          {
            id: 'preferanse',
            label: 'Som deltakernes uttalte preferanse.',
            feedback:
              'Ingen deltaker har sagt dette. Kollegaen tolker handlingene deres.',
          },
        ],
        correctId: 'antakelse',
        hint: 'Hva er sett, sagt og tolket?',
        explanation:
          'Returen er observert. Årsaken og «alle» er tolkning. Undersøk videre før dere bestemmer.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u01-ny',
        title: 'Ny situasjon: søknaden',
        role: 'application',
        source: u1,
        context:
          'Etter fem sider får søkeren vite at et vedlegg kreves. Hun forlater siden for å finne det og mister utfyllingen.',
        question: 'Hvilken endring treffer begge hindringene?',
        options: [
          {
            id: 'tekst',
            label: 'Gi en tydeligere feil ved innsending.',
            feedback:
              'Tydelig feil hjelper, men kommer sent og bevarer ikke utfyllingen.',
          },
          {
            id: 'reise',
            label: 'Opplys om vedlegget tidlig og bevar utfyllingen.',
          },
          {
            id: 'sider',
            label: 'Samle alle fem sidene på én side.',
            feedback:
              'Færre sider sikrer hverken tidlig informasjon eller bevart arbeid.',
          },
        ],
        correctId: 'reise',
        hint: 'Se både på forberedelsen og på hva som skjer når søkeren må ut av skjemaet.',
        explanation:
          'Søkeren kan forberede vedlegget og fortsette uten omarbeid. Test også avbrudd og retur.',
      },
    ],
  },
  {
    id: 'tsu-ux-uu-u02',
    title: 'Test ideen før du bygger',
    summary: 'Velg test og tolk observasjoner.',
    minutes: 4,
    takeaway:
      'Bruk en enkel modell og en nøytral oppgave. Observer, undersøk tolkningen og test endringen.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u02-forklart',
        title: 'Lær med en enkel modell',
        role: 'explain',
        source: u2,
        idea: 'En skisse viser en idé. En wireframe viser plassering av innhold og valg. En prototype lar noen prøve løsningen, på papir eller digitalt. Velg etter det dere trenger å lære.\nGi en realistisk oppgave i brukertesten, uten å røpe veien. Skill observasjon fra din forklaring.',
        bridge: 'Neste: prøve et nytt billettkjøp.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u02-test',
        title: 'Finner folk riktig billett?',
        role: 'scaffold',
        source: u2,
        context:
          'Forstår folk billettvalgene? Dere har en klikkbar prototype uten betaling.',
        question: 'Hvilken test gir mest nyttig kunnskap nå?',
        options: [
          {
            id: 'noytral',
            label:
              '«Én voksen skal fra Oslo S til Lillestrøm i morgen kl. 09. Finn billett.»',
          },
          {
            id: 'ledende',
            label: '«Velg Enkeltbillett, og trykk deretter Fortsett.»',
            feedback: 'Da røpes veien.',
          },
          {
            id: 'vente',
            label: 'Vent til betalingen er ferdig før noen prøver.',
            feedback:
              'Valgene kan undersøkes nå. Prototypen trenger ikke en ekte betaling for dette.',
          },
        ],
        correctId: 'noytral',
        hint: 'Gi et mål uten å røpe veien.',
        explanation:
          'Oppgaven undersøker forståelse av valgene. Prototypen kan ikke teste om betalingen fungerer.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u02-funn',
        title: 'Et uklart «Fortsett»',
        role: 'application',
        source: u2,
        context:
          'To deltakere spør ved «Fortsett» om de blir belastet. Neste side er bare en oppsummering.',
        question: 'Hva bør teamet prøve?',
        options: [
          {
            id: 'forklar',
            label: 'Forklar neste steg muntlig i resten av testene.',
            feedback:
              'Da skjuler testlederen problemet som vanlige brukere fortsatt vil møte.',
          },
          {
            id: 'tekst',
            label: 'Prøv «Se oppsummering» og test uten forklaring.',
          },
          {
            id: 'fjern',
            label: 'Fjern oppsummeringen siden folk stopper før den.',
            feedback:
              'Usikkerhet om knappen betyr ikke at oppsummeringen er unødvendig.',
          },
        ],
        correctId: 'tekst',
        hint: 'Hva trenger personen å forstå før trykket?',
        explanation:
          'Se om nye deltakere forstår knappeteksten uten hjelp. To observasjoner er et funn, ikke bevis for alle.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u02-ny',
        title: 'Ny situasjon: fungerer tastaturet?',
        role: 'application',
        source: u2,
        context:
          'Papirskissen er forståelig. Kan menyen også åpnes, brukes og lukkes uten mus?',
        question: 'Hva må dere prøve?',
        options: [
          {
            id: 'papir',
            label: 'Be deltakeren peke ut tastene på papirskissen.',
            feedback:
              'Det tester forventninger, ikke faktisk betjening og fokus.',
          },
          { id: 'kode', label: 'Prøv en fungerende meny med tastatur.' },
          {
            id: 'sporre',
            label: 'Spør om deltakeren tror menyen blir enkel å bruke.',
            feedback: 'En forventning viser ikke at samhandlingen virker.',
          },
        ],
        correctId: 'kode',
        hint: 'Kan modellen utføre det dere vil undersøke?',
        explanation:
          'En fungerende meny kan avsløre feil i betjening og fokus. Papirskissen kan ikke det.',
      },
    ],
  },
  {
    id: 'tsu-ux-uu-u03',
    title: 'Hvem møter en hindring?',
    summary: 'Skill brukervennlighet fra tilgjengelighetsbarrierer.',
    minutes: 3,
    takeaway:
      'Spør hvem som stenges ute. Involver mennesker med ulike funksjonsnedsettelser; én representerer ikke alle.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u03-forklart',
        title: 'Lett for hvem?',
        role: 'explain',
        source: u3,
        idea: 'Brukervennlighet gjelder effektiv og forståelig oppgaveløsning. Tilgjengelighet gjelder særlig barrierer for personer med funksjonsnedsettelser. Noen lykkes der andre stenges ute.\nUniversell utforming planlegger for at flest mulig kan bruke hovedløsningen, på ulike måter.',
        bridge: 'Neste: en påmelding som får gode vurderinger.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u03-barriere',
        title: 'Fire kom raskt gjennom',
        role: 'scaffold',
        source: u3,
        context:
          'Fire melder seg raskt på med mus. En deltaker med motorisk funksjonsnedsettelse når ikke Send-knappen med tastatur.',
        question: 'Hva viser testen?',
        options: [
          {
            id: 'snitt',
            label: 'God brukervennlighet samlet sett er nok.',
            feedback:
              'Gjennomsnittet skjuler at én deltaker ikke får meldt seg på.',
          },
          {
            id: 'hjelp',
            label: 'Tjenesten er tilgjengelig hvis noen kan hjelpe til.',
            feedback: 'Hjelp fra andre fjerner ikke selve hindringen.',
          },
          {
            id: 'barriere',
            label: 'En tilgjengelighetsbarriere, selv om andre lykkes.',
          },
        ],
        correctId: 'barriere',
        hint: 'Kan alle deltakerne utføre selve oppgaven?',
        explanation:
          'Tastaturbrukeren stenges ute. Færre klikk for andre løser ikke det.',
      },
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u03-flere',
        title: 'Ulike behov kan overlappe',
        role: 'explain',
        source: u3,
        idea: 'En skjermleser formidler tekst og struktur. Forstørring kan hjelpe ved nedsatt syn; teksting ved nedsatt hørsel. Tydelige steg kan hjelpe ved kognitive vansker. Noen kombinerer flere verktøy.\nTekst hjelper også når lyd er av, men likeverdig tilgang er et mål i seg selv.',
        bridge: 'Neste: nødvendig informasjon i en video.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u03-ny',
        title: 'Ny situasjon: hente billetten',
        role: 'application',
        source: u3,
        context:
          'En video forklarer hvor billetter hentes. Stedet sies bare med lyd. En døv kunde vil hente billetten uten å måtte spørre andre.',
        question: 'Hva gir tilgang til informasjonen?',
        options: [
          {
            id: 'lyd',
            label: 'Gjør lydstyrken justerbar.',
            feedback:
              'Lydstyrke gir ikke en døv kunde tilgang til det som blir sagt.',
          },
          {
            id: 'tekst',
            label: 'Gi korrekt teksting og hentestedet som tekst ved videoen.',
          },
          {
            id: 'bilde',
            label: 'Legg til flere bilder av lokalet.',
            feedback:
              'Bildene forteller ikke nødvendigvis hvor billetten hentes.',
          },
        ],
        correctId: 'tekst',
        hint: 'Hvilken opplysning finnes bare i lyd?',
        explanation:
          'Kontroller at teksten gir riktig hentested og tekstingen dekker nødvendig tale og lyd.',
      },
    ],
  },
  {
    id: 'tsu-ux-uu-u04',
    title: 'Bruk siden på flere måter',
    summary: 'Rett betjening, fokus og forstørring.',
    minutes: 3,
    takeaway:
      'Prøv hele oppgaven med tastatur og større tekst. Bevar rekkefølge, synlig fokus og alt innhold.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u04-forklart',
        title: 'Betjening og oversikt',
        role: 'explain',
        source: u4,
        idea: 'Fokus viser hvor tastetrykket virker. Tab flytter vanligvis fokus; Enter eller mellomrom aktiverer knapper. Rekkefølgen må gi mening, uten at brukeren fanges.\nTastaturstøtte hjelper også mange alternative inndataverktøy. Forstørret tekst må flyte om uten tap av innhold.',
        bridge: 'Neste: en meny uten synlig fokus.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u04-fokus',
        title: 'Hvor er jeg i menyen?',
        role: 'scaffold',
        source: u4,
        context:
          'Menyen kan åpnes med tastatur, men fokus er usynlig. Ved lukking hopper fokus til sidestart.',
        question: 'Hva bør rettes?',
        options: [
          {
            id: 'farge',
            label: 'Gjør menyens bakgrunn mørkere.',
            feedback: 'Det viser ikke fokus og retter ikke hoppet.',
          },
          {
            id: 'fokus',
            label: 'Vis fokus tydelig og gi det tilbake til menyknappen.',
          },
          {
            id: 'tab',
            label: 'Legg alle menyvalg først i Tab-rekkefølgen.',
            feedback: 'Det bryter rekkefølgen uten å rette fokusproblemene.',
          },
        ],
        correctId: 'fokus',
        hint: 'Hvor virker neste tastetrykk?',
        explanation:
          'Synlig fokus gir oversikt. Retur til menyknappen lar personen fortsette. Prøv også å gå videre ut av menyen.',
      },
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u04-struktur',
        title: 'Struktur som tåler endring',
        role: 'explain',
        source: u4,
        idea: 'Beskrivende, riktig kodede overskrifter hjelper oversikt og skjermlesernavigasjon. Bevar leserekkefølgen. Større tekst kan trenge mer plass nedover.',
        bridge: 'Neste: et skjema med forstørret tekst.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u04-ny',
        title: 'Ny situasjon: lange linjer',
        role: 'application',
        source: u4,
        context:
          'Forstørring krever rulling bortover og nedover for å lese felt og instruksjoner. Send-knappen havner utenfor skjermen.',
        question: 'Hva bør prøves?',
        options: [
          {
            id: 'liten',
            label: 'Hold teksten liten for å bevare oppsettet.',
            feedback: 'Da fjernes forstørringen personen trenger.',
          },
          {
            id: 'skjul',
            label: 'Skjul hjelpeteksten på smale skjermer.',
            feedback: 'Da kan nødvendig informasjon forsvinne.',
          },
          {
            id: 'flyt',
            label: 'La feltene stå under hverandre og teksten flyte om.',
          },
        ],
        correctId: 'flyt',
        hint: 'Hva kan flyttes uten informasjonstap?',
        explanation:
          'Én kolonne bevarer leserekkefølgen. Prøv forstørring og hele innsendingen igjen. Rulling nedover er greit.',
      },
    ],
  },
  {
    id: 'tsu-ux-uu-u05',
    title: 'Gjør informasjonen mulig å bruke',
    summary: 'Rett status, tekstalternativer og skjema.',
    minutes: 4,
    takeaway:
      'Bruk mer enn farge. Gi tydelige navn, konkrete feil og bevar utfyllingen.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u05-forklart',
        title: 'Informasjon må kunne oppfattes',
        role: 'explain',
        source: u5,
        idea: 'Farge alene er ikke nok til å vise status. Tekst må ha tilstrekkelig kontrast mot bakgrunnen. En bildeknapp trenger et tekstalternativ for handlingen.\nSkjemafelt trenger tydelige navn som også er koblet til feltet i koden. Forklar obligatoriske felt før innsending. Ved feil: si hvilket felt, hva som er galt og hvordan det rettes.',
        bridge: 'Neste: en status med bare farge.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u05-status',
        title: 'Er påmeldingen registrert?',
        role: 'scaffold',
        source: u5,
        context:
          'En prikk blir grønn ved påmelding. Ingen tekst endres. En deltaker med nedsatt fargesyn er usikker på resultatet.',
        question: 'Hvilken retting hjelper?',
        options: [
          {
            id: 'mork',
            label: 'Velg en mørkere grønnfarge.',
            feedback:
              'Kontrast hjelper, men statusen krever fortsatt fargesyn.',
          },
          {
            id: 'stor',
            label: 'Gjør prikken større.',
            feedback: 'Størrelse forklarer ikke statusen.',
          },
          {
            id: 'tekst',
            label: 'Vis «Du er påmeldt», også tilgjengelig for skjermleser.',
          },
        ],
        correctId: 'tekst',
        hint: 'Hva forteller resultatet hvis fargene ikke kan skilles?',
        explanation:
          'Teksten sier hva som har skjedd. Kontroller kontrasten og at skjermleseren formidler statusendringen uten at personen må lete etter den.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u05-feil',
        title: 'Bare «Ugyldig verdi»',
        role: 'application',
        source: u5,
        context:
          'Datoformatet er ikke oppgitt. Etter innsending blir datofeltet rødt og skjemaet tømmes. En søker med lesevansker vet ikke hva hun skal endre.',
        question: 'Hva hjelper henne videre?',
        options: [
          {
            id: 'forklar',
            label:
              'Vis datoformatet, knytt konkret feiltekst til feltet og bevar utfyllingen.',
          },
          {
            id: 'generell',
            label: 'Skriv «Kontroller alle feltene» øverst.',
            feedback: 'Det sier ikke hvilket felt eller datoformat.',
          },
          {
            id: 'rod',
            label: 'Bruk sterkere rødt og stjerne ved datoen.',
            feedback:
              'Format og feil er fortsatt uklare, og utfyllingen tapes.',
          },
        ],
        correctId: 'forklar',
        hint: 'Hva hjelper før feilen og ved et nytt forsøk?',
        explanation:
          'For eksempel «Dato (dd.mm.åååå)» og «Skriv datoen som 14.03.2027». Feilen må kunne finnes med skjermleser også. Bevar gyldige svar så de slipper å skrives om.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u05-ny',
        title: 'Ny situasjon: lupen',
        role: 'application',
        source: u5,
        context:
          'Søkeknappen viser en lupe. Skjermleseren sier bare «knapp». Søket skal også virke med talestyring.',
        question: 'Hva bør prøves?',
        options: [
          {
            id: 'utseende',
            label: 'Beskriv bildet med «svart lupe».',
            feedback: 'Det beskriver formen, ikke handlingen.',
          },
          {
            id: 'navn',
            label: 'Vis «Søk» og gi knappen samme tilgjengelige navn.',
          },
          {
            id: 'hjelp',
            label: 'Legg forklaringen i tekst som vises når musen holdes over.',
            feedback:
              'Den er ikke nødvendigvis tilgjengelig med skjermleser eller talestyring.',
          },
        ],
        correctId: 'navn',
        hint: 'Hva skal personen kunne be knappen om å gjøre?',
        explanation:
          'Navnet beskriver handlingen. Samsvar med synlig tekst hjelper talestyring. Prøv både tale og skjermleser.',
      },
    ],
  },
  {
    id: 'tsu-ux-uu-u06',
    title: 'Rett det viktigste og sjekk igjen',
    summary: 'Prioriter hindringer og kontroller hele oppgaven.',
    minutes: 4,
    takeaway:
      'Prioriter konsekvens, ikke bare klager og innsats. Kombiner verktøy, manuell kontroll og erfaring fra bruk.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u06-forklart',
        title: 'Et grønt verktøy er ikke hele svaret',
        role: 'explain',
        source: u6,
        idea: 'Automatiske tester finner noen feil, men avgjør ikke alt, som om beskjeder gir mening. Prøv hele oppgaven med tastatur, forstørring og relevante hjelpemidler. Involver ulike brukere.\nVurder hvem som rammes, konsekvens og tiltak. Få klager kan skjule alvorlige hindringer. Sett av tid til kontroll.',
        bridge: 'Neste: velge arbeid før en frist.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u06-prioriter',
        title: 'Tre timer til fristen',
        role: 'scaffold',
        source: u6,
        context:
          'Påmelding stenger om tre timer. Tastaturbrukere får ikke sendt (tre timer å rette og teste). Bekreftelsen kan ikke leses med skjermleser (to timer). Arrangøren kan sende e-post.',
        question: 'Hva bør prioriteres?',
        options: [
          {
            id: 'rask',
            label: 'Rett bekreftelsen først; det går fortest.',
            feedback: 'Da rekker ikke tastaturbrukere fristen.',
          },
          {
            id: 'stopp',
            label:
              'Rett og test innsending; bruk e-postbekreftelse midlertidig.',
          },
          {
            id: 'dele',
            label: 'Del timene mellom feilene og test senere.',
            feedback: 'Da kan begge feilene bestå ved fristen.',
          },
        ],
        correctId: 'stopp',
        hint: 'Hvem blir utestengt før fristen?',
        explanation:
          'Begge feilene må rettes. Sikre og test innsending før fristen. Bruk e-postbekreftelse mens den andre feilen rettes.',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u06-kontroll',
        title: 'Rettelsen er på plass',
        role: 'application',
        source: u6,
        context:
          'Send-knappen kan nå nås med tastatur. Den automatiske testen finner ingen feil.',
        question: 'Hva gir best grunnlag for å godta rettingen?',
        options: [
          {
            id: 'gronn',
            label: 'Den grønne rapporten og et bilde av knappen.',
            feedback: 'Bildet viser ikke om oppgaven virker.',
          },
          {
            id: 'tab',
            label: 'Sjekk at Tab når knappen på forsiden.',
            feedback: 'Fokus på knappen beviser ikke fullført oppgave.',
          },
          {
            id: 'oppgave',
            label:
              'Prøv hele flyten, også feil og bekreftelse, med tastatur og relevante hjelpemidler.',
          },
        ],
        correctId: 'oppgave',
        hint: 'Hva skal skje etter at knappen er nådd?',
        explanation:
          'Test utfylling, feilretting, innsending og bekreftelse. Involver berørte brukere. Dokumenter kontrollene og det som gjenstår.',
      },
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u06-regler',
        title: 'Standard og norske krav',
        role: 'explain',
        source: u6,
        idea: 'WCAG er en standard med testbare tilgjengelighetskrav. Norske minstekrav avhenger av sektor og løsning. Offentlig sektor har flere krav enn privat sektor. WCAG 2.2 er ikke automatisk lovkrav. Sjekk Uu-tilsynets gjeldende veiledning.\nNoen beståtte tester beviser ikke etterlevelse av regelverket.',
        bridge: 'Neste: hva kan dere si om en annen tjeneste?',
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u06-ny',
        title: 'Ny situasjon: rapporten er grønn',
        role: 'application',
        source: u6,
        context:
          'Nettbutikkens automatiske test og kontrastmåling er grønne. Kjøp med skjermleser og feilhåndtering er uprøvd. Lederen vil si «Oppfyller alle norske krav».',
        question: 'Hva er en forsvarlig konklusjon?',
        options: [
          {
            id: 'nok',
            label: 'Kontrast og grønn test er nok til påstanden.',
            feedback: 'Kontrollene dekker bare deler av løsningen og kravene.',
          },
          {
            id: 'avgrens',
            label:
              'Beskriv kontrollene, undersøk resten og avklar hvilke krav som gjelder.',
          },
          {
            id: 'nyest',
            label: 'Bytt til en WCAG 2.2-test, så gjelder konklusjonen.',
            feedback:
              'En nyere standard avgjør hverken testdekning eller norske plikter.',
          },
        ],
        correctId: 'avgrens',
        hint: 'Hvilke oppgaver og krav er ennå uprøvd?',
        explanation:
          'Skill kontrollomfang fra etterlevelse. Avklar regelgrunnlaget og undersøk det som gjenstår før dere vurderer påstanden.',
      },
    ],
  },
];
