// Presentation-only revisions for the pinned M01 export. The compact key is
// a non-security fingerprint of the original UTF-16 string, including length.
// Tests verify that every key resolves to exactly one distinct source string.
// LessonView also requires the matching authoring source SHA before applying it.
export const campaignM01SourceSha =
  '70438bd924141500ebb636b69f74a578f58c1b37f7a152fa073349bce50b60bb';

export function campaignM01TextKey(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    hash = BigInt.asUintN(
      64,
      (hash ^ BigInt(text.charCodeAt(i))) * 0x100000001b3n,
    );
  }
  return text.length.toString(36) + ':' + hash.toString(36);
}

// prettier-ignore
export const campaignM01Editorial = new Map<string, string>([
  [
    "3x:27bpm2f78ug61",
    "Nå sjekker du at Python virker på maskinen din. Kjør kommandoene i terminalen og lim inn utskriften i de to første oppgavene."
  ],
  [
    "7a:pigrvi2irnt9",
    "Her øver du på terminalkommandoer. Skriv kommandoen som svar; ProgressPal kjører den ikke på maskinen din. I eksemplene ligger `hei.py`, `notater.txt` og mappen `ovelser` i `kode`. I `ovelser` ligger `plakat.py`."
  ],
  [
    "8z:30h09cbc2xx0",
    "Fyll først inn kode som mangler, og forutsi utskriften. Deretter endrer du et program og skriver to programmer selv. Skriv og kjør koden i editoren og terminalen, og lim den inn her for å sjekke utskriften. Ingen av programmene trenger input fra brukeren."
  ],
  [
    "dj:303d87n4wyohr",
    "Når noe ikke virker, start med det du faktisk ser. Finn en mulig årsak, sjekk den og rett bare det som er galt.\n\nHvert av de sju tilfellene har tre spørsmål. Du kan komme tilbake til denne delen når du møter et lignende problem."
  ],
  [
    "6k:3nxbzc1afrmoc",
    "Windows kan vise feilmeldinger på norsk eller engelsk. «Gjenkjennes ikke» betyr det samme som «not recognized»."
  ],
  [
    "3c:1gsjm4t10dkc6",
    "Her er et eksempel på at `python` åpner Microsoft Store, mens `py` virker."
  ],
  [
    "42:242ka5777yt3t",
    "Øv på å dele en oppgave inn i inndata, behandling, utdata og begrensninger. Du finner eksemplet med hilseprogrammet i «Hva skal programmet gjøre? Inndata, behandling og utdata»."
  ],
  [
    "5q:1d7ri6nwxsjsd",
    "Øv først på Git-kommandoer og `git status --short`. Deretter får du fire vanlige Git-problemer. Se hva terminalen sier, finn årsaken og velg en rettelse."
  ],
  [
    "d1:26a1g7fd8jhkd",
    "## Hvorfor dette er nyttig\n\nEt program kan fungere teknisk og likevel løse feil problem. Derfor avklarer du behov og krav før du bygger.\n\nI «Hva skal programmet gjøre? Inndata, behandling og utdata» øvde du på å beskrive hva løsningen skal gjøre. I hver modul får du øve på å skrive kode, teste og forbedre den."
  ],
  [
    "1s:1j8t90thlqycm",
    "Eksempel på et KI-forslag: «Bruk println for å skrive ut teksten.»"
  ],
  [
    "8z:1ag3piq799bco",
    "Kontoret skal ha kaffekveld. Du skal lage et program som skriver ut en plakat. Du får en **spesifikasjon**: en beskrivelse av hva programmet skal gjøre. Velg selv hvordan du løser oppgaven. Lag tre commits underveis, og prøv ett KI-forslag som du sjekker selv."
  ],
  [
    "47:2x41ie032kgrd",
    "## Del 6: Sjekk et KI-forslag\n\nDu vil ha en ekstra pyntelinje under tittelen. Her er to eksempler på forslag fra en KI-assistent. Prøv begge."
  ],
  [
    "81:4uwj7j918dsa",
    "Modulsjekken har fire deler: bygge, lese og rette, repetere og resonnere. Bruk editor, terminal og Git, men ikke slå opp i leksjonene. ProgressPal sjekker svarene. Den siste refleksjonen er valgfri."
  ],
  [
    "52:3umqlnnp4iyw3",
    "Windows skjuler filendelser i Filutforsker. Du har lagret en fil i Notisblokk. Den vises som `hei.py` med et tekstfilikon, men `py hei.py` svarer «can't open file». Hva kan være årsaken?"
  ],
  [
    "1i:pko1eakl2gdx",
    "Sjekkliste: oppsettet ditt."
  ],
  [
    "1i:3e95qmw34ulr0",
    "Tilfelle 1 – hvordan sjekker du om det er årsaken?"
  ],
  [
    "1d:3vtfsmlj696oq",
    "Tilfelle 1 – hva bør du gjøre?"
  ],
  [
    "1j:2pd2swxwt57f3",
    "Tilfelle 2 – hvordan ser du at Python er installert?"
  ],
  [
    "1t:3387zlt6r2uyt",
    "Tilfelle 2 – hva bør du gjøre?"
  ],
  [
    "19:2f05g15brm7ik",
    "Tilfelle 3 – hvordan sjekker du hvilken mappe du står i?"
  ],
  [
    "1d:15ndyalmkws1k",
    "Tilfelle 3 – hva bør du gjøre?"
  ],
  [
    "15:3vcam90b43xqu",
    "Tilfelle 4 – hva i utskriften viser problemet?"
  ],
  [
    "22:1hq9whoq262m",
    "Tilfelle 4 – hva bør du gjøre?"
  ],
  [
    "z:d9jgx7e29fqk",
    "Tilfelle 5 – hva i eksemplet viser årsaken?"
  ],
  [
    "1d:1qk2sxakmcbo6",
    "Tilfelle 5 – hva bør du gjøre?"
  ],
  [
    "1l:12ib5w258n2s2",
    "Tilfelle 6 – hva bør du sammenligne?"
  ],
  [
    "1t:1ktu03w9r3xer",
    "Tilfelle 6 – hva bør du gjøre?"
  ],
  [
    "1b:8gbgrrlfby60",
    "Tilfelle 7 – hva i feilmeldingen viser problemet?"
  ],
  [
    "1d:byo3fh6s2mys",
    "Tilfelle 7 – hva bør du gjøre?"
  ],
  [
    "3e:3esokpvqir7fy",
    "Hvilket av de sju tilfellene tror du er mest sannsynlig at du selv møter først? Skriv én setning (valgfritt)."
  ],
  [
    "3x:16523c6bu6xxi",
    "Sett stegene fra problem til presentasjon i riktig rekkefølge. Huskeregelen fra «Fra behov til løsning: hele veien» er *hvorfor → hva → hvordan → virker det?*"
  ],
  [
    "37:3oe0xlpkbxrrn",
    "Koble det utvikleren gjør, til resultatet av arbeidet."
  ],
  [
    "2r:19fy82od2dt53",
    "Hva syntes du var vanskeligst å forutsi? Velg det som passer best (valgfritt)."
  ],
  [
    "37:3ln4l3brav0i2",
    "Kjør `git log --oneline` i prosjektet ditt (mappen `kode`). Sjekk at du ser minst én commit, og lim inn utskriften."
  ],
  [
    "2d:24ml95wd3kbzz",
    "Kjør `git status` i prosjektet ditt. Sjekk at Git viser en ren arbeidsmappe, uten endringer som venter på en commit. Lim inn utskriften."
  ],
  [
    "1h:33u6edqt34e0f",
    "Git-tilfelle 1 – hva bør du gjøre?"
  ],
  [
    "1h:zd1rxb2cgfk4",
    "Git-tilfelle 2 – hva bør du gjøre?"
  ],
  [
    "1h:kx48sfb3w46l",
    "Git-tilfelle 3 – hva bør du gjøre?"
  ],
  [
    "1h:1spjmtnyabqqi",
    "Git-tilfelle 4 – hva bør du gjøre?"
  ],
  [
    "25:2oiejhp6vwa05",
    "Hvordan kan du gjøre spørsmålet «Hvorfor virker ikke programmet?» mer nyttig?"
  ],
  [
    "42:21pe1g5g4updk",
    "Her er et eksempel på et KI-forslag for å skrive ut «Hei, verden!». Du kjører koden og får feilmeldingen under. Hva viser feilen?"
  ],
  [
    "2z:10go8jrt3bnco",
    "Skriv din egen regel for hvordan du vil bruke KI i dette programmet, i én setning (valgfritt)."
  ],
  [
    "38:364m6ok2z752g",
    "Her er to eksempler på KI-forslag for å skrive ut en tom linje. Prøv begge i en liten fil. Hvilket virker?"
  ],
  [
    "3g:3fa33jcic0h76",
    "Skriv 2–3 setninger om hva som var vanskeligst i labben, og hva du vil gjøre annerledes neste gang (valgfritt)."
  ],
  [
    "10:3a0cofl10b4t5",
    "Sjekkliste for labben."
  ],
  [
    "25:tawvbna0o1ts",
    "Hvilket av disse KI-forslagene kan du bruke i programmet?"
  ],
  [
    "2j:2vmha7jis9eof",
    "Hvilket steg i oppdraget var vanskeligst, og hvordan løste du det? (valgfritt)"
  ],
  [
    "2q:1nas814kkdm2a",
    "Hva vil du øve mer på før neste modul? (Valgfritt.)"
  ],
  [
    "3v:11c9xr8pzqhqb",
    "Få `py --version` til å gi en linje som starter med `Python 3.`. Leser du en feilmelding, se tabellen «Når noe går galt» i «Sett opp arbeidsstedet: Python og editor»."
  ],
  [
    "6r:1mx29yz8yyoqx",
    "Tabellen fra `ls` har flere kolonner. Se etter filnavnene i kolonnen `Name`. Datoene på maskinen din blir andre. I kolonnen `Mode` betyr `d` at det er en mappe (directory). `a` står for «archive» og står på vanlige filer. Den kan du se bort fra."
  ],
  [
    "5p:2ykmkeu7dh1m0",
    "Skriv og kjør programmet i editoren og terminalen. Sammenlign utskriften med oppgaven, og lim inn koden her. ProgressPal kjører koden og sjekker utskriften. Programmet trenger ingen input fra brukeren."
  ],
  [
    "2o:29zteyhy7kpfn",
    "Les meldingen på nytt. Hvilket alternativ passer med det terminalen viser?"
  ],
  [
    "2w:1px3sbpqyp1rk",
    "VS Code er et eget program. At det er installert, betyr ikke at Python er installert."
  ],
  [
    "1t:10tgyoe23u1tq",
    "Riktig. Da ser du både stedet og innholdet, og kan sjekke om filen ligger i riktig mappe."
  ],
  [
    "1d:1b72czpjkbbp7",
    "Versjonsnummeret på maskinen din kan være et annet."
  ],
  [
    "9u:27e1wgl8inr6z",
    "Hvis `py --version` viser Python 3.12 eller nyere, gå til steg 3. Vi bruker Python 3.14 i eksemplene. Har du en eldre versjon, installer en nyere. Hvis `py` ikke blir gjenkjent, gå til steg 2."
  ],
  [
    "iz:2dk6qh9o07ch",
    "## Steg 2: Installer Python (hvis du ikke har det)\n\n1. Åpne `python.org/downloads` i nettleseren.\n2. Last ned Python for Windows. For Python 3.14 anbefales Python install manager. Åpne installasjonsfilen.\n3. Følg spørsmålene. Hvis du blir spurt om å installere en Python-versjon, velg 3.14. Du trenger normalt ikke legge selve Python til PATH for å bruke `py`.\n4. Lukk PowerShell, åpne et nytt vindu og kjør `py --version` igjen."
  ],
  [
    "34:yx34h29uh4nw",
    "## Flere linjer, ovenfra og ned\n\nI disse eksemplene skriver hvert `print`-kall ut én linje. Python kjører linjene i rekkefølge:"
  ],
  [
    "82:1kp0cwdsnxjsn",
    "Før du kjører et lite program, prøv å se for deg utskriften. Da kan du sammenligne det du forventer, med det Python faktisk skriver ut."
  ],
  [
    "9j:3gtz5md5bz4j1",
    "Når Python møter en feil, viser det ofte en **feilmelding** (error message). Meldingen hjelper deg å finne hvor og hvorfor programmet stoppet. Å finne og rette feil kalles **feilsøking** (debugging). En feil i programmet kalles ofte en bug."
  ],
  [
    "bm:1ru06diec0nzk",
    "## Når bør du lage en commit?\n\nLag en commit når du har en endring du vil kunne finne tilbake til. Bruk `git status` for å se hva som er endret, og velg filene med `git add`.\n\nSkriv en melding som forteller hva du endret, for eksempel «Legg til hei-program» eller «Rett skrivefeil i hilsen». «Endringer» og «fix» sier lite om hva du gjorde."
  ],
  [
    "1w:2ncj9j1l3dx2w",
    "Filen heter egentlig `hei.py.txt`, men Filutforsker skjuler `.txt`."
  ],
  [
    "4r:1tqs3my5zm0vs",
    "Utskriften stemmer. `py hei.py` skal skrive «Hei, verden!» i terminalen."
  ],
  [
    "v:2cvyb8szbf6ke",
    "Du kan gå til mappen der filen ligger, eller bruke en sti til filen. Her skal du gå til mappen."
  ],
  [
    "27:2wbm7dcihfeij",
    "Tekst mellom anførselstegn skrives ut som tekst. Et regnestykke uten anførselstegn blir regnet ut."
  ],
  [
    "1u:2xrq9vq1qymvh",
    "Riktig. Utenfor en tekststreng starter `#` en kommentar. Python ignorerer resten av linjen."
  ],
  [
    "2p:1j5uqql65m7i0",
    "Riktig hvis Python mangler. Sjekk først med `py --version` i et nytt terminalvindu. Installer Python bare hvis du fortsatt ikke finner det."
  ],
  [
    "1q:3d4sis2sbjw5j",
    "Riktig. `py` finner Python, mens `python` åpner Microsoft Store i dette eksemplet."
  ],
  [
    "1x:24shnkb13xtlf",
    "En ekstra installasjon kan gjøre det vanskeligere å holde styr på hvilken Python-versjon du bruker. Prøv `py` først."
  ],
  [
    "3e:1jdz6cw8065gu",
    "Python leser den lagrede filen hver gang den kjøres. I dette eksemplet viser prikken at endringen ikke er lagret."
  ],
  [
    "3i:3apu32mnj93y9",
    "Riktig. Velg samme Python-versjon i VS Code som i terminalen. Prøv å kjøre programmet igjen etterpå."
  ],
  [
    "2h:2bc0cjp2gr8bf",
    "Riktig. Vanlige rette anførselstegn avgrenser teksten i Python."
  ],
  [
    "4s:3muh7m2e0eddd",
    "## Steg 1: Sjekk om Python allerede er installert\n\n1. Trykk Windows-tasten, skriv `PowerShell` og trykk Enter.\n2. Skriv `py --version` og trykk Enter."
  ],
  [
    "mz:2td5mbd2fe8vs",
    "## Steg 4: Lag en mappe til koden din\n\n1. Åpne Filutforsker og gå til hjemmemappen din, for eksempel `C:\\Users\\ola`.\n2. Lag en mappe som heter `kode`. Bruk en mappe utenfor OneDrive til disse øvingene. Et kort navn uten mellomrom gjør stiene enkle å skrive.\n3. I VS Code: velg `File → Open Folder…` (på norsk `Fil → Åpne mappe…`) og åpne `kode`.\n\nHvis VS Code spør om du stoler på innholdet i mappen, kan du velge å stole på den nye, tomme mappen du selv opprettet. Ikke gjør det ukritisk med mapper du har lastet ned."
  ],
  [
    "bm:nzyrv0pg9sho",
    "## Steg 5: Lag og lagre ditt første program\n\n1. I VS Code: trykk på ikonet for ny fil ved siden av mappenavnet i Utforsker-panelet til venstre. Kall filen `hei.py`.\n2. `.py` er **filendelsen** (file extension). Den brukes vanligvis for Python-filer.\n3. Skriv denne linjen i filen:"
  ],
  [
    "8e:z3573klkdbaz",
    "Ser du `Hei, verden!`, har du kjørt ditt første program. Knappen ▷ («Run Python File») i VS Code kan også kjøre filen. Den kan bruke en annen Python-versjon enn `py`. I M01 bruker vi terminalkommandoen `py hei.py`, slik at vi følger samme fremgangsmåte."
  ],
  [
    "66:3pxozf4bo57gi",
    "Med fem kommandoer kan du finne ut hvilken mappe terminalen står i, se filene, gå inn og ut av mapper og kjøre en Python-fil."
  ],
  [
    "7o:3u3e8b4dq5vrj",
    "Trykk `Tab` for å fullføre et fil- eller mappenavn. Bruk pil opp for å hente forrige kommando. Sett navn med mellomrom i anførselstegn, for eksempel `cd \"min mappe\"`. Windows skiller som regel ikke mellom store og små bokstaver i mappenavn."
  ],
  [
    "1t:ehlslglr1z86",
    "Neste: «Terminaløvelser». Du skriver kommandoene selv og prøver dem på maskinen din."
  ],
  [
    "7z:3oc1nyhtmlsn4",
    "Et **program** inneholder instruksjoner til datamaskinen. I de første eksemplene kjører Python instruksjonene ovenfra og ned. Du starter med `print()`, som skriver ut tekst eller andre verdier."
  ],
  [
    "4y:3a598wpfzs8cn",
    "## Kommentarer og små detaljer\n\nUtenfor en tekststreng starter `#` en **kommentar** (comment). Python ignorerer resten av linjen. Kommentarer er notater til deg og andre som leser koden."
  ],
  [
    "50:5am7331spozt",
    "Kopierer du kode fra en nettside eller et dokument, kan rette anførselstegn bli «krøllete» (“ ”). De kan stå inni tekst, men kan ikke brukes til å avgrense en Python-string. Bytt til rette anførselstegn."
  ],
  [
    "a7:2j8ees6kwgvf",
    "Før du skriver kode, finn ut hva programmet skal gjøre. Del oppgaven i det som går inn, det programmet gjør, det som kommer ut, og reglene som må følges. Noter det du trenger å spørre om."
  ],
  [
    "5s:1861izx8yaowa",
    "Et nyttig spørsmål avklarer noe som påvirker løsningen. For eksempel kan «Skal programmet huske betalinger mellom dagene?» avgjøre om du trenger å lagre data."
  ],
  [
    "4p:dumn4ckubx7a",
    "En huskeregel: *Hvorfor → hva → hvordan → virker det?* Problem og behov forklarer hvorfor. Krav sier hva løsningen skal gjøre. Modell og plan viser hvordan du vil bygge den. Testene sjekker om det virker."
  ],
  [
    "7e:15l5ma4gv54hy",
    "## Noe å huske på\n\n- En linje som begynner med `#` er en kommentar.\n- `print()` skriver ut et linjeskift, slik at du får en tom linje i disse eksemplene.\n- Flere argumenter til `print()` skilles som standard med mellomrom.\n- Anførselstegn avgrenser tekst. Et regnestykke uten anførselstegn blir regnet ut."
  ],
  [
    "46:3709sdic8mvj",
    "Hvis utskriften ikke stemmer med det du forventet, finn den første forskjellen. Sjekk hvilken linje som laget den, og hvorfor."
  ],
  [
    "8y:2trkk8kt2qib5",
    "`SyntaxError` betyr at koden ikke følger Pythons regler. Her mangler det siste anførselstegnet. «Unterminated string literal» betyr at teksten ikke er avsluttet. Meldingen peker på stedet Python oppdaget problemet."
  ],
  [
    "47:693sc9aoe1qn",
    "`IndentationError` betyr feil **innrykk**. Her står det et mellomrom i starten av en linje som ikke skal ha innrykk. Senere bruker du innrykk for å vise hvilke linjer som hører sammen."
  ],
  [
    "6r:39pqoz35yikd6",
    "Feilmeldinger kan se litt forskjellige ut i Python-versjonene. Les feiltypen og forklaringen nederst, og bruk filnavnet, linjenummeret og eventuelle piler for å finne stedet i koden."
  ],
  [
    "1m:3r1o8gmlw62g9",
    "lese feilen, finne linjen, vurdere årsaken, rette én ting og kjøre igjen"
  ],
  [
    "5o:2rzyz74zof3qr",
    "I dette eksemplet er `hei.py` allerede endret og lagret. Vi bruker et annet øvingsrepo, så commit-hashen kan være en annen."
  ],
  [
    "dm:2bhieazyl1709",
    "KI-assistenter kan forklare feilmeldinger, gi hint og foreslå kode. Du får mest ut av dem når du ber om hjelp med det du ikke forstår, prøver forslagene og sjekker resultatet selv."
  ],
  [
    "5n:a2d9ucjoxz95",
    "`println` finnes i enkelte andre språk, men er ikke en innebygd funksjon i Python. Bruk eksemplet til å øve på å sjekke et KI-forslag: kjør det, les feilmeldingen og finn ut hva som er galt."
  ],
  [
    "66:3slh9j44fmm9l",
    "**Personvern.** Fjern passord, API-nøkler, personopplysninger og annet du ikke har lov til å dele, også fra feilmeldinger. Følg reglene som gjelder for oppgaven eller arbeidsplassen din."
  ],
  [
    "7l:16iuxdjej0ccb",
    "## Steg 6: Ett KI-hint du sjekker selv\n\nDu vil ha en tom linje mellom første og andre linje. Sett sammen et godt spørsmål til en KI-assistent. Du kan prøve det i en KI-tjeneste hvis du vil. Les og kjør forslagene før du bruker dem."
  ],
  [
    "1d:cgn9eqfbkd2r",
    "Drikkevanene kan være relevante, men spør først hva kaffekassen skal gjøre."
  ],
  [
    "3j:27slh1rjt0gyt",
    "Se tabellen i «Fra behov til løsning: hele veien». Hva må du forstå før du kan begynne å bygge?"
  ],
  [
    "3e:2jibdx3mxvcuw",
    "Finn steget i tabellen i «Fra behov til løsning: hele veien», og se hva du har etter det."
  ],
  [
    "2k:1ap0xubcv3lqw",
    "En tom linje i koden lager ikke utskrift. Se etter et `print()`-kall."
  ],
  [
    "1a:340lbib325yf",
    "En tom kodelinje skriver ikke ut noe. `print()` kan lage en tom linje i utskriften."
  ],
  [
    "18:19egsyt8e6xue",
    "Forutsi utskriften. Prøv først uten hint."
  ],
  [
    "2b:2l2m8b3prla2j",
    "Gå gjennom koden ovenfra og ned. Hopp over kommentarene når du skriver ned utskriften."
  ],
  [
    "1l:21juj026mcucn",
    "Her peker feilmeldingen på det ukjente navnet `Print`. Sjekk navnet i koden."
  ],
  [
    "21:35i4i9yssxefr",
    "Python har funnet starten på en tekst, men ikke et avsluttende anførselstegn."
  ],
  [
    "1n:2c3sk0ig7jslh",
    "Bruk `git status` for å se hva som er endret. Legg bare til filene du vil ha med i neste commit."
  ],
  [
    "4x:1zduq4epqmyrm",
    "I `git log --oneline` ser du en kort commit-hash og en melding. Meldingen hjelper deg å finne tilbake til endringen senere."
  ],
  [
    "1o:1ey3eubso3fyv",
    "Git leter etter et repository i mappen du står i og i mappene over den. Gå til prosjektmappen før du eventuelt kjører `git init`."
  ],
  [
    "17:i45m7x8ybrvu",
    "En feilmelding kan hjelpe assistenten. Sjekk først at den ikke inneholder passord, nøkler, personopplysninger eller andre opplysninger du ikke kan dele."
  ],
  [
    "1x:1swy76agoc953",
    "Del gjerne relevant øvingskode, men fjern hemmeligheter og annet du ikke har lov til å dele."
  ],
  [
    "y:2qh7tjqpn241v",
    "Et kort spørsmål kan være bra, men assistenten trenger nok informasjon til å forstå problemet."
  ],
  [
    "2w:3w1yh2warot20",
    "Riktig. `println` er ikke en innebygd funksjon i Python. Sjekk forslag i en liten fil før du bruker dem i prosjektet."
  ],
  [
    "1d:2a0fvp4th3tu2",
    "Se tabellen over kommandoer i «Terminalen i fem kommandoer»."
  ],
  [
    "1x:2je55z6yj0wij",
    "Se «Når oppdages feilen?» i «Din første feilmelding»."
  ],
  [
    "u:3rmpzoqa3631n",
    "Python kan foreslå en rettelse i feilmeldingen, men den endrer ikke kildefilen for deg."
  ],
  [
    "4c:24pekc1l6tyz6",
    "Den korte commit-hashen og meldingen vises sammen i `git log --oneline`. Bruk en melding som forteller hva du endret."
  ],
  [
    "1m:349h2vhmm7tnd",
    "Se «Sjekk svaret før du bruker det» i «KI som læringshjelp, ikke snarvei»."
  ],
  [
    "1b:3vcdttzjhq8gk",
    "`println` er ikke en innebygd Python-funksjon. Kjør forslagene hver for seg og les resultatet."
  ],
  [
    "18:2v9lo2n0iv6kz",
    "Utskriften stemmer med oppgaven. Når du retter én feil og kjører igjen, er det lettere å se hva endringen gjorde."
  ],
  [
    "19:18ypsbyymwens",
    "En ny installasjon kan gi flere Python-versjoner. Prøv `py` først."
  ],
  [
    "2l:2o0s16ip7hf55",
    "`print` er riktig stavet. I dette programmet stopper Python på linjen med feilen."
  ],
  [
    "1q:3rusc8yvm8kpz",
    "Gå linje for linje. En tom linje i koden lager ikke utskrift, mens `print()` skriver et linjeskift."
  ],
  [
    "6s:1fvnz5hwy0d9u",
    "Riktig. Programmet trenger navn og telefonnummer og skal vise begge deler. Spørsmålet om landskode avklarer hvordan nummeret skal vises."
  ],
  [
    "1m:18oja1oancw3o",
    "Sjekk at koden gir forventet resultat, og be om en forklaring på det du ikke forstår."
  ]
]);

export function reviseCampaignM01(text: string): string {
  return campaignM01Editorial.get(campaignM01TextKey(text)) ?? text;
}
