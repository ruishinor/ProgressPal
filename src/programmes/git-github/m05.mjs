// M05 — Samarbeid med pull requests. Canonical build-time lesson source.
// The local bare remote is real Git, not a GitHub pull request.
const text = (nb) => ({ t: 'text', nb });
const note = (nb) => ({ t: 'callout', kind: 'merk', nb });
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
const reflect = (id, prompt) => ({
  id,
  type: 'reflect',
  prompt,
  choices: null,
  hints: [],
});
const command = (heading, explanation, script, sampleOutput = '') => [
  text('### ' + heading + '\n\n' + explanation),
  {
    t: 'code',
    file: 'Kommando – PowerShell 5.1',
    code: '& {\n' + script + '\n}',
    stdin: '',
    stdout: sampleOutput,
    error: '',
    error_info: null,
    nb: '',
  },
];

// One separate M05 fixture. Each later operation verifies its own context;
// no existing owner repository, folder or branch is repaired automatically.
const setup = String.raw`$ErrorActionPreference = 'Stop'
$null = Get-Command git.exe -ErrorAction Stop
$documents = [Environment]::GetFolderPath('MyDocuments')
if (-not $documents -or -not (Test-Path -LiteralPath $documents -PathType Container)) { throw 'STOPP: Dokumenter-mappen mangler.' }
$root = Join-Path $documents 'ProgressPal-Git-M05'
if (Test-Path -LiteralPath $root) { throw 'STOPP: M05-mappen finnes allerede. Ikke overskriv den.' }
New-Item -ItemType Directory -Path $root -ErrorAction Stop | Out-Null
$remote = Join-Path $root 'felles.git'
$dev = Join-Path $root 'utvikler'
$review = Join-Path $root 'gjennomgang'
& git.exe init --bare --initial-branch=main "$remote"
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke opprette lokal bare remote.' }
& git.exe init --initial-branch=main "$dev"
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke opprette utviklerkopien.' }
& git.exe -C "$dev" config --local user.name 'M05 Utvikler'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Lokal Git-identitet feilet.' }
& git.exe -C "$dev" config --local user.email 'utvikler@example.invalid'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Lokal Git-identitet feilet.' }
'*.js text eol=lf' | Set-Content -LiteralPath (Join-Path $dev '.gitattributes') -Encoding Ascii
@'
function bekreft(navn) {
  return 'Registrert: ' + navn;
}
module.exports = { bekreft };
'@ | Set-Content -LiteralPath (Join-Path $dev 'paamelding.js') -Encoding Ascii
'Krav: Tomt navn og navn med bare mellomrom skal gi Skriv inn navn. Vanlige navn skal fortsatt registreres.' | Set-Content -LiteralPath (Join-Path $dev 'oppgave.txt') -Encoding Ascii
& git.exe -C "$dev" add -- .gitattributes paamelding.js oppgave.txt
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke stage grunnversjonen.' }
& git.exe -C "$dev" commit -m 'Opprett enkel paamelding'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke committe grunnversjonen.' }
& git.exe -C "$dev" remote add origin "$remote"
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke registrere lokal remote.' }
& git.exe -C "$dev" push -u origin main
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke sende main til lokal remote.' }
if (Test-Path -LiteralPath $review) { throw 'STOPP: Gjennomgangskopien finnes allerede.' }
& git.exe clone --branch main "$remote" "$review"
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Clone feilet.' }
& git.exe -C "$review" config --local user.name 'M05 Gjennomgang'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke sette lokal Git-identitet.' }
& git.exe -C "$review" config --local user.email 'gjennomgang@example.invalid'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke sette lokal Git-identitet.' }
& git.exe -C "$dev" status --short
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke kontrollere status.' }`;

const guard = (which, branch) =>
  String.raw`$ErrorActionPreference = 'Stop'
$null = Get-Command git.exe -ErrorAction Stop
$documents = [Environment]::GetFolderPath('MyDocuments')
if (-not $documents -or -not (Test-Path -LiteralPath $documents -PathType Container)) { throw 'STOPP: Dokumenter-mappen mangler.' }
$root = Join-Path $documents 'ProgressPal-Git-M05'
$remote = Join-Path $root 'felles.git'
$dev = Join-Path $root 'utvikler'
$review = Join-Path $root 'gjennomgang'
$copy = ` +
  (which === 'dev' ? '$dev' : '$review') +
  String.raw`
if (-not (Test-Path -LiteralPath (Join-Path $copy '.git') -PathType Container)) { throw 'STOPP: Dette er ikke M05-arbeidskopien.' }
$isBare = & git.exe --git-dir="$remote" rev-parse --is-bare-repository
if ($LASTEXITCODE -ne 0 -or $isBare -ne 'true') { throw 'STOPP: Lokal remote mangler eller er feil.' }
$top = & git.exe -C "$copy" rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0 -or $top.Replace('/', '\') -ne $copy) { throw 'STOPP: Feil arbeidskopi.' }
$url = & git.exe -C "$copy" remote get-url origin
if ($LASTEXITCODE -ne 0 -or $url.Replace('/', '\') -ne $remote) { throw 'STOPP: Origin peker utenfor M05-ovingen.' }
$current = & git.exe -C "$copy" branch --show-current
if ($LASTEXITCODE -ne 0 -or $current -ne '` +
  branch +
  String.raw`') { throw 'STOPP: Uventet branch.' }
$dirty = @(& git.exe -C "$copy" status --porcelain)
if ($LASTEXITCODE -ne 0 -or $dirty.Count -ne 0) { throw 'STOPP: Undersoek lokale endringer foer videre arbeid.' }`;

const firstProposal =
  guard('dev', 'main') +
  String.raw`
& git.exe -C "$dev" show-ref --verify --quiet refs/heads/feature/valider-navn
if ($LASTEXITCODE -eq 0) { throw 'STOPP: Branchen finnes allerede.' }
if ($LASTEXITCODE -ne 1) { throw 'STOPP: Kunne ikke kontrollere branch.' }
$localMain = & git.exe -C "$dev" rev-parse main
$remoteMain = & git.exe -C "$dev" rev-parse origin/main
if ($LASTEXITCODE -ne 0 -or $localMain -ne $remoteMain) { throw 'STOPP: Main samsvarer ikke med ovingsremote.' }
$initial = Get-Content -LiteralPath (Join-Path $dev 'paamelding.js') -Raw
if ($initial -notmatch [regex]::Escape("return 'Registrert: ' + navn;") -or $initial -match 'if \(') { throw 'STOPP: Uventet innhold i grunnversjonen.' }
& git.exe -C "$dev" switch -c feature/valider-navn
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke lage feature branch.' }
@'
function bekreft(navn) {
  if (navn === '') {
    return 'Skriv inn navn.';
  }
  return 'Registrert: ' + navn;
}
module.exports = { bekreft };
'@ | Set-Content -LiteralPath (Join-Path $dev 'paamelding.js') -Encoding Ascii
& git.exe -C "$dev" --no-pager diff -- paamelding.js
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Diff feilet.' }
& git.exe -C "$dev" add -- paamelding.js
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Staging feilet.' }
& git.exe -C "$dev" diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Undersoek formatering.' }
& git.exe -C "$dev" commit -m 'Vis feil ved tomt navn'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Commit feilet.' }
& git.exe -C "$dev" push -u origin feature/valider-navn
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Push feilet.' }
& git.exe -C "$dev" branch -vv
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Branch-visning feilet.' }`;

