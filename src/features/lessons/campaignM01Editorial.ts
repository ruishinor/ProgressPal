// Product presentation overrides for M01. Exact source strings are used so
// an updated authoring export cannot silently receive a stale revision.
// These are prose only: never alter the exercise object or its content hash.
// prettier-ignore
export const campaignM01Editorial = new Map<string, string>([
  [
    "Nå viser du at arbeidsstedet ditt virker. To av oppgavene bruker utskrift fra din egen maskin. Det er meningen: du skal se det virke hos deg.",
    "Nå sjekker du at Python virker på maskinen din. Kjør kommandoene i terminalen og lim inn utskriften i de to første oppgavene."
  ],
  [
    "Her trener du kommandoene. Du skriver dem som svar, og evaluatoren sjekker at kommandoen er riktig. Den kjører ikke noe på maskinen din. Mappene i oppgavene er en tenkt mappestruktur: `kode` inneholder `hei.py`, `notater.txt` og mappen `ovelser` med `plakat.py`.",
    "Her øver du på terminalkommandoer. Skriv kommandoen som svar; ProgressPal kjører den ikke på maskinen din. I eksemplene ligger `hei.py`, `notater.txt` og mappen `ovelser` i `kode`. I `ovelser` ligger `plakat.py`."
  ],
  [
    "Nå skriver du egne programmer. Start med å fylle inn det som mangler, forutsi hva kode gjør, og endre et program. Til slutt skriver du to programmer helt selv. Oppgavene med kode leveres ved at du limer inn koden din. Evaluatoren kjører programmet ditt og sammenligner utskriften. Programmene her spør ikke brukeren om noe.",
    "Fyll først inn kode som mangler, og forutsi utskriften. Deretter endrer du et program og skriver to programmer selv. Skriv og kjør koden i editoren og terminalen, og lim den inn her for å sjekke utskriften. Ingen av programmene trenger input fra brukeren."
  ],
  [
    "Før eller siden virker ikke oppsettet. Det er ikke et tegn på at du gjør noe galt. Erfarne utviklere bruker den samme rutinen hver gang, og den trener du her: **Symptom** (hva ser du?) → **hva er galt** (årsak) → **bevis** (hva kan du se eller kjøre som viser at det er akkurat dette?) → **minste trygge rettelse** (den minste endringen som løser det, uten å ødelegge noe annet).\n\nHvert tilfelle har tre spørsmål. Du trenger ikke kunne dette utenat: finn frem hit igjen når noe streiker.",
    "Når noe ikke virker, start med det du faktisk ser. Finn en mulig årsak, sjekk den og rett bare det som er galt.\n\nHvert av de sju tilfellene har tre spørsmål. Du kan komme tilbake til denne delen når du møter et lignende problem."
  ],
  [
    "Norsk Windows kan vise meldinger på norsk, for eksempel at noe «gjenkjennes ikke». Innholdet er det samme som i eksemplene her. Eksemplene er kjørt på en engelskspråklig melding; den norske ordlyden er ikke kontrollert i dette utkastet.",
    "Windows kan vise feilmeldinger på norsk eller engelsk. «Gjenkjennes ikke» betyr det samme som «not recognized»."
  ],
  [
    "Eksempel (ikke kjørt på denne maskinen, men Windows-meldingen er standard): `python` sendes til Store, mens `py` virker.",
    "Her er et eksempel på at `python` åpner Microsoft Store, mens `py` virker."
  ],
  [
    "Her trener du på å gjenfortelle oppgaver med kortet fra forrige leksjon. Først får du mest hjelp. Senere velger du selv hva som hører hjemme hvor.",
    "Øv på å dele en oppgave inn i inndata, behandling, utdata og begrensninger. Du finner eksemplet med hilseprogrammet i «Hva skal programmet gjøre? Inndata, behandling og utdata»."
  ],
  [
    "Først trener du på kommandoene og på å lese `git status --short`. Deretter kommer fire vanlige Git-problemer, med samme rutine som i delen om feilsøking av oppsett: symptom, årsak og minste trygge rettelse.",
    "Øv først på Git-kommandoer og `git status --short`. Deretter får du fire vanlige Git-problemer. Se hva terminalen sier, finn årsaken og velg en rettelse."
  ],
  [
    "## Hvorfor dette er nyttig\n\n- Hver fase har et konkret **resultat** du kan peke på. Da vet du om du er ferdig med fasen.\n- Mange dyre feil kommer av at man bygger noe som fungerer, men som ikke løser det egentlige problemet.\n- Det du lærte i forrige leksjon (inndata, behandling, utdata og uklare punkter) er de tre første stegene i miniformat.\n- Resten av programmet går gjennom flere av stegene: du skriver kode (6), tester den (7), og forbedrer den (8) i hver modul.",
    "## Hvorfor dette er nyttig\n\nEt program kan fungere teknisk og likevel løse feil problem. Derfor avklarer du behov og krav før du bygger.\n\nI «Hva skal programmet gjøre? Inndata, behandling og utdata» øvde du på å beskrive hva løsningen skal gjøre. I hver modul får du øve på å skrive kode, teste og forbedre den."
  ],
  [
    "Konstruert eksempelsvar: «Bruk println for å skrive ut teksten.»",
    "Eksempel på et KI-forslag: «Bruk println for å skrive ut teksten.»"
  ],
  [
    "Kontoret skal ha kaffekveld, og du får i oppdrag å lage en plakat som programmet skriver ut. Denne gangen får du en **spesifikasjon** (en beskrivelse av hva som skal lages) i stedet for en oppskrift. Du bestemmer selv fremgangsmåten, men du skal lage tre commits underveis, og du bruker KI til ett steg som du sjekker selv.",
    "Kontoret skal ha kaffekveld. Du skal lage et program som skriver ut en plakat. Du får en **spesifikasjon**: en beskrivelse av hva programmet skal gjøre. Velg selv hvordan du løser oppgaven. Lag tre commits underveis, og prøv ett KI-forslag som du sjekker selv."
  ],
  [
    "## Del 6: Ett KI-steg du sjekker selv\n\nDu vil ha en ekstra pynte-linje under tittelen. To konstruerte KI-svar foreslår hver sin linje. Du kjører begge.",
    "## Del 6: Sjekk et KI-forslag\n\nDu vil ha en ekstra pyntelinje under tittelen. Her er to eksempler på forslag fra en KI-assistent. Prøv begge."
  ],
  [
    "Modulsjekken har fire deler: **bygge** (c), **lese og rette** (d), **hente frem fra tidligere** (r) og **resonnere** (x). Oppgavene er nye for deg. Du kan bruke editor, terminal og Git, men ikke leksjonene. Svarene rettes automatisk. Fritekst brukes ikke til å godkjenne eller underkjenne.",
    "Modulsjekken har fire deler: bygge, lese og rette, repetere og resonnere. Bruk editor, terminal og Git, men ikke slå opp i leksjonene. ProgressPal sjekker svarene. Den siste refleksjonen er valgfri."
  ],
  [
    "Windows skjuler som standard filendelser i Filutforsker. Du lagde filen i Notisblokk og ser «hei» med en tekstfil-ikon. `py hei.py` svarer «can't open file». Hva er sannsynlig årsak?",
    "Windows skjuler filendelser i Filutforsker. Du har lagret en fil i Notisblokk. Den vises som `hei.py` med et tekstfilikon, men `py hei.py` svarer «can't open file». Hva kan være årsaken?"
  ],
  [
    "Sjekkliste: oppsettet ditt (kun for deg, ingen poeng).",
    "Sjekkliste: oppsettet ditt."
  ],
  [
    "Tilfelle 1 – bevis: Hva viser at det er akkurat dette?",
    "Tilfelle 1 – hvordan sjekker du om det er årsaken?"
  ],
  [
    "Tilfelle 1 – minste trygge rettelse: Hva gjør du?",
    "Tilfelle 1 – hva bør du gjøre?"
  ],
  [
    "Tilfelle 2 – bevis: Hva viser at Python likevel finnes?",
    "Tilfelle 2 – hvordan ser du at Python er installert?"
  ],
  [
    "Tilfelle 2 – minste trygge rettelse: Hva er den minste endringen?",
    "Tilfelle 2 – hva bør du gjøre?"
  ],
  [
    "Tilfelle 3 – bevis: Hvordan bekrefter du det?",
    "Tilfelle 3 – hvordan sjekker du hvilken mappe du står i?"
  ],
  [
    "Tilfelle 3 – minste trygge rettelse: Hva gjør du?",
    "Tilfelle 3 – hva bør du gjøre?"
  ],
  [
    "Tilfelle 4 – bevis: Hvilket bevis ser du?",
    "Tilfelle 4 – hva i utskriften viser problemet?"
  ],
  [
    "Tilfelle 4 – minste trygge rettelse: Hva er den minste, riktige rettelsen?",
    "Tilfelle 4 – hva bør du gjøre?"
  ],
  [
    "Tilfelle 5 – bevis: Hva er beviset?",
    "Tilfelle 5 – hva i eksemplet viser årsaken?"
  ],
  [
    "Tilfelle 5 – minste trygge rettelse: Hva gjør du?",
    "Tilfelle 5 – hva bør du gjøre?"
  ],
  [
    "Tilfelle 6 – bevis: Hva sammenligner du for å bevise det?",
    "Tilfelle 6 – hva bør du sammenligne?"
  ],
  [
    "Tilfelle 6 – minste trygge rettelse: Hva er den minste rettelsen?",
    "Tilfelle 6 – hva bør du gjøre?"
  ],
  [
    "Tilfelle 7 – bevis: Hva i meldingen er beviset?",
    "Tilfelle 7 – hva i feilmeldingen viser problemet?"
  ],
  [
    "Tilfelle 7 – minste trygge rettelse: Hva gjør du?",
    "Tilfelle 7 – hva bør du gjøre?"
  ],
  [
    "Hvilket av de sju tilfellene tror du er mest sannsynlig at du selv møter først? Skriv én setning (valgfritt, ingen poeng).",
    "Hvilket av de sju tilfellene tror du er mest sannsynlig at du selv møter først? Skriv én setning (valgfritt)."
  ],
  [
    "Sett stegene fra problem til presentasjon i riktig rekkefølge. Huskeregelen fra leksjonen kan hjelpe: *hvorfor → hva → hvordan → virker det?*",
    "Sett stegene fra problem til presentasjon i riktig rekkefølge. Huskeregelen fra «Fra behov til løsning: hele veien» er *hvorfor → hva → hvordan → virker det?*"
  ],
  [
    "Hvert utsagn under beskriver noe en utvikler har gjort. Koble hvert utsagn til det utvikleren har i hånden etterpå.",
    "Koble det utvikleren gjør, til resultatet av arbeidet."
  ],
  [
    "Hva slags forutsigelse gikk oftest galt for deg? Velg det som passer best (valgfritt, ingen poeng).",
    "Hva syntes du var vanskeligst å forutsi? Velg det som passer best (valgfritt)."
  ],
  [
    "Kjør `git log --oneline` i ditt eget prosjekt (mappen `kode`) og lim inn utskriften. Den skal vise minst én commit.",
    "Kjør `git log --oneline` i prosjektet ditt (mappen `kode`). Sjekk at du ser minst én commit, og lim inn utskriften."
  ],
  [
    "Kjør `git status` i prosjektet og lim inn utskriften. Den skal vise at alt er lagret.",
    "Kjør `git status` i prosjektet ditt. Sjekk at Git viser en ren arbeidsmappe, uten endringer som venter på en commit. Lim inn utskriften."
  ],
  [
    "Git-tilfelle 1 – minste trygge rettelse: Hva gjør du?",
    "Git-tilfelle 1 – hva bør du gjøre?"
  ],
  [
    "Git-tilfelle 2 – minste trygge rettelse: Hva gjør du?",
    "Git-tilfelle 2 – hva bør du gjøre?"
  ],
  [
    "Git-tilfelle 3 – minste trygge rettelse: Hva gjør du?",
    "Git-tilfelle 3 – hva bør du gjøre?"
  ],
  [
    "Git-tilfelle 4 – minste trygge rettelse: Hva gjør du?",
    "Git-tilfelle 4 – hva bør du gjøre?"
  ],
  [
    "Hvilken endring gjør spørsmålet «Hvorfor virker ikke programmet?» mest bedre?",
    "Hvordan kan du gjøre spørsmålet «Hvorfor virker ikke programmet?» mer nyttig?"
  ],
  [
    "En KI-assistent (konstruert svar) foreslo denne koden for å skrive ut «Hei, verden!». Du kjørte den og fikk feilmeldingen under. Hva viser feilen?",
    "Her er et eksempel på et KI-forslag for å skrive ut «Hei, verden!». Du kjører koden og får feilmeldingen under. Hva viser feilen?"
  ],
  [
    "Skriv din egen regel for hvordan du vil bruke KI i dette programmet, i én setning (valgfritt, ingen poeng).",
    "Skriv din egen regel for hvordan du vil bruke KI i dette programmet, i én setning (valgfritt)."
  ],
  [
    "To konstruerte KI-svar foreslår hvordan du lager en tom linje. Du kjører begge i en liten fil. Hvilket kan du bruke?",
    "Her er to eksempler på KI-forslag for å skrive ut en tom linje. Prøv begge i en liten fil. Hvilket virker?"
  ],
  [
    "Skriv 2–3 setninger om hva som var vanskeligst i labben, og hva du vil gjøre annerledes neste gang (valgfritt, ingen poeng).",
    "Skriv 2–3 setninger om hva som var vanskeligst i labben, og hva du vil gjøre annerledes neste gang (valgfritt)."
  ],
  [
    "Sjekkliste for labben (kun for deg).",
    "Sjekkliste for labben."
  ],
  [
    "Hvilken av disse konstruerte KI-foreslåtte linjene kan du bruke i programmet?",
    "Hvilket av disse KI-forslagene kan du bruke i programmet?"
  ],
  [
    "Hvilket steg i oppdraget var vanskeligst, og hvordan løste du det? (valgfritt, ingen poeng)",
    "Hvilket steg i oppdraget var vanskeligst, og hvordan løste du det? (valgfritt)"
  ],
  [
    "Valgfritt (ingen poeng, teller ikke for resultatet ditt): hva ville du øvd mer på før neste modul?",
    "Hva vil du øve mer på før neste modul? (Valgfritt.)"
  ],
  [
    "Få `py --version` til å gi en linje som starter med `Python 3.`. Leser du en feilmelding, se tabellen «Når noe går galt» i forrige leksjon.",
    "Få `py --version` til å gi en linje som starter med `Python 3.`. Leser du en feilmelding, se tabellen «Når noe går galt» i «Sett opp arbeidsstedet: Python og editor»."
  ],
  [
    "Tabellen fra `ls` har flere kolonner. Se etter filnavnene i kolonnen `Name`. Datoene på din maskin blir andre. I kolonnen `Mode` betyr `d` at det er en mappe (directory). `a` står for «archive» og står på vanlige filer. Den kan du se bort fra.",
    "Tabellen fra `ls` har flere kolonner. Se etter filnavnene i kolonnen `Name`. Datoene på maskinen din blir andre. I kolonnen `Mode` betyr `d` at det er en mappe (directory). `a` står for «archive» og står på vanlige filer. Den kan du se bort fra."
  ],
  [
    "Skriv programmet i editoren, kjør det i terminalen og sammenlign med det oppgaven ber om. Lim så koden inn her. Programmet ditt spør ikke brukeren om noe; evaluatoren kjører det og sammenligner utskriften.",
    "Skriv og kjør programmet i editoren og terminalen. Sammenlign utskriften med oppgaven, og lim inn koden her. ProgressPal kjører koden og sjekker utskriften. Programmet trenger ingen input fra brukeren."
  ],
  [
    "Les symptomet én gang til og velg det som er bevist av det du ser, ikke det som bare kan tenkes.",
    "Les meldingen på nytt. Hvilket alternativ passer med det terminalen viser?"
  ],
  [
    "VS Code er et eget program. Det sier ingenting om Python finnes, så du får ikke noe bevis for eller mot.",
    "VS Code er et eget program. At det er installert, betyr ikke at Python er installert."
  ],
  [
    "Riktig. Da ser du både stedet og innholdet, og årsaken er bevist.",
    "Riktig. Da ser du både stedet og innholdet, og kan sjekke om filen ligger i riktig mappe."
  ],
  [
    "Versjonsnummeret på din maskin kan være et annet.",
    "Versjonsnummeret på maskinen din kan være et annet."
  ],
  [
    "Får du en linje som starter med `Python 3.`, har du Python, og du kan hoppe til steg 3. Tallene etter kan være andre enn i eksempelet. Dette programmet (Programvareutvikling) er skrevet for Python 3.14, og versjon 3.12 eller nyere er bra nok. Får du en melding om at `py` ikke finnes eller ikke gjenkjennes, må du installere Python. Det gjør du i steg 2.",
    "Hvis `py --version` viser Python 3.12 eller nyere, gå til steg 3. Vi bruker Python 3.14 i eksemplene. Har du en eldre versjon, installer en nyere. Hvis `py` ikke blir gjenkjent, gå til steg 2."
  ],
  [
    "## Steg 2: Installer Python (hvis du ikke har det)\n\n1. Gå til `python.org/downloads` i nettleseren din.\n2. Last ned Python for Windows. Ifølge Python-dokumentasjonen for Windows er anbefalt måte fra Python 3.14 en liten installasjonsbehandler (**Python install manager**). Kjør filen du lastet ned.\n3. Følg spørsmålene. Standardvalgene er greie. Blir du spurt om å installere selve Python-versjonen (for eksempel 3.14), svarer du ja. Et spørsmål om å legge Python til i «PATH» er valgfritt: kommandoen `py` virker uten.\n4. **Lukk PowerShell og åpne det på nytt**, og skriv `py --version` igjen. Et terminalvindu som var åpent under installasjonen kjenner ikke til det nye programmet.",
    "## Steg 2: Installer Python (hvis du ikke har det)\n\n1. Åpne `python.org/downloads` i nettleseren.\n2. Last ned Python for Windows. For Python 3.14 anbefales Python install manager. Åpne installasjonsfilen.\n3. Følg spørsmålene. Hvis du blir spurt om å installere en Python-versjon, velg 3.14. Du trenger normalt ikke legge selve Python til PATH for å bruke `py`.\n4. Lukk PowerShell, åpne et nytt vindu og kjør `py --version` igjen."
  ],
  [
    "## Flere linjer, ovenfra og ned\n\nHver `print` skriver ut én linje. Python utfører linjene i rekkefølgen de står:",
    "## Flere linjer, ovenfra og ned\n\nI disse eksemplene skriver hvert `print`-kall ut én linje. Python kjører linjene i rekkefølge:"
  ],
  [
    "De fleste nybegynnere skriver kode og kjører den for å «se hva som skjer». Erfarne utviklere leser først og forutsier, og bruker kjøringen til å sjekke forståelsen sin. Det gjør at du lærer av hver kjøring, og at du oppdager når du har misforstått noe. I dag lærer du en fast fremgangsmåte.",
    "Før du kjører et lite program, prøv å se for deg utskriften. Da kan du sammenligne det du forventer, med det Python faktisk skriver ut."
  ],
  [
    "Før eller siden skriver alle kode som Python ikke forstår. Da skriver Python en **feilmelding** (error message). Feilmeldinger er ikke en straff, men informasjon: Python forteller deg hva den ikke forstod og hvor. I dag lærer du å lese dem. Å finne og rette slike feil kalles **feilsøking** (debugging), og feilene kalles ofte **bugs** (bugs).",
    "Når Python møter en feil, viser det ofte en **feilmelding** (error message). Meldingen hjelper deg å finne hvor og hvorfor programmet stoppet. Å finne og rette feil kalles **feilsøking** (debugging). En feil i programmet kalles ofte en bug."
  ],
  [
    "## Når bør du lage en *commit*?\n\n- Lag en *commit* når du har gjort en endring du vil kunne finne tilbake til, for eksempel når et lite program virker. Sjekk med `git status` hva som er endret, og klargjør filene du vil lagre.\n- Skriv en melding som beskriver endringen: «Legg til hei-program» eller «Rett skrivefeil i hilsen». Meldinger som «endringer» og «fix» hjelper deg lite når du senere skal forstå historikken.",
    "## Når bør du lage en commit?\n\nLag en commit når du har en endring du vil kunne finne tilbake til. Bruk `git status` for å se hva som er endret, og velg filene med `git add`.\n\nSkriv en melding som forteller hva du endret, for eksempel «Legg til hei-program» eller «Rett skrivefeil i hilsen». «Endringer» og «fix» sier lite om hva du gjorde."
  ],
  [
    "Filen heter egentlig `hei.py.txt`, selv om Filutforsker viser `hei`.",
    "Filen heter egentlig `hei.py.txt`, men Filutforsker skjuler `.txt`."
  ],
  [
    "Riktig utskrift! Den stemmer med det programmet skal vise. Hvis du kjørte `py hei.py` i prosjektmappen din, har du også sett ditt første Python-program virke i terminalen.",
    "Utskriften stemmer. `py hei.py` skal skrive «Hei, verden!» i terminalen."
  ],
  [
    "Terminalen må stå der filen er.",
    "Du kan gå til mappen der filen ligger, eller bruke en sti til filen. Her skal du gå til mappen."
  ],
  [
    "Anførselstegn betyr «skriv ut akkurat dette». Uten anførselstegn regner Python.",
    "Tekst mellom anførselstegn skrives ut som tekst. Et regnestykke uten anførselstegn blir regnet ut."
  ],
  [
    "Riktig. Alt etter `#` på linjen er til mennesker, ikke til Python.",
    "Riktig. Utenfor en tekststreng starter `#` en kommentar. Python ignorerer resten av linjen."
  ],
  [
    "Riktig. Det er den minste endringen som løser problemet, og den påvirker ikke resten av maskinen.",
    "Riktig hvis Python mangler. Sjekk først med `py --version` i et nytt terminalvindu. Installer Python bare hvis du fortsatt ikke finner det."
  ],
  [
    "Riktig. To navn, samme verktøy: én virker, én blir omdirigert.",
    "Riktig. `py` finner Python, mens `python` åpner Microsoft Store i dette eksemplet."
  ],
  [
    "Da får du to forskjellige installasjoner, og det lager nye problemer.",
    "En ekstra installasjon kan gjøre det vanskeligere å holde styr på hvilken Python-versjon du bruker. Prøv `py` først."
  ],
  [
    "Python leser filen på nytt hver gang den kjøres, uansett hvor kort den er. Er utskriften gammel, er endringen ikke lagret.",
    "Python leser den lagrede filen hver gang den kjøres. I dette eksemplet viser prikken at endringen ikke er lagret."
  ],
  [
    "Riktig. Det endrer bare hva VS Code bruker, ikke resten av maskinen. Inntil det er gjort, er terminalen (`py hei.py`) fasiten.",
    "Riktig. Velg samme Python-versjon i VS Code som i terminalen. Prøv å kjøre programmet igjen etterpå."
  ],
  [
    "Riktig. Kopierer du kode fra nettsider eller dokumenter, se alltid over anførselstegnene.",
    "Riktig. Vanlige rette anførselstegn avgrenser teksten i Python."
  ]
]);

export function reviseCampaignM01(text: string): string {
  return campaignM01Editorial.get(text) ?? text;
}
