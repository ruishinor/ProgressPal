import type { MicroSession } from '@/lib/domain';

import { source } from './source';

const s01 = source('S01');
const s02 = source('S02');
const s03 = source('S03');
const s04 = source('S04');
const s05 = source('S05');
const s06 = source('S06');

/** Utviklerblikk · Scrum: ACT 18 activities S01–S06, in authored order. */
export const scrumSessions: readonly MicroSession[] = [
  {
    id: 'tsu-scrum-s01',
    title: 'Hvorfor jobbe i sprinter?',
    summary: 'Korte sykluser gir tidlig læring.',
    minutes: 4,
    takeaway:
      'Korte sprinter gir et brukbart resultat tidlig, slik at teamet kan oppdage misforståelser mens de fortsatt er billige å rette.\nTilpass ut fra det dere lærer – men la nye ønsker gå via produktbackloggen i stedet for å kaste sprintmålet hver gang noen har en ny idé.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-scrum-s01-forklart',
        title: 'Sprinter: lære tidlig',
        role: 'explain',
        source: s01,
        idea: 'Det er ofte vanskelig å vite nøyaktig hva brukerne trenger før de har fått prøve noe. Det gjelder også når alle har gjort sitt beste for å forklare det.\nDerfor jobber Scrum – en måte å organisere teamarbeid på, i små steg – i sprinter. En sprint er en fast periode på én måned eller mindre, ofte to uker. I hver sprint lager teamet et inkrement: en ferdig del av produktet som faktisk kan brukes og prøves.\nHver sprint har et sprintmål: én tydelig grunn til at akkurat denne sprinten er verdt å gjennomføre. Det gir teamet felles fokus.\nMot slutten av hver sprint ser teamet og de som skal bruke produktet, på resultatet sammen. Jo kortere sprintene er, desto oftere får teamet mulighet til å lære og justere retningen.',
        definitions: [
          {
            term: 'Inspeksjon',
            text: 'å se nøye på resultatet og hvordan det går.',
          },
          {
            term: 'Tilpasning',
            text: 'å endre planen eller produktet når man ser at noe ikke stemmer.',
          },
          {
            term: 'Produktbackloggen',
            text: 'listen over alt som kan lages i produktet.',
          },
          {
            term: 'Produkteieren',
            text: 'personen i teamet som har ansvar for den listen og for hva som er viktigst å lage.',
          },
        ],
        bridge: 'Neste: et team får tilbakemelding etter første sprint.',
      },
      {
        kind: 'learn',
        id: 'tsu-scrum-s01-situasjon',
        title: 'Trenerne prøver appen',
        role: 'explain',
        source: s01,
        idea: 'Et team på fem lager en app der trenere i et idrettslag kan booke treningstid i hallen. Sprintene varer i to uker.\nSprintmålet for den første sprinten var: «Trenere kan se ledige tider og booke én treningstime.»\nTeamet ble ferdig, og på slutten av sprinten prøvde tre trenere appen. Tilbakemeldingen var tydelig: «Vi booker nesten aldri én og én time. Vi trenger den samme tiden hver uke gjennom hele sesongen.»\nTeamet hadde misforstått hvordan trenerne faktisk bruker hallen.',
        bridge: 'Neste: Hva bør teamet gjøre nå?',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s01-sporsmal',
        title: 'Etter første sprint',
        role: 'scaffold',
        source: s01,
        context:
          'Teamet har laget en første versjon av en app der trenere kan booke én treningstime i hallen. Trenerne prøvde den og sa at de i stedet trenger den samme tiden hver uke gjennom hele sesongen.',
        question: 'Hva er den mest fornuftige reaksjonen?',
        options: [
          {
            id: 'fortsette',
            label:
              'Fortsette med den opprinnelige planen. Faste ukentlige tider kan legges til når resten av appen er ferdig, så teamet ikke mister oversikten.',
            feedback:
              'Planen ble laget før teamet visste hvordan trenerne jobber. Hvis teamet fortsetter som før, bygger de videre på en misforståelse, og den blir dyrere å rette jo lenger de venter. I Scrum skal teamet tilpasse seg så snart det lærer noe viktig.',
          },
          {
            id: 'kravspesifikasjon',
            label:
              'Slå fast at sprinten var bortkastet, og skrive en fullstendig kravspesifikasjon for hele appen før teamet programmerer mer.',
            feedback:
              'Det er lett å tro at bedre planlegging kunne ha hindret feilen. Men trenerne oppdaget selv hva de trengte først da de prøvde appen. Sprinten var ikke bortkastet: For prisen av to uker fant teamet en viktig misforståelse, og det er nettopp dette korte sprinter er til for.',
          },
          {
            id: 'bruke',
            label:
              'Bruke det de har lært: Produkteieren oppdaterer produktbackloggen, og ukentlig booking tas med i planleggingen av neste sprint.',
          },
          {
            id: 'lengre',
            label:
              'Gjøre sprintene lengre, slik at teamet rekker å lage mer av appen før trenerne ser den neste gang.',
            feedback:
              'Lengre sprinter betyr lengre tid mellom hver tilbakemelding. Da kan teamet jobbe lenge i feil retning. Scrum peker heller på kortere sprinter når man vil lære mer og redusere risikoen.',
          },
        ],
        correctId: 'bruke',
        hint: 'Hva skjedde fordi trenerne fikk prøve appen etter bare to uker? Tenk på hva som kunne ha skjedd hvis de først hadde fått se den etter et halvt år.',
        explanation:
          'Teamet bruker den nye kunnskapen der den hører hjemme: Produktbackloggen blir oppdatert, og neste sprint planlegges ut fra det teamet nå vet. Teamet kunne ikke vite hvordan trenerne bruker hallen før trenerne fikk noe ekte å prøve. Fordi sprinten var kort og ga et brukbart resultat, ble misforståelsen oppdaget etter to uker i stedet for etter flere måneder. Men det hjelper bare hvis teamet faktisk endrer noe: Å se på resultatet uten å tilpasse seg, er meningsløst.',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s01-ny',
        title: 'Ny situasjon: et ønske midt i sprinten',
        role: 'application',
        source: s01,
        context:
          'Nå er teamet midt i sprint 2. Sprintmålet er: «Trenere kan booke fast ukentlig treningstid for en hel sesong.»\nEn dag kommer lederen i idrettslaget innom og spør: «Kan dere lage en nyhetsside i appen? Vi vil gjerne ha den før jul.» Sprinten slutter om én uke, og det er to måneder til jul.',
        question: 'Hva bør skje med ønsket?',
        options: [
          {
            id: 'produkteier',
            label:
              'Ønsket går til produkteieren, som kan legge det inn i produktbackloggen og vurdere hvor viktig det er. Teamet jobber videre mot sprintmålet.',
          },
          {
            id: 'tilpasse',
            label:
              'Teamet legger sprintmålet til side og begynner på nyhetssiden, fordi Scrum handler om å tilpasse seg endringer så raskt som mulig, uansett hva de går ut på.',
            feedback:
              'Å tilpasse seg betyr å endre retning når man har lært noe viktig, ikke å bytte retning hver gang noen har en ny idé. Under en sprint skal teamet ikke gjøre endringer som setter sprintmålet i fare. Sprinten slutter om en uke, og det er to måneder til jul, så ønsket kan vurderes når neste sprint skal planlegges.',
          },
          {
            id: 'nei',
            label:
              'Teamet sier nei og lar ønsket ligge, fordi ingenting kan endres i Scrum når en sprint først er i gang.',
            feedback:
              'Ønsket kan være verdifullt og bør ikke bare forsvinne. Produktbackloggen kan endres når som helst, og selv innholdet i sprinten kan avklares med produkteieren underveis. Det som beskyttes under sprinten, er sprintmålet – ikke all mulighet for endring.',
          },
        ],
        correctId: 'produkteier',
        hint: 'Har lederen fortalt noe som gjør sprintmålet feil eller unødvendig?',
        explanation:
          'Ønsket blir tatt på alvor uten at teamet mister fokus: Produkteieren har ansvar for produktbackloggen og kan vurdere nyhetssiden opp mot alt annet som skal lages. Ny kunnskap som endrer hva brukerne trenger, skal brukes så fort som mulig. Et nytt ønske som ikke endrer sprintmålet, går inn i produktbackloggen og vurderes der. Bare hvis sprintmålet blir meningsløst – for eksempel hvis idrettslaget plutselig mister tilgangen til hallen – kan produkteieren avbryte sprinten.',
      },
    ],
  },
  {
    id: 'tsu-scrum-s02',
    title: 'Hvem har ansvar for hva?',
    summary: 'Hvert ansvar har sine beslutninger.',
    minutes: 4,
    takeaway:
      'I Scrum spør du hvilket ansvar en beslutning hører til. Produkteieren avgjør verdi og rekkefølge, utviklerne avgjør hvordan arbeidet gjøres, og Scrum Master sørger for at Scrum og samarbeidet fungerer og at hindringer blir fjernet.\nIngen av dem er sjef for de andre, og en stillingstittel endrer ikke dette.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-scrum-s02-forklart',
        title: 'Tre typer ansvar i Scrum',
        role: 'explain',
        source: s02,
        idea: 'Scrum er en måte å organisere teamarbeid på, i korte perioder som kalles sprinter. I et Scrum-team finnes det tre typer ansvar (på engelsk accountabilities). Å ha ansvar betyr her at du står for at noe blir ivaretatt. Det betyr ikke at du må gjøre alt selv, og ikke at du er sjef for de andre.\nInne i et Scrum-team finnes det ikke noe hierarki. Den tittelen en person har i bedriften, avgjør ikke hvilket ansvar personen har i Scrum.',
        definitions: [
          {
            term: 'Produkteieren (Product Owner)',
            text: 'har ansvar for at produktet blir så verdifullt som mulig. Produkteieren bestemmer rekkefølgen i produktbackloggen, altså listen over det som kan lages. Produkteieren er én person, ikke en komité. Andre som vil endre rekkefølgen, må prøve å overbevise produkteieren.',
          },
          {
            term: 'Utviklerne (Developers)',
            text: 'lager selve produktet. De lager planen for sprinten, sørger for kvaliteten og bestemmer selv hvordan arbeidet skal gjøres.',
          },
          {
            term: 'Scrum Master',
            text: 'har ansvar for at teamet forstår og bruker Scrum, og for at teamet jobber effektivt. Scrum Master veileder teamet og sørger for at hindringer blir fjernet. Scrum Master er ikke prosjektleder og ikke sjef for teamet.',
          },
        ],
        bridge: 'Neste: to ledere vil ha hver sin ting først.',
      },
      {
        kind: 'learn',
        id: 'tsu-scrum-s02-situasjon',
        title: 'Rabattkoder eller pakkesporing?',
        role: 'explain',
        source: s02,
        idea: 'Et Scrum-team lager en nettbutikk for en sykkelforretning. To personer i forretningen vil ha hver sin ting først:\n• Salgssjefen vil ha rabattkoder klare før en stor vårkampanje.\n• Lederen for kundeservice vil ha bedre pakkesporing, fordi kundeservice får mange telefoner fra kunder som lurer på hvor pakken er.\nTeamet rekker ikke begge deler i neste sprint. Salgssjefen går til teamets Scrum Master, Emma, og sier: «Du er jo prosjektlederen her. Sørg for at teamet lager rabattkodene først.»',
        bridge: 'Neste: Hvem bør avgjøre?',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s02-sporsmal',
        title: 'To ønsker, én sprint',
        role: 'scaffold',
        source: s02,
        context:
          'Teamet rekker bare én av to saker i neste sprint: rabattkoder (salgssjefen) eller bedre pakkesporing (kundeservice). Salgssjefen ber Scrum Master Emma sørge for at rabattkodene kommer først.',
        question: 'Hvem bør avgjøre hva som er viktigst å lage først?',
        options: [
          {
            id: 'produkteier',
            label:
              'Produkteieren, som ordner produktbackloggen. Begge lederne kan legge frem argumentene sine for produkteieren.',
          },
          {
            id: 'emma',
            label:
              'Scrum Master Emma, fordi Emma leder teamet i hverdagen og har best oversikt over hva teamet rekker.',
            feedback:
              'Emma er ikke prosjektleder, selv om salgssjefen sier det. Scrum Master har ansvar for at Scrum fungerer og at teamet jobber effektivt, men bestemmer ikke hva som er viktigst å lage. Emma kan likevel hjelpe ved å forklare hvordan prioritering fungerer i Scrum, og ved å legge til rette for en samtale med produkteieren.',
          },
          {
            id: 'utviklerne',
            label:
              'Utviklerne, ved å stemme. Teamet er selvstyrt, så det er de som bestemmer hva som er viktigst å lage.',
            feedback:
              'Utviklerne er selvstyrte når det gjelder hvordan arbeidet gjøres og hvor mye de kan få ferdig i en sprint. Når sprinten planlegges, velger utviklerne i samtale med produkteieren hva som skal være med. Men det er produkteieren som ordner produktbackloggen ut fra hva som gir mest verdi.',
          },
          {
            id: 'salgssjefen',
            label:
              'Salgssjefen, fordi salgssjefen har den høyeste stillingen av dem som er involvert i saken.',
            feedback:
              'En høy stilling gir ikke rett til å bestemme rekkefølgen i produktbackloggen. Scrum Guide, den offisielle beskrivelsen av Scrum, sier at hele organisasjonen må respektere produkteierens beslutninger. Salgssjefen kan påvirke – ved å overbevise produkteieren.',
          },
        ],
        correctId: 'produkteier',
        hint: 'Dette er et spørsmål om hva som gir mest verdi, ikke om hvordan noe skal lages. Hvilket ansvar handler om verdi og rekkefølge?',
        explanation:
          'Rekkefølgen i produktbackloggen er produkteierens ansvar. Begge ønskene kan være gode, og produkteieren må vurdere hva som gir mest verdi. Når noen vil ha noe prioritert, er det første spørsmålet: Hvilket ansvar handler dette om? Legg merke til at Emma likevel har en rolle. Scrum Master skal hjelpe både teamet og organisasjonen med å forstå Scrum, og kan legge til rette for samarbeid med dem som har ønsker til produktet. Å hjelpe er ikke det samme som å bestemme.',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s02-ny',
        title: 'Ny situasjon: Sara venter på tilgang',
        role: 'application',
        source: s02,
        context:
          'En utvikler i teamet, Sara, har ventet i tre dager på tilgang til en testserver. IT-avdelingen svarer ikke. Uten tilgangen kan Sara ikke teste pakkesporingen. Sara tar det opp med teamet.',
        question: 'Hvilket utsagn stemmer best med Scrum?',
        options: [
          {
            id: 'ordne',
            label:
              'Scrum Master må selv ordne tilgangen og fortelle Sara hva Sara skal jobbe med i mellomtiden, så teamet ikke mister tid.',
            feedback:
              'Scrum Master har ansvar for at hindringen blir fjernet, men trenger ikke å gjøre alt selv. Å fortelle Sara hva Sara skal jobbe med, er dessuten å styre utviklerne som en prosjektleder. I Scrum planlegger utviklerne sitt eget arbeid.',
          },
          {
            id: 'produkteier',
            label:
              'Dette er produkteierens problem, fordi produkteieren er den som leder teamet og fordeler arbeidet mellom utviklerne.',
            feedback:
              'Produkteieren er ikke leder for teamet og fordeler ikke arbeidet. Det finnes ikke noe hierarki i et Scrum-team. Produkteierens ansvar er verdien av produktet og produktbackloggen, ikke å fjerne praktiske hindringer for utviklerne.',
          },
          {
            id: 'hindring',
            label:
              'Scrum Master har ansvar for at hindringen blir fjernet, men utviklerne bestemmer selv hvordan de justerer planen.',
          },
        ],
        correctId: 'hindring',
        hint: '«Sørge for at noe blir gjort» og «gjøre alt selv» er to forskjellige ting. Hvem planlegger utviklernes arbeid?',
        explanation:
          'Scrum Master sørger for at hindringen blir tatt tak i, mens utviklerne beholder ansvaret for sin egen plan. Å ha ansvar for noe betyr ikke at du utfører hver handling selv. Scrum Master kan for eksempel kontakte IT, be om hjelp fra noen som kan påvirke IT-avdelingen, eller hjelpe teamet med å finne en annen vei videre. Det viktige er at hindringen ikke blir liggende. Samtidig bestemmer utviklerne hvordan de bruker tiden mens de venter.',
      },
    ],
  },
  {
    id: 'tsu-scrum-s03',
    title: 'Hvilken Scrum-hendelse passer?',
    summary: 'Velg hendelse etter hva som skal inspiseres.',
    minutes: 5,
    takeaway:
      'Velg hendelse etter hva som skal inspiseres.\nSprint Planning lager planen for sprinten, Daily Scrum justerer planen underveis, Sprint Review ser på produktet sammen med interessentene, og Sprint Retrospective forbedrer måten teamet jobber på.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-scrum-s03-forklart',
        title: 'Fire hendelser i hver sprint',
        role: 'explain',
        source: s03,
        idea: 'Scrum er en måte å organisere teamarbeid på, i sprinter. En sprint er en fast periode, ofte to uker, der teamet jobber mot et sprintmål. Inne i hver sprint finnes det fire hendelser. Hver av dem er en anledning til å se på noe og endre det som trengs. Produkteieren er personen i teamet som har ansvar for hva som er viktigst å lage.\nEn enkel huskeregel: Sprint Review handler om produktet. Sprint Retrospective handler om arbeidsmåten.\nMange team bruker tre faste spørsmål på Daily Scrum: Hva gjorde jeg i går? Hva skal jeg gjøre i dag? Er det noe som hindrer meg? Det er en vanlig teknikk, men ikke et krav. Utviklerne kan velge den formen som fungerer best, så lenge møtet handler om fremdriften mot sprintmålet og ender med en plan for den neste dagen.',
        definitions: [
          {
            term: 'Sprint Planning (starten av sprinten)',
            text: 'Hele teamet blir enige om hvorfor sprinten er verdifull (sprintmålet), hva de skal ta med, og hvordan arbeidet skal gjøres.',
          },
          {
            term: 'Daily Scrum (hver arbeidsdag, maks 15 minutter)',
            text: 'Utviklerne ser på hvordan det går mot sprintmålet og justerer planen for den neste dagen.',
          },
          {
            term: 'Sprint Review (nær slutten av sprinten)',
            text: 'Teamet og interessentene – de som bruker eller påvirkes av produktet – ser på resultatet sammen og diskuterer hva som bør gjøres videre.',
          },
          {
            term: 'Sprint Retrospective (helt til slutt)',
            text: 'Teamet ser på hvordan de har jobbet – samarbeid, verktøy og arbeidsmåter – og velger forbedringer.',
          },
        ],
        bridge: 'Neste: to temaer på siste dag i en sprint.',
      },
      {
        kind: 'learn',
        id: 'tsu-scrum-s03-situasjon',
        title: 'Siste dag i sprinten',
        role: 'explain',
        source: s03,
        idea: 'Et team lager en app der elever kan bestille mat i skolekantina. Det er siste dag i en sprint på to uker. Teamet har lagt merke til to ting:\n1. Kantinesjefen prøvde den nye bestillingsskjermen i går. Kantinesjefen sa at elevene må kunne se hvilke allergener maten inneholder før de bestiller. Det hadde ingen tenkt på.\n2. Utviklerne har merket at ferdig kode flere ganger ble liggende to–tre dager før noen gjennomgikk den. Derfor kom testingen sent i gang.\nBegge temaene skal tas opp før neste sprint. Teamet har to hendelser igjen: Sprint Review og Sprint Retrospective.',
        bridge: 'Neste: Hvor passer hvert tema?',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s03-sporsmal',
        title: 'Allergener og ventetid',
        role: 'scaffold',
        source: s03,
        context:
          'To temaer skal tas opp før neste sprint:\n1. Kantinesjefen sa at elevene må se allergenene i maten før de bestiller.\n2. Ferdig kode ligger flere ganger i to–tre dager og venter på gjennomgang, så testingen kommer sent i gang.\nSprint Review og Sprint Retrospective er de to hendelsene som er igjen.',
        question: 'Hvor passer det best å ta opp hvert av de to temaene?',
        options: [
          {
            id: 'review',
            label:
              'Begge i Sprint Review, fordi begge handler om ting som ikke gikk som de skulle i sprinten.',
            feedback:
              'Begge temaene er «noe som ikke gikk som det skulle», men det er ikke det som avgjør. Sprint Review handler om resultatet og produktet sammen med dem som bruker det. Ventingen på kodegjennomgang handler om teamets arbeidsmåte, og det hører hjemme i Sprint Retrospective.',
          },
          {
            id: 'byttet',
            label:
              'Allergenene i Sprint Retrospective og ventingen på kodegjennomgang i Sprint Review.',
            feedback:
              'Her er de to byttet om. Allergenene sier noe om hva elevene trenger av produktet, og det er Sprint Review til for. Ventingen sier noe om teamets egen prosess, og det er Sprint Retrospective til for.',
          },
          {
            id: 'daily',
            label:
              'Begge på Daily Scrum, fordi Daily Scrum er det faste stedet der teamet tar opp problemer.',
            feedback:
              'Daily Scrum er ikke et møte for alle slags problemer. Den er et kort møte for utviklerne der de ser på fremdriften mot sprintmålet og planlegger den neste dagen. Sprinten er dessuten nesten over, og den neste sprinten begynner med Sprint Planning.',
          },
          {
            id: 'riktig',
            label:
              'Allergenene i Sprint Review og ventingen på kodegjennomgang i Sprint Retrospective.',
          },
        ],
        correctId: 'riktig',
        hint: 'Spør for hvert tema: Handler dette om hva produktet skal gjøre, eller om hvordan teamet jobber?',
        explanation:
          'Allergenene er en tilbakemelding om produktet. Den passer i Sprint Review, der teamet og kantinesjefen kan diskutere hva som bør lages videre og justere produktbackloggen. Ventingen handler om hvordan teamet samarbeider, og passer i Sprint Retrospective. I Scrum er det nyttig å spørre: Hva skal vi se på, og hva kan vi endre? Viktige problemer kan også tas opp underveis; ingen trenger å vente på et møte.',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s03-ny-1',
        title: 'Ny situasjon: en ny sprint',
        role: 'application',
        source: s03,
        context:
          'En ny sprint starter mandag. Teamet skal bli enige om hva de vil oppnå de neste to ukene, og om allergenvisningen skal være med.',
        question: 'Hvilken hendelse passer?',
        options: [
          {
            id: 'daily',
            label: 'Daily Scrum',
            feedback:
              'Daily Scrum justerer planen fra dag til dag inne i en sprint. Sprintmålet må være på plass før den første Daily Scrum.',
          },
          { id: 'planning', label: 'Sprint Planning' },
          {
            id: 'review',
            label: 'Sprint Review',
            feedback:
              'Sprint Review holdes mot slutten av en sprint og ser på resultatet av den. Den gir viktig informasjon til planleggingen, men selve planen for den nye sprinten lages i Sprint Planning.',
          },
        ],
        correctId: 'planning',
        hint: 'Skal teamet planlegge en hel sprint, eller justere planen underveis?',
        explanation:
          'Sprint Planning starter sprinten. Hele teamet blir enige om sprintmålet og hva de skal ta med. Produkteieren kan forklare hvorfor allergenvisningen er viktig, og utviklerne vurderer hva de kan få ferdig.',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s03-ny-2',
        title: 'Ny situasjon: onsdag i sprinten',
        role: 'application',
        source: s03,
        context:
          'Det er onsdag i den nye sprinten. Utviklerne ser at allergenvisningen er mer arbeid enn de trodde, og at sprintmålet kan komme i fare. De må justere planen for de neste dagene.',
        question: 'Hvilken hendelse er laget for nettopp dette?',
        options: [
          { id: 'daily', label: 'Daily Scrum' },
          {
            id: 'retro',
            label: 'Sprint Retrospective',
            feedback:
              'Sprint Retrospective kommer helt til slutt i sprinten. Utviklerne trenger å justere planen nå, ikke først når sprinten er over.',
          },
          {
            id: 'review',
            label: 'Sprint Review',
            feedback:
              'Sprint Review handler om å se på resultatet sammen med interessentene. Her er det utviklernes plan for de neste dagene som må justeres.',
          },
        ],
        correctId: 'daily',
        hint: 'Skal teamet planlegge en hel sprint, eller justere planen underveis?',
        explanation:
          'Daily Scrum er laget for å se på fremdriften mot sprintmålet og justere planen. Utviklerne kan også snakke sammen og planlegge på nytt utenom Daily Scrum. De trenger ikke å vente til neste morgen hvis det haster.',
      },
    ],
  },
  {
    id: 'tsu-scrum-s04',
    title: 'Fra produktmål til sprintplan',
    summary: 'Et sprintmål er et realistisk steg mot produktmålet.',
    minutes: 5,
    takeaway:
      'Produktmålet viser retningen, produktbackloggen ordner veien dit, og sprintmålet sier hva neste steg skal oppnå – og hvorfor.\nEt godt sprintmål støtter produktmålet, tar hensyn til prioriteringene og er realistisk ut fra det utviklerne regner med å få ferdig med god kvalitet.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-scrum-s04-forklart',
        title: 'Fire nivåer av planlegging',
        role: 'explain',
        source: s04,
        idea: 'Scrum er en vanlig måte å organisere utviklingsarbeid i team på. Teamet jobber i sprinter: faste perioder på én måned eller mindre, ofte to uker. Planleggingen skjer på flere nivåer, fra langsiktig til kortsiktig.\nEt godt sprintmål er et tydelig steg mot produktmålet og bør kunne nås med den kapasiteten teamet regner med å ha i sprinten. Det samler teamet om én felles hensikt. Fordi det beskriver et mål og ikke en liste med oppgaver, kan teamet endre detaljene hvis arbeidet blir annerledes enn ventet.',
        definitions: [
          {
            term: 'Produktmålet (Product Goal)',
            text: 'det langsiktige målet for produktet. Teamet jobber mot ett produktmål om gangen.',
          },
          {
            term: 'Produktbackloggen (Product Backlog)',
            text: 'en ordnet liste over det som trengs for å nå produktmålet. Produkteieren har ansvar for innholdet og rekkefølgen.',
          },
          {
            term: 'Sprintmålet (Sprint Goal)',
            text: 'det ene målet for sprinten. Det sier hvorfor sprinten er verdt å gjennomføre. Hele Scrum-teamet lager det sammen når sprinten planlegges.',
          },
          {
            term: 'Sprintbackloggen (Sprint Backlog)',
            text: 'sprintmålet, elementene som er valgt fra produktbackloggen, og utviklernes plan for hvordan de skal lage dem.',
          },
        ],
        bridge: 'Neste: en app for skolebiblioteket.',
      },
      {
        kind: 'learn',
        id: 'tsu-scrum-s04-situasjon',
        title: 'Appen for skolebiblioteket',
        role: 'explain',
        source: s04,
        idea: 'Et Scrum-team lager en app for skolebiblioteket. Sprintene varer i to uker.\nProduktmål: «Elever kan låne og levere bøker selv, uten papirlister.» Teamet og produkteieren er enige om at produktmålet er nådd når element 1–4 under er ferdige.\nProdukteieren har satt denne rekkefølgen øverst i produktbackloggen:\n1. Låne en bok ved å skanne strekkoden\n2. Se egne lån og når de skal leveres\n3. Få varsel dagen før en bok skal leveres\n4. Levere en bok ved å skanne strekkoden\n5. Statistikk over de mest lånte bøkene, for bibliotekaren\nElementene er omtrent like store. I de tre siste sprintene fikk utviklerne ferdig tre, tre og fire slike elementer, med kodegjennomgang og testing. De regner derfor med å få omtrent tre elementer helt ferdige i neste sprint.',
        bridge: 'Neste: Hvilket sprintmål er best?',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s04-sporsmal',
        title: 'Velg sprintmålet',
        role: 'scaffold',
        source: s04,
        context:
          'Produktmålet er «Elever kan låne og levere bøker selv, uten papirlister». Det er nådd når element 1–4 er ferdige.\nØverst i produktbackloggen ligger: (1) låne en bok med strekkode, (2) se egne lån, (3) få varsel før levering, (4) levere en bok med strekkode og (5) statistikk for bibliotekaren.\nElementene er omtrent like store, og utviklerne regner med å få omtrent tre ferdige i neste sprint.',
        question: 'Hvilket forslag er det beste sprintmålet for neste sprint?',
        options: [
          {
            id: 'statistikk',
            label: '«Bibliotekaren får statistikk over de mest lånte bøkene.»',
            feedback:
              'Statistikk for bibliotekaren kan bli nyttig, og det er lett å få ferdig. Men det er ikke et steg mot produktmålet om at elever skal låne og levere selv, og produkteieren har satt det sist. Et sprintmål skal bygge på produktmålet og på rekkefølgen i produktbackloggen, ikke velges fordi det er enkelt.',
          },
          {
            id: 'lane',
            label:
              '«Elever kan låne en bok selv i appen og se når den skal leveres.»',
          },
          {
            id: 'produktmal',
            label: '«Elever kan låne og levere bøker selv, uten papirlister.»',
            feedback:
              'Dette gjentar hele produktmålet. Fire omtrent like store elementer er mer enn utviklerne vanligvis rekker i en sprint. Det kan gå, men det er et svakere og mindre realistisk sprintmål enn et mål som bygger på element 1 og 2.',
          },
          {
            id: 'fordeling',
            label:
              '«Vilde lager skanningen, Elias lager oversikten over lån, og Maja lager varslene til elevene.»',
            feedback:
              'Dette er en fordeling av arbeid mellom personer, ikke et mål. Hvem som gjør hva, bestemmer utviklerne selv når de lager planen. Et sprintmål skal samle teamet om én felles hensikt, ikke dele sprinten opp i hver sin del.',
          },
        ],
        correctId: 'lane',
        hint: 'Et sprintmål skal være et steg mot produktmålet, ta hensyn til prioriteringene, være realistisk med kapasiteten og si hvorfor sprinten gir verdi. Hvilket forslag gjør alle fire?',
        explanation:
          'Målet er et konkret steg mot produktmålet, og det bygger på de høyt prioriterte elementene 1 og 2. Det er realistisk med omtrent tre elementer, og det sier hva elevene får ut av sprinten. Tenk på nivåene som en kjede: Produktmålet sier hvor produktet skal, produktbackloggen hva som trengs og i hvilken rekkefølge, sprintmålet hva akkurat denne sprinten skal bidra med og hvorfor, og sprintbackloggen hvordan teamet når det. Legg merke til at målet ikke nevner varslene (element 3). Teamet kan ta dem med hvis det går bra, men målet er nådd også uten dem.',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s04-ny',
        title: 'Ny situasjon: ett element til?',
        role: 'application',
        source: s04,
        context:
          'I Sprint Planning har teamet valgt element 1–3 fra listen: omtrent så mye som utviklerne rekker. Produkteieren vil gjerne ha med element 4 (levere en bok ved å skanne strekkoden) også, så elevene kan levere bøker selv allerede i denne sprinten. Utviklerne sier at fire elementer er mer enn de realistisk kan få ferdig, med kodegjennomgang og testing.',
        question: 'Hva bør skje?',
        options: [
          {
            id: 'bestemmer',
            label:
              'Produkteieren bestemmer at utviklerne skal ta med fire elementer. Produkteieren har ansvar for produktbackloggen og vet best hva som gir mest verdi for elevene.',
            feedback:
              'Produkteieren har ansvar for rekkefølgen i produktbackloggen, men bestemmer ikke alene hvor mye som skal inn i sprinten. Utviklerne velger elementer i samtale med produkteieren, fordi det er de som vet hvor mye de har rukket tidligere og hvor mye tid de har.',
          },
          {
            id: 'kutte',
            label:
              'Utviklerne tar med alle fire elementene og kutter ned på testingen, slik at de rekker alt før sprinten er slutt og elevene kan levere bøker selv allerede i denne sprinten.',
            feedback:
              'Kvaliteten skal ikke bli dårligere i en sprint. Hvis teamet tester mindre for å rekke mer, er det ikke sikkert resultatet kan brukes – og feilene kommer tilbake senere.',
          },
          {
            id: 'samtale',
            label:
              'Utviklerne sier hvor mange elementer de rekker, i samtale med produkteieren. Element 4 kan vente til neste sprint, eller erstatte et annet element hvis produkteieren ser mer verdi i det.',
          },
        ],
        correctId: 'samtale',
        hint: 'Hvem vet best hvor mye utviklerne kan få ferdig? Og hva skal ikke ofres for å rekke mer?',
        explanation:
          'Utviklerne vurderer hvor mye de rekker, og produkteieren bidrar med hva som gir mest verdi. Sammen finner de et innhold som passer til sprintmålet, uten å ofre kvaliteten. Jo mer teamet vet om hva de har rukket før, hvor mye tid de har og hva som kreves for at noe er ferdig, desto bedre blir anslaget. Et sprintmål som er for stort, gir ikke mer verdi. Det gir bare et mål teamet ikke når.',
      },
    ],
  },
  {
    id: 'tsu-scrum-s05',
    title: 'Når er noe egentlig ferdig?',
    summary: 'Definition of Done avgjør hva som er ferdig.',
    minutes: 4,
    takeaway:
      '«Ferdig» betyr at arbeidet oppfyller Definition of Done – ikke at koden er skrevet, eller at det virket i én demo.\nDet som ikke oppfyller Definition of Done, er ikke en del av inkrementet. Det som oppfyller den, kan leveres uten å vente på Sprint Review.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-scrum-s05-forklart',
        title: 'Hva betyr «ferdig»?',
        role: 'explain',
        source: s05,
        idea: 'Scrum er en måte å organisere teamarbeid på, i korte perioder som kalles sprinter. I Scrum er et inkrement en ferdig, brukbar del av produktet. Det skal fungere sammen med alt som er laget før.\nFor at alle skal mene det samme med «ferdig», har Scrum-teamet en Definition of Done. Det er en felles beskrivelse av hvilke krav til kvalitet som må være oppfylt, for eksempel at koden er gjennomgått og testet. Noen organisasjoner har en felles Definition of Done for alle team. Ellers lager Scrum-teamet sin egen.\nRegelen er enkel: Når et arbeid oppfyller Definition of Done, er det et inkrement. Når det ikke gjør det, er det ikke ferdig. Det kan hverken leveres eller vises i Sprint Review.',
        definitions: [
          {
            term: 'Sprint Review',
            text: 'møtet der teamet og interessentene (de som bruker eller påvirkes av produktet) ser på resultatet av sprinten sammen og diskuterer veien videre.',
          },
          {
            term: 'Produkteieren',
            text: 'personen i teamet som har ansvar for hva som er viktigst å lage.',
          },
          {
            term: 'Produktbackloggen',
            text: 'listen over alt som kan lages i produktet.',
          },
        ],
        bridge: 'Neste: dagen før Sprint Review.',
      },
      {
        kind: 'learn',
        id: 'tsu-scrum-s05-situasjon',
        title: 'Rabattkoden virker på Evens PC',
        role: 'explain',
        source: s05,
        idea: 'Et Scrum-team lager en nettside der folk kan kjøpe kinobilletter. Teamets Definition of Done er:\n1. Koden er gjennomgått av en annen utvikler.\n2. Automatiske tester er skrevet og kjører uten feil.\n3. Funksjonen er testet på testserveren og virker både på mobil og PC.\nDet er dagen før Sprint Review. Utvikleren Even har skrevet ferdig koden for «Kjøp billett med rabattkode». Den virker på Evens egen PC, og produkteieren har sett den og syntes den så bra ut. Even har også skrevet automatiske tester, og de kjører uten feil. Koden er ikke gjennomgått ennå, og funksjonen er ikke testet på testserveren.\nEn i teamet sier: «Den virker jo! Vi sier at den er ferdig og viser den på Sprint Review i morgen.»',
        bridge: 'Neste: Er funksjonen ferdig?',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s05-sporsmal',
        title: 'Ferdig til Sprint Review?',
        role: 'scaffold',
        source: s05,
        context:
          'Teamets Definition of Done krever (1) kodegjennomgang av en annen utvikler, (2) automatiske tester som kjører uten feil, og (3) test på testserveren, både på mobil og PC.\nFunksjonen virker på Evens PC, og produkteieren har sett den. De automatiske testene kjører uten feil, men koden er ikke gjennomgått og funksjonen er ikke testet på testserveren. Sprint Review er i morgen.',
        question: 'Hva stemmer best?',
        options: [
          {
            id: 'ferdig',
            label:
              'Funksjonen er ferdig. Den virker på Evens PC, og produkteieren har allerede sett den og likt den, så mer trengs ikke.',
            feedback:
              'At noe virker på én maskin, er ikke det samme som at det er ferdig. Ingen vet ennå om funksjonen virker på mobil, på testserveren eller sammen med resten av nettsiden. At produkteieren har sett den, endrer ikke dette. Det er Definition of Done som avgjør.',
          },
          {
            id: 'senere',
            label:
              'Teamet kan kalle funksjonen ferdig nå og vise den på Sprint Review, og så ta kodegjennomgang og testing i neste sprint.',
            feedback:
              'Da kaller teamet noe ferdig som ikke er det. Det gir et feil bilde av hvor langt produktet har kommet, og ugjort arbeid hoper seg opp. Arbeid som ikke oppfyller Definition of Done, er ikke en del av inkrementet.',
          },
          {
            id: 'droppe',
            label:
              'Teamet kan droppe kravet om testing på testserveren for akkurat denne funksjonen, siden sprinten nesten er over.',
            feedback:
              'Definition of Done er ikke noe teamet senker når tiden blir knapp. Kvaliteten skal ikke bli dårligere i løpet av en sprint. Hvis teamet mener at kravene bør endres, er det en egen beslutning om produktets kvalitet – ikke en snarvei for én funksjon.',
          },
          {
            id: 'ikke-ferdig',
            label:
              'Den er ikke ferdig ennå. Uten å oppfylle Definition of Done kan den ikke leveres eller vises i Sprint Review.',
          },
        ],
        correctId: 'ikke-ferdig',
        hint: 'Sammenlign det som er gjort, med de tre punktene i teamets Definition of Done. Hvor mange er oppfylt?',
        explanation:
          'Bare ett av tre punkter i Definition of Done er oppfylt. Hvis kodegjennomgangen og testingen blir gjort før Sprint Review, er den ferdig og kan være med. Hvis ikke, kan den ikke vises der, og den går tilbake til produktbackloggen og blir vurdert videre. Det er stor forskjell på «koden er skrevet» og «inkrementet er ferdig». Hvis uferdig arbeid blir vist som ferdig, tar man beslutninger på feil grunnlag. Teamet kan fortelle at funksjonen ikke ble ferdig og hvorfor. Det er noe annet enn å presentere den som et ferdig inkrement.',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s05-ny',
        title: 'Ny situasjon: ferdig før Sprint Review',
        role: 'application',
        source: s05,
        context:
          'På dag fire i den neste sprinten blir en annen funksjon, «Se kinoprogrammet for neste uke», helt ferdig. Den oppfyller alle punktene i Definition of Done. Kinoen vil gjerne ha den ute med en gang, fordi en populær film har premiere i helgen. Sprint Review er om seks dager.',
        question: 'Hva stemmer?',
        options: [
          {
            id: 'levere',
            label:
              'Funksjonen kan leveres nå. Den oppfyller Definition of Done, og Sprint Review er ingen port man må gjennom.',
          },
          {
            id: 'review',
            label:
              'Funksjonen må vente til Sprint Review, fordi det er der interessentene godkjenner det teamet har laget i sprinten.',
            feedback:
              'Sprint Review er et arbeidsmøte der teamet og interessentene ser på resultatet og diskuterer hva som bør skje videre. Det er ikke en godkjenning man må vente på. Scrum Guide, den offisielle beskrivelsen av Scrum, sier at Sprint Review aldri skal være en port for å levere verdi.',
          },
          {
            id: 'alt',
            label:
              'Funksjonen må vente til alt i sprinten er ferdig, fordi en sprint bare kan gi ett inkrement.',
            feedback:
              'En sprint kan gi flere inkrementer. Hver gang et element oppfyller Definition of Done, blir et nytt inkrement til.',
          },
        ],
        correctId: 'levere',
        hint: 'Hva avgjør om noe er ferdig – datoen for Sprint Review, eller om Definition of Done er oppfylt?',
        explanation:
          'Funksjonen er et inkrement fra det øyeblikket den oppfyller Definition of Done, og et inkrement kan leveres før sprinten er slutt. På Sprint Review kan teamet og interessentene likevel se på den. Regelen virker begge veier: Noe som ikke oppfyller Definition of Done, er ikke ferdig – selv om Sprint Review er i morgen. Noe som oppfyller den, er ferdig – selv om Sprint Review er om en uke.',
      },
    ],
  },
  {
    id: 'tsu-scrum-s06',
    title: 'Når noe endrer seg under en sprint',
    summary: 'Spør først hva endringen betyr for sprintmålet.',
    minutes: 4,
    takeaway:
      'Når noe endrer seg i en sprint, spør du først hva det betyr for sprintmålet.\nEr målet fortsatt riktig, justerer utviklerne og produkteieren innholdet uten å senke kvaliteten. Har målet mistet mening, kan produkteieren – og bare produkteieren – avbryte sprinten.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-scrum-s06-forklart',
        title: 'Regler når noe endrer seg',
        role: 'explain',
        source: s06,
        idea: 'Scrum er en måte å organisere teamarbeid på, i sprinter – faste perioder på én måned eller mindre, ofte to uker. Det skjer ofte at noe endrer seg midt i en sprint. Scrum har noen tydelige regler for hvordan teamet skal håndtere det:\n• Teamet gjør ingen endringer som setter sprintmålet i fare. Sprintmålet er grunnen til at sprinten er verdifull.\n• Kvaliteten skal ikke bli dårligere.\n• Hvis arbeidet viser seg å bli annerledes enn ventet, kan utviklerne og produkteieren forhandle om hva som skal være med i sprinten – så lenge sprintmålet ikke påvirkes.\n• Hvis sprintmålet ikke lenger gir mening, kan sprinten avbrytes. Bare produkteieren kan avbryte en sprint.\nSprintmålet beskriver hva teamet vil oppnå, ikke nøyaktig hvilke oppgaver som skal gjøres. Det gir rom for å justere detaljene.',
        definitions: [
          {
            term: 'Produkteieren',
            text: 'personen i Scrum-teamet som har ansvar for hva som er viktigst å lage.',
          },
          {
            term: 'Produktbackloggen',
            text: 'listen over alt som kan lages i produktet.',
          },
        ],
        bridge: 'Neste: dag seks i en sprint.',
      },
      {
        kind: 'learn',
        id: 'tsu-scrum-s06-situasjon',
        title: 'Betalingen tar lengre tid',
        role: 'explain',
        source: s06,
        idea: 'Et Scrum-team lager en nettbutikk for brukte klær. Sprinten varer i to uker.\nSprintmål: «Kunder kan betale med kort og får kvittering på e-post.»\nI sprinten har utviklerne planlagt tre elementer:\n1. Betaling med kort\n2. Kvittering på e-post\n3. Et nytt filter for å søke på klesstørrelse\nDet er dag seks. Utviklerne oppdager at betalingsløsningen krever ekstra sikkerhetsarbeid som de ikke visste om. Det tar mye tid. De ser at de ikke rekker alle tre elementene med den kvaliteten teamet krever.',
        bridge: 'Neste: Hva bør utviklerne gjøre?',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s06-sporsmal',
        title: 'Tre elementer, for lite tid',
        role: 'scaffold',
        source: s06,
        context:
          'Sprintmålet er «Kunder kan betale med kort og får kvittering på e-post». Sprinten har tre elementer: betaling med kort, kvittering på e-post og et filter for klesstørrelse.\nPå dag seks viser det seg at betalingen krever ekstra sikkerhetsarbeid. Utviklerne rekker ikke alle tre elementene med den kvaliteten teamet krever.',
        question: 'Hva bør utviklerne gjøre?',
        options: [
          {
            id: 'filter',
            label:
              'Snakke med produkteieren om å ta filteret ut av sprinten, så de når sprintmålet med full kvalitet.',
          },
          {
            id: 'tester',
            label:
              'Hoppe over noen av testene på betalingen, slik at alle tre elementene blir ferdige før sprinten er slutt.',
            feedback:
              'Kvaliteten skal ikke bli dårligere i løpet av en sprint. Betaling er dessuten et område der feil kan få store følger for kundene. Å hoppe over testing er å bytte et synlig problem nå mot et skjult problem senere.',
          },
          {
            id: 'bytte',
            label:
              'Bytte sprintmålet til det teamet rekker, for eksempel «Kunder kan søke på klesstørrelse».',
            feedback:
              'Sprintmålet skal ikke byttes ut fordi noe annet er enklere. Betaling med kort er fortsatt like viktig som før – det er bare mer arbeid enn teamet trodde. Hvis teamet mener at målet ikke lenger gir mening, er det en sak for produkteieren, ikke noe utviklerne endrer på egen hånd.',
          },
          {
            id: 'vente',
            label:
              'Jobbe videre som planlagt og ta opp problemet på Sprint Review, slik at alle får vite hvorfor ikke alt ble ferdig.',
            feedback:
              'Teamet vet allerede nå at planen ikke holder. Hvis de venter til Sprint Review, mister produkteieren muligheten til å være med og velge underveis. I Scrum skal teamet tilpasse seg så snart det lærer noe nytt, og være åpent om utfordringene med en gang.',
          },
        ],
        correctId: 'filter',
        hint: 'Hvilket av de tre elementene trengs ikke for å nå sprintmålet? Og hvem må være med når innholdet i sprinten endres?',
        explanation:
          'Sprintmålet gir rom for å endre de nøyaktige oppgavene. Utviklerne og produkteieren kan forhandle om innholdet i sprinten, så lenge sprintmålet ikke settes i fare. Her er målet fortsatt riktig, men arbeidet er større enn antatt. Filteret hører ikke til sprintmålet. Det forsvinner ikke, men går tilbake til produktbackloggen og kan vurderes til en senere sprint.',
      },
      {
        kind: 'select',
        id: 'tsu-scrum-s06-ny',
        title: 'Ny situasjon: «Stopp sprinten!»',
        role: 'application',
        source: s06,
        context:
          'Sprintmålet er fortsatt «Kunder kan betale med kort og får kvittering på e-post». Noen dager senere, mens sprinten fortsatt pågår, bestemmer ledelsen i klesbutikken at de ikke skal ta imot kortbetaling likevel. De skal bare bruke faktura. Daglig leder ringer teamet og sier: «Stopp sprinten med en gang!»',
        question: 'Hva stemmer best?',
        options: [
          {
            id: 'leder',
            label:
              'Daglig leder kan avbryte sprinten, fordi daglig leder har den høyeste stillingen i butikken.',
            feedback:
              'En høy stilling gir ikke rett til å avbryte en sprint. Bare produkteieren har den myndigheten. Daglig leder kan påvirke ved å ta saken med produkteieren.',
          },
          {
            id: 'produkteier',
            label:
              'Produkteieren kan avbryte sprinten, siden sprintmålet handler om kortbetaling som butikken ikke lenger skal ha.',
          },
          {
            id: 'utviklerne',
            label:
              'Utviklerne kan avbryte sprinten selv, siden de kjenner arbeidet best og vet at kortbetalingen ikke trengs.',
            feedback:
              'Utviklerne bestemmer hvordan arbeidet gjøres, men det er bare produkteieren som har myndighet til å avbryte en sprint. Utviklerne kan si fra til produkteieren at målet ikke lenger gir mening.',
          },
          {
            id: 'fortsette',
            label:
              'Sprinten må fortsette til den er over. Teamet gjør ferdig kortbetalingen, og ledelsen tar saken opp ved neste sprint.',
            feedback:
              'En sprint kan avbrytes – men bare når sprintmålet er blitt meningsløst, og bare av produkteieren. Å gjøre ferdig noe butikken ikke skal bruke, gir ingen verdi.',
          },
        ],
        correctId: 'produkteier',
        hint: 'Gir sprintmålet fortsatt mening? Og hvem har myndighet til å avbryte en sprint?',
        explanation:
          'Sprintmålet handler om kortbetaling, og nå skal butikken ikke ha kortbetaling. Da har målet mistet mening, og produkteieren kan avbryte sprinten. Teamet kan planlegge en ny sprint ut fra det de nå vet, og daglig leder bør ta saken med produkteieren. Begge situasjonene ble avgjort ut fra sprintmålet: Er arbeidet større enn antatt, men målet fortsatt riktig, justerer utviklerne og produkteieren innholdet. Har målet ikke lenger mening, kan produkteieren avbryte sprinten.',
      },
    ],
  },
];
