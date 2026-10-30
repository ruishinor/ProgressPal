import type { MicroSession } from '@/lib/domain';

// Educational remediation proposal, 2026-10-27. Independent acceptance pending.
export const uxUuSessions: readonly MicroSession[] = [
  {
    id: 'tsu-ux-uu-u01',
    title: 'Hvor stopper brukeren opp?',
    summary: 'Undersøk hva folk gjør, før du forklarer hvorfor.',
    minutes: 5,
    takeaway:
      'Skriv hva personen faktisk gjorde, og hva personen selv fortalte. Undersøk forklaringen før du velger en endring. Informasjon må komme før valget som trenger den.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u01-forklart',
        title: 'Hva så dere, og hva tror dere?',
        role: 'explain',
        idea: 'Et team lager nettsiden til en privat klinikk. Pasientene skal kunne velge og bestille en time. Brukeropplevelse, ofte kalt UX, handler om hvordan tjenesten oppleves: fra å finne en passende time til å få bekreftelsen.\nI en test ser teamet hva pasientene trykker på. En slik observasjon forteller hva som skjedde. Den forteller ikke alltid hvorfor. Et forslag som «Lag en snarvei» sier heller ikke hvilket problem snarveien skal løse.',
        bridge: 'Neste: Hva kan teamet vite fra en test av timebestillingen?',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U01'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u01-antakelse',
        title: 'Hva forteller handlingen?',
        role: 'scaffold',
        context:
          'På klinikkens nettside velger pasienten først en time og fyller inn kontaktopplysninger. Prisen vises deretter, før bestillingen bekreftes. Tre testdeltakere trykker da på «Endre time» og velger en annen time. Ingen har ennå forklart hvorfor. Timene har ulike priser.',
        question:
          'En kollega sier: «De vil ha den billigste timen.» Hvordan bør teamet bruke forklaringen?',
        options: [
          {
            id: 'preferanse',
            label: 'Som noe deltakerne har fortalt at de ønsker.',
            feedback:
              'Deltakerne har valgt andre timer, men ingen har sagt at de ønsker lavest pris. En handling og et uttalt ønske er ulike opplysninger.',
          },
          {
            id: 'antakelse',
            label: 'Som en mulig grunn å spørre deltakerne om.',
          },
          {
            id: 'krav',
            label: 'Som dokumentasjon på at pris veier tyngre enn tidspunkt.',
            feedback:
              'Teamet har sett at deltakerne valgte andre timer. Det vet verken om de valgte billigere timer, eller om tidspunktet påvirket valget. Prioriteringen kan ikke leses ut av handlingen alene.',
          },
        ],
        correctId: 'antakelse',
        hint: 'Hvilken opplysning mangler mellom det dere så, og kollegaens forklaring?',
        explanation:
          'Teamet vet at tre personer valgte en annen time etter at prisen ble vist. Det vet ikke hva som avgjorde valget. «Hva tenkte du da du valgte en annen time?» kan undersøke grunnen uten å foreslå svaret.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U01'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u01-reise',
        title: 'Bruk det pasienten forteller',
        role: 'retrieval',
        context:
          'En deltaker forklarer: «Jeg måtte velge en time jeg hadde råd til. Jeg så ikke prisen før etter at jeg hadde skrevet kontaktopplysningene.» På nettsiden vises prisene fortsatt først etter utfyllingen.',
        question:
          'Hva bør teamet prøve for at pasienten skal kunne vurdere pris før utfylling?',
        options: [
          {
            id: 'snarvei',
            label: 'La «Endre time» bevare kontaktopplysningene.',
            feedback:
              'Det kan spare ny skriving, men pasienten må fortsatt fylle ut før prisen blir kjent. Det løser en annen del av problemet.',
          },
          {
            id: 'pris',
            label: 'Vis prisen ved hver time i timevalget.',
          },
          {
            id: 'hjelp',
            label: 'Vis en oversikt over bestillingsstegene først.',
            feedback:
              'Stegene kan bli lettere å forstå, men oversikten gir ikke prisen som deltakeren trenger for å velge time.',
          },
        ],
        correctId: 'pris',
        hint: 'Når trenger pasienten prisopplysningen for å kunne velge?',
        explanation:
          'Prisen blir tilgjengelig mens pasienten sammenligner timene. Prøv den endrede nettsiden med nye deltakere og se om de finner en passende time uten unødvendig utfylling. Én forklaring gjelder ikke nødvendigvis alle.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U01'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u01-ny',
        title: 'Ny situasjon: søknaden',
        role: 'application',
        context:
          'Mina søker stipend i et nettskjema med fem trinn. Først på siste trinn får hun vite at hun må laste opp en studieattest. Hun åpner skolens nettsted i samme fane for å hente attesten. Når hun åpner søknaden igjen, er svarene borte.',
        question:
          'Hvilket forslag lar Mina forberede attesten og åpne søknaden igjen med svarene fortsatt i feltene?',
        options: [
          {
            id: 'tekst',
            label:
              'Forklar vedleggskravet før start; la søkeren selv kopiere svarene før hun forlater skjemaet.',
            feedback:
              'Tidlig informasjon hjelper, og en kopi kan ta vare på teksten. Men kopien står utenfor skjemafeltene. Mina må legge svarene inn igjen; hun åpner ikke søknaden med feltene ferdig utfylt.',
          },
          {
            id: 'sider',
            label:
              'Samle trinnene på én side og bevar svarene mens denne siden er åpen.',
            feedback:
              'En åpen side er ikke en bevart kladd. Mina forlater nettopp siden for å hente attesten; forslaget sikrer ikke at svarene finnes når hun åpner søknaden igjen.',
          },
          {
            id: 'reise',
            label:
              'Vis vedleggskrav før start, og lagre en kladd som kan åpnes etter avbrudd.',
          },
        ],
        correctId: 'reise',
        hint: 'Se på tidspunktet for informasjonen og på hva som må finnes etter avbruddet.',
        explanation:
          'Mina kan hente attesten før hun begynner. En bevart kladd lar henne også fortsette hvis hun blir avbrutt. Kontroller ved å fylle ut, forlate skjemaet og åpne søknaden igjen; se at de samme svarene fortsatt står der.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U01'],
          skillIds: ['SK-METH-01'],
        },
      },
    ],
  },
  {
    id: 'tsu-ux-uu-u02',
    title: 'Test ideen før du bygger',
    summary: 'Velg en modell og en test som kan svare på spørsmålet.',
    minutes: 6,
    takeaway:
      'Bestem hva dere vil finne ut før dere velger test. Gi deltakeren et mål uten å vise fremgangsmåten. En modell kan bare undersøke det den faktisk lar personen gjøre.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u02-forklart',
        title: 'Hva kan en modell vise?',
        role: 'explain',
        idea: 'Et team lager en app for togbilletter. Før de bygger alt, vil de se om folk forstår billettvalgene.\nEn skisse er en rask tegning av en idé. En wireframe er en enkel skisse av hvor tekst, felt og knapper skal stå, uten ferdig utseende. En prototype er en modell noen kan prøve: på papir kan testlederen bytte tegning når deltakeren peker; digitalt kan deltakeren trykke seg mellom skjermbilder.\nEn brukertest betyr her at en deltaker prøver å løse en oppgave mens teamet observerer. Oppgaven må fortelle målet, men la deltakeren finne valgene selv. Ellers lærer teamet bare om deltakeren klarer å følge instruksjoner.',
        bridge: 'Neste: Velg en oppgave for en klikkbar billettmodell.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U02'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u02-test',
        title: 'Kan deltakeren finne en billett?',
        role: 'scaffold',
        context:
          'Teamets digitale prototype lar deltakeren velge reisemål, dato og billettype og se en oppsummering. Betaling er ikke laget. Teamet vil undersøke om en voksen finner riktig billett for én reise uten hjelp.',
        question: 'Hvilken oppgave gir best grunnlag for å undersøke dette?',
        options: [
          {
            id: 'noytral',
            label:
              '«Du skal reise fra Oslo S til Lillestrøm i morgen kl. 09. Finn en billett til deg selv.»',
          },
          {
            id: 'ledende',
            label:
              '«Velg Enkeltbillett, fyll inn reisen din og trykk Fortsett. Si fra hvis noe er uklart.»',
            feedback:
              'Deltakeren får vite hvilket valg og hvilken knapp som skal brukes. Da får dere ikke sett om personen selv finner billettypen.',
          },
          {
            id: 'vente',
            label:
              '«Fortell hvordan du ville funnet en billett fra Oslo S til Lillestrøm i morgen kl. 09.»',
            feedback:
              'Deltakeren kan beskrive en plan uten å prøve valgene. Å si hvordan man tror man ville gjort det, viser ikke om appens faktiske billettvalg blir forstått.',
          },
        ],
        correctId: 'noytral',
        hint: 'Hva må deltakeren få vite om reisen, og hva skal deltakeren finne ut selv?',
        explanation:
          'Reisemål og tidspunkt gjør oppgaven mulig å løse. Den røper ikke appens valg. Teamet kan notere hvilke valg deltakeren tar og hvor personen nøler. Prototypen kan ikke vise om en ekte betaling virker.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U02'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u02-funn',
        title: 'Usikker før neste skjermbilde',
        role: 'retrieval',
        context:
          'I billettprototypen spør to deltakere ved knappen «Fortsett»: «Betaler jeg nå?» Knappen åpner bare en oppsummering; betaling ville kommet senere. Teamet vil undersøke om knappeteksten skaper usikkerheten. Testlederen har deretter forklart neste steg til disse to.',
        question: 'Hvilket forsøk undersøker forklaringen best?',
        options: [
          {
            id: 'forklar',
            label:
              'Prøv «Se oppsummering» med deltakerne som nettopp fikk knappen forklart.',
            feedback:
              'De kjenner nå neste steg. At de forstår knappen på nytt, skiller ikke tydelig mellom virkningen av den nye teksten og det de lærte i første forsøk.',
          },
          {
            id: 'fjern',
            label:
              'Be nye deltakere vurdere om «Fortsett» eller «Se oppsummering» virker tydeligst.',
            feedback:
              'Dette gir synspunkter om teksten, men viser ikke om deltakerne forstår neste steg når de faktisk bestiller. Teamets spørsmål gjelder oppførselen under oppgaven.',
          },
          {
            id: 'tekst',
            label: 'Prøv «Se oppsummering» med nye deltakere uten forklaring.',
          },
        ],
        correctId: 'tekst',
        hint: 'Hvilken endring undersøker knappeteksten uten at testlederen forklarer den?',
        explanation:
          'Den nye teksten sier hva neste trykk gjør. Se om nye deltakere forstår dette og går videre uten å spørre om betaling. To spørsmål er grunn til å prøve en forbedring, men forteller ikke hvor mange av alle reisende som møter problemet.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U02'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u02-ny',
        title: 'Ny situasjon: fungerer tastaturet?',
        role: 'application',
        context:
          'Et annet team har tegnet menyen til en bibliotekkatalog på papir. Deltakere finner riktig menyvalg når de peker. Nå vil teamet vite om menyen kan åpnes, brukes og lukkes uten mus. Tastaturfokus er stedet på skjermen der neste tastetrykk virker.',
        question:
          'Hvilken modell kan gi direkte kunnskap om tastaturbetjeningen?',
        options: [
          {
            id: 'papir',
            label:
              'En papirtest der testlederen følger en plan for hvert tastetrykk.',
            feedback:
              'Planen kan avdekke uklar rekkefølge, men testlederen simulerer oppførselen. Den viser ikke at den programmerte menyen reagerer riktig på tastene.',
          },
          {
            id: 'kode',
            label:
              'En programmert meny som reagerer på tastene og viser hvor fokus flyttes.',
          },
          {
            id: 'sporre',
            label:
              'En klikkbar modell med tegninger av tastaturfokus ved alle menyvalgene.',
            feedback:
              'Tegningene viser en plan for fokus. En modell som bare reagerer på klikk, etablerer ikke at taster faktisk flytter fokus og lukker menyen.',
          },
        ],
        correctId: 'kode',
        hint: 'Hvilken modell lar deltakeren utføre akkurat handlingene dere vil undersøke?',
        explanation:
          'Med en fungerende meny kan deltakeren prøve tastene, se hvor fokus flyttes, og lukke menyen. Papir og museklikk kan gi annen nyttig kunnskap, men etablerer ikke tastaturstøtte.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U02'],
          skillIds: ['SK-METH-01'],
        },
      },
    ],
  },
  {
    id: 'tsu-ux-uu-u03',
    title: 'Hvem møter en hindring?',
    summary: 'Undersøk hvem som får tilgang til samme oppgave og informasjon.',
    minutes: 5,
    takeaway:
      'At noen fullfører raskt, betyr ikke at alle får tilgang. Finn hvilken handling eller informasjon som er utilgjengelig, og la flere ulike mennesker prøve hovedløsningen.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u03-forklart',
        title: 'En enkel påmelding — for hvem?',
        role: 'explain',
        idea: 'Et bibliotek har påmelding til et foredrag på nettsiden. Brukervennlighet handler blant annet om hvor lett og effektivt en person kan forstå og fullføre påmeldingen. Det er en del av brukeropplevelsen, UX, som også omfatter forventninger og opplevelsen før og etterpå.\nTilgjengelighet handler om å fjerne barrierer, særlig for personer med funksjonsnedsettelser. En knapp som bare virker med mus, kan være rask for noen og umulig for andre. Med tastatur brukes ofte Tab til å flytte mellom felt og knapper.\nUniversell utforming betyr å planlegge hovedløsningen slik at flest mulig kan bruke den på ulike måter, i stedet for å kreve en særordning i etterkant.',
        bridge:
          'Neste: Vurder resultatet når deltakerne bruker ulike måter å navigere på.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U03'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u03-barriere',
        title: 'Fire kom raskt gjennom',
        role: 'scaffold',
        context:
          'Fire testdeltakere melder seg på bibliotekets foredrag med mus. Erik bruker tastatur fordi presise musebevegelser er vanskelige for ham. Han fyller ut feltene, men Tab-tasten hopper over Send-knappen. Han får ikke sendt påmeldingen.',
        question: 'Hvilken konklusjon støttes av det teamet observerte?',
        options: [
          {
            id: 'snitt',
            label:
              'Problemet gjelder tidsbruk: Fire fullførte raskt, mens Erik trenger lengre tid.',
            feedback:
              'Erik brukte ikke bare lengre tid. Han fikk ikke sendt. Å sammenligne fullføringstider utelater den som ikke kan fullføre i det hele tatt.',
          },
          {
            id: 'hjelp',
            label:
              'Feilen gjelder skjemaets innsending generelt, siden Erik ikke får sendt påmeldingen.',
            feedback:
              'Eriks forsøk viser en feil ved tastaturbetjeningen. Musebrukerne sendte. Det er ikke grunnlag for å si at selve innsendingen svikter på alle betjeningsmåter.',
          },
          {
            id: 'barriere',
            label:
              'Erik møter en tastaturbarriere; de raske museforsøkene avkrefter ikke denne hindringen.',
          },
        ],
        correctId: 'barriere',
        hint: 'Sammenlign hva hver deltaker faktisk får gjort, ikke bare tiden til dem som fullførte.',
        explanation:
          'Tab hopper over knappen, og Erik får ikke sendt. Det er en konkret tastaturbarriere, selv om musebrukerne fullfører. Undersøk hvorfor knappen hoppes over, rett betjeningen og prøv innsendingen med tastatur igjen.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U03'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u03-flere',
        title: 'Den samme informasjonen på flere måter',
        role: 'explain',
        idea: 'En døv person får ikke tilgang til tale bare ved at lyden blir høyere. Teksting kan formidle tale og viktige lyder i en video. En skjermleser er et hjelpemiddel som formidler tekst og struktur som tale eller punktskrift, for eksempel til en blind person. Den lager ikke automatisk en forklaring på alt som bare finnes i et bilde. Hvis en rutetabell bare er et bilde med «Avgang 08.30», må avgangstiden også finnes som lesbar tekst.\nBehov varierer også mellom personer med samme funksjonsnedsettelse. Én vellykket test viser derfor ikke at alle får tilgang.',
        bridge: 'Neste: Finn informasjonen som må være tilgjengelig uten lyd.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U03'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u03-ny',
        title: 'Ny situasjon: hente billetten',
        role: 'application',
        context:
          'En konsertvideo sier: «Forhåndsbestilte billetter hentes ved inngang B. Nye billetter kjøpes ved inngang A.» Opplysningene finnes bare i talen. Liv er døv og har bestilt på forhånd. Teamet vil legge samme praktiske informasjon som tekst ved videoen.',
        question: 'Hvilken tekst bevarer forskjellen mellom henting og kjøp?',
        options: [
          {
            id: 'lyd',
            label:
              '«Billetter: inngang A. Forhåndsbestilte billetter kontrolleres ved inngang B.»',
            feedback:
              'Videoen sier at forhåndsbestilte billetter hentes ved B. Denne teksten gjør om henting til kontroll og knytter «Billetter» til A uten å si at dette gjelder nye kjøp. Liv får ikke samme opplysning som i talen.',
          },
          {
            id: 'tekst',
            label:
              '«Hent forhåndsbestilte billetter ved B. Kjøp nye billetter ved A.»',
          },
          {
            id: 'bilde',
            label:
              '«Hent billetter ved inngang B. Ved inngang A får du hjelp til billettspørsmål.»',
            feedback:
              'Billettkjøp er ikke det samme som generell hjelp. Teksten må bevare handlingen og stedet som talen oppgir, slik at kunder uten lyd får samme opplysninger.',
          },
        ],
        correctId: 'tekst',
        hint: 'Koble hver handling i talen til riktig inngang.',
        explanation:
          'Liv kan lese hvor hennes forhåndsbestilte billett hentes. Teksten bevarer også kjøpsstedet for andre kunder. Tilgjengelig informasjon må ha samme mening, ikke bare omtale samme tema. Tekst videoen også, med nødvendig tale og viktige lyder.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U03'],
          skillIds: ['SK-METH-01'],
        },
      },
    ],
  },
  {
    id: 'tsu-ux-uu-u04',
    title: 'Bruk siden på flere måter',
    summary: 'Følg tastaturfokus og bevar innhold når teksten forstørres.',
    minutes: 5,
    takeaway:
      'Tastaturbrukeren må vite hvor neste tastetrykk virker og kunne fortsette etter at en meny lukkes. Når tekst blir større, må innhold og kontroller fortsatt være lesbare og mulige å bruke.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u04-forklart',
        title: 'Hvor virker neste tastetrykk?',
        role: 'explain',
        idea: 'Sara bruker en nettside uten mus. Hun trykker Tab for å flytte mellom lenker, knapper og felt. Elementet som mottar neste tastetrykk, har tastaturfokus. En synlig ramme rundt elementet hjelper henne å se hvor hun er. Enter eller mellomrom kan aktivere en knapp.\nNår Sara åpner en meny, bruker hun tastene til å velge i den. Hvis hun lukker menyen uten å velge en ny side, bør hun kunne fortsette ved knappen som åpnet den. Hun skal også kunne bevege seg ut av menyen; tastaturet må ikke bli fanget der.',
        bridge: 'Neste: Vurder to konkrete fokusproblemer i en meny.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U04'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u04-fokus',
        title: 'Hvor er Sara i menyen?',
        role: 'scaffold',
        context:
          'Sara åpner «Mine bestillinger» med tastatur. Menyvalgene får fokus, men ingen synlig markering viser hvilket valg som er aktivt. Når hun trykker Escape for å lukke uten å velge noe, flyttes fokus til første lenke øverst på nettsiden.',
        question:
          'Hvilken retting hjelper henne både inne i menyen og etter lukking?',
        options: [
          {
            id: 'farge',
            label:
              'Marker valget under musepekeren; flytt fokus til menyknappen ved lukking.',
            feedback:
              'Dette retter destinasjonen etter lukking, men markeringen inne i menyen følger musen, ikke Saras tastetrykk. Hun mangler fortsatt oversikt over hvilket valg som har fokus.',
          },
          {
            id: 'fokus',
            label:
              'Vis fokus på menyvalget; flytt fokus til menyknappen ved lukking.',
          },
          {
            id: 'tab',
            label:
              'Vis fokus på menyvalget; flytt fokus til sidens første lenke ved lukking.',
            feedback:
              'Sara kan da se valget inne i menyen, men starter fortsatt navigeringen øverst etter Escape. Hun har ikke valgt en ny side og bør kunne fortsette ved menyknappen.',
          },
        ],
        correctId: 'fokus',
        hint: 'Hva trenger Sara å kunne se mens hun velger, og hvor vil hun fortsette etter Escape?',
        explanation:
          'Markeringen viser hvilket valg neste tastetrykk gjelder. Fokus på menyknappen etter Escape lar Sara fortsette der hun var. Prøv åpning, valg, lukking og videre navigering med tastatur for å kontrollere oppførselen.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U04'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u04-struktur',
        title: 'Større tekst trenger plass',
        role: 'explain',
        idea: 'Noen forstørrer tekst for å kunne lese den. Da får færre ord plass på hver linje. Et nettskjema kan tilpasse seg ved å bryte teksten over flere linjer og plassere feltene under hverandre. Dette kalles reflow, eller at innholdet flyter om.\nMålet er å beholde instruksjoner, felt og knapper i lesbar rekkefølge. Å måtte rulle nedover er normalt. Å måtte rulle frem og tilbake sidelengs for hver tekstlinje gjør lesingen vanskelig.',
        bridge:
          'Neste: Velg hvordan et søknadsskjema kan tilpasse seg forstørring.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U04'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u04-ny',
        title: 'Ny situasjon: lange linjer',
        role: 'application',
        context:
          'Jon forstørrer teksten i kommunens søknadsskjema. Feltene står i to faste kolonner. Instruksjonene fortsetter utenfor høyre skjermkant, så han må rulle sidelengs for hver linje. Han trenger både større tekst og hele instruksjonen for å fylle ut.',
        question: 'Hvilket oppsett bør teamet prøve?',
        options: [
          {
            id: 'liten',
            label:
              'Legg instruksjonene under feltene, men behold teksten på én lang linje.',
            feedback:
              'Flyttingen gir feltene plass, men den lange instruksjonslinjen krever fortsatt sidelengs rulling. Jon trenger linjebryting, ikke bare en annen plassering.',
          },
          {
            id: 'skjul',
            label:
              'Behold to kolonner og gi hver instruksjon en egen vannrett rullelinje.',
            feedback:
              'Hele teksten kan nås, men Jon må fortsatt rulle frem og tilbake for å lese hver linje. Flere rulleområder løser ikke leseproblemet.',
          },
          {
            id: 'flyt',
            label:
              'La tekst brytes over flere linjer og plasser feltene i én kolonne.',
          },
        ],
        correctId: 'flyt',
        hint: 'Hvordan kan oppsettet bruke mer plass nedover uten å fjerne noe?',
        explanation:
          'Én kolonne kan holde tekst og felt innenfor skjermbredden. Kontroller med forstørring at Jon kan lese instruksjonene, fylle ut, rette feil og sende. Et ryddig første skjermbilde er ikke nok hvis Send-knappen senere blir utilgjengelig.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U04'],
          skillIds: ['SK-METH-01'],
        },
      },
    ],
  },
  {
    id: 'tsu-ux-uu-u05',
    title: 'Gjør informasjonen mulig å bruke',
    summary: 'Gi tydelige beskjeder, feil og navn på kontroller.',
    minutes: 6,
    takeaway:
      'En beskjed må fortelle hva som skjedde, også uten farge. Et felt trenger navn og nødvendige instruksjoner. Ved feil må personen finne og rette problemet uten å skrive gyldige svar på nytt.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u05-forklart',
        title: 'Hva skjedde da du trykket?',
        role: 'explain',
        idea: 'Et påmeldingsskjema må svare forståelig etter at du trykker Send. En grønn prikk sier lite hvis du ikke skiller fargene eller ikke vet hva grønt betyr. Teksten «Du er påmeldt» forteller selve resultatet. Teksten må også kunne leses mot bakgrunnen; dette handler om kontrast.\nEn skjermleser formidler tekst og struktur som tale eller punktskrift. En ny statusbeskjed må være kodet slik at skjermleseren kan formidle endringen uten at personen må lete på siden. Synlig tekst alene sikrer ikke dette.',
        bridge:
          'Neste: Velg en bekreftelse som gir samme beskjed på flere måter.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U05'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u05-status',
        title: 'Er påmeldingen registrert?',
        role: 'scaffold',
        context:
          'Appen har registrert Annes foredragspåmelding. På skjermen blir bare en grå prikk grønn. Anne har nedsatt fargesyn og vet ikke hva endringen betyr. Teamet vil også at en skjermleser skal formidle den nye bekreftelsen. Skjermleseren får nå ingen melding når prikken endrer farge.',
        question: 'Hvilken endring gir en tydelig bekreftelse?',
        options: [
          {
            id: 'mork',
            label:
              'Vis «Du er påmeldt» som et bilde; behold kodingen av status uendret.',
            feedback:
              'Bildet kan forklare resultatet visuelt, men sikrer ikke at skjermleseren får og formidler den nye teksten. Den eksisterende statuskodingen gir ingen slik beskjed.',
          },
          {
            id: 'stor',
            label:
              'Vis «Påmelding» ved prikken; la skjermleseren lese denne overskriften ved innlasting.',
            feedback:
              'Overskriften navngir temaet, men sier ikke om påmeldingen ble registrert. Opplesning ved innlasting formidler heller ikke nødvendigvis endringen etter Send.',
          },
          {
            id: 'tekst',
            label:
              'Vis «Du er påmeldt» som en ny statusbeskjed skjermleseren kan formidle.',
          },
        ],
        correctId: 'tekst',
        hint: 'Hva kan Anne forstå uten å måtte tolke prikkens farge?',
        explanation:
          'Teksten sier at påmeldingen er registrert. Kontroller at den er lett å lese, og prøv med skjermleser at endringen blir formidlet. Å legge inn teksten i koden er ikke alene bevis på at beskjeden blir lest opp.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U05'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u05-veiledning',
        title: 'Hjelp før og etter en feil',
        role: 'explain',
        idea: 'Et skjemafelt trenger et tydelig navn, som «Fødselsdato». Navnet må være koblet til feltet i koden, slik at også skjermleseren kan fortelle hvilket felt personen fyller ut. Hvis formatet er viktig, vis et eksempel før personen skriver.\nVed feil trenger personen å vite hvilket felt som er galt, hva som må endres og hvordan. Bevar andre gyldige svar. En rød ramme eller «Ugyldig verdi» forklarer ikke hvordan personen skal komme videre.',
        bridge: 'Neste: Undersøk en feil i et datofelt.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U05'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u05-feil',
        title: 'Bare «Ugyldig verdi»',
        role: 'retrieval',
        context:
          'Lina søker lånekort på bibliotekets nettside. Feltet heter «Fødselsdato», men formatet er ikke oppgitt. Hun skriver 14/3/2007. Skjemaet krever 14.03.2007. Etter Send vises bare «Ugyldig verdi», datofeltet blir rødt, og alle svar tømmes.',
        question:
          'Lina må rette datoformatet. Hvilken feiltekst gir henne opplysningene som mangler?',
        options: [
          {
            id: 'forklar',
            label:
              '«Fødselsdato: Bruk punktum og fire sifre i året, for eksempel 14.03.2007.»',
          },
          {
            id: 'generell',
            label:
              '«Fødselsdato: Skriv en gyldig dato i formatet som er oppgitt ved feltet.»',
            feedback:
              'Feltet oppgir ikke formatet. Meldingen viser til en instruksjon Lina ikke har fått og forklarer ikke hvordan 14/3/2007 skal endres.',
          },
          {
            id: 'rod',
            label:
              '«Fødselsdato: Datoen kunne ikke lagres. Kontroller datoen og prøv å sende på nytt.»',
            feedback:
              'Problemet er det krevde formatet, ikke en påvist lagringsfeil. Meldingen sier ikke hva Lina skal skrive annerledes, så samme forsøk kan gi samme feil.',
          },
        ],
        correctId: 'forklar',
        hint: 'Sammenlign Linas dato med formatet skjemaet krever. Hva trenger meldingen å forklare?',
        explanation:
          'Meldingen navngir feltet og viser hvordan datoen skal skrives. Vis også formatet før utfylling, knytt feilen til feltet i koden og bevar de andre svarene. Da kan Lina rette én verdi uten å begynne på nytt.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U05'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u05-ny',
        title: 'Ny situasjon: lupen',
        role: 'application',
        context:
          'Søkeknappen i en bibliotekapp viser bare et bilde av en lupe. Skjermleseren sier «knapp», uten handling. En annen person styrer appen med stemmen og trenger et synlig navn å si. Et tilgjengelig navn er navnet hjelpemidler får fra koden. Talestyringen bruker det tilgjengelige navnet til å finne knappen.',
        question:
          'Hvilket par lar personen si det synlige knappnavnet og få samme handling formidlet av skjermleseren?',
        options: [
          {
            id: 'navn',
            label: 'Synlig tekst: «Søk». Tilgjengelig navn: «Søk».',
          },
          {
            id: 'utseende',
            label: 'Synlig tekst: «Søk». Tilgjengelig navn: «Finn bøker».',
            feedback:
              'Begge uttrykk beskriver søking, men det synlige ordet Søk finnes ikke i navnet hjelpemiddelet får. Talestyringen får dermed et annet knappnavn enn personen ser.',
          },
          {
            id: 'hjelp',
            label: 'Synlig tekst: «Finn bøker». Tilgjengelig navn: «Søk».',
            feedback:
              'Skjermleseren får et handlingsnavn, men en person som sier det synlige «Finn bøker», bruker et annet navn. Bevar samsvar mellom synlig tekst og tilgjengelig navn.',
          },
        ],
        correctId: 'navn',
        hint: 'Hvilket navn sier hva knappen gjør og kan brukes både visuelt og av hjelpemidler?',
        explanation:
          'Begge får handlingen Søk. Det synlige ordet finnes også i det tilgjengelige navnet, slik at personen kan bruke det ved talestyring. Kontroller faktisk bruk med hjelpemidlene; like navn alene viser ikke at søkefunksjonen virker.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U05'],
          skillIds: ['SK-METH-01'],
        },
      },
    ],
  },
  {
    id: 'tsu-ux-uu-u06',
    title: 'Rett det viktigste og sjekk igjen',
    summary:
      'Vurder konsekvenser, tilgjengelige alternativer og hva kontrollene faktisk viser.',
    minutes: 6,
    takeaway:
      'Prioriter ut fra hvem som hindres, hva de må få gjort og om et fungerende alternativ finnes. Kontroller selve oppgaven etter retting. Beskriv testene og begrensningene før dere lover mer enn dere har undersøkt.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u06-forklart',
        title: 'Hvilken feil haster mest?',
        role: 'explain',
        idea: 'Et team finner to feil før påmeldingen til et arrangement stenger. For å velge hva som må rettes først, trenger det mer enn antall klager. Hvem får ikke meldt seg på? Finnes det et alternativ personen faktisk kan bruke? Hvor lang tid tar retting og kontroll?\nEn automatisk tilgjengelighetstest undersøker bestemte forhold i koden, som om et felt mangler navn. Den kan ikke avgjøre alt, for eksempel om en beskjed gir mening. En grønn rapport betyr bare at verktøyet ikke fant feil med kontrollene det utførte.',
        bridge: 'Neste: Fordel en begrenset arbeidstid før påmeldingsfristen.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U06'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u06-prioriter',
        title: 'Fire timer til retting',
        role: 'scaffold',
        context:
          'Én utvikler har fire arbeidstimer før påmeldingen stenger. Oppgavene kan ikke gjøres samtidig.\n1. Send-knappen virker ikke med tastatur. Retting og kontroll tar tre timer. Ingen annen påmeldingsmåte er tilgjengelig før fristen.\n2. Bekreftelsessiden kan ikke leses med skjermleser, et hjelpemiddel som formidler tekst som tale eller punktskrift. Retting og kontroll tar to timer. Arrangøren har prøvd en e-postbekreftelse som de berørte kan lese, og sender den til alle som melder seg på.',
        question:
          'Hvilken plan kan gi både fungerende påmelding med tastatur og lesbar bekreftelse før fristen, med den tiden og de alternativene teamet har?',
        options: [
          {
            id: 'rask',
            label:
              'Bruk to timer på bekreftelsen, deretter resten på Send-knappen.',
            feedback:
              'Da er to timer igjen til en oppgave som trenger tre inkludert kontroll. De som bruker tastatur, har fortsatt ingen fungerende påmeldingsmåte før fristen.',
          },
          {
            id: 'stopp',
            label:
              'Bruk tre timer på Send-knappen og kontroll; send bekreftelsen på e-post.',
          },
          {
            id: 'dele',
            label:
              'Fordel timene mellom feilene og prøv begge rettingene samlet mot slutten.',
            feedback:
              'En slik fordeling kan etterlate begge rettingene uferdige. Den kjente tre timers oppgaven kan gjøres ferdig og kontrolleres, mens den andre allerede har et prøvd midlertidig alternativ.',
          },
        ],
        correctId: 'stopp',
        hint: 'Hvilken hindring mangler et fungerende alternativ før fristen?',
        explanation:
          'Tre timer rekker til en kontrollert innsending. Den prøvde e-postbekreftelsen gir midlertidig tilgang til bekreftelsen. Feilen på bekreftelsessiden må fortsatt rettes; prioriteringen gjør den ikke akseptabel permanent.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U06'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u06-kontroll',
        title: 'Virker hele påmeldingen nå?',
        role: 'retrieval',
        context:
          'Etter rettingen har teamet fylt ut og sendt en gyldig påmelding med bare tastatur og fått bekreftelsen. En ugyldig dato gir en feil som hittil bare er rettet med mus. Den automatiske tilgjengelighetstesten finner ingen feil.',
        question:
          'Hva bør teamet prøve før det sier at også feilrettingen fungerer uten mus?',
        options: [
          {
            id: 'gronn',
            label: 'Prøv gyldig påmelding med tastatur i en annen nettleser.',
            feedback:
              'En annen nettleser kan gi nyttig kunnskap, men denne kontrollen prøver fortsatt bare gyldige opplysninger. Teamet vet ennå ikke om datofeilen kan rettes uten mus.',
          },
          {
            id: 'tab',
            label:
              'Rett datoen med mus, bruk så tastatur til å sende og les bekreftelsen.',
            feedback:
              'Dette prøver innsending og bekreftelse, men bruker fortsatt mus til selve rettingen. En person uten mus kan bli stoppet før innsendingen.',
          },
          {
            id: 'oppgave',
            label:
              'Skriv ugyldig dato, rett den og send påmeldingen med bare tastatur.',
          },
        ],
        correctId: 'oppgave',
        hint: 'Skill mellom det teamet allerede har prøvd uten mus, og det som bare er prøvd med mus.',
        explanation:
          'Teamet har allerede prøvd en gyldig påmelding uten mus. Den nye kontrollen undersøker også om personen kommer videre fra en feil. Noter hva som ble prøvd og resultatet; ett vellykket tastaturforsøk dekker ikke alle former for tilgjengelighet.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U06'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-ux-uu-u06-regler',
        title: 'Et testresultat og en regel er ulike ting',
        role: 'explain',
        idea: 'WCAG er retningslinjer med testbare krav til tilgjengelighet på nett. Norske plikter avhenger blant annet av hvilken virksomhet og løsning det gjelder. Uu-tilsynets veiledning viser hvilke krav som gjelder. At WCAG 2.2 er en nyere versjon, gjør ikke hele versjonen automatisk til lovkrav for alle.\nEt team må derfor både avklare kravene og undersøke om løsningen oppfyller dem. Noen beståtte kontroller er ikke nok til en påstand om alle krav.',
        bridge: 'Neste: Vurder hva en nettbutikk har grunnlag for å si.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U06'],
          skillIds: ['SK-METH-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-ux-uu-u06-ny',
        title: 'Ny situasjon: rapporten er grønn',
        role: 'application',
        context:
          'En nettbutikk har kontrollert tekstkontrast og kjørt en automatisk tilgjengelighetstest uten funn. Ingen har prøvd kjøp med skjermleser eller feil i bestillingsskjemaet. Teamet har heller ikke avklart hvilke norske krav som gjelder. Lederen foreslår teksten «Oppfyller alle norske krav».',
        question: 'Hva gjenstår før teamet kan vurdere lederens påstand?',
        options: [
          {
            id: 'nok',
            label:
              'Avklar regelgrunnlaget, mål kontrast og feltnavn på nytt, og dokumenter den automatiske rapporten.',
            feedback:
              'Dette avklarer krav og undersøker utvalgte egenskaper. Det viser fortsatt ikke om kjøp og feilretting fungerer med skjermleser. Rapporten kan ikke fylle det uprøvde området.',
          },
          {
            id: 'avgrens',
            label:
              'Avklar regelgrunnlaget og prøv kjøp og feilretting med skjermleser før dere vurderer påstanden.',
          },
          {
            id: 'nyest',
            label:
              'Prøv kjøpet med flere hjelpemidler, og bruk funnene til å fylle ut en WCAG 2.2-sjekkliste.',
            feedback:
              'Dette gir nyttig kunnskap om kjøpet. WCAG 2.2 kan være et arbeidsverktøy, men planen avklarer ikke hvilke norske plikter som gjelder. En test og en standardliste avgjør ikke regelgrunnlaget.',
          },
        ],
        correctId: 'avgrens',
        hint: 'Hvilke deler av lederens påstand er det ennå ikke samlet kunnskap om?',
        explanation:
          'Teamet mangler både et avklart regelgrunnlag og undersøkelser av kjøp og feilretting. Riktig kravliste erstatter ikke testing, og en manuell test avgjør ikke hvilke regler som gjelder. Rapporten kan brukes som del av dokumentasjonen.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['UXUU-U06'],
          skillIds: ['SK-METH-01'],
        },
      },
    ],
  },
];