const inspectProposal =
  guard('review', 'main') +
  String.raw`
& git.exe -C "$review" fetch origin
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Fetch feilet.' }
& git.exe -C "$review" --no-pager log --oneline origin/main..origin/feature/valider-navn
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Commit-visning feilet.' }
$changed = @(& git.exe -C "$review" diff --name-only origin/main...origin/feature/valider-navn)
if ($LASTEXITCODE -ne 0 -or $changed.Count -ne 1 -or $changed[0] -ne 'paamelding.js') { throw 'STOPP: Forslaget inneholder andre filer enn ventet.' }
& git.exe -C "$review" --no-pager diff origin/main...origin/feature/valider-navn
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Diff feilet.' }
Get-Content -LiteralPath (Join-Path $review 'oppgave.txt')`;

const revise =
  guard('dev', 'feature/valider-navn') +
  String.raw`
$localFeature = & git.exe -C "$dev" rev-parse HEAD
$remoteFeature = & git.exe -C "$dev" rev-parse origin/feature/valider-navn
if ($LASTEXITCODE -ne 0 -or $localFeature -ne $remoteFeature) { throw 'STOPP: Feature-historikken er ikke som forventet.' }
$count = & git.exe -C "$dev" rev-list --count origin/main..HEAD
if ($LASTEXITCODE -ne 0 -or $count -ne '1') { throw 'STOPP: Ventet akkurat en feature-commit foer rettelsen.' }
$path = Join-Path $dev 'paamelding.js'
$before = (Get-Content -LiteralPath $path -Raw).TrimEnd([char[]]@(13, 10))
$expected = @'
function bekreft(navn) {
  if (navn === '') {
    return 'Skriv inn navn.';
  }
  return 'Registrert: ' + navn;
}
module.exports = { bekreft };
'@
if ($before -cne $expected) { throw 'STOPP: Foerste losning har uventet innhold. Undersoek foer du endrer.' }
@'
function bekreft(navn) {
  if (typeof navn !== 'string' || navn.trim() === '') {
    return 'Skriv inn navn.';
  }
  return 'Registrert: ' + navn.trim();
}
module.exports = { bekreft };
'@ | Set-Content -LiteralPath $path -Encoding Ascii
& git.exe -C "$dev" --no-pager diff -- paamelding.js
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Diff feilet.' }
& git.exe -C "$dev" add -- paamelding.js
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Staging feilet.' }
& git.exe -C "$dev" diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Formateringsavvik.' }
& git.exe -C "$dev" commit -m 'Avvis ogsaa navn med bare mellomrom'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Commit feilet.' }
& git.exe -C "$dev" push origin feature/valider-navn
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Push av rettelsen feilet.' }
& git.exe -C "$dev" --no-pager log --oneline origin/main..feature/valider-navn
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Log feilet.' }`;

const integrate =
  guard('review', 'main') +
  String.raw`
& git.exe -C "$review" fetch origin
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Fetch feilet.' }
$localMain = & git.exe -C "$review" rev-parse main
$remoteMain = & git.exe -C "$review" rev-parse origin/main
if ($LASTEXITCODE -ne 0 -or $localMain -ne $remoteMain) { throw 'STOPP: Gjennomgangskopien er ikke oppdatert. Ikke merge.' }
$count = & git.exe -C "$review" rev-list --count origin/main..origin/feature/valider-navn
if ($LASTEXITCODE -ne 0 -or $count -ne '2') { throw 'STOPP: Ventet to commits i feature-branchen.' }
$proposed = & git.exe -C "$review" show 'origin/feature/valider-navn:paamelding.js'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kan ikke lese rettelsen.' }
$joined = $proposed -join [Environment]::NewLine
if (-not $joined.Contains("typeof navn !== 'string'") -or -not $joined.Contains("navn.trim() === ''")) { throw 'STOPP: Korrigert validering mangler.' }
$changed = @(& git.exe -C "$review" diff --name-only origin/main...origin/feature/valider-navn)
if ($LASTEXITCODE -ne 0 -or $changed.Count -ne 1 -or $changed[0] -ne 'paamelding.js') { throw 'STOPP: Forslaget berorer uventede filer. Ikke merge.' }
& git.exe -C "$review" --no-pager diff origin/main...origin/feature/valider-navn
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Diff feilet.' }
& git.exe -C "$review" merge --no-ff -m 'Integrer gjennomgaatt navnevalidering' origin/feature/valider-navn
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Merge feilet. Ikke push.' }
$dirty = @(& git.exe -C "$review" status --porcelain)
if ($LASTEXITCODE -ne 0 -or $dirty.Count -ne 0) { throw 'STOPP: Uventet tilstand etter merge. Ikke push.' }
& git.exe -C "$review" push origin main
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Push av main feilet.' }
& git.exe -C "$review" --no-pager log --graph --oneline -4
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Log feilet.' }`;

const verifyIntegration =
  guard('dev', 'feature/valider-navn') +
  String.raw`
& git.exe -C "$dev" fetch origin
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Fetch feilet.' }
& git.exe -C "$dev" merge-base --is-ancestor feature/valider-navn origin/main
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Feature-commits er ikke del av remote main.' }
& git.exe -C "$dev" --no-pager log --graph --oneline --all -5
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Log feilet.' }
& git.exe -C "$dev" branch -vv
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Branch-visning feilet.' }
& git.exe -C "$dev" status --short
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Status feilet.' }`;

