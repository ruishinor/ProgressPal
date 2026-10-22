import type { MicroSession } from '@/lib/domain';

import { source } from './source';

const a01 = source('A01');
const a02 = source('A02');
const a03 = source('A03');
const a04 = source('A04');
const a05 = source('A05');
const a06 = source('A06');

/**
 * Utviklerblikk · Smidig samarbeid: ACT 18 activities A01–A06, in authored
 * order. (Generelt's own TSU-A1 to TSU-A6 are different activities.)
 */
export const smidigSamarbeidSessions: readonly MicroSession[] = [
  {
    id: 'tsu-smidig-a01',
    title: 'Når planen må endres',
    summary: 'Vurder hver endring ut fra verdi og kostnad.',
    minutes: 4,
    takeaway:
      'Smidig betyr ikke å følge planen uansett, og ikke å si ja til alt.\nNår noe nytt dukker opp, spør du: Hva har vi lært? Hvilken verdi gir det? Hva må vike? Ta valget sammen med dem det gjelder.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-smidig-a01-forklart',
        title: 'Svare på endringer',
        role: 'explain',
        source: a01,
        idea: 'I programvareutvikling endrer ting seg nesten alltid underveis. Brukerne oppdager hva de egentlig trenger når de prøver noe. Teamet finner ut at noe er vanskeligere enn de trodde. Nye ønsker dukker opp.\nDet smidige manifestet – en kort tekst som beskriver verdiene bak smidig utvikling – sier at det er viktigere å svare på endringer enn å følge en plan. Det betyr ikke at planer er verdiløse, eller at teamet skal si ja til alt.\nEn god endring kan være verdt å gjøre selv sent i et prosjekt. Et ønske med liten verdi kan vente, selv om det er lett å si ja til. Derfor må teamet vurdere hver endring:',
        definitions: [
          {
            term: 'Hva har vi lært?',
            text: 'Er dette ny og viktig informasjon, eller bare et nytt ønske?',
          },
          {
            term: 'Hvilken verdi gir det?',
            text: 'Hvor mange blir berørt, og hvor viktig er det for dem?',
          },
          {
            term: 'Hva koster det?',
            text: 'Hva må vente eller droppes hvis vi gjør dette nå?',
          },
        ],
        bridge: 'Neste: to nye ting fire uker før lansering.',
      },
      {
        kind: 'learn',
        id: 'tsu-smidig-a01-situasjon',
        title: 'Fire uker før lansering',
        role: 'explain',
        source: a01,
        idea: 'Et team lager en app der elever kan se timeplanen og leksene sine. Appen skal lanseres om fire uker. To nye ting har dukket opp:\n1. Brukertesting: De fleste elevene bruker appen på mobilen. Der er timeplanen så liten at den nesten ikke går an å lese. Testerne syntes appen var «ubrukelig på telefonen».\n2. En lærer vil ha mørk modus, «fordi det ser kulere ut». Ingen andre har spurt om det.\nTeamet har allerede planlagt arbeidet for de neste fire ukene.',
        bridge: 'Neste: Hvordan bør teamet tenke?',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a01-sporsmal',
        title: 'Mobilproblemet og mørk modus',
        role: 'scaffold',
        source: a01,
        context:
          'Teamet har planlagt arbeidet for de neste fire ukene, og appen skal lanseres om fire uker. Brukertesting viser at timeplanen er nesten uleselig på mobil, som de fleste elevene bruker. En lærer vil ha mørk modus «fordi det ser kulere ut», og ingen andre har spurt om det.',
        question: 'Hvilken tilnærming passer best med smidig tenkning?',
        options: [
          {
            id: 'hver-for-seg',
            label:
              'Vurdere endringene hver for seg. Mobilproblemet prioriteres, selv om noe annet må vente. Mørk modus legges i listen over ønsker og vurderes senere.',
          },
          {
            id: 'planen',
            label:
              'Følge den opprinnelige planen. Endringer så nær lansering skaper bare uro i teamet, så begge deler kan vente til versjon 2 etter lanseringen.',
            feedback:
              'Planen ble laget før teamet visste at timeplanen er uleselig på mobil. Hvis teamet lanserer uten å gjøre noe med det, får de fleste elevene en app de ikke kan bruke. Smidige prinsipper sier at man skal ønske endrede krav velkommen, også sent i utviklingen.',
          },
          {
            id: 'begge',
            label:
              'Ta inn begge endringene med en gang. Smidig utvikling betyr å ønske endringer velkommen, også sent i prosjektet.',
            feedback:
              'Å ønske endringer velkommen betyr å ta dem på alvor, ikke å ta inn alle uten å tenke. Hver endring koster tid, og noe annet må vike. Ut fra det teamet vet, er mørk modus ønsket av én lærer og ikke begrunnet med et behov, så det er mindre viktig enn å få timeplanen lesbar.',
          },
          {
            id: 'overtid',
            label:
              'Gjøre begge endringene og jobbe overtid, slik at også alt det opprinnelig planlagte blir ferdig til lansering.',
            feedback:
              'Overtid kan virke som en løsning, men smidige prinsipper legger vekt på et tempo teamet kan holde over tid. Et team som jobber overtid lenge, blir slitent, og det kan gå ut over kvaliteten. Problemet er ikke for lite innsats, men at teamet må velge hva som er viktigst.',
          },
        ],
        correctId: 'hver-for-seg',
        hint: 'Ikke spør bare «skal vi endre?», men «hva er denne endringen verdt, og hva koster den?» Er de to endringene like viktige?',
        explanation:
          'Teamet tar det viktigste problemet på alvor og vurderer hva det koster. Mobilproblemet er ny og viktig kunnskap: Det påvirker kjernen i appen for de fleste brukerne. Mørk modus blir ikke avvist for alltid, men må konkurrere med annet arbeid. Det viktigste er ikke om teamet endrer planen, men hvordan de vurderer endringene: ut fra verdi, hvem som blir berørt, og hva som må vike.',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a01-ny',
        title: 'Ny situasjon: chatten tar for lang tid',
        role: 'application',
        source: a01,
        context:
          'En elevgruppe lager et bookingsystem for et lokalt treningssenter. Planen var å lage både booking av timer og en chat mellom medlemmene. Halvveis ser gruppa at chatten vil ta mye lengre tid enn de anslo. Treningssenteret sier at det aller viktigste er at bookingen fungerer godt.',
        question: 'Hva er mest fornuftig?',
        options: [
          {
            id: 'chat',
            label:
              'Fortsette med chatten som planlagt. Den står i planen, og gruppa har lovet treningssenteret å levere den.',
            feedback:
              'Planen ble laget før gruppa visste hvor mye arbeid chatten var. Å holde fast ved den, kan gå ut over det kunden sier er viktigst.',
          },
          {
            id: 'snakke',
            label:
              'Snakke med treningssenteret om å utsette eller droppe chatten, og bruke tiden på å gjøre bookingen god.',
          },
          {
            id: 'testing',
            label:
              'Lage både booking og chat, men hoppe over det meste av testingen, så gruppa rekker alt i planen.',
            feedback:
              'Uten testing øker risikoen for at bookingen ikke fungerer. Da mister kunden det de bryr seg mest om. Å kutte kvaliteten er ikke en god måte å holde planen på.',
          },
        ],
        correctId: 'snakke',
        hint: 'Hva sier kunden er viktigst? Og hva skjer med kvaliteten hvis gruppa prøver å rekke alt?',
        explanation:
          'Gruppa bruker det de har lært – at chatten er større enn de trodde – og vurderer det sammen med kunden. Når tiden brukes på det som gir mest verdi, blir resultatet bedre. Det er også smidig enkelhet: å la være å lage det som ikke trengs akkurat nå. Endringer kommer ikke bare fra brukerne, men tankemåten er den samme: Vurder verdi og konsekvenser, og ta valget sammen med dem det gjelder.',
      },
    ],
  },
  {
    id: 'tsu-smidig-a02',
    title: 'Når teamet er avhengig av hverandre',
    summary: 'Velg koordinering som treffer avhengigheten.',
    minutes: 5,
    takeaway:
      'Når noen er avhengige av hverandre, spør du: Hva er vi egentlig avhengige av, og hvilken avtale mangler?\nVelg den enkleste koordineringen som løser akkurat det – en samtale, en skriftlig avtale, en markering på tavla eller et møte – og gjør avhengigheten synlig.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-smidig-a02-forklart',
        title: 'Avhengigheter og koordinering',
        role: 'explain',
        source: a02,
        idea: 'Når flere personer eller team lager noe sammen, blir de avhengige av hverandre. Man kan for eksempel være avhengig av informasjon fra noen andre, at noe skjer før noe annet, bestemte verktøy eller tilganger, eller at bestemt kode er på plass.\nAvhengigheter er helt normale. De blir et problem når ingen har sett dem, eller når det mangler en avtale om hvordan de skal håndteres. Da blir folk sittende og vente, eller de bygger på feil antakelser.\nLurt spørsmål: Hva er vi egentlig avhengige av, og hva er den enkleste måten å håndtere akkurat det på?',
        definitions: [
          {
            term: 'Koordinering',
            text: 'å håndtere avhengigheter. Møter er en vanlig måte å koordinere på, men ikke den eneste. Det kan også være en kort samtale, en felles skriftlig beskrivelse, eller noe som gjøres synlig på en tavle.',
          },
        ],
        bridge: 'Neste: to team og en pris uten moms.',
      },
      {
        kind: 'learn',
        id: 'tsu-smidig-a02-situasjon',
        title: 'Prisen var uten moms',
        role: 'explain',
        source: a02,
        idea: 'To team jobber på den samme nettbutikken:\n• Team App lager betalingssiden i mobilappen.\n• Team Betaling eier tjenesten som regner ut prisen appen skal vise. Appen henter prisen gjennom et API, altså et grensesnitt som programmer bruker for å hente data fra hverandre.\nTeam App trodde at prisen fra API-et var med moms. Det var den ikke. Feilen ble oppdaget da en test i appen viste feil totalpris.\nSamtidig får Team App høre at Team Betaling skal endre formatet på prisene neste uke. Ingen har skrevet ned hvordan API-et fungerer, og det finnes ingen avtale om hvordan endringer skal varsles.',
        bridge: 'Neste: Hva vil hjelpe begge teamene?',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a02-sporsmal',
        title: 'Prisformatet endres neste uke',
        role: 'scaffold',
        source: a02,
        context:
          'Team App trodde at prisen de henter fra Team Betalings API var med moms. Det var den ikke, og en test i appen viste feil totalpris. Neste uke skal Team Betaling endre formatet på prisene. Ingen har skrevet ned hvordan API-et fungerer, og det finnes ingen avtale om hvordan endringer varsles.',
        question:
          'Hva vil mest sannsynlig hjelpe begge teamene – både nå og neste gang?',
        options: [
          {
            id: 'mote',
            label:
              'Sette opp et fast møte på én time hver uke for alle i begge teamene, der de går gjennom alt arbeidet som pågår.',
            feedback:
              'Et stort, generelt møte kan føles trygt, men det treffer ikke det egentlige problemet. Mange personer må bruke en time hver uke på arbeid som stort sett ikke angår dem. Det som mangler, er en felles forståelse av prisformatet og en avtale om å varsle endringer.',
          },
          {
            id: 'avklare',
            label:
              'La en utvikler fra hvert team avklare prisformatet nå, og avtale at API-endringer beskrives skriftlig og varsles i en felles kanal før de skjer.',
          },
          {
            id: 'selv',
            label:
              'La Team App regne ut momsen selv i appen, slik at de ikke lenger er avhengige av hva Team Betaling gjør med prisene.',
            feedback:
              'Det kan se ut som om avhengigheten forsvinner, men den gjør ikke det. Nå finnes prisberegningen to steder, og når Team Betaling endrer noe neste uke, kan appen vise feil igjen – uten at noen merker det.',
          },
          {
            id: 'produkteierne',
            label:
              'La produkteierne – de som prioriterer arbeidet i hvert team – ta det opp når de møtes for å planlegge om tre uker, og la utviklerne vente til da.',
            feedback:
              'Det tar tre uker, og endringen kommer neste uke. Spørsmålet om prisformatet er dessuten et teknisk spørsmål som utviklerne selv kan avklare raskt.',
          },
        ],
        correctId: 'avklare',
        hint: 'Hva er det egentlig Team App er avhengig av? Hva manglet – et møte, eller en felles forståelse og en avtale?',
        explanation:
          'Den direkte samtalen løser problemet raskt, og avtalen om hvordan endringer skal varsles, gjør at det samme ikke skjer igjen. Problemet var ikke for få møter, men at Team App var avhengig av informasjon fra Team Betaling uten en felles beskrivelse eller en avtale om endringer. Den beste koordineringen er den som treffer avhengigheten. Møter kan absolutt være riktig: Hadde teamene mange avhengigheter som endret seg hver uke, kunne et kort, fast møte med de riktige personene vært et godt valg. Men møter bør ha et tydelig formål og ikke være flere enn nødvendig.',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a02-ny',
        title: 'Ny situasjon: Ali venter på Mia',
        role: 'application',
        source: a02,
        context:
          'I et utviklingsteam skal Ali teste en ny innloggingsfunksjon. Ali kan ikke begynne før Mia har lagt den ferdige koden sin inn i felles kode. Mia vet ikke at Ali venter. Ali har ventet i to dager uten å si noe.',
        question: 'Hva er den mest nyttige koordineringen her?',
        options: [
          {
            id: 'avklare',
            label:
              'Ali avklarer med Mia når koden kommer, og markerer avhengigheten på tavla.',
          },
          {
            id: 'mote',
            label:
              'Ali kaller inn hele teamet til et møte for å gjennomgå alle avhengighetene i prosjektet.',
            feedback:
              'Avhengigheten gjelder bare to personer. Et møte for hele teamet bruker mange personers tid på noe som kan løses med en kort beskjed.',
          },
          {
            id: 'vente',
            label:
              'Ali jobber med noe annet og venter til Mia blir ferdig, for ikke å mase.',
            feedback:
              'Det kan være lurt å jobbe med noe annet mens man venter, men det løser ikke avhengigheten. Mia vet fortsatt ikke at Ali venter, og ventetiden kan bli mye lengre enn nødvendig.',
          },
        ],
        correctId: 'avklare',
        hint: 'Hvem er avhengig av hvem? Og hvor mange trenger egentlig å være med for å løse det?',
        explanation:
          'Mia får vite om avhengigheten, og den blir synlig for alle. Det er enkelt og treffer akkurat problemet: Her handler avhengigheten om at noe må skje før noe annet, og det viktigste er at de to som er berørt, snakker sammen. Samme tankemåte som i forrige situasjon: Finn ut hva dere er avhengige av, og velg den enkleste koordineringen som løser akkurat det.',
      },
    ],
  },
  {
    id: 'tsu-smidig-a03',
    title: 'Fra erfaring til forbedring',
    summary: 'Se, endre og sjekk.',
    minutes: 5,
    takeaway:
      'Å se et problem er bare første steg. Gjør det om til én konkret endring som er knyttet til årsaken – hva, hvem og fra når – og avtal hvordan dere skal sjekke om den hjalp.\nNår dere sjekker, se på hva resultatet faktisk sier før dere bestemmer hva som skjer videre.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-smidig-a03-forklart',
        title: 'Se, endre, sjekke',
        role: 'explain',
        source: a03,
        idea: 'Et av de smidige prinsippene sier at et team med jevne mellomrom skal se tilbake på hvordan det jobber, og deretter justere måten det jobber på. Mange team jobber i sprinter – faste arbeidsperioder på noen uker – og gjør dette i et retrospektiv på slutten av hver sprint.\nDet er lett å stoppe halvveis. En forbedring har tre steg:\n1. Se problemet – og prøve å forstå hvorfor det skjer.\n2. Endre noe konkret – bli enige om hva som skal gjøres annerledes, av hvem og fra når.\n3. Sjekke etterpå – hjalp det, eller må vi prøve noe annet?\nEn setning som «vi må bli flinkere» er en god intensjon, men det er ikke en endring. Det er vanskelig å vite hva man skal gjøre annerledes i morgen, og umulig å sjekke om det har hjulpet.\nDet er også viktig at alle tør å si fra. Hvis retrospektivet handler om å finne noen å skylde på, slutter folk å dele det de har sett.',
        definitions: [
          {
            term: 'Retrospektiv',
            text: 'et fast møte der teamet snakker om hva som gikk bra, hva som gikk mindre bra, og hva de vil gjøre annerledes.',
          },
          {
            term: 'Aksjonspunkt',
            text: 'det teamet blir enige om å gjøre annerledes.',
          },
        ],
        bridge: 'Neste: det samme problemet for tredje gang.',
      },
      {
        kind: 'learn',
        id: 'tsu-smidig-a03-situasjon',
        title: 'Tredje sprint på rad',
        role: 'explain',
        source: a03,
        idea: 'Et team lager en app for et bibliotek. For tredje sprint på rad står det samme på retrospektiv-tavla: «Misforståelser om hva som skal lages.»\nDet har skjedd flere ganger at utviklerne har laget en funksjon, og så sier produkteieren – personen som bestemmer hva som skal lages – «Det var ikke det jeg mente.» Da må arbeidet gjøres om.\nDe to forrige retrospektivene endte med det samme aksjonspunktet: «Vi må kommunisere bedre.»',
        bridge: 'Neste: Hvilket aksjonspunkt vil hjelpe?',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a03-sporsmal',
        title: 'Et bedre aksjonspunkt',
        role: 'scaffold',
        source: a03,
        context:
          'For tredje sprint på rad står «Misforståelser om hva som skal lages» på retrospektiv-tavla. Utviklerne lager en funksjon, produkteieren sier «Det var ikke det jeg mente», og arbeidet må gjøres om. De to forrige retrospektivene endte med «Vi må kommunisere bedre». Nå har teamet også fått sju forslag på post-it-lapper.\nAkseptansekriterier er korte punkter som sier hva som må være på plass for at en oppgave er løst slik brukeren ønsker.',
        question:
          'Hvilket aksjonspunkt vil mest sannsynlig føre til en reell forbedring?',
        options: [
          {
            id: 'kommunisere',
            label:
              '«Vi må kommunisere bedre, og alle må være mer nøye med å forstå hva produkteieren mener før de begynner.»',
            feedback:
              'Dette er nesten det samme aksjonspunktet som teamet har prøvd to ganger før, og problemet er der fortsatt. Det sier ikke hva teamet skal gjøre annerledes, og det er ikke mulig å sjekke om det har hjulpet.',
          },
          {
            id: 'hvem',
            label:
              '«Vi finner ut hvem som misforsto hver gang, slik at akkurat de personene kan være ekstra nøye neste gang.»',
            feedback:
              'Misforståelser oppstår ofte mellom folk, ikke hos én person. Når fokuset blir hvem som gjorde feil, blir det mindre trygt å si fra, og årsaken blir ikke tatt tak i.',
          },
          {
            id: 'kriterier',
            label:
              '«Før en oppgave startes, skriver vi og produkteieren sammen 2–3 akseptansekriterier på den. Neste retrospektiv sjekker vi om færre oppgaver måtte gjøres om.»',
          },
          {
            id: 'alle',
            label:
              '«Vi innfører alle de sju forslagene fra post-it-lappene fra neste uke: nye møter, en ny tavle, nye regler for kode, nytt verktøy og mer.»',
            feedback:
              'Det kan virke handlekraftig å gjøre alt på en gang. Men det er vanskelig å gjennomføre sju endringer samtidig, og hvis noe blir bedre, vet ingen hvilken endring som hjalp. Det er bedre å velge den endringen som mest sannsynlig treffer årsaken.',
          },
        ],
        correctId: 'kriterier',
        hint: 'Tenk på de tre stegene: se, endre, sjekke. Hvilket alternativ har med alle tre – og er knyttet til hvorfor misforståelsene skjer?',
        explanation:
          'Endringen er knyttet til årsaken: at teamet og produkteieren ikke har en felles forståelse før arbeidet starter. Den sier hva som skal gjøres, av hvem og når, og den har en plan for å sjekke resultatet. Teamet hadde allerede sett problemet – det sto på tavla tre ganger. Det som manglet, var en konkret endring og en plan for å sjekke den. Akseptansekriterier er ett eksempel på en slik endring. Det viktigste er ikke akkurat denne teknikken, men at endringen er knyttet til årsaken og kan følges opp.',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a03-ny',
        title: 'Ny situasjon: sjekk resultatet',
        role: 'application',
        source: a03,
        context:
          'Det er gått én sprint. På retrospektivet sjekker teamet resultatet:\n• Teamet skrev akseptansekriterier på 4 av 6 oppgaver.\n• Ingen av de 4 oppgavene måtte gjøres om.\n• Begge de 2 oppgavene uten akseptansekriterier måtte gjøres om.',
        question: 'Hva er den mest fornuftige konklusjonen?',
        options: [
          {
            id: 'hjelper',
            label:
              'Resultatet tyder på at endringen hjelper. Teamet fortsetter og finner ut hvorfor den ikke ble brukt på to oppgaver.',
          },
          {
            id: 'ferdig',
            label:
              'Endringen fungerte, og det meste gikk bra. Teamet kan sette strek over problemet og snakke om noe annet.',
            feedback:
              'Endringen ble ikke brukt på alle oppgavene, og to oppgaver måtte fortsatt gjøres om. Seks oppgaver er dessuten et lite grunnlag. Det er for tidlig å si at problemet er løst.',
          },
          {
            id: 'droppe',
            label:
              'Resultatet er blandet, siden to oppgaver fortsatt måtte gjøres om. Teamet dropper endringen og prøver noe annet, siden den ikke ser ut til å virke.',
            feedback:
              'Resultatet er ikke blandet på den måten det kan se ut som. Oppgavene med akseptansekriterier gikk bra. Problemene var der endringen ikke ble brukt. Å droppe den nå ville være å kaste noe som ser ut til å virke.',
          },
        ],
        correctId: 'hjelper',
        hint: 'Se på hvilke oppgaver som måtte gjøres om. Hva hadde de til felles?',
        explanation:
          'Tallene tyder på at akseptansekriteriene hjelper, selv om seks oppgaver er et lite grunnlag. Teamet har også lært noe nytt: Endringen blir ikke alltid fulgt. Neste steg er å finne ut hvorfor, for eksempel om det var tidspress eller at ingen husket det. Å sjekke en endring handler ikke bare om «virket det, ja eller nei?», men om å forstå hva resultatet faktisk sier. Slik blir forbedring en løkke: se – endre – sjekke – og justere igjen.',
      },
    ],
  },
  {
    id: 'tsu-smidig-a04',
    title: 'Møter som faktisk hjelper',
    summary: 'Velg form ut fra formål og mottakere.',
    minutes: 5,
    takeaway:
      'Et møte er verdt tiden når det har et tydelig formål, de riktige deltakerne og ender med en avklaring.\nInformasjon kan ofte deles skriftlig, og enkle spørsmål kan stilles direkte. Spar møtene til det som trenger en samtale.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-smidig-a04-forklart',
        title: 'Når er et møte verdt tiden?',
        role: 'explain',
        source: a04,
        idea: 'Møter er en av de viktigste måtene et team holder arbeidet sammen på. Et godt møte kan gi struktur og felles forståelse, men det tar tid som ellers kunne vært brukt på arbeidet.\nIkke alt trenger et møte. Ren informasjon kan ofte deles skriftlig, og et enkelt spørsmål kan stilles direkte til den som vet svaret.\nEt møte er som regel verdt tiden når det har:',
        definitions: [
          {
            term: 'Et tydelig formål',
            text: 'hva skal vi avklare eller bestemme?',
          },
          {
            term: 'Forberedelse',
            text: 'vet deltakerne hva de skal ta stilling til?',
          },
          {
            term: 'De riktige deltakerne',
            text: 'de som trengs for å avklare saken, og der alle som er med, får si sin mening.',
          },
          {
            term: 'Et resultat',
            text: 'hva ble bestemt, og hvem gjør hva?',
          },
        ],
        bridge: 'Neste: et statusmøte uten resultat.',
      },
      {
        kind: 'learn',
        id: 'tsu-smidig-a04-situasjon',
        title: 'Statusmøtet på mandag',
        role: 'explain',
        source: a04,
        idea: 'Et team på seks har et fast «statusmøte» hver mandag i en time. Det er ingen agenda. Alle forteller etter tur hva de har gjort siden sist, og ingenting blir skrevet ned. Teamet har også en felles oppgavetavle, men den blir sjelden oppdatert.\nLikevel er det ofte uklart hvem som skal gjøre hva. To ganger den siste måneden har to personer jobbet med den samme oppgaven uten å vite om hverandre.',
        bridge: 'Neste: Hvilken endring vil hjelpe?',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a04-sporsmal',
        title: 'Et møte som ikke avklarer',
        role: 'scaffold',
        source: a04,
        context:
          'Teamet på seks har et fast statusmøte hver mandag i en time, uten agenda og uten referat. Tavla blir sjelden oppdatert. Det er ofte uklart hvem som skal gjøre hva, og to ganger den siste måneden har to personer jobbet med den samme oppgaven uten å vite om hverandre.',
        question: 'Hvilken endring vil mest sannsynlig hjelpe teamet?',
        options: [
          {
            id: 'chat',
            label:
              'Droppe alle faste møter og bare bruke chat, siden møtene tar så mye tid fra det egentlige arbeidet.',
            feedback:
              'Problemet er ikke at teamet har møter, men at møtet ikke gir noen avklaring. Uten et sted der teamet blir enige, kan forvirringen bli enda større. Et møte med et tydelig formål kan være akkurat det teamet trenger.',
          },
          {
            id: 'torsdag',
            label:
              'Legge til et ekstra statusmøte på torsdager, slik at alle får oppdatert hverandre to ganger i uka.',
            feedback:
              'Et møte til av samme slag gir mer av det samme: mange oppdateringer, men ingen beslutninger. Mer tid i møter betyr også mindre tid til å jobbe konsentrert.',
          },
          {
            id: 'lengre',
            label:
              'Gjøre mandagsmøtet lengre, slik at alle får fortelle grundigere og mer detaljert om hva de har jobbet med siden sist.',
            feedback:
              'Lengre runder med status løser ikke problemet. Det som mangler, er ikke mer informasjon, men en tydelig avtale om hvem som gjør hva.',
          },
          {
            id: 'tavla',
            label:
              'Holde statusen oppdatert på tavla, og bruke et kortere møte til å bli enige om hvem som gjør hva.',
          },
        ],
        correctId: 'tavla',
        hint: 'Teamet får allerede mye informasjon i møtet. Hva er det som mangler?',
        explanation:
          'Endringen treffer det som faktisk mangler: en avklaring. Statusen ligger på tavla, der alle kan se den når de vil, og møtetiden brukes på det som krever en samtale. Skriv gjerne ned det som blir bestemt, så alle kan sjekke det senere. Møtet hadde ikke et tydelig formål og ga ikke noe resultat, derfor hjalp det lite. Spør: Hva trenger vi å avklare, og hva er den beste måten å gjøre det på? Noen ganger er svaret et kortere og bedre møte. Andre ganger er det en tavle, en beskjed eller et spørsmål.',
      },
      {
        kind: 'match',
        leftPresentation: 'text',
        id: 'tsu-smidig-a04-ny',
        title: 'Ny situasjon: tre saker, fire former',
        role: 'application',
        source: a04,
        context: 'Du kan bruke hver form én gang, og én form blir ikke brukt.',
        question: 'Hvilken form passer best til hver situasjon?',
        leftLabel: 'Situasjon',
        rightLabel: 'Form',
        pairs: [
          {
            id: 'skriftlig',
            left: 'Testserveren har fått en ny adresse. Alle seks i teamet må bruke den fra i morgen. Det er ingenting å diskutere.',
            right: 'Skriftlig beskjed til hele teamet i den felles kanalen',
          },
          {
            id: 'kort-mote',
            left: 'Tre av utviklerne er uenige om hvordan innloggingen skal fungere. Valget påvirker arbeidet til alle tre, og de må bli enige i dag.',
            right: 'Kort møte med de berørte, med mål om å ta en beslutning',
          },
          {
            id: 'direkte',
            left: 'Emilie lurer på hvilken mappe en ny fil skal ligge i. Emilie vet at Jonas har laget mappestrukturen, og spørsmålet angår bare Emilie.',
            right: 'Spørsmål direkte til én person som vet svaret',
          },
        ],
        unusedRight: [
          { id: 'langt-mote', label: 'Langt møte med hele teamet' },
        ],
        rightOrder: ['direkte', 'langt-mote', 'skriftlig', 'kort-mote'],
        hint: 'For hver situasjon: Hvor mange angår det? Trenger det en samtale og en beslutning, eller bare at informasjonen kommer fram?',
        explanation:
          'Den nye adressen trenger ingen diskusjon, men må nå alle seks: En skriftlig beskjed når alle og kan finnes igjen senere. Innloggingen er en uenighet som tre personer må avgjøre sammen samme dag, og da er et kort møte med de berørte godt egnet. Mappespørsmålet angår bare Emilie, så det går raskest å spørre Jonas direkte. Ingen av situasjonene trenger hele teamet i lang tid. Også chat eller andre former kan fungere når deltakerne faktisk får avklart saken.',
      },
    ],
  },
  {
    id: 'tsu-smidig-a05',
    title: 'Fra brukerbehov til felles forståelse',
    summary: 'Avtal kriterier som kan sjekkes.',
    minutes: 5,
    takeaway:
      'Bli enige med den som har behovet om hva som skal kunne sjekkes – i konkrete punkter som kan vurderes som oppfylt eller ikke. Da har dere en felles forståelse før arbeidet starter, og en felles målestokk når resultatet skal vurderes.\nOppfylte kriterier viser at det avtalte er levert. Om behovet er løst, ser dere i bruk.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-smidig-a05-forklart',
        title: 'Brukerhistorie og akseptansekriterier',
        role: 'explain',
        source: a05,
        idea: 'Når en kunde ber om en bestemt funksjon, er det nyttig å spørre hvorfor. Et team kan beskrive behovet med en brukerhistorie. Deretter blir teamet og kunden enige om akseptansekriterier.',
        definitions: [
          {
            term: 'Brukerhistorie',
            text: '«Som [bruker] ønsker jeg [handling] for å [oppnå noe].»',
          },
          {
            term: 'Akseptansekriterier',
            text: 'konkrete forhold som skal kunne sjekkes før funksjonen godtas. De kan handle om hva funksjonen gjør, hvordan den ser ut eller kvalitet, hvis dette er relevant for behovet. Kriteriene bør være tydelige og mulige å undersøke. At de er oppfylt, viser at det avtalte er levert, men ikke nødvendigvis at løsningen har ønsket virkning i praksis.',
          },
        ],
        bridge: 'Neste: en trener vil ha en rød knapp.',
      },
      {
        kind: 'learn',
        id: 'tsu-smidig-a05-situasjon',
        title: 'Knappen som heter «Avlys»',
        role: 'explain',
        source: a05,
        idea: 'Et team lager en app for et fotballag. Treneren sier: «Jeg vil ha en stor, rød knapp på forsiden som heter Avlys.»\nTeamet spør hvorfor. Treneren forklarer: «Når en trening blir avlyst, sender jeg melding til foreldrene én og én. Det tar lang tid, og noen får det ikke med seg og kjører barna til banen likevel.» Teamet og treneren blir enige om at avlysningen bør ta under ett minutt, og at varsel sendes til alle foreldre som er registrert på laget.\nSammen med treneren skriver teamet denne brukerhistorien: «Som trener ønsker jeg å kunne avlyse en trening slik at alle foreldrene får beskjed med en gang, for at ingen skal kjøre forgjeves til banen.»',
        bridge: 'Neste: Hvilke kriterier dekker behovet?',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a05-sporsmal',
        title: 'Fire sett med kriterier',
        role: 'scaffold',
        source: a05,
        context:
          'Treneren vil avlyse treninger uten å sende meldinger én og én. Brukerhistorien er: «Som trener ønsker jeg å kunne avlyse en trening slik at alle foreldrene får beskjed med en gang, for at ingen skal kjøre forgjeves til banen.»\nTeamet og treneren har avtalt at avlysningen skal ta under ett minutt, og at varsel går til alle registrerte foreldre. Hvert svar er et sett med tre kriterier.',
        question: 'Hvilket sett med akseptansekriterier dekker behovet best?',
        options: [
          {
            id: 'utseende',
            label:
              'Knappen er stor og rød.\nKnappen ligger øverst i appen.\nKnappen har et tydelig ikon.',
            feedback:
              'Utseendet kan avtales som kriterier, men punktene sier ikke om foreldrene blir varslet.',
          },
          {
            id: 'uklart',
            label:
              'Appen er brukervennlig og rask.\nForeldrene blir fornøyde.\nDesignet ser profesjonelt ut.',
            feedback:
              '«Brukervennlig», «fornøyde» og «profesjonelt» er for uklare uten målbare eller observerbare kjennetegn.',
          },
          {
            id: 'behov',
            label:
              'Treneren kan avlyse på under ett minutt.\nAppen sender varsel til alle registrerte foreldre når treningen avlyses.\nVarselet viser hvilken trening det gjelder.',
          },
          {
            id: 'kode',
            label:
              'En annen utvikler gjennomgår koden.\nAutomatiske tester kjører uten feil.\nKoden følger teamets kodestandard.',
            feedback:
              'Dette kan være viktige kvalitetskrav, men settet sier ikke om treningen kan avlyses eller om varselet sendes.',
          },
        ],
        correctId: 'behov',
        hint: 'Hvilke punkter kan sjekkes, og hvilke gjelder selve behovet?',
        explanation:
          'Punktene dekker det avtalte resultatet og kan sjekkes. Tidskravet er også et gyldig kvalitetskriterium fordi det ble avtalt. Det er forskjell på å sende et varsel og å være sikker på at det blir sett. Kriteriene kan sjekke at appen sender det. Om foreldre faktisk får det med seg i tide, må teamet undersøke i bruk.',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a05-ny',
        title: 'Ny situasjon: et nytt ønske',
        role: 'application',
        source: a05,
        context:
          'Funksjonen er levert. Teamet har sjekket at treneren kan avlyse på under ett minutt, at appen sender varsel til alle registrerte foreldre og at riktig trening står i varselet. Treneren sier etter én uke at funksjonen fungerer bra, men vil nå også at foreldre skal kunne svare om barna kommer på neste trening.',
        question: 'Hva stemmer best?',
        options: [
          {
            id: 'feilet',
            label:
              'Funksjonen har feilet, fordi treneren ønsker mer. Teamet må lage den om.',
            feedback:
              'Et nytt ønske betyr ikke at det avtalte har feilet. Men dersom foreldre fortsatt kjører forgjeves, bør teamet undersøke om de opprinnelige kriteriene var gode nok.',
          },
          {
            id: 'nytt-behov',
            label:
              'Kriteriene er oppfylt, og treneren sier at løsningen fungerer. Svar fra foreldrene er et nytt behov som kan vurderes.',
          },
          {
            id: 'nei',
            label:
              'Teamet bør si nei til ønsket, fordi det ikke var med i de opprinnelige kriteriene.',
            feedback:
              'Kriterier hindrer ikke nye behov. De hjelper teamet å skille nytt arbeid fra feil i det som var avtalt.',
          },
        ],
        correctId: 'nytt-behov',
        hint: 'Hva er allerede kontrollert, og hva er et nytt ønske?',
        explanation:
          'Det avtalte er kontrollert, og trenerens tilbakemelding er positiv. Det nye behovet kan prioriteres, men er ikke automatisk en feil ved den leverte funksjonen. Kriterier gir felles forventninger før og etter utvikling, men de beviser ikke at ønsket brukernytte oppnås. Tilbakemeldinger fra faktisk bruk må fortsatt tas alvorlig.',
      },
    ],
  },
  {
    id: 'tsu-smidig-a06',
    title: 'Selvstyrt, men sammen',
    summary: 'Teamet eier hvordan, ikke alene hva.',
    minutes: 4,
    takeaway:
      'Selvstyrt betyr at teamet tar ansvar for hvordan det jobber sammen – også når noe ikke fungerer.\nDet betyr ikke at alle gjør som de vil, at én person bestemmer, eller at teamet alene bestemmer hva kunden trenger.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-smidig-a06-forklart',
        title: 'Hva betyr selvstyrt?',
        role: 'explain',
        source: a06,
        idea: 'Smidige team er ofte selvstyrte (også kalt selvorganiserende). Et av de smidige prinsippene sier at de beste løsningene vokser fram i slike team. Et annet sier at man skal gi folk det de trenger og stole på at de får jobben gjort.\nSelvstyrt betyr at teamet selv tar ansvar for hvordan det jobber: hvem som gjør hva, hvordan de samarbeider, og hva de gjør når noe ikke fungerer.\nSelvstyrt betyr ikke at alle gjør som de vil, at den som kan mest eller snakker høyest, bestemmer, eller at teamet bestemmer alene hva kunden trenger.',
        definitions: [
          {
            term: 'Teamavtale (team-kontrakt)',
            text: 'der mange team skriver ned avtalene sine, for eksempel hvor ofte de møtes, hvordan de fordeler arbeid, og hvordan de sier fra om endringer.',
          },
        ],
        bridge: 'Neste: en elevgruppe der det skurrer.',
      },
      {
        kind: 'learn',
        id: 'tsu-smidig-a06-situasjon',
        title: 'Det skurrer i gruppa',
        role: 'explain',
        source: a06,
        idea: 'Fire elever – Leo, Ida, Amir og Sofie – lager en nettside for en lokal sportsbutikk som skoleprosjekt. Det har gått tre uker, og det skurrer:\n• Leo og Ida gjør det meste av programmeringen.\n• Amir vet ofte ikke hva som skal gjøres, og venter på at noen skal si fra.\n• Sofie endret hele designet uten å si fra. Leo måtte gjøre om mye av arbeidet sitt.\nGruppa har ingen skriftlige avtaler. Ida foreslår: «Vi spør læreren om å fordele oppgavene for oss.»',
        bridge: 'Neste: Hvordan bør gruppa håndtere dette?',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a06-sporsmal',
        title: 'Hvem fordeler arbeidet?',
        role: 'scaffold',
        source: a06,
        context:
          'Etter tre uker skurrer det i gruppa: Leo og Ida programmerer det meste, Amir vet ofte ikke hva som skal gjøres og venter på beskjed, og Sofie endret hele designet uten å si fra, så Leo måtte gjøre om mye. Gruppa har ingen skriftlige avtaler. Ida foreslår at læreren fordeler oppgavene for dem.',
        question: 'Hva er den beste måten for gruppa å håndtere dette på?',
        options: [
          {
            id: 'avtale',
            label:
              'Ta problemene opp i gruppa, bli enige om hvordan dere fordeler arbeid og varsler endringer, og skrive det ned.',
          },
          {
            id: 'laereren',
            label:
              'La læreren fordele oppgavene, siden læreren har mest erfaring og kan se hvem som passer til hva.',
            feedback:
              'Læreren kan gi gode råd. Men hvis læreren fordeler oppgavene, er det fortsatt ingen avtale i gruppa om å si fra om endringer – og det var en av grunnene til at det gikk galt. Gruppa lærer heller ikke å løse slike problemer selv.',
          },
          {
            id: 'leo',
            label:
              'La Leo bestemme hvem som gjør hva, siden Leo kan mest om programmering.',
            feedback:
              'Da får gruppa en sjef. Leo kan mye om programmering, men det betyr ikke at Leo ser alt. Amir vil fortsatt vente på beskjed, og de andre får mindre ansvar. I smidige team skal kompetansen til alle brukes.',
          },
          {
            id: 'som-de-vil',
            label:
              'La alle jobbe videre med det de selv vil. I et selvstyrt team skal ingen styre hva de andre gjør.',
            feedback:
              'Selvstyrt betyr ikke uten avtaler. Det var nettopp mangelen på avtaler som gjorde at Sofie endret designet uten å si fra. Selvstyrte team lager sine egne regler – de slipper ikke å ha dem.',
          },
        ],
        correctId: 'avtale',
        hint: 'Hvem kjenner problemene i gruppa best – og hvem må følge avtalene etterpå?',
        explanation:
          'Gruppa tar selv ansvar for samarbeidet. Avtalene blir laget av dem som skal følge dem, og de er skrevet ned, så alle kan se dem. Det er også lurt å se på avtalen igjen etter noen uker og justere det som ikke virker. I et selvstyrt team er samarbeidet teamets eget ansvar: ta opp problemer åpent, bli enige om hvordan man vil jobbe, og skriv det ned. Å be læreren om råd kan godt være lurt, men avtalene må gruppa selv eie.',
      },
      {
        kind: 'select',
        id: 'tsu-smidig-a06-ny',
        title: 'Ny situasjon: søk eller quiz?',
        role: 'application',
        source: a06,
        context:
          'Noen uker senere fungerer samarbeidet bedre. Sportsbutikken har sagt at et godt søk etter produkter er det aller viktigste på nettsiden. Gruppa synes søket er kjedelig å lage, og vil heller lage et quiz-spill på forsiden. Amir sier: «Vi er et selvstyrt team, så vi bestemmer selv hva vi lager.»',
        question: 'Hva stemmer best?',
        options: [
          {
            id: 'amir',
            label:
              'Amir har rett. Et selvstyrt team bestemmer selv både hva som skal lages, og hvordan det skal lages.',
            feedback:
              'Selvstyring handler om hvordan teamet organiserer arbeidet. Men nettsiden lages for butikken, og i smidig utvikling jobber teamet tett sammen med kunden om hva som skal prioriteres. Synes gruppa at quizen gir verdi, kan de foreslå den for butikken.',
          },
          {
            id: 'avstemning',
            label:
              'Gruppa tar en avstemning mellom seg om de vil lage søket eller quizen, og følger flertallet.',
            feedback:
              'En avstemning er en god måte å bestemme hvordan gruppa jobber. Men hva som er viktigst for butikken, avgjør ikke et flertall i gruppa. Det må gruppa avklare med butikken.',
          },
          {
            id: 'butikken',
            label:
              'Gruppa styrer selv hvordan søket lages, men hva som er viktigst, må avklares med butikken.',
          },
        ],
        correctId: 'butikken',
        hint: 'Hvem er nettsiden laget for? Og hvilken del av arbeidet handler selvstyringen om?',
        explanation:
          'Gruppa styrer selv hvordan arbeidet gjøres. Hva som er viktigst, avgjøres i samarbeid med den produktet er laget for. Selvstyring har en grense: Teamet eier sine egne arbeidsmåter og avtaler, men hva som gir mest verdi, finner teamet ut sammen med kunden eller brukerne – ikke ut fra hva som er morsomst å lage.',
      },
    ],
  },
];
