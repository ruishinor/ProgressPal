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
        "### Slik bruker du kommandoboksene\n\nDu skal lære hva Git gjør, ikke pugge PowerShell-kode.\n\n- **Kommando:** Kopier hele kommandoboksen til PowerShell. Se spesielt etter linjene med `git`.\n- **Forventet utskrift:** Les resultatet i terminalen. Ikke kopier dette som en kommando.\n- **STOPP:** Linjene med `$practiceRoot`, `Test-Path` og `throw 'STOPP'` passer på at du arbeider i riktig øvingsmappe. Hvis de stopper, undersøk mappen og Git-statusen før du fortsetter. Ikke slett mappen eller kjør oppsettet på nytt.",
      ),
      text(
        'Du trenger ikke kunne programmere, Git eller terminal fra før. I denne modulen går vi fra å forstå et vanlig utviklingsproblem til å registrere og kontrollere egne versjoner. De praktiske øvelsene bruker ufarlige tekstfiler om en tur, slik at du kan lære Git uten samtidig å måtte feilsøke programkode. Du trenger ingen GitHub-konto.',
      ),
      text(
        'Tenk deg at du har laget en enkel nettside som virker. Du endrer koden for å legge til et kontaktskjema, men nå virker ikke menyen. Hva ble endret, og kan du få tilbake versjonen som virket? Det samme blir enda vanskeligere når flere i klassen endrer forskjellige deler av prosjektet. Å lagre en fil eller kopiere prosjektmappen hjelper med å beholde filinnhold, men gir ikke i seg selv en ryddig oversikt over hvilke endringer som hører sammen, eller hvorfor de ble gjort.',
      ),
      text(
        'Git hjelper deg å holde orden på endringer i et prosjekt. Når du vil lagre et bestemt resultat, velger du hvilke endringer som skal være med og lager en *commit*. Det er en registrering i Git-historikken som du senere kan finne tilbake til og sammenligne med andre endringer. Dette kan du gjøre lokalt uten internett. Git sjekker ikke om koden fungerer; det må du teste.',
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
            'Lagring i Notisblokk oppdaterer filen. En commit lagrer det valgte innholdet som en versjon i Git-historikken.',
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
        "### Slik bruker du kommandoboksene\n\nDu skal lære hva Git gjør, ikke pugge PowerShell-kode.\n\n- **Kommando:** Kopier hele kommandoboksen til PowerShell. Se spesielt etter linjene med `git`.\n- **Forventet utskrift:** Les resultatet i terminalen. Ikke kopier dette som en kommando.\n- **STOPP:** Linjene med `$practiceRoot`, `Test-Path` og `throw 'STOPP'` passer på at du arbeider i riktig øvingsmappe. Hvis de stopper, undersøk mappen og Git-statusen før du fortsetter. Ikke slett mappen eller kjør oppsettet på nytt.",
      ),
      text(
        '**Du trenger:** Windows PowerShell 5.1, Git 2.28 eller nyere og Notisblokk på en Windows-maskin. PowerShell og Notisblokk følger med Windows. Du trenger nett bare hvis Git må installeres; selve øvingen fungerer uten nett. GitHub-konto, VS Code og programmeringskunnskap er ikke nødvendig. Bruker du en administrert skole- eller jobbmaskin, følger du installasjonsreglene der.',
      ),
      text(
        'En **terminal** er et vindu der du skriver kommandoer til datamaskinen. **PowerShell** er programmet som tolker dem.\n\n1. Åpne Start-menyen i Windows.\n2. Søk etter Windows PowerShell og åpne appen.\n3. Bruk vanlig åpning, ikke «Kjør som administrator».\n\nBruk Windows PowerShell, ikke Git Bash, i denne øvingen.',
      ),
      text(
        '### Hva skal du skrive i PowerShell?\n\nTerminalen viser for eksempel `PS C:\\Users\\navn>` og en blinkende markør. Teksten foran markøren viser hvilken mappe du står i.\n\n- **Skriv eller kopier:** Innholdet i boksen «Kommando – PowerShell 5.1». Trykk Enter.\n- **Ikke kopier:** `PS C:\\Users\\navn>` eller boksen «Forventet utskrift». Den viser bare hva du kan forvente å se.',
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
        'Utskriften har en Path med en sti, for eksempel C:\\Users\\navn. En sti er adressen til en mappe eller fil. Stien din vil ofte være annerledes enn i eksemplet. Kommandoer som bruker filnavn uten en full sti, leter normalt i gjeldende mappe. Derfor må vi vite hvor vi står.',
      ),
      command(
        'Sjekk at Git finnes',
        'Denne kommandoen ber Git oppgi versjonen. Den lager ikke et repository.',
        'git --version',
        'git version 2.x.y.windows.z',
      ),
      text(
        'Versjonstallet ditt kan være annerledes enn i eksemplet.\n\n### Hvis Git ikke er installert\n\n1. Åpne `git-scm.com/install/windows` i nettleseren. Lenken «Installer Git for Windows» finnes også på modulsiden.\n2. Last ned Git for Windows, velg utgaven for maskinen din og følg installasjonsprogrammet.\n3. Behold valget som gjør Git tilgjengelig fra kommandolinjen og andre programmer.\n\nDu trenger ikke en GitHub-konto.',
      ),
      text(
        '### Sjekk installasjonen\n\n1. Lukk PowerShell og åpne Windows PowerShell på nytt.\n2. Kjør `git --version`.\n3. Fortsett når Git viser versjon 2.28 eller nyere.\n\n**Hvis Git fortsatt ikke virker:** Få hjelp med installasjonen før du går videre. Ikke prøv tilfeldige skript fra nettet.',
      ),
      text(
        '### Lag en egen øvingsmappe\n\nVi bruker en ny mappe under Dokumenter, ikke et kodeprosjekt du allerede har. Kommandoen stopper hvis mappen finnes fra før.\n\n- `$practiceRoot` husker stien til øvingsmappen.\n- `Join-Path` setter sammen stien og mappenavnet.\n\nDu trenger ikke pugge PowerShell-koden. Det viktigste er å vite hvor Git arbeider.',
      ),
      command(
        'Opprett en ny øvingsmappe én gang',
        'Kopier hele boksen inn i PowerShell og trykk Enter. Les gjennom linjene først. Kjør den bare for denne nye øvingen.',
        "$practiceRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ProgressPal Git oving'\nif (Test-Path -LiteralPath $practiceRoot) { throw 'STOPP: Mappen finnes allerede. Ikke overskriv den.' }\nNew-Item -ItemType Directory -Path $practiceRoot -ErrorAction Stop\nSet-Location -LiteralPath $practiceRoot -ErrorAction Stop\nGet-Location",
      ),
      text(
        '**Se etter:** `Path` skal slutte på `ProgressPal Git oving`.\n\n`New-Item` laget mappen, `Set-Location` gikk inn i den, og `-LiteralPath` bruker stien slik den er skrevet.\n\n**Hvis du får STOPP fordi mappen finnes:** Ikke slett noe. Er dette øvingsmappen din, bruk «Slik finner du tilbake etter en pause». Hvis innholdet er ukjent, velg et annet mappenavn i oppsettet og bruk samme navn når du kommer tilbake.\n\nVed andre røde feilmeldinger: les meldingen før du fortsetter.',
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
        '### Jobb med ProgressPal og PowerShell samtidig\n\n- Ha vinduene ved siden av hverandre, eller bytt med `Alt+Tab`.\n- Bruk «Kopier» ved kommandoboksene.\n- Send svar før du lukker eller laster siden på nytt. Utkast er ikke lagret.\n- Etter en pause: bruk «Fortsett der du slapp».',
      ),
      {
        id: 'GIT-M01-E02',
        type: 'checklist',
        prompt:
          'Kryss av det du har gjort. Du kan lagre svarene og fortsette senere.',
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
    goal: 'Opprette et repo med øvingsfiler og lage den første commiten.',
    skillId: 'GIT-SNAPSHOT',
    flow: [
      text(
        '### Fortsetter du etter en pause?\n\nÅpne PowerShell. Bruk «Slik finner du tilbake etter en pause» i leksjon 2, «Gjør klar Windows og øvingsmappen», for å gå til `ProgressPal Git oving`.\n\n- Kjør `Get-Location` for å se hvor du står.\n- Hvis repoet finnes: kjør `git status` og `git log --oneline`.\n\nIkke gjenta `git init` eller første commit hvis du allerede har gjort det. Behold mappen.',
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
        '**Se etter:** Du står på `main` uten commits. Stien kan variere.\n\n- `Initialized empty Git repository`: Git opprettet repoet.\n- `Reinitialized`: Repoet fantes fra før. Undersøk historikken før du fortsetter.\n- `not a git repository`: Du står sannsynligvis i feil mappe. Sjekk `Get-Location` og bruk «Slik finner du tilbake etter en pause» i leksjon 2.',
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
        '### Fra en redigert fil til en commit\n\nDu kan rette en feil i én fil og prøve noe uferdig i en annen. Du trenger ikke ta med begge i samme commit.\n\n- **Working tree:** Filene du redigerer på disken.\n- **Staging area (index):** Innholdet du har valgt til neste commit.\n- **Commit-historikken:** Versjonene du allerede har registrert.\n\n`git add` velger filinnhold til staging. `git commit` registrerer det valgte innholdet i historikken.\n\nÅ lagre en fil er altså ikke det samme som å kjøre `git add` eller `git commit`.',
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
            'Riktig. `git add` velger innholdet. `git commit` lagrer det som en versjon i historikken.',
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
        '### Endre de to filene i Notisblokk\n\n1. I `README.txt`: behold `Turplan` og `Dagstur langs elva.`. Legg til `Starttid: 10:00` på en egen linje.\n2. I `plan.txt`: bytt linjen til `Husk vann og mat.`\n3. Lagre begge med `Ctrl+S` og gå tilbake til PowerShell.\n\nViser Git ingen endring? Sjekk at du har lagret og åpnet riktig fil.',
      ),
      command(
        'Undersøk endringene før staging',
        'Status viser hvilke filer som er endret. Diff viser hva som faktisk er annerledes. Utdraget under viser status; diff gir i tillegg linjer med minus og pluss.',
        'git status --short\ngit --no-pager diff -- README.txt plan.txt',
        ' M README.txt\n M plan.txt',
      ),
      text(
        '### Slik leser du `git status --short`\n\nDe to første plassene før filnavnet betyr forskjellige ting:\n\n- **Første plass:** Endring i staging area sammenlignet med siste commit.\n- **Andre plass:** Endring i working tree sammenlignet med staging area.\n- `M` betyr modified (endret). En blank første plass og `M` på andre betyr at endringen ikke er staged.\n- `??` betyr at Git ennå ikke følger filen.\n\nDette er utskrift fra Git, ikke kommandoer.',
      ),
      command(
        'Klargjør bare starttidspunktet',
        'Nå velger vi README.txt slik den er lagret akkurat nå. Huskelisten skal vente.',
        'git add -- README.txt\ngit status --short\ngit --no-pager diff --cached -- README.txt',
        'M  README.txt\n M plan.txt',
      ),
      text(
        '**Se etter:** `git diff --cached` viser `Starttid: 10:00` i `README.txt`, men ikke endringen i `plan.txt`.\n\nStaging area husker innholdet du valgte, ikke bare filnavnet.',
      ),
      command(
        'Endre en fil som allerede er staged',
        'Åpne `README.txt` igjen. Legg til `Ta med kart.` nederst. Lagre med Ctrl+S og gå tilbake til PowerShell. Ikke kjør git add igjen ennå.',
        'notepad.exe .\\README.txt',
      ),
      command(
        'Sammenlign de to endringene',
        'Se først status, så den nye endringen som ikke er staged, og til slutt det som fortsatt er klart for commit.',
        'git status --short\ngit --no-pager diff -- README.txt\ngit --no-pager diff --cached -- README.txt',
        'MM README.txt\n M plan.txt',
      ),
      text(
        '### Hva betyr `MM`?\n\nI denne øvingen er den første endringen staged, mens den andre bare ligger i arbeidsfilen. Derfor viser Git to M-er.\n\n```\nMM README.txt\n```\n\n- **Første M – staged:** `Starttid: 10:00` er klar for neste commit. Se med `git diff --cached`.\n- **Andre M – unstaged:** Kartlinjen ligger bare i arbeidsfilen. Se med `git diff`.\n\n`git add` tar med innholdet slik det er akkurat når du kjører kommandoen. Senere endringer kommer ikke med før du kjører `git add` på nytt.\n\n**I denne øvingen:** Kartlinjen og huskelisten skal vente.',
      ),
      question(
        'GIT-M01-E04',
        'Du har gjort to endringer i `README.txt`:\n\n- Du la til `Starttid: 10:00` og kjørte `git add`.\n- Du la til «Ta med kart.» og lagret, uten å kjøre `git add` igjen.\n\nGit viser `MM README.txt`.\n\n**Hva blir med i neste commit hvis du kjører `git commit` uten ekstra valg?**',
        [
          [
            'a',
            'Starttid: 10:00, uten den nye kartlinjen.',
            true,
            'Riktig. Git bruker innholdet du la i staging area med `git add`. Kartlinjen blir værende i filen etter commit.',
          ],
          [
            'b',
            'Starttid: 10:00 og kartlinjen, fordi filen allerede lå i staging area.',
            false,
            'Git legger ikke nye endringer i staging area av seg selv. Kartlinjen blir først med hvis du kjører `git add` på nytt.',
          ],
          [
            'c',
            'Ingen av endringene, fordi MM stopper Git fra å lage en commit.',
            false,
            'MM viser at filen har både staged og unstaged endringer. Git kan lage en commit med det staged innholdet.',
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
        'Du har klargjort `plan.txt` ved en feil. `git restore --staged -- plan.txt` tar endringen ut av staging area. Teksten du har lagret i filen, blir værende.\n\n**Viktig:** Behold `--staged`. Uten dette valget kan `git restore` overskrive endringer i arbeidsfilen.',
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
        '### Sjekk resultatet\n\n**Historikk (nyeste først):**\n- Beskriv starttid for turen\n- Start turplanen\n\n**Git-status:**\n```\n M README.txt\n M plan.txt\n```\n\nBegge filene har fortsatt unstaged endringer. Det er akkurat det vi vil her.',
      ),
      command(
        'Sammenlign registrert og nåværende innhold',
        'show leser siste commit; Get-Content leser filen du nå har på disken. Se forskjellen selv.',
        "git --no-pager show HEAD:README.txt\nGet-Content -LiteralPath 'README.txt'",
      ),
      text(
        'Begge viser `Turplan`, `Dagstur langs elva.` og `Starttid: 10:00`. Bare `Get-Content` skal i tillegg vise `Ta med kart.`. Hvis du brukte den tidligere teksten «Start klokken 10.», behold den. Du trenger ikke endre historikken. Hvis show også viser kartlinjen, har du klargjort README på nytt før commit. Det er ingen grunn til å slette eller skrive om historikken. Bruk dette til å forklare forskjellen, behold mappen og tilpass neste oppgave til det som faktisk gjenstår. Du kan også starte en ny øving i en helt ny mappe for å gjenskape eksemplet.',
      ),
    ],
  },
  {
    missionId: 'GIT-M01-O05',
    title: 'Prøv selv: et endret mål',
    goal: 'Velge riktig innhold til neste commit og sjekke hva som ble med.',
    skillId: 'GIT-TRANSFER',
    flow: [
      text(
        'I et utviklingsprosjekt kan en annen feil plutselig bli viktigere. Nå skal du selv velge hva neste commit skal inneholde.\n\n### Før du starter\n\nDu skal være i samme repo som i leksjon 4, «Velg innholdet i neste commit»:\n\n- Branch: `main`.\n- To commits i historikken.\n- `README.txt`: kartlinjen er endret, men ikke committet.\n- `plan.txt`: huskelisten er endret, men ikke committet.\n\nHvis dette ikke stemmer, undersøk med `git status` og `git log --oneline` før du går videre.',
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
        'Målet er å lage en commit med bare endringene i `plan.txt`.\n\nGit viser:\n```\nM  README.txt\n M plan.txt\n```\n\n**Hva må du gjøre før commit?**',
        [
          [
            'a',
            'Ta README.txt ut av staging area, legg til plan.txt og sjekk hva som er staged.',
            true,
            'Riktig. Du må både fjerne den gamle endringen og legge til den nye:\n\n- `git restore --staged -- README.txt`\n- `git add -- plan.txt`\n- `git diff --cached` for å sjekke innholdet.',
          ],
          [
            'b',
            'Legg til plan.txt og lag commit. Den nye filen erstatter automatisk README.txt i staging area.',
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
        'Se både på filen som allerede er staged, og filen som ikke er staged. Hvordan tok du plan.txt ut av staging i leksjon 4, «Rett bare utvalget»?',
      ),
      text(
        'Nå skal du selv velge hvilke endringer som blir med i neste commit.\n\nI leksjon 4, «Velg innholdet i neste commit», lærte du å fjerne en fil fra staging area uten å slette endringene i filen. Se kommandoboksen [«Rett bare utvalget»](lesson:git-m01-o04#rett-bare-utvalget) dersom du trenger hjelp.\n\nDenne gangen skal du:\n\n1. Fjerne README.txt fra staging area.\n2. Legge til plan.txt i staging area.\n3. Kontrollere hvilke filer som er klargjort.\n4. Kontrollere innholdet i endringene.\n\nBare endringene i plan.txt skal være klargjort for neste commit.\n\nHvorfor holder det ikke å bare legge til plan.txt?',
      ),
      {
        id: 'GIT-M01-E06',
        type: 'evidence',
        optional: true,
        prompt:
          'Vil du sjekke filvalget før commit? Kjør `git diff --cached --name-only` i øvingsmappen. Lim inn bare filnavnene Git viser, uten teksten foran kommandoen (for eksempel `PS ...>`) eller innholdet fra diff.',
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
            'Bruk bare filnavn fra øvingen. Ikke ta med passord, tokens eller private opplysninger.',
        },
      },
      text(
        '### Lag commiten og sjekk resultatet\n\nNår `git diff --cached` bare viser endringen i `plan.txt`, lager du en commit med meldingen `Oppdater huskelisten`.\n\nSjekk deretter:\n\n- `git --no-pager log --oneline -3`\n- `git --no-pager show HEAD:plan.txt`\n- `git --no-pager show HEAD:README.txt`\n- `git status --short`',
      ),
      text(
        '### Dette skal du se\n\n- Historikken har tre commits.\n- `HEAD:plan.txt` viser `Husk vann og mat. Sjekk vaeret.`\n- `HEAD:README.txt` har ikke kartlinjen.\n- `README.txt` på disken har kartlinjen. Status viser bare denne filen som unstaged.\n\nStemmer ikke resultatet? Bruk `git show`, `git diff` og `git status` til å finne forskjellen. Ikke bruk `reset --hard`, `clean` eller slett `.git`.',
      ),
      {
        id: 'GIT-M01-E07',
        type: 'reflect',
        prompt:
          'Hva fikk du til? Fortell kort hva som kom med i commiten, hva som lå igjen, og om du trengte hjelp. Det går fint om du ikke ble ferdig. Ikke ta med private filstier eller personopplysninger.',
        choices: null,
        hints: [],
      },
      text(
        'Marker leksjonen som fullført når du har gått gjennom den. Svarene og framdriften din lagres i ProgressPal. Ta vare på Git-øvingsmappen separat.',
      ),
      {
        t: 'recap',
        can: [
          'Forklare hvorfor Git-historikk og vanlig fillagring har ulike oppgaver, og hvorfor GitHub ikke trengs for en lokal commit.',
          'Finne en trygg mappe i PowerShell, lese status og se forskjell på working tree, staging area og commit-historikk.',
          'Velge innhold med add, kontrollere det med diff --cached og registrere det med commit.',
          'Ta en fil ut av staging uten å slette arbeidsfilen og forstå hvorfor samme fil kan ha både staged og unstaged innhold.',
        ],
        next: 'I M02 bruker du Git-historikken til å se hva som ble endret, sammenligne versjoner og rette en feil uten å miste annet arbeid. Du finner M02 i Pathways. Vil du øve mer på *staging* og *commits* først, kan du bruke en ny øvingsmappe.',
      },
    ],
  },
];