export const gitM05Lessons = [
  {
    missionId: 'GIT-M05-O01',
    title: 'Fra behov til et samarbeid om endring',
    goal: 'Forstå hvorfor et issue, en branch, en commit, en push, en PR og en merge er ulike deler av arbeidet.',
    skillId: 'GIT-M05-WORKFLOW',
    flow: [
      text(
        'Du øver på ekte Git-kommandoer og gjennomgang av kode. Vi bruker et tenkt pull request-eksempel, ikke en PR på GitHub.\n\n- Se etter `git diff`, `fetch`, `merge` og `status` i kommandoboksene.\n- PowerShell passer på at bare øvingsmappene brukes.\n- Har du allerede gjort et steg, sjekk branch, logg og arbeidsfiler. Ikke kjør hele oppsettet på nytt.',
      ),
      text(
        '### Dette er nytt etter M04\n\nI M01–M04 lærte du å registrere, undersøke, samle og dele Git-historikk. Nå kan du sende commits til en remote. Men **deling er ikke det samme som å beslutte at endringen hører hjemme i hovedversjonen**. To utviklere arbeider på en enkel påmeldingsside. Den ene vil rette en feil i navnefeltet. Den andre må undersøke om rettelsen løser problemet uten å skape nye. Her lærer du samarbeidsprosessen rundt selve endringen, ikke bare nye Git-kommandoer.',
      ),
      text(
        'Å ha redigert en fil betyr at innholdet er endret. En **commit** registrerer et valgt snapshot i Git-historikken. **Push** overfører commits til en branch i et annet repository. En **pull request** (PR) er et forslag om å integrere én branch i en annen, med plass for forklaring, diff, diskusjon, review og kontroller. **Merge** er selve integreringen. Etter merge kan prosjektet fortsatt trenge kontroll av at funksjonen virker sammen med resten av løsningen. Dette er forskjellige hendelser med forskjellige formål.',
      ),
      text(
        '### Hva er et issue?\n\nEn bruker melder: «Jeg får bekreftelse hvis jeg skriver bare mellomrom i navnefeltet.» Utvikleren trenger et avgrenset problem å løse. Et enkelt **issue**, eller en oppgave i et annet system, kan beskrives slik:\n\n- **Behov:** Påmeldingen godtar ugyldig navn.\n- **Endring:** Avvis tomt navn og navn med bare mellomrom.\n- **Aksept:** Begge tilfeller får «Skriv inn navn.», mens et vanlig navn fortsatt blir registrert.\n- **Utenfor omfang:** Design, innlogging og lagring skal ikke endres.\n\nDette er noe en annen utvikler kan undersøke. «Fiks skjemaet» er ikke en like kontrollerbar oppgave.',
      ),
      text(
        'GitHub Issues er en funksjon for å beskrive og følge opp oppgaver, feil og ideer. **Issues er ikke en del av Git**. En PR knytter seg til et faktisk endringsforslag; et issue kan eksistere uten kode. Man kan bruke andre oppgavesystemer, for eksempel Trello eller en tekstfil. Vi trenger ikke et eget prosjektledelseskurs for å arbeide ryddig.',
      ),
      question(
        'GIT-M05-E01',
        'Utvikleren har pushet en mulig rettelse til sin feature branch. Hva vet teamet sikkert?',
        [
          [
            'a',
            'At endringen er integrert i main.',
            false,
            'Push oppdaterer branchen den sendes til. Main blir ikke automatisk endret.',
          ],
          [
            'b',
            'At branchen er overført, men review og merge er fortsatt separate handlinger.',
            true,
            'Riktig. Overføring av commits sier ingenting om teamets vurdering av endringen.',
          ],
          [
            'c',
            'At den andre utvikleren har godkjent koden.',
            false,
            'En push oppretter ingen automatisk menneskelig godkjenning. Review er en egen handling.',
          ],
        ],
        'Hva gjør Git med historikk, og hva må utviklerne fremdeles beslutte?',
      ),
      question(
        'GIT-M05-E02',
        'Hvilken oppgavebeskrivelse er best egnet for denne rettelsen?',
        [
          [
            'a',
            '«Endre valideringen slik at tomt navn og bare mellomrom avvises. Vanlige navn må virke som før.»',
            true,
            'Riktig. Du kan kontrollere både det som skal fikses og det som skal bevares.',
          ],
          [
            'b',
            '«Gjør påmeldingsløsningen mer moderne.»',
            false,
            'Dette sier verken hvilket problem som skal løses eller hva som skal testes.',
          ],
          [
            'c',
            '«Bygg ny database, innlogging og skjema for å rette ett navnefelt.»',
            false,
            'Det utvider omfanget uten begrunnelse og øker risikoen for utilsiktede endringer.',
          ],
        ],
        'Hva trenger en reviewer for å vurdere om resultatet dekker behovet?',
      ),
      question(
        'GIT-M05-E03',
        'Hva skiller et GitHub issue fra en pull request?',
        [
          [
            'a',
            'Issue og PR er to navn på samme Git-commit.',
            false,
            'En commit er et Git-objekt; både issues og PR-er er samarbeidsfunksjoner på GitHub.',
          ],
          [
            'b',
            'Et issue finnes bare når en PR allerede er merget.',
            false,
            'Et issue kan beskrive en oppgave eller feil før noen har skrevet en eneste linje kode.',
          ],
          [
            'c',
            'Et issue beskriver et problem eller arbeid; en PR presenterer et konkret forslag til integrering.',
            true,
            'Riktig. Oppgaven og forslaget kan knyttes sammen, men er ikke samme objekt.',
          ],
        ],
        'Tenk på hvilket objekt som kan finnes før arbeidet med en løsning har begynt.',
      ),
    ],
  },
  {
    missionId: 'GIT-M05-O02',
    title: 'Et eget prosjekt med to arbeidskopier',
    goal: 'Opprette en avgrenset lokal Git-remote og forstå rollene til utvikler og reviewer.',
    skillId: 'GIT-M05-LOCAL-SETUP',
    flow: [
      text(
        'Du øver på ekte Git-kommandoer og gjennomgang av kode. Vi bruker et tenkt pull request-eksempel, ikke en PR på GitHub.\n\n- Se etter `git diff`, `fetch`, `merge` og `status` i kommandoboksene.\n- PowerShell passer på at bare øvingsmappene brukes.\n- Har du allerede gjort et steg, sjekk branch, logg og arbeidsfiler. Ikke kjør hele oppsettet på nytt.',
      ),
      text(
        '### Her skal du faktisk bruke Git\n\nVi fortsetter med en ufarlig påmeldingsløsning, men lager **en helt ny M05-mappe**. I `utvikler` lager du endringen. I `gjennomgang` skal du lese forslaget som en annen deltaker ville gjort. `felles.git` er en lokal *bare remote* uten vanlig arbeidskopi, akkurat som i prinsippet fra M04. Du trenger verken internett, GitHub-konto eller en annen person for obligatorisk M05.',
      ),
      note(
        'Dette er **ikke** en ekte GitHub-PR. Den lokale remoten tilbyr ikke PR-er, formelle approvals, review threads, status checks eller GitHubs regler for merge. Du bruker ekte Git for å vise det tekniske grunnlaget, og senere undersøker vi hvordan GitHub bygger samarbeidsfunksjonene rundt det.',
      ),
      text(
        'Bruk Windows PowerShell 5.1, Git for Windows 2.28 eller nyere og en vanlig brukerkonto. Kjør hele kommando-blokker i rekkefølge, ikke enkeltlinjer fra en blokk som har stoppet. Blokkene bruker `git.exe` for å unngå kollisjon med en eventuell PowerShell-funksjon kalt `git`. Alle oppgaver er syntetiske, med egne lokale Git-identiteter. Skriv aldri passord, tokens eller private filstier i svarene du lagrer i ProgressPal.',
      ),
      command(
        'Opprett M05-mappen, remote og to arbeidskopier',
        'Denne blokken **stopper dersom mappen finnes**. Den oppretter en enkel `paamelding.js`, et kravdokument og grunnversjonen på `main`, pusher til lokal remote og kloner deretter gjennomgangskopien. Det skal ikke stå filnavn etter `status --short` til slutt.',
        setup,
        "Initialized empty Git repository ...\n[main ...] Opprett enkel paamelding\n... main -> main\nCloning into '...gjennomgang'...\nSiste status er tom.",
      ),
      text(
        'Les `utvikler/oppgave.txt` og `utvikler/paamelding.js` som vanlig tekst i Notisblokk. Den første funksjonen bekrefter alle verdier. Den mangler foreløpig validering. Gjennomgangen senere skal kontrollere at rettelsen dekker begge ugyldige tilfeller, **ikke bare at filen har forandret seg**. `git status --short` sier noe om arbeidskopien, ikke om programmets funksjonalitet.',
      ),
      question(
        'GIT-M05-E04',
        'Hva er en korrekt beskrivelse av `felles.git` i M05?',
        [
          [
            'a',
            'En ny GitHub-organisasjon som automatisk tilordner reviewere.',
            false,
            'Dette er en lokal bare remote. Den har ingen GitHub-brukere eller reviewfunksjoner.',
          ],
          [
            'b',
            'Et Git-repository som to arbeidskopier kan sende og hente commits fra.',
            true,
            'Riktig. Git kan dele historikk også uten GitHub eller internett.',
          ],
          [
            'c',
            'En database som verifiserer at valideringen fungerer.',
            false,
            'Git lagrer versjoner og referanser. Det evaluerer ikke kravene til påmeldingen.',
          ],
        ],
        'Hva finnes i Git, og hva er tjenester GitHub legger rundt?',
      ),
      reflect(
        'GIT-M05-E05',
        'Forklar med egne ord hva mappene `utvikler`, `gjennomgang` og `felles.git` brukes til. Noter også om opprettelsen stoppet og hva du da undersøkte.',
      ),
    ],
  },
  {
    missionId: 'GIT-M05-O03',
    title: 'Fra feature branch til et forslag',
    goal: 'Lage en bevisst ufullstendig endring, pushe en branch og forstå PR-base og PR-head.',
    skillId: 'GIT-M05-PROPOSAL',
    flow: [
      text(
        'Hvis du fortsetter M05 senere, finn den eksisterende `ProgressPal-Git-M05`-mappen med `utvikler`, `gjennomgang` og den lokale remoten `felles.git`. Kontroller branch, status og logg i riktig arbeidskopi før du gjør neste endring eller push. Oppsettet skal ikke kjøres på nytt i samme mappe. Dette simulerer en review-arbeidsflyt med lokal Git, ikke en faktisk pull request på GitHub.',
      ),
      text(
        "### En branch beskytter hovedarbeidet\n\nI M03 brukte du en branch for å holde pågående arbeid adskilt fra `main`. Nå gjør du det fordi en annen utvikler skal vurdere forslaget. Du lager `feature/valider-navn` og en første commit som avviser `navn === ''`. Den er **bevisst ufullstendig**: navn med bare mellomrom blir fortsatt godkjent. Dette er øvingsmateriale for review, ikke en anbefalt løsning.",
      ),
      command(
        'Lag første endring og push feature-branchen',
        'Start etter at grunnprosjektet er opprettet. Blokken sjekker ren `main`, avviser eksisterende feature branch, skriver en endring og committer den. Den pusher bare til den lokale remoten, ikke til GitHub.',
        firstProposal,
        "Switched to a new branch 'feature/valider-navn'\n[feature/valider-navn ...] Vis feil ved tomt navn\n* [new branch] feature/valider-navn -> feature/valider-navn",
      ),
      command(
        'Se endringen fra den andre kopien',
        'Gjennomgangskopien henter referansene med `fetch` uten å endre sin lokale `main`. `log` viser commitene i forslaget; `diff` viser innholdet som skiller feature fra felles utgangspunkt.',
        inspectProposal,
        "Vis feil ved tomt navn\n+  if (navn === '') {\n+    return 'Skriv inn navn.';\n+  }",
      ),
      text(
        '### En PR-visning på GitHub (undervisningseksempel, ikke faktisk Git-output)\n\n- **Tittel:** Avvis ugyldig navn i påmelding.\n- **Base branch:** `main` (branchen endringen skal inn i).\n- **Head branch:** `feature/valider-navn` (branchen med endringen).\n- **Endrede filer:** `paamelding.js`.\n- **Commits:** «Vis feil ved tomt navn».\n- **Beskrivelse:** «Skal avvise tomt navn og bare mellomrom. Har lagt til en kontroll for tom streng. Har undersøkt den lokale diffen, men ikke testet tilfellet med bare mellomrom.»\n\nDette er en nyttig, ærlig beskrivelse fordi den skiller behov, faktisk endring, utførte kontroller og gjenstående usikkerhet. Den er **ikke en PR du opprettet**. Et forslag kan også starte som *draft* mens utvikleren fremdeles arbeider.',
      ),
      text(
        'En **pull request** er et GitHub-objekt for å foreslå å integrere endringer fra head til base. Du kan se commits, endrede filer, kommentarer, reviews, checks og merge-muligheter. Rekkefølgen betyr noe: `feature` → `main` er ikke det samme som `main` → `feature`. En PR er heller ikke Git-kommandoen `git pull`. Den kommandoen henter og integrerer Git-historikk i den lokale arbeidskopien.',
      ),
      question(
        'GIT-M05-E06',
        'Hvilken retning har en PR med base `main` og head `feature/valider-navn`?',
        [
          [
            'a',
            'Den foreslår feature-branchens endringer inn i main.',
            true,
            'Riktig. Base er mål, og head er branchen som inneholder forslaget.',
          ],
          [
            'b',
            'Den sletter feature og kopierer hele main over til utvikleren.',
            false,
            'Å åpne PR endrer ikke automatisk Git-historikken eller sletter noen branch.',
          ],
          [
            'c',
            'Den foreslår alle commits på main inn i feature.',
            false,
            'Det ville være motsatt sammenligningsretning. Kontroller base og head før opprettelse.',
          ],
        ],
        'Hvilken branch skal få endringen når den blir integrert?',
      ),
      question(
        'GIT-M05-E07',
        'Hvilken kontroll kan utvikleren sannferdig oppgi etter første push?',
        [
          [
            'a',
            'At all funksjonalitet er riktig fordi Git lot branchen pushes.',
            false,
            'Push viser at overføringen gikk, ikke om funksjonen oppfyller kravene.',
          ],
          [
            'b',
            'At review er bestått fordi branchen har en upstream.',
            false,
            'Tracking oppgir en Git-remote; det er ikke en formell gjennomgang av koden.',
          ],
          [
            'c',
            'At lokal diff og commit ble undersøkt, men whitespace-tilfellet ennå ikke er kontrollert.',
            true,
            'Riktig. Skriv hva du faktisk vet og hva som er usikkert, slik at reviewer kan undersøke riktig risiko.',
          ],
        ],
        'Skiller du mellom dokumentert observasjon og en udokumentert kvalitetspåstand?',
      ),
      question(
        'GIT-M05-E08',
        'Hva skjer hvis du kjører `git pull` i en arbeidskopi?',
        [
          [
            'a',
            'GitHub oppretter en ny review og godkjenner den automatisk.',
            false,
            'Git pull er en Git-operasjon, ikke GitHubs PR- eller reviewmekanisme.',
          ],
          [
            'b',
            'Git henter historikk og forsøker å integrere den i nåværende branch.',
            true,
            'Riktig. Navnelikheten med pull request betyr ikke at det er samme handling.',
          ],
          [
            'c',
            'GitHub endrer PR-base til branchen din.',
            false,
            'Git pull endrer ikke automatisk PR-metadata på GitHub.',
          ],
        ],
        'Hva skiller Git-klientens operasjoner fra GitHubs samarbeidsobjekter?',
      ),
    ],
  },
  {
    missionId: 'GIT-M05-O04',
    title: 'Review er mer enn en kommentar',
    goal: 'Undersøke krav og diff, identifisere en funksjonell mangel og formulere presis tilbakemelding.',
    skillId: 'GIT-M05-REVIEW',
    flow: [
      text(
        "### Les behovet først\n\nSammenlign `oppgave.txt` med diffen i den første feature-commiten. Koden sjekker `navn === ''`, men en streng med tre mellomrom er ikke tom. Den går videre til `return 'Registrert: ' + navn`. Dermed får brukeren bekreftelse selv om kravet sier at navnet skal avvises. Dette er en **funksjonell mangel**, ikke en teknisk Git-konflikt. Det er nettopp slike spørsmål en reviewer bør stille: Hva skulle endringen oppnå? Hvilke inndata og konsekvenser er ikke håndtert? Hva med eksisterende funksjonalitet?",
      ),
      text(
        "### To review-kommentarer\n\n**Lite nyttig:** «Dette er feil.» Kommentaren sier ikke hva eller hvorfor.\n\n**Nyttig:** «Kravet sier at også navn med bare mellomrom skal avvises. Med `navn === ''` blir `'   '` godkjent. Kan du kontrollere dette tilfellet og justere valideringen?» Det er en konkret betingelse, konsekvens og relevant anmodning. Review skal forbedre et felles resultat, ikke handle om hvem som får rett. En preferanse for et annet variabelnavn kan diskuteres uten nødvendigvis å blokkere løsningen.",
      ),
      text(
        '### Samtale, review og tråder\n\nPå GitHub kan en utvikler skrive en vanlig kommentar til PR-en, kommentere en bestemt linje eller levere en formell review. Vanlige utfall er **Comment** (tilbakemelding uten formell godkjenning), **Approve** (godkjenning) og **Request changes** (endringer etterspørres). Review threads kan besvares og markeres som løst. En samtalekommentar er ikke det samme som en formell approval. Noen repositories krever godkjenninger, nye reviews etter endringer eller godkjenning fra andre enn forfatteren. Andre krever ingen slike ting. Reglene, rettighetene og reviewstatusen må kontrolleres i det aktuelle repositoryet.',
      ),
      text(
        'Revieweren kan undersøke de endrede filene, commits, relevante tester, avhengigheter og eventuell påvirkning på andre deler av løsningen. Et «Approve» betyr at revieweren stiller seg bak forslaget etter sin vurdering. Det **garanterer ikke** at koden er feilfri, og gir ikke nødvendigvis mergetillatelse. Man kan også ha en godkjent PR med en blokkert kontroll.',
      ),
      question(
        'GIT-M05-E09',
        'Hvilken review-kommentar er best begrunnet?',
        [
          [
            'a',
            '«Gjør hele koden annerledes.»',
            false,
            'Kommentaren angir ingen feil, konsekvens eller konkret grunn til å endre forslaget.',
          ],
          [
            'b',
            "«`navn === ''` godtar bare mellomrom; kravet sier at dette skal avvises. Kan du dekke det?»",
            true,
            'Riktig. Kommentaren kan undersøkes mot konkrete inndata og det avtalte kravet.',
          ],
          [
            'c',
            '«Den er pushet, så review er unødvendig.»',
            false,
            'Push dokumenterer overføring av commits, ikke funksjonell korrekthet eller sikkerhet.',
          ],
        ],
        'Kan en annen utvikler forstå og kontrollere påstanden?',
      ),
      question(
        'GIT-M05-E10',
        'En reviewer skriver «Jeg ville kalt variabelen inputName», men viser ikke til feil eller teamstandard. Hva bør utvikleren gjøre?',
        [
          [
            'a',
            'Ignorere alle innspill som ikke er formelle Request changes.',
            false,
            'En kommentar kan fortsatt være nyttig for lesbarhet og felles forståelse.',
          ],
          [
            'b',
            'Slette hele branchen fordi revieweren har en annen preferanse.',
            false,
            'Preferanser kan drøftes uten å forkaste en fungerende og avgrenset endring.',
          ],
          [
            'c',
            'Vurdere om forslaget gir bedre klarhet eller følger standard, og begrunne valget saklig.',
            true,
            'Riktig. Skill påviste feil fra preferanser, og behandle begge på en profesjonell måte.',
          ],
        ],
        'Hva er et krav, og hva er et faglig valg flere løsninger kan tilfredsstille?',
      ),
      question(
        'GIT-M05-E11',
        'En PR har fått en vanlig kommentar «ser fint ut». Hva kan du konkludere med?',
        [
          [
            'a',
            'At noen har kommentert, ikke at en formell approval eller merge-rettighet finnes.',
            true,
            'Riktig. En samtalekommentar må ikke forveksles med et formelt reviewutfall.',
          ],
          [
            'b',
            'At alle status checks er bestått.',
            false,
            'Kommentarer er ikke tekniske kontroller. Sjekk egne check-resultater og deres innhold.',
          ],
          [
            'c',
            'At main allerede inneholder forslaget.',
            false,
            'Ingen Git-merge følger automatisk av en positiv kommentar.',
          ],
        ],
        'Se på hvilke separate objekter GitHub faktisk viser i PR-en.',
      ),
    ],
  },
  {
    missionId: 'GIT-M05-O05',
    title: 'Svar på review med en ny commit',
    goal: 'Forbedre samme feature branch og forstå hvorfor en eksisterende PR oppdateres.',
    skillId: 'GIT-M05-REVISION',
    flow: [
      text(
        '### Ta stilling før du endrer\n\nRevieweren har rett i at mellomrom ikke dekkes. Du endrer derfor valideringen til å avvise verdier som ikke er tekst og navn der `trim()` fjerner alt innholdet. `trim()` fjerner også ledende og avsluttende mellomrom fra vanlige navn i bekreftelsen. Før du velger løsningen, må du forstå at denne funksjonen behandler navn som tekst; i andre systemer kan input og regler være annerledes. En review-kommentar peker på noe du bør undersøke. Den trenger ikke bestemme nøyaktig hvordan du skriver koden.',
      ),
      command(
        'Rett samme feature branch og push en ny commit',
        'Den første løsningen og en ren feature branch må finnes. Kontroller diffen, commit rettelsen og push til **samme branch**. En uventet tilstand gir STOPP i stedet for automatisk opprydding.',
        revise,
        '[feature/valider-navn ...] Avvis ogsaa navn med bare mellomrom\n... feature/valider-navn -> feature/valider-navn\nTo feature-commits etter main.',
      ),
      text(
        'På GitHub vil en eksisterende pull request som følger denne branchen normalt få med seg den nye commiten og vise oppdatert diff. Du trenger vanligvis **ikke en ny PR for hver rettelse**. Du kan svare på tråden: «Du hadde rett; mellomromstilfellet manglet. Jeg har oppdatert samme branch. Se den nye diffen.» Oppgi i tillegg bare kontroller du faktisk har gjennomført. Om en tidligere approval blir stående eller må fornyes, avhenger av repositoryets reviewregler.',
      ),
      text(
        'Sammenlign **første forslag** og **nåværende forslag**. Etter den andre commiten er det ikke nok å vise at `trim()` finnes i koden. Revieweren må ta stilling til hva funksjonen gjør med tom tekst, bare mellomrom, vanlige navn og uventede typer. Teamet kan også ønske en reell test som kjøres av et relevant verktøy. Den lokale øvingen viser en konkret korrigert kodeversjon, men ProgressPal tester ikke programmet automatisk.',
      ),
      question(
        'GIT-M05-E12',
        'Revieweren finner en ekte mangel. Hvordan bør utvikleren håndtere den?',
        [
          [
            'a',
            'Vurdere funnet, rette samme branch, lage en ny commit og be om ny kontroll.',
            true,
            'Riktig. Den eksisterende PR-en kan følge nye commits og bevare diskusjonen.',
          ],
          [
            'b',
            'Merke tråden løst før feilen er vurdert, fordi reviewerens ord ikke er bindende.',
            false,
            'En saklig review krever at innvendingen undersøkes og relevante problemer håndteres.',
          ],
          [
            'c',
            'Endre main direkte slik at PR-en slipper å vise rettelsen.',
            false,
            'Da omgår du den avtalte arbeidsflyten og gjør forslaget vanskeligere å gjennomgå.',
          ],
        ],
        'Hvorfor er det nyttig å beholde sammenhengen mellom funn, rettelse og forslag?',
      ),
      reflect(
        'GIT-M05-E13',
        'Skriv et kort svar til revieweren. Beskriv hva kommentaren avdekket, hva du endret, hva du faktisk har kontrollert, og hva du fortsatt er usikker på. Svaret blir bare lagret lokalt i ProgressPal.',
      ),
    ],
  },
  {
    missionId: 'GIT-M05-O06',
    title: 'Status checks, merge og sluttkontroll',
    goal: 'Vurdere om et forslag er klart, kjenne merge-strategier og kontrollere integreringen.',
    skillId: 'GIT-M05-INTEGRATION',
    flow: [
      text(
        '### Grønt betyr det kontrollen faktisk sjekket\n\nEn pull request kan ha automatiserte **status checks**. For eksempel kan et prosjekt bygge programmet, kjøre tester, kontrollere formatering, bruke statisk analyse og undersøke tilgjengelighet. En grønn kontroll betyr at akkurat den kontrollen bestod i den kjøringen. Den er ikke bevis på at alle brukerbehov er dekket eller at løsningen er sikker. En rød kontroll må undersøkes før man trekker konklusjoner: det kan være en faktisk feil, feil miljø eller et tidsavbrudd. Noen repositories krever bestemte checks før merge; andre har ikke slike krav.',
      ),
      text(
        "En test som bare bruker den tomme strengen `''`, kunne vært grønn allerede etter første commit. Akseptkriteriene krever også `'   '` og vanlige navn. Menneskelig review kan oppdage manglende tilfeller, urimelige antakelser og utilsiktede endringer; automatiske kontroller kan oppdage gjentakbare feil i bestemte betingelser. Begge har begrensninger. En konfliktfri merge betyr heller ikke at funksjonaliteten er bevart.",
      ),
      text(
        '### Hva skjer med commit-historikken ved merge?\n\n- **Merge commit** beholder feature-commitene i historikken og lager en ny merge commit med to foreldre.\n- **Squash and merge** samler endringen i én ny commit på målbranchen. De opprinnelige feature-commitene blir ikke med som egne commits i målbranchens historikk.\n- **Rebase and merge** legger commitene på toppen av målbranchen som nye commits uten merge commit, vanligvis med nye hashverdier.\n\n Ingen av metodene gjør koden automatisk korrekt. Teamet velger ofte policy for en forståelig historikk. Du trenger ikke kunne interaktiv rebase i M05.',
      ),
      text(
        'GitHub kan blokkere merge på grunn av uavklart konflikt, obligatoriske status checks, reviewregler eller manglende rettighet. En godkjenning gir ikke nødvendigvis mergetillatelse. Her integrerer du **bare lokalt** etter å ha undersøkt kravet og den korrigerte diffen. Du spiller både utvikler og reviewer, så dette er ikke uavhengig menneskelig review. En ekte GitHub-policy håndheves heller ikke i den lokale øvingen.',
      ),
      command(
        'Kontroller siste forslag og integrer i lokal main',
        'Fra `gjennomgang` henter du nyeste remote-historikk. Blokken krever nøyaktig to feature-commits og forventet korrigering før den lager en lokal merge commit og pusher `main` til den **lokale** remoten. Dette er ikke knappen «Merge pull request» på GitHub.',
        integrate,
        "Merge made by the 'ort' strategy.\n... main -> main\n* Integrer gjennomgaatt navnevalidering\n* Avvis ogsaa navn med bare mellomrom\n* Vis feil ved tomt navn",
      ),
      command(
        'Bekreft at endringen nå finnes i remote main',
        'Fra `utvikler` gjør du `fetch` og kontrollerer at feature-branchen er en forfader til `origin/main`. Den lokale `main` i utviklerkopien oppdateres **ikke** av `fetch` alene. En tom `git status --short` viser en ren arbeidskopi; det er ikke en funksjonstest.',
        verifyIntegration,
        'Grafen viser to feature-commits og en merge commit. Lokal status er tom.',
      ),
      question(
        'GIT-M05-E14',
        'Bygget er grønt, men reviewer har påvist at whitespace-navn fortsatt godtas. Hva bør teamet gjøre?',
        [
          [
            'a',
            'Merge; en grønn byggkontroll trumfer brukerkravet.',
            false,
            'Bygget kan være vellykket selv om en konkret funksjon oppfører seg feil.',
          ],
          [
            'b',
            'Undersøke og rette mangelen, kjøre relevante kontroller og vurdere forslaget på nytt.',
            true,
            'Riktig. Review og automatiserte tester er forskjellige, supplerende kilder til tillit.',
          ],
          [
            'c',
            'Opprette en ny PR med omvendt base og head.',
            false,
            'Feilen gjelder koden og kravoppfyllelse, ikke navnet på eller retningen til PR-en.',
          ],
        ],
        'Hvilken kontroll har faktisk undersøkt navnefeltet med mellomrom?',
      ),
      question(
        'GIT-M05-E15',
        'Hvorfor kan squash and merge passe for noen team?',
        [
          [
            'a',
            'Det lager alltid en merge commit med to foreldre og beholder nøyaktig de samme feature-commitene.',
            false,
            'Det beskriver ikke squash. Squash lager i stedet én ny samlet commit på målbranchen.',
          ],
          [
            'b',
            'Det kjører flere sikkerhetstester enn andre merge-metoder.',
            false,
            'Historikkstrategien er ikke i seg selv en test- eller sikkerhetsmekanisme.',
          ],
          [
            'c',
            'Det samler en PRs samlede endring i én ny commit på målbranchen.',
            true,
            'Riktig. Det gir et annet historikkbilde enn vanlig merge commit eller rebase and merge.',
          ],
        ],
        'Hva endres i historikken, ikke i løsningens kvalitet?',
      ),
      question(
        'GIT-M05-E16',
        'Et forslag har en godkjenning, men den obligatoriske testkontrollen er rød. Hva vet du?',
        [
          [
            'a',
            'Godkjenningen alene gir ikke nødvendigvis mergetillatelse; undersøk den røde kontrollen.',
            true,
            'Riktig. Repositoryregler og resultatet fra relevante checks må vurderes separat.',
          ],
          [
            'b',
            'En approval betyr at GitHub alltid ignorerer krav om status checks.',
            false,
            'Review og status checks kan være uavhengige mergekrav i repositoryets regler.',
          ],
          [
            'c',
            'Testen må være falsk positiv, fordi et menneske har godkjent koden.',
            false,
            'En review er ingen garanti for at alle automatiske kontroller eller brukerforløp virker.',
          ],
        ],
        'Kan ulike krav hindre merge selv om ett av dem er oppfylt?',
      ),
    ],
  },
  {
    missionId: 'GIT-M05-O07',
    title: 'Fork, rettigheter og trygg gjennomgang',
    goal: 'Forstå fork-basert samarbeid og håndtere risiko før kode kjøres eller integreres.',
    skillId: 'GIT-M05-SECURITY',
    flow: [
      text(
        '### Branch i felles repo eller fork?\n\nHar du skriverettigheter til et felles repository, kan du ofte opprette en feature branch der. Har du bare lesetilgang til et open-source-prosjekt, er en **fork** vanlig: du lager ditt eget repository som utgangspunkt, arbeider på en branch i dette og foreslår en PR tilbake til originalen. Da er det ekstra viktig å kontrollere både **base repository og branch** (mottakeren) og **head repository og branch** (din fork og forslag). En fork er ikke obligatorisk for alle prosjekter.',
      ),
      text(
        '### Hvilken risiko følger med en PR?\n\nEn endring kan inneholde tokens, passord, personopplysninger eller private data i filer eller historikk, skadelige eller ukjente kodeendringer, uventede endringer i avhengigheter eller CI-workflows, og arbeid langt utenfor oppgavens omfang. En feature branch er ikke automatisk hemmelig når den pushes. Undersøk **alle** endrede filer og kildehistorikken som er relevant, ikke bare PR-tittelen. Kjør ikke ukjent PR-kode med tilgang til hemmeligheter. Fork-baserte bidrag kan ha andre regler for workflow-godkjenning og secrets.',
      ),
      text(
        '### Frivillig spor: en ekte GitHub-PR\n\nHvis du har GitHub-konto og ønsker plattformpraksis, opprett manuelt et **eget, syntetisk øvingsrepository**. Velg privat synlighet dersom innholdet ikke skal være offentlig, og sjekk innstillingene før publisering. Sørg for at nødvendig autentisering er på plass. Lag `main`, en feature branch og en commit; push feature-branchen. I GitHub velger du å opprette PR, kontrollerer riktig base og head, skriver kort behov, endring, utførte kontroller og usikkerhet, og bruker eventuelt draft. Undersøk Conversation, Commits, Checks og Files changed. Legg så til en ny commit på samme branch og se hvordan PR-en endres. Merge bare hvis rettigheter og regler tillater det. ProgressPal gjør ingen av disse nettoperasjonene for deg.',
      ),
      note(
        'GitHub-øvingen er valgfri. Ikke bruk personopplysninger, tokens eller repoer du ikke har tillatelse til å bruke.',
      ),
      question(
        'GIT-M05-E17',
        'Du ønsker å bidra til et offentlig prosjekt, men mangler skriverettigheter. Hva er en vanlig vei?',
        [
          [
            'a',
            'Be om eierens private tilgangstoken og push direkte til main.',
            false,
            'Ikke del autentiseringshemmeligheter. Bruk ordinære rettigheter og bidragsflyt.',
          ],
          [
            'b',
            'Lag en fork, arbeid på en branch der og åpne PR mot originalprosjektet.',
            true,
            'Riktig. En fork lar deg foreslå endringer uten direkte skriverettighet til originalen.',
          ],
          [
            'c',
            'Bruk git pull for å opprette en formell godkjenning.',
            false,
            'Git pull er en lokal Git-operasjon og oppretter ikke en GitHub-review.',
          ],
        ],
        'Hvordan kan du foreslå kode uten å kunne skrive i målrepositoryet?',
      ),
      question(
        'GIT-M05-E18',
        'En ukjent PR kalles «rett skrivefeil», men endrer også CI-workflow og avhengigheter. Hva bør du gjøre?',
        [
          [
            'a',
            'Undersøke de faktiske endringene og risikoen før noen kjører eller merger ukjent kode.',
            true,
            'Riktig. PR-beskrivelsen er en påstand; diff og konsekvenser må undersøkes.',
          ],
          [
            'b',
            'Stole på tittelen og kjøre alle workflows med repository-secrets.',
            false,
            'Det kan eksponere hemmeligheter for kode du ennå ikke har vurdert.',
          ],
          [
            'c',
            'Kalle den trygg fordi den kommer fra en privat feature branch.',
            false,
            'En branch har ingen garanti for konfidensialitet eller ufarlig innhold.',
          ],
        ],
        'Hva er det faktisk sendt inn, og hvilke rettigheter ville kjøring gitt?',
      ),
      question(
        'GIT-M05-E19',
        'Hva lærer du av å opprette en PR i et eget øvingsrepo?',
        [
          [
            'a',
            'At en annen utvikler har godkjent koden.',
            false,
            'Når du øver alene, har ikke en annen utvikler nødvendigvis sett på koden.',
          ],
          [
            'b',
            'At GitHub automatisk har testet alle endringene.',
            false,
            'GitHub kjører bare de kontrollene som er satt opp for prosjektet.',
          ],
          [
            'c',
            'Hvordan du foreslår en endring og leser diffen i en PR.',
            true,
            'Riktig. Du kan øve på å opprette og lese en PR selv.',
          ],
        ],
        'Hvilke deler av en PR kan du prøve selv?',
      ),
    ],
  },
  {
    missionId: 'GIT-M05-O08',
    title: 'Prøv selv: Er dette klart for merge?',
    goal: 'Begrunne neste handling i en ny PR-situasjon med krav, diff, review og usikker status check.',
    skillId: 'GIT-M05-TRANSFER',
    flow: [
      text(
        '### Et nytt problem\n\nTeamet arbeider nå med kursplasser. Et issue sier: «Når kurset er fullt, skal siden vise `Fullt`, og nye påmeldinger skal avvises. Når det finnes plasser, skal påmelding virke.» En utvikler lager en feature branch og en PR mot `main`. Diffen viser at teksten på siden er endret til `Fullt`, men registreringsfunksjonen mangler fortsatt kapasitetskontroll. En byggekontroll er grønn. Nettlesertesten er rød med meldingen «timeout while starting browser». En reviewer skriver: «Visningen ser riktig ut, men nye påmeldinger blir fortsatt akseptert når kurset er fullt.» Ingen formell approval finnes.',
      ),
      text(
        '### Slik angriper du oppgaven\n\n1. Les hva oppgaven ber om.\n2. Undersøk hva PR-en faktisk endrer.\n3. Les testresultatene og kommentaren fra review.\n4. Vurder om endringen er klar for merge, eller om noe må rettes først.\n\nEn timeout kan skyldes at testen ikke kom i gang. Undersøk årsaken.\n\nEtter merge må teamet sjekke både teksten på siden og om påmelding faktisk blir avvist når kurset er fullt.',
      ),
      question(
        'GIT-M05-E20',
        'Hva er den mest forsvarlige neste handlingen i dette nye scenariet?',
        [
          [
            'a',
            'Merge straks: bygg er grønt og siden viser riktig tekst.',
            false,
            'Kravet sier også at registrering må blokkere ved full kapasitet. Dette er fortsatt en kjent mangel.',
          ],
          [
            'b',
            'Utsett merge, få kapasitetskontrollen rettet og undersøk årsaken til den røde nettleserkontrollen.',
            true,
            'Riktig. Både kjent funksjonell mangel og uavklart kontroll må håndteres på et saklig grunnlag.',
          ],
          [
            'c',
            'Snu PR-ens base og head; da forsvinner problemet med kapasitet.',
            false,
            'Sammenligningsretningen endrer ikke mangelen i registreringsfunksjonen.',
          ],
        ],
        'Er begge akseptkriterier oppfylt, og hva vet du om den røde kontrollen?',
      ),
      question(
        'GIT-M05-E21',
        'Funksjonen blir rettet, relevant review er gjennomført og påkrevde checks er bestått. Hva gjenstår?',
        [
          [
            'a',
            'Kontroller tilgang og mergepolicy, og etterprøv den samlede atferden etter integrering.',
            true,
            'Riktig. Godkjent forslag og vellykket merge er ikke garanti for fremtidig korrekthet.',
          ],
          [
            'b',
            'Ingenting; alle fremtidige feil er umulige når en PR blir grønn.',
            false,
            'Review og checks har avgrenset dekning. Den integrerte løsningen må fortsatt kunne undersøkes.',
          ],
          [
            'c',
            'Bruk alltid rebase and merge, selv om teamet har valgt en annen policy.',
            false,
            'Historikkstrategien velges ut fra samarbeid og rettigheter, ikke som en universell regel.',
          ],
        ],
        'Hva er bevist, hva er teamets policy, og hva må kontrolleres i main?',
      ),
      reflect(
        'GIT-M05-E22',
        'Skriv en kort, selvstendig beslutning: problem og avgrensning, head/base, hva diffen viser, hvilken review-kommentar som krever oppfølging, relevante kontroller, hvorfor du vil merge eller vente, og hva du ville kontrollert etterpå. Skill lokal Git-øving fra ekte GitHub-PR.',
      ),
      text(
        '### Videre til M06\n\nDu kan nå forklare hvordan utviklere foreslår, undersøker, forbedrer og integrerer endringer. Men hva gjør du dersom du oppdager en feil før commit, etter commit eller etter deling? M06 handler om å undersøke situasjonen først og velge trygg gjenoppretting. `restore`, `revert`, `reset`, `stash` og `reflog` kommer der – vi bruker dem ikke som snarveier i M05.',
      ),
    ],
  },
];
