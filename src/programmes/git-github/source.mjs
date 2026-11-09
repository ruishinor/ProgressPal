// Canonical, originally authored Bokmål curriculum. Build-time input only.
// Run node scripts/git-github-content.mjs after editing; never import into the app.
const text = (nb) => ({ t: 'text', nb });
const note = (nb) => ({ t: 'callout', kind: 'merk', nb });
const command = (title, say, code, stdout = '') => [
  text('### ' + title + '\n\n' + say),
  {
    t: 'code',
    file: 'Kommando – PowerShell 5.1',
    code:
      '. {\n' +
      (/git (?:init|config|add|restore|commit)\b|Set-Content\b|notepad\.exe/.test(
        code,
      )
        ? "if ((Get-Location).Path -ne $practiceRoot) { throw 'STOPP: Gaa tilbake til ovingsmappen.' }\n" +
          code
        : code) +
      '\n}',
    stdin: '',
    stdout,
    error: '',
    error_info: null,
    nb: '',
  },
];
const question = (id, prompt, options, hint) => ({
  id,
  type: 'mcq',
  prompt,
  hints: [hint],
  options: options.map(([id, text, correct, feedback]) => ({
    id,
    text,
    correct,
    feedback,
  })),
});

export const gitLessons = [
  {
    missionId: 'GIT-M01-O01',
    title: 'Start her: hvorfor bruke Git?',
    goal: 'Forstå forskjellen på å lagre en fil, registrere en versjon med Git og samarbeide gjennom GitHub.',
    skillId: 'GIT-VERSIONING',
    flow: [
      text(
        "Før kommandoene: Du skal lære hva Git gjør, ikke lære en lang PowerShell-oppskrift utenat. Se etter selve `git`-kommandoen i hver boks. Linjene med `$practiceRoot`, `Test-Path` og `throw 'STOPP'` kontrollerer at du er i din egen øvingsmappe. «Forventet utskrift» er et eksempel på hva du skal undersøke, ikke noe du skal skrive inn. Hvis en kontroll stopper, ikke slett mappen eller kjør oppsettet på nytt: finn ut hvilken mappe og Git-tilstand du faktisk har. Du kan komme tilbake etter en pause med navigasjonsblokken lenger nede.",
      ),
      text(
        'Du trenger ikke kunne programmere, Git eller terminal fra før. I denne modulen går vi fra å forstå et vanlig utviklingsproblem til å registrere og kontrollere egne versjoner. De praktiske øvelsene bruker ufarlige tekstfiler om en tur, slik at du kan lære Git uten samtidig å måtte feilsøke programkode. Du trenger ingen GitHub-konto.',
      ),
      text(
        'Tenk deg at du har laget en enkel nettside som virker. Du endrer koden for å legge til et kontaktskjema, men nå virker ikke menyen. Hva ble endret, og kan du få tilbake versjonen som virket? Det samme blir enda vanskeligere når flere i klassen endrer forskjellige deler av prosjektet. Å lagre en fil eller kopiere prosjektmappen hjelper med å beholde filinnhold, men gir ikke i seg selv en ryddig oversikt over hvilke endringer som hører sammen, eller hvorfor de ble gjort.',
      ),
      text(
        'Git er et versjonskontrollsystem som organiserer prosjektets endringer. Du bestemmer når en sammenhengende versjon er verdt å registrere. Den registreringen heter en **commit**. En commit bevarer et øyeblikksbilde (snapshot) av det utvalgte filinnholdet, med en melding som forklarer endringen. Du kan sammenligne versjoner og undersøke tidligere arbeid. Dette skjer lokalt på datamaskinen, også uten nett. Git sjekker ikke om programmet faktisk virker: det er ditt og teamets arbeid å teste.',
      ),
      text(
        'Filene i et prosjekt ligger i en mappe. Når Git settes opp for den mappen, blir den et **repository**, ofte kalt et **repo**. Git lagrer historikken i en skjult undermappe som heter .git. Kommandoene du bruker i prosjektmappen, arbeider med dette repositoryet. Ikke endre .git manuelt.',
      ),
      text(
        '**GitHub** er en nettplattform der dere kan oppbevare et Git-repo og samarbeide om kode, for eksempel ved å foreslå endringer og diskutere dem før de tas inn. Git lager og organiserer versjonshistorikken; GitHub tilbyr tjenester rundt den. GitLab og Bitbucket er alternativer. En lokal commit sendes ikke automatisk til GitHub. I M01 bruker vi bare Git lokalt, og lærer deling senere.',
      ),
      note(
        'Git-historikk på samme disk er ikke en sikkerhetskopi: forsvinner hele prosjektmappen, kan også .git og historikken gå tapt. Ta en separat sikkerhetskopi av verdifullt arbeid. ProgressPal lagrer svar og framdrift i nettleseren; Git lagrer filene og historikken i din øvingsmappe. Appens sikkerhetskopi tar ikke med Git-mappen.',
      ),
      text(
        'I M01 lærer du å forstå og registrere egne endringer. Når du senere arbeider med historikk, brancher og samarbeid, bruker du samme grunnlag videre. Hele M01–M07-løpet og rekkefølgen finner du i Pathways-oversikten; du trenger ikke lære alle begrepene før første øvelse.',
      ),
      question(
        'GIT-M01-E01',
        'Du har lagret turplanen i Notisblokk og vil nå registrere en lokal versjon du kan finne igjen senere. Hva beskriver forskjellen riktig?',
        [
          [
            'a',
            'Lagring i Notisblokk oppdaterer filen. En commit registrerer et valgt snapshot i Git-historikken.',
            true,
            'Ja. Filen må først være lagret på disken; deretter kan Git registrere en versjon du velger. Senere lærer du hvordan du velger innholdet.',
          ],
          [
            'b',
            'Git registrerer automatisk en ny commit hver gang du trykker Lagre i Notisblokk.',
            false,
            'Lagre oppdaterer filen, men Git lager ingen commit av seg selv. Du velger innhold og ber deretter Git registrere det.',
          ],
          [
            'c',
            'En lokal commit må lastes opp til GitHub før Git kan vise historikken.',
            false,
            'Historikken ligger lokalt i .git. GitHub trengs først når du vil bruke den separate nettjenesten.',
          ],
        ],
        'Tenk på hva som skjer med filen på disken, og hva du selv må be Git registrere.',
      ),
      text(
        'I neste leksjon gjør du klar en trygg mappe og ser hvor kommandoer kjøres. Deretter lager du din første commit og øver på å velge nøyaktig hvilke endringer den skal inneholde.',
      ),
    ],
  },
  {
    missionId: 'GIT-M01-O02',
    title: 'Gjør klar Windows og øvingsmappen',
    goal: 'Åpne PowerShell, sjekke Git og finne fram til en ny, trygg mappe uten å berøre egne prosjekter.',
    skillId: 'GIT-TOOLS',
    flow: [
      text(
        "Før kommandoene: Du skal lære hva Git gjør, ikke lære en lang PowerShell-oppskrift utenat. Se etter selve `git`-kommandoen i hver boks. Linjene med `$practiceRoot`, `Test-Path` og `throw 'STOPP'` kontrollerer at du er i din egen øvingsmappe. «Forventet utskrift» er et eksempel på hva du skal undersøke, ikke noe du skal skrive inn. Hvis en kontroll stopper, ikke slett mappen eller kjør oppsettet på nytt: finn ut hvilken mappe og Git-tilstand du faktisk har. Du kan komme tilbake etter en pause med navigasjonsblokken lenger nede.",
      ),
      text(
        '**Du trenger:** Windows PowerShell 5.1, Git 2.28 eller nyere og Notisblokk på en Windows-maskin. PowerShell og Notisblokk følger med Windows. Du trenger nett bare hvis Git må installeres; selve øvingen fungerer uten nett. GitHub-konto, VS Code og programmeringskunnskap er ikke nødvendig. Bruker du en administrert skole- eller jobbmaskin, følger du installasjonsreglene der.',
      ),
      text(
        'En **terminal** er et vindu der du skriver beskjeder til datamaskinen. **PowerShell** er programmet som tolker beskjedene, eller kommandoene, i dette vinduet. Åpne Start-menyen i Windows, skriv Windows PowerShell og åpne appen med det navnet. Velg vanlig åpning; ikke «Kjør som administrator». Velg Windows PowerShell framfor Git Bash i denne øvingen.',
      ),
      text(
        'Ledeteksten kan for eksempel vise PS C:\\Users\\navn> med en blinkende markør. Den forteller hvilken mappe terminalen står i. Ikke kopier ledeteksten, stien eller tegnet >. Du skriver eller kopierer bare innholdet i bokser merket «Kommando – PowerShell 5.1» og trykker Enter. Bokser med «Forventet utskrift» viser resultater du skal lese, ikke kjøre.',
      ),
      text(
        'Når du kopierer en kommandoboks, tar du med alle linjene. Noen bokser har ytterlinjene . { og }. De sørger for at en sikkerhetsstopp avbryter hele boksen, og at PowerShell husker øvingsmappen mellom boksene. Du trenger ikke forstå eller skrive disse tegnene selv for å lære Git; bruk dem slik de står.',
      ),
      command(
        'Finn ut hvor du står',
        'Skriv kommandoen i Windows PowerShell. Get-Location viser gjeldende mappe. Den endrer ingenting.',
        'Get-Location',
      ),
      text(
        'Utskriften har en Path med en sti, for eksempel C:\\Users\\navn. En sti er adressen til en mappe eller fil. Din sti skal gjerne være annerledes enn eksemplet. Kommandoer som bruker filnavn uten en full sti, leter normalt i gjeldende mappe. Derfor må vi vite hvor vi står.',
      ),
      command(
        'Sjekk at Git finnes',
        'Denne kommandoen ber Git oppgi versjonen. Den lager ikke et repository.',
        'git --version',
        'git version 2.x.y.windows.z',
      ),
      text(
        'Versjonstallene varierer. Eksemplet over er en form, ikke en bestemt versjon du må finne. Trenger du å installere Git, eller får du en melding om at git ikke gjenkjennes? Åpne nettleseren og gå til den offisielle siden git-scm.com/install/windows. Last ned Git for Windows derfra, velg utgaven for maskinen din og følg installasjonsprogrammet. Behold valget som gjør Git tilgjengelig fra kommandolinjen og andre programmer. Du trenger ikke logge inn på GitHub. Lenken «Installer Git for Windows» finnes også på modulsiden.',
      ),
      text(
        'Lukk PowerShell-vinduet etter installasjonen, åpne Windows PowerShell på nytt fra Start og kjør git --version igjen. Fortsett først når Git svarer med 2.28 eller nyere. Hvis installasjonen avvises, eller git fortsatt ikke gjenkjennes etter ny åpning, stopp Git-øvingene og få hjelp til selve installasjonen. Ikke prøv tilfeldige skript fra nettet. Installasjonsveiviseren er ikke en del av den lokale, reproduserte Git-øvelsen.',
      ),
      text(
        'Vi lager en egen mappe under Dokumenter, ikke i et eksisterende kodeprosjekt. Kommandoene nedenfor undersøker om navnet allerede finnes, før de oppretter noe. $practiceRoot er et navn PowerShell bruker for å huske adressen til øvingsmappen; Join-Path setter sammen adressen og mappenavnet. Du trenger ikke lære skriptsyntaksen utenat. Det viktige er at du vet hvilken mappe Git skal arbeide i, og at en eksisterende mappe ikke overskrives.',
      ),
      command(
        'Opprett en ny øvingsmappe én gang',
        'Kopier hele boksen inn i PowerShell og trykk Enter. Les gjennom linjene først. Kjør den bare for denne nye øvingen.',
        "$practiceRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ProgressPal Git oving'\nif (Test-Path -LiteralPath $practiceRoot) { throw 'STOPP: Mappen finnes allerede. Ikke overskriv den.' }\nNew-Item -ItemType Directory -Path $practiceRoot -ErrorAction Stop\nSet-Location -LiteralPath $practiceRoot -ErrorAction Stop\nGet-Location",
      ),
      text(
        'Path skal nå slutte på ProgressPal Git oving. New-Item laget mappen; Set-Location gikk inn i den. -LiteralPath betyr at stien brukes som skrevet. Hvis du får STOPP om at mappen finnes: ikke slett noe. Hvis dette er din tidligere øvingsmappe, fortsetter du der som beskrevet under. Er innholdet ukjent, velger du et annet nytt mappenavn i første linje og bruker det samme navnet når du skal tilbake. Ved en annen rød feilmelding stopper du og leser hva som feilet før du fortsetter.',
      ),
      command(
        'Se den nye mappen',
        'Get-ChildItem viser filer og undermapper. Før vi lager filene, skal det ikke stå noen filer her.',
        'Get-ChildItem -Force',
      ),
      text(
        'Kommandobokser som senere endrer filer eller Git-utvalget, begynner med en mappekontroll. Den sammenligner gjeldende sti med $practiceRoot og stopper med STOPP hvis de er ulike. Hvis du får den meldingen, bruker du «Slik finner du tilbake etter en pause» under. Ikke fjern kontrollen for å komme videre.',
      ),
      note(
        'Bruk bare oppdiktede turtekster her. Ikke bruk et arbeidsprosjekt, passord, tokens eller private filer. Et repository deler ingenting av seg selv, men historikk kan senere bli delt. .gitignore er heller ingen beskyttelse for hemmeligheter.',
      ),
      command(
        'Slik finner du tilbake etter en pause',
        'Hvis du åpner et nytt PowerShell-vindu, finner disse linjene den eksisterende mappen. De lager den ikke på nytt. Kjør ikke opprettelsesboksen igjen.',
        "$practiceRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ProgressPal Git oving'\nSet-Location -LiteralPath $practiceRoot -ErrorAction Stop\nGet-Location",
      ),
      text(
        'Ha ProgressPal ved siden av terminalen eller bytt mellom vinduene med Alt+Tab. Du kan bruke «Kopier» ved en kommandoboks. Svar lagres når du sender dem; tekst du ennå ikke har sendt, er et utkast og må sendes før du lukker eller laster siden på nytt. Nettleseren husker et sted i leksjonen når du bruker «Fortsett» mellom innholdsdelene eller sender et svar. Etter en pause bruker du «Fortsett der du slapp».',
      ),
      {
        id: 'GIT-M01-E02',
        type: 'checklist',
        prompt:
          'Ta en ærlig egenkontroll før du går videre. Kryss bare av det du faktisk har gjort. Du kan lagre en delvis liste og komme tilbake.',
        items: [
          'Jeg har åpnet Windows PowerShell og sett at git --version virker.',
          'Jeg har en egen øvingsmappe og har kontrollert stien med Get-Location.',
        ],
        hints: [],
      },
    ],
  },
  {
    missionId: 'GIT-M01-O03',
    title: 'Lag og undersøk den første versjonen',
    goal: 'Opprette et repository med ufarlige tekstfiler og registrere det første snapshotet.',
    skillId: 'GIT-SNAPSHOT',
    flow: [
      text(
        'Hvis du gjenopptar M01 etter en pause, åpner du PowerShell og går tilbake til din eksisterende `ProgressPal Git oving`-mappe via navigasjonsblokken fra forrige leksjon. Undersøk først `Get-Location` og, hvis repoet allerede er opprettet, `git status` og `git log --oneline`. Ikke gjenta `git init` eller første commit bare fordi du har åpnet terminalen på nytt. Et avvik er grunn til å stoppe og undersøke, ikke til å slette mappen.',
      ),
      text(
        'I et utviklingsprosjekt kan den første commiten beskrive en fungerende grunnversjon av programmet. Da har teamet et kjent utgangspunkt å sammenligne senere endringer med. Her øver vi på akkurat den arbeidsmåten med små tekstfiler: én beskrivelse, én huskeliste og en kladd som ikke skal inn i historikken. Fortsett i den tomme mappen ProgressPal Git oving fra forrige leksjon. Sjekk hvor du står før du kjører kommandoer. Har du gjort dette før, skal du undersøke filene og historikken, ikke lage dem på nytt.',
      ),
      text(
        'Før Git kan følge endringene dine, må du gjøre prosjektmappen til et repo. **git init** starter et lokalt repository. **-b main** gir den første **branchen** navnet main. En branch er en navngitt utviklingslinje i historikken. Foreløpig bruker du bare main; egne grener kommer senere når du skal prøve endringer parallelt.',
      ),
      command(
        'Start repositoryet',
        'Kjør dette bare én gang i den nye, tomme øvingsmappen.',
        "if (@(Get-ChildItem -Force).Count -ne 0) { throw 'STOPP: Opprettelse krever en ny, tom ovingsmappe.' }\ngit init -b main\nif ($LASTEXITCODE -ne 0) { throw 'STOPP: Git kunne ikke opprette repositoryet.' }\ngit status",
      ),
      text(
        'Git skal fortelle at du er på main, at det ikke finnes commits ennå, og at det ikke er noe å registrere. «Initialized empty Git repository» betyr at opprettelsen lyktes. Stien varierer. «Reinitialized» betyr at .git allerede fantes: stopp oppsettet og undersøk hva du har gjort tidligere. «not a git repository» betyr vanligvis at du står i feil mappe. Bruk Get-Location og gå tilbake med Set-Location fra forrige del.',
      ),
      command(
        'Finn Git-mappen',
        'Get-ChildItem -Force viser også skjulte elementer. Du skal nå se .git. Ikke åpne den for å endre noe.',
        'Get-ChildItem -Force',
      ),
      text(
        'Før en commit trenger Git et forfatternavn og en e-postadresse. I denne øvingen bruker du oppdiktede verdier. --local avgrenser innstillingen til dette repositoryet. Den endrer ikke andre prosjekter eller hele datamaskinen. I et virkelig prosjekt bruker du en identitet som passer for samarbeidet; opplysningene følger med commits som deles.',
      ),
      command(
        'Angi lokal øvingsidentitet',
        'Kjør linjene i øvingsmappen. Den siste linjen skal vise Git-elev.',
        'git config --local user.name "Git-elev"\ngit config --local user.email "git-elev@example.invalid"\ngit config --local --get user.name',
        'Git-elev',
      ),
      text(
        'Vi lager README.txt, en liten beskrivelse av turen, og plan.txt med en huskeliste. Set-Content skriver tekst til en fil. -Encoding ASCII passer her fordi selve eksempeltekstene bare bruker tegnene i ASCII. Ikke bruk disse skrivekommandoene på egne filer; de erstatter innholdet i filene de navngir. Oppsettet under avviser filer som allerede finnes.',
      ),
      command(
        'Lag startfilene uten å overskrive',
        'Kjør hele boksen én gang i øvingsmappen etter vellykket git init.',
        "$names = @('README.txt', 'plan.txt', '.gitignore', 'kladde.txt')\nforeach ($name in $names) {\n  if (Test-Path -LiteralPath $name) { throw ('STOPP: Filen finnes allerede: ' + $name) }\n}\nSet-Content -LiteralPath 'README.txt' -Value @('Turplan', 'Dagstur langs elva.') -Encoding ASCII -ErrorAction Stop\nSet-Content -LiteralPath 'plan.txt' -Value 'Husk vann.' -Encoding ASCII -ErrorAction Stop\nSet-Content -LiteralPath '.gitignore' -Value 'kladde.txt' -Encoding ASCII -ErrorAction Stop\nSet-Content -LiteralPath 'kladde.txt' -Value 'Et forslag jeg ikke vil ha med i historikken.' -Encoding ASCII -ErrorAction Stop\nGet-ChildItem -Force",
      ),
      text(
        'En **.gitignore** er en vanlig tekstfil med navn eller mønstre Git normalt skal la være å ta med blant nye filer. Her inneholder den bare kladde.txt. Derfor vil kladden finnes i mappen, men ikke dukke opp som en ny fil i status. .gitignore fjerner ikke innhold som allerede er registrert. Legg aldri hemmeligheter i øvingsmappen.',
      ),
      command(
        'Åpne en fil i en enkel editor',
        'Denne kommandoen åpner README.txt i Notisblokk. Les de to linjene. Filmenyer kan variere mellom Windows-versjoner. Lukk filen uten endringer foreløpig.',
        'notepad.exe .\\README.txt',
      ),
      text(
        'Notisblokk er teksteditoren; PowerShell er terminalen. Når du endrer en fil senere, velger du Fil → Lagre eller trykker Ctrl+S i Notisblokk før du går tilbake til PowerShell. Bruk den eksisterende filen, ikke «Lagre som», så navnet ikke ender som README.txt.txt. Get-Content lar deg lese det som faktisk er lagret på disken.',
      ),
      command(
        'Se filinnhold og Git-status',
        'Git kjenner foreløpig disse filene som untracked: de er ikke lagt i staging area eller registrert i historikken.',
        "Get-Content -LiteralPath 'README.txt'\ngit status --short",
        'Turplan\nDagstur langs elva.\n?? .gitignore\n?? README.txt\n?? plan.txt',
      ),
      text(
        'I et virkelig prosjekt kan du for eksempel rette en feil i én fil mens du eksperimenterer med en annen. Du vil ikke nødvendigvis registrere begge deler i samme commit. Derfor skiller Git mellom **working tree** (filene på disken), **staging area** eller **index** (innholdet du har valgt til neste commit) og **commit-historikken** (versjoner som allerede er registrert). **git add** kopierer det valgte filinnholdet inn i staging. **git commit** registrerer det som er klargjort. En lagret fil blir verken staged eller committed av seg selv.',
      ),
      command(
        'Velg startfilene',
        'Vi tar med tre bestemte filer. -- skiller valgene til kommandoen fra filnavnene. Kladden blir liggende utenfor.',
        'git add -- .gitignore README.txt plan.txt\nif ($LASTEXITCODE -ne 0) { throw "STOPP: Filene kunne ikke klargjores." }\ngit diff --cached --name-only',
        '.gitignore\nREADME.txt\nplan.txt',
      ),
      text(
        '--cached ber diff vise det som er klargjort for neste commit. --name-only viser bare filnavn. Du skal se akkurat disse tre. Se også innholdet før du registrerer det. --no-pager gjør at Git skriver rett i terminalen, uten å åpne en egen lesevisning. Plusslinjer i diff er innhold som legges til.',
      ),
      command(
        'Undersøk og registrer',
        'Kjør diff først. Les innholdet; hvis de tre filene stemmer, kjører du commit-linjen og deretter status. -m følger med en kort forklaring av versjonen.',
        'git --no-pager diff --cached\ngit commit -m "Start turplanen"\nif ($LASTEXITCODE -ne 0) { throw "STOPP: Commit ble ikke laget. Les feilmeldingen." }\ngit status --short',
      ),
      text(
        'Diff viser innholdet i de tre filene. Commit skriver en bekreftelse med main, en generert ID og meldingen Start turplanen. Den siste status-kommandoen skal ikke skrive noen filrader: filene Git følger er uendret siden commit. Kladden finnes fortsatt, men er ignorert. En tom status betyr ikke at mappen er tom.',
      ),
      command(
        'Se det Git faktisk registrerte',
        'log viser historikken. show HEAD:README.txt leser README.txt fra den nyeste commiten; HEAD betegner versjonen du står på. Disse kommandoene endrer ikke filene.',
        'git --no-pager log --oneline -1\ngit --no-pager show HEAD:README.txt',
      ),
      text(
        'log viser en kort, maskinlaget commit-ID fulgt av Start turplanen. Din ID blir annerledes enn andres og skal ikke kopieres som et svar. show skal vise Turplan og Dagstur langs elva. Hvis commit feiler med «Author identity unknown», kontroller de lokale navn/e-post-linjene og prøv commit igjen. Hvis Git sier «nothing to commit», undersøk status og log før du gjør noe mer; kanskje commiten allerede finnes. Ved en annen feil beholder du mappen og stanser for å undersøke, framfor å slette arbeid. En LF/CRLF-advarsel gjelder linjesluttformat; les status og diff og kontroller at teksten er riktig.',
      ),
      question(
        'GIT-M01-E03',
        'Du har kjørt git add med startfilene og sett dem i git diff --cached, men ikke kjørt git commit. Hva har skjedd?',
        [
          [
            'a',
            'Innholdet er valgt til neste commit, men det finnes ennå ingen ny commit.',
            true,
            'Riktig. git add velger innhold. git commit er et eget steg som registrerer snapshotet.',
          ],
          [
            'b',
            'Git har registrert en commit, men har ennå ikke laget en forklarende melding.',
            false,
            'git add lager ingen commit, heller ikke en uten melding. Innholdet ligger bare klargjort i index.',
          ],
          [
            'c',
            'Git følger bare filnavnene nå og leser innholdet først når commit kjøres.',
            false,
            'git add klargjør filinnholdet slik det var da add ble kjørt. Det er derfor senere redigeringer må vurderes separat.',
          ],
        ],
        'Hva gjør add, og hva er det separate formålet med commit?',
      ),
    ],
  },
  {
    missionId: 'GIT-M01-O04',
    title: 'Velg innholdet i neste commit',
    goal: 'Skille working tree fra staging area, rette feil staging og lage en commit med bare det planlagte innholdet.',
    skillId: 'GIT-STAGING',
    flow: [
      text(
        'I et kodeprosjekt kan du ha endret både innloggingsskjermen og en uferdig eksperimentell funksjon. En god commit bør inneholde en endring du kan forklare og undersøke; du trenger ikke ta med alt bare fordi filene er endret. Nå bruker du det samme repoet på main med én commit: Start turplanen. Du skal registrere starttidspunktet i README.txt, mens en endret huskeliste skal vente. Den konkrete øvingen lærer deg å velge hva som faktisk blir med.',
      ),
      command(
        'Åpne begge filene',
        'Gjør endringene beskrevet rett under i Notisblokk. Det er filene i øvingsmappen du åpner.',
        'notepad.exe .\\README.txt\nnotepad.exe .\\plan.txt',
      ),
      text(
        'I README.txt beholder du Turplan på første linje og erstatter andre linje med Dagstur langs elva. Start klokken 10. I plan.txt erstatter du linjen med Husk vann og mat. Lagre begge med Ctrl+S. Gå deretter tilbake til PowerShell. En uendret fil i Git selv om editoren viser ny tekst, skyldes ofte at du ikke har lagret eller at du redigerer en annen fil.',
      ),
      command(
        'Undersøk endringene før staging',
        'Status viser hvilke filer som er endret. Diff viser hva som faktisk er annerledes. Utdraget under viser status; diff gir i tillegg linjer med minus og pluss.',
        'git status --short\ngit --no-pager diff -- README.txt plan.txt',
        ' M README.txt\n M plan.txt',
      ),
      text(
        'Hver statusrad har to plasser før filnavnet. Den første gjelder staging area sammenlignet med siste commit; den andre gjelder working tree sammenlignet med staging area. M betyr modified, altså endret. En blank første plass og M på andre betyr at filen er endret, men ikke klargjort. ?? betyr en ny fil Git ennå ikke følger. Ikke skriv statusradene som kommandoer.',
      ),
      command(
        'Klargjør bare starttidspunktet',
        'Nå velger vi README.txt slik den er lagret akkurat nå. Huskelisten skal vente.',
        'git add -- README.txt\ngit status --short\ngit --no-pager diff --cached -- README.txt',
        'M  README.txt\n M plan.txt',
      ),
      text(
        'Diff med --cached skal nå inneholde start klokken 10 i README.txt, men ingen endring i plan.txt. Den første M-en viser klargjort innhold. Nå skal du se at staging area husker et bestemt innhold, ikke bare en liste med filnavn.',
      ),
      command(
        'Endre en fil som allerede er staged',
        'Åpne README.txt igjen. Legg til en tredje linje: Ta med kart. Lagre med Ctrl+S og gå tilbake til PowerShell. Ikke kjør git add igjen ennå.',
        'notepad.exe .\\README.txt',
      ),
      command(
        'Sammenlign de to endringene',
        'Se først status, så den nye endringen som ikke er staged, og til slutt det som fortsatt er klart for commit.',
        'git status --short\ngit --no-pager diff -- README.txt\ngit --no-pager diff --cached -- README.txt',
        'MM README.txt\n M plan.txt',
      ),
      text(
        'MM betyr at README.txt har både staged og unstaged innhold. Diff uten --cached viser den nye kartlinjen; diff med --cached viser fortsatt bare endringen til starttid 10. git add tok ikke med framtidige endringer automatisk. Kjører du add på nytt, oppdaterer du innholdet som er valgt. Her skal kartlinjen vente sammen med huskelisten.',
      ),
      question(
        'GIT-M01-E04',
        'README.txt ble staged med starttid 10. Etterpå la du til Ta med kart. og lagret uten å kjøre add igjen. Status viser MM README.txt. Hva vil neste vanlige git commit registrere for denne filen?',
        [
          [
            'a',
            'Starttid 10, uten den nye kartlinjen.',
            true,
            'Ja. Index inneholder versjonen fra add. Kartlinjen finnes bare i working tree og blir liggende som en endring etter commit.',
          ],
          [
            'b',
            'Starttid 10 og kartlinjen, fordi filnavnet allerede var staged.',
            false,
            'Staging er ikke et løfte om å følge framtidige endringer. Git bruker innholdet som ble valgt da add ble kjørt.',
          ],
          [
            'c',
            'Ingen av endringene, fordi MM betyr at Git ikke kan lage en commit.',
            false,
            'MM er en beskrivelse av to forskjellige tilstander, ikke en sperre. Git kan registrere det staged innholdet og la resten vente.',
          ],
        ],
        'Sammenlign hva diff med og uten --cached viser for samme fil.',
      ),
      text(
        'Vi øver på en vanlig feil med vilje: å klargjøre huskelisten også, selv om den ikke skal med. Dette er trygt i denne øvingen fordi vi bare endrer utvalget i staging area. Filene er fortsatt lagret på disken.',
      ),
      command(
        'Gjør og oppdag en staging-feil',
        'Kjør linjene og les listen. Den viser to filer, selv om målet var én.',
        'git add -- plan.txt\ngit diff --cached --name-only',
        'README.txt\nplan.txt',
      ),
      text(
        'Du oppdaget at plan.txt var klargjort ved en feil. **git restore --staged -- plan.txt** fjerner denne filens endring fra utvalget for neste commit, men lar den redigerte filen på disken være i fred. Det er en nyttig retting når du ser at feil arbeid er valgt. **Behold --staged**: restore uten dette valget kan erstatte endringer i selve arbeidsfilen.',
      ),
      command(
        'Rett bare utvalget',
        'Etter rettingen skal bare README.txt stå i den første listen. Get-Content skal fortsatt vise den endrede huskelisten.',
        "git restore --staged -- plan.txt\ngit diff --cached --name-only\nGet-Content -LiteralPath 'plan.txt'",
        'README.txt\nHusk vann og mat.',
      ),
      command(
        'Kontroller snapshotet og lag commit',
        'Les diff før du utfører commit-linjen. Den skal bare registrere starttidspunktet, uten kartlinjen og uten huskelisten.',
        'git --no-pager diff --cached\ngit commit -m "Beskriv starttid for turen"\nif ($LASTEXITCODE -ne 0) { throw "STOPP: Commit ble ikke laget." }\ngit --no-pager log --oneline -2\ngit status --short',
      ),
      text(
        'Historikken skal nå inneholde to commits: Beskriv starttid for turen øverst og Start turplanen under. Status skal vise blank første plass og M på andre for både README.txt og plan.txt. De ventende endringene ble bevart. Status blir altså ikke nødvendigvis tom etter en vellykket commit.',
      ),
      command(
        'Sammenlign registrert og nåværende innhold',
        'show leser siste commit; Get-Content leser filen du nå har på disken. Se forskjellen selv.',
        "git --no-pager show HEAD:README.txt\nGet-Content -LiteralPath 'README.txt'",
      ),
      text(
        'Begge viser Turplan og Dagstur langs elva. Start klokken 10. Bare Get-Content skal i tillegg vise Ta med kart. Hvis show også viser kartlinjen, har du klargjort README på nytt før commit. Det er ingen grunn til å slette eller skrive om historikken. Bruk dette til å forklare forskjellen, behold mappen og tilpass neste oppgave til det som faktisk gjenstår. Du kan også starte en ny øving i en helt ny mappe for å gjenskape eksemplet.',
      ),
    ],
  },
  {
    missionId: 'GIT-M01-O05',
    title: 'Prøv selv: et endret mål',
    goal: 'Velge en annen endring, kontrollere en commit og skille egenrapportert øving fra et automatisk sjekket svar.',
    skillId: 'GIT-TRANSFER',
    flow: [
      text(
        'Til nå har du fått steg for steg-hjelp. I et virkelig programvareprosjekt endres ofte oppgaven mens du arbeider: en annen feil blir viktigere, eller teamet velger å sende én retting før den andre. Nå får du et endret mål og må selv bruke status og diff til å avgjøre hva Git skal registrere. Start i samme repo på main med to commits, en ventende kartlinje i README.txt og en ventende huskelisteendring i plan.txt. Er tilstanden annerledes, undersøk først hva som er staged eller committed før du gjør noe mer.',
      ),
      text(
        'Det nye målet er motsatt av forrige commit: **registrer bare huskelisten i plan.txt**, nå med en sjekk av været. Kartlinjen i README.txt skal fortsatt vente. Før du fikk det nye målet, rakk du å klargjøre README.txt. Vi lager den startsituasjonen bevisst under.',
      ),
      command(
        'Gjør klar den endrede situasjonen',
        'Klargjør README.txt. Åpne så plan.txt i Notisblokk og erstatt linjen med Husk vann og mat. Sjekk vaeret. Lagre filen før du fortsetter.',
        'git add -- README.txt\nnotepad.exe .\\plan.txt',
      ),
      command(
        'Les startsituasjonen',
        'Undersøk status. Her er det nå én staged og én unstaged fil. Hva må endres i utvalget for å oppfylle det nye målet?',
        'git status --short\ngit --no-pager diff --cached\ngit --no-pager diff',
        'M  README.txt\n M plan.txt',
      ),
      question(
        'GIT-M01-E05',
        'Målet er en commit med bare plan.txt. Nå viser status M i første kolonne for README.txt og M i andre kolonne for plan.txt. Hva trenger du å gjøre før commit?',
        [
          [
            'a',
            'Ta README.txt ut av staging area uten å endre arbeidsfilen, klargjør plan.txt og kontroller utvalget.',
            true,
            'Ja. Begge delene trengs: fjern det gamle utvalget med git restore --staged -- README.txt, klargjør plan.txt med git add -- plan.txt og undersøk diff med --cached før commit. Dette er riktig vurdering av situasjonen; appen har ikke utført kommandoene.',
          ],
          [
            'b',
            'Klargjør plan.txt og lag commit; den sist klargjorte filen erstatter automatisk den første i utvalget.',
            false,
            'add legger ikke bort andre staged filer. Uten å ta README.txt ut av index vil begge endringene bli med.',
          ],
          [
            'c',
            'Lag commit først; Git velger automatisk filen som ble redigert sist.',
            false,
            'Commit bruker index, ikke tidspunktet for siste redigering. Her er feil fil klargjort og riktig fil fortsatt unstaged.',
          ],
        ],
        'Se både på det som allerede er valgt, og det som mangler i utvalget. Hvordan rettet du staging uten å endre filer i forrige del?',
      ),
      text(
        'Utfør nå arbeidet i PowerShell. Bruk det du har lært framfor å kopiere hele forrige oppskrift: ta README.txt ut av utvalget, velg plan.txt og undersøk både filnavnene og innholdet i diff --cached. Ingen README-endring skal være med. Noter hvorfor det ikke holder å bare legge til enda en fil. Ved behov kan du lese rettingen i forrige del igjen; det er lov å bruke hjelp.',
      ),
      {
        id: 'GIT-M01-E06',
        type: 'evidence',
        optional: true,
        prompt:
          'Valgfri tekstkontroll før commit: kjør git diff --cached --name-only i øvingsmappen og lim bare inn filnavnlisten. Ikke lim inn ledetekst, stier eller diff-innhold. Sjekken ser etter at bare plan.txt står i teksten. Den kan ikke se repositoryet eller bekrefte at kommandoen ble kjørt.',
        hints: [
          'Se på det som er staged, ikke bare på hvilke filer du har endret.',
        ],
        evaluator: {
          mode: 'paste-regex',
          pattern: '(?<![\\s\\S])\\s*plan\\.txt\\s*(?![\\s\\S])',
          flags: 'm',
          diagnostics: [
            {
              regex: 'README\\.txt',
              feedback:
                'README.txt står fortsatt i teksten. Undersøk om kartlinjen fremdeles er staged, og ta i så fall bare denne filen ut av utvalget.',
            },
          ],
          privacy:
            'Lim bare inn de oppdiktede filnavnene fra øvingen. Ingen tokens, passord, personopplysninger, private repoer eller fullstendige filstier. Teksten lagres i nettleseren og blir med i sikkerhetskopier du eksporterer eller velger å laste opp.',
        },
      },
      text(
        'Når diff --cached viser bare den nye huskelisten i plan.txt, lager du en commit med meldingen Oppdater huskelisten. Du har allerede lært git commit -m. Kontroller deretter git log --oneline -3, git show HEAD:plan.txt, git show HEAD:README.txt og git status --short. Bruk --no-pager foran log og show hvis du vil ha resultatet rett i terminalen.',
      ),
      text(
        'Du skal nå ha tre commits. Nyeste plan.txt i historikken skal ha Husk vann og mat. Sjekk vaeret. README.txt i historikken skal fortsatt mangle kartlinjen. Working tree skal fortsatt ha kartlinjen, og status skal vise bare README.txt som unstaged. Hvis resultatet er annerledes, bruk show, diff og status til å finne forskjellen. Ikke bruk reset --hard, clean eller slett .git for å få et pent resultat. Behold arbeidet mens du undersøker.',
      ),
      {
        id: 'GIT-M01-E07',
        type: 'reflect',
        prompt:
          'Skriv en kort egenrapport: Hva fikk du gjort i den virkelige øvingsmappen, hva viste at bare huskelisten ble registrert, og hva lå igjen? Fortell også hvis noe ikke lyktes eller du brukte hjelp. Du kan skrive en delvis gjennomføring. Ingen personlige stier eller sensitive data.',
        choices: null,
        hints: [],
      },
      text(
        'Du kan lagre svar, en valgfri filnavnkontroll og din egen beskrivelse av øvingen. Marker leksjonen som fullført når du selv har gått gjennom den. Framdrift og svar blir lagret i ProgressPal og følger med en sikkerhetskopi av appen; Git-øvingsmappen må du ta vare på separat.',
      ),
      {
        t: 'recap',
        can: [
          'Forklare hvorfor Git-historikk og vanlig fillagring har ulike oppgaver, og hvorfor GitHub ikke trengs for en lokal commit.',
          'Finne en trygg mappe i PowerShell, lese status og se forskjell på working tree, staging area og commit-historikk.',
          'Velge innhold med add, kontrollere det med diff --cached og registrere det med commit.',
          'Ta en fil ut av staging uten å slette arbeidsfilen og forstå hvorfor samme fil kan ha både staged og unstaged innhold.',
        ],
        next: 'Dette er starten, ikke Git- eller GitHub-mestring. M02 er tilgjengelig og lærer deg å lese historikk, sammenligne versjoner og gjøre en målrettet rettelse. M03 er nå tilgjengelig med branches, merge og konflikter. M04–M06 bygger videre med GitHub, samarbeid og trygg gjenoppretting. M07 avslutter nå Foundations med et lite utviklingsprosjekt. M01 har fortsatt fem deler. Du kan øve igjen i en ny, separat mappe med et nytt navn.',
      },
    ],
  },
];
