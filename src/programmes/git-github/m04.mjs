// M04 — Fra lokal Git til GitHub. Authoring source, not a browser import.
// Preserves the M01–M03 curriculum model: sequential lessons with real Git
// practice, guided choices and optional self-reported reflection.
// This file alone does not register M04, update the catalogue or publish it.

const text = (nb) => ({ t: 'text', nb });
const note = (nb) => ({ t: 'callout', kind: 'merk', nb });
const question = (id, prompt, options, hint) => ({
  id,
  type: 'mcq',
  prompt,
  hints: [hint],
  options: options.map(([optionId, label, correct, feedback]) => ({
    id: optionId,
    text: label,
    correct,
    feedback,
  })),
});
const reflection = (id, prompt) => ({
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

// Build-time code composition only: the learner receives complete blocks.
// git.exe avoids the case-insensitive PowerShell function-name collision that
// affected the M03 handoff. No block mutates an existing unrelated repo.
const must = (args) =>
  `& git.exe ${args}\nif ($LASTEXITCODE -ne 0) { throw 'STOPP: Git-kommandoen feilet. Les meldingen og undersoek tilstanden.' }`;
const context = String.raw`$ErrorActionPreference = 'Stop'
$null = Get-Command git.exe -ErrorAction Stop
$documents = [Environment]::GetFolderPath('MyDocuments')
if (-not $documents -or -not (Test-Path -LiteralPath $documents -PathType Container)) { throw 'STOPP: Finner ikke Dokumenter-mappen.' }
$root = Join-Path $documents 'ProgressPal-Git-M04'
$remote = Join-Path $root 'delt-repo.git'
$a = Join-Path $root 'arbeidskopi-A'
$b = Join-Path $root 'arbeidskopi-B'
if (-not (Test-Path -LiteralPath $remote -PathType Container)) { throw 'STOPP: M04-ovingen er ikke opprettet.' }
$isBare = & git.exe --git-dir="$remote" rev-parse --is-bare-repository
if ($LASTEXITCODE -ne 0 -or $isBare -ne 'true') { throw 'STOPP: Delt repo er ikke et bare repository.' }
$remoteHead = & git.exe --git-dir="$remote" symbolic-ref HEAD
if ($LASTEXITCODE -ne 0 -or $remoteHead -ne 'refs/heads/main') { throw 'STOPP: Delt repo har uventet standardbranch.' }`;
const verifyCopy = (which, mustBeClean = true) =>
  String.raw`
$copy = ` +
  (which === 'A' ? '$a' : '$b') +
  String.raw`
if (-not (Test-Path -LiteralPath (Join-Path $copy '.git') -PathType Container)) { throw 'STOPP: Arbeidskopien finnes ikke.' }
$actualRoot = & git.exe -C "$copy" rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0 -or $actualRoot.Replace('/', '\') -ne $copy) { throw 'STOPP: Feil Git-repository.' }
$active = & git.exe -C "$copy" branch --show-current
if ($LASTEXITCODE -ne 0 -or $active -ne 'main') { throw 'STOPP: Arbeidskopien maa staa paa main.' }
$address = & git.exe -C "$copy" remote get-url origin
if ($LASTEXITCODE -ne 0 -or $address.Replace('/', '\') -ne $remote) { throw 'STOPP: Origin peker ikke paa M04-ovingen.' }` +
  (mustBeClean
    ? String.raw`
$pending = & git.exe -C "$copy" status --porcelain
if ($LASTEXITCODE -ne 0 -or -not [string]::IsNullOrEmpty(($pending -join ''))) { throw 'STOPP: Arbeidskopien har endringer. Undersoek foerst.' }`
    : '');

const setup =
  String.raw`$ErrorActionPreference = 'Stop'
$null = Get-Command git.exe -ErrorAction Stop
$documents = [Environment]::GetFolderPath('MyDocuments')
if (-not $documents -or -not (Test-Path -LiteralPath $documents -PathType Container)) { throw 'STOPP: Finner ikke Dokumenter-mappen.' }
$root = Join-Path $documents 'ProgressPal-Git-M04'
if (Test-Path -LiteralPath $root) { throw 'STOPP: M04-mappen finnes allerede. Ikke overskriv den.' }
New-Item -ItemType Directory -Path $root -ErrorAction Stop | Out-Null
$remote = Join-Path $root 'delt-repo.git'
$a = Join-Path $root 'arbeidskopi-A'
` +
  must('init --bare --initial-branch=main "$remote"') +
  '\n' +
  must('init --initial-branch=main "$a"') +
  '\n' +
  must('-C "$a" config --local user.name "ProgressPal Oving A"') +
  '\n' +
  must('-C "$a" config --local user.email "a@example.invalid"') +
  String.raw`
@'
<!doctype html>
<html lang="nb">
<head><meta charset="utf-8"><title>Kursside</title></head>
<body>
<h1>Introduksjonskurs</h1>
<p id="status">Kurset har ledige plasser.</p>
</body>
</html>
'@ | Set-Content -LiteralPath (Join-Path $a 'index.html') -Encoding Ascii
'Prosjekt: en enkel nettside for et kurs.' | Set-Content -LiteralPath (Join-Path $a 'README.txt') -Encoding Ascii
'Melding: Vi har mottatt skjemaet ditt.' | Set-Content -LiteralPath (Join-Path $a 'messages.txt') -Encoding Ascii
` +
  must('-C "$a" add -- index.html README.txt messages.txt') +
  '\n' +
  must('-C "$a" commit -m "Opprett kursside"') +
  '\n' +
  must('-C "$a" remote add origin "$remote"') +
  '\n' +
  must('-C "$a" remote -v') +
  '\n' +
  must('-C "$a" status -sb');

const firstPush =
  context +
  verifyCopy('A') +
  String.raw`
& git.exe --git-dir="$remote" show-ref --verify --quiet refs/heads/main
if ($LASTEXITCODE -eq 0) { throw 'STOPP: Remote har allerede en main. Undersoek hva som er gjort.' }
if ($LASTEXITCODE -ne 1) { throw 'STOPP: Kunne ikke kontrollere fjernlagerets main.' }
` +
  must('-C "$a" push -u origin main') +
  '\n' +
  must('-C "$a" branch -vv') +
  '\n' +
  must('-C "$a" status -sb');

const cloneB =
  context +
  verifyCopy('A') +
  String.raw`
if (Test-Path -LiteralPath $b) { throw 'STOPP: B finnes allerede. Ikke overskriv den.' }
& git.exe --git-dir="$remote" show-ref --verify --quiet refs/heads/main
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Send foerst A sin commit til delt repo.' }
` +
  must('clone --branch main "$remote" "$b"') +
  '\n' +
  must('-C "$b" config --local user.name "ProgressPal Oving B"') +
  '\n' +
  must('-C "$b" config --local user.email "b@example.invalid"') +
  '\n' +
  must('-C "$b" branch -vv') +
  '\n' +
  must('-C "$b" remote -v') +
  '\n' +
  must('-C "$b" --no-pager log -1 --oneline');

const editB =
  context +
  verifyCopy('B') +
  String.raw`
$filename = Join-Path $b 'messages.txt'
$before = (Get-Content -LiteralPath $filename -Raw).Trim()
if ($before -ne 'Melding: Vi har mottatt skjemaet ditt.') { throw 'STOPP: B har annet filinnhold enn forventet.' }
'Melding: Takk! Skjemaet er registrert.' | Set-Content -LiteralPath $filename -Encoding Ascii
` +
  must('-C "$b" --no-pager diff -- messages.txt') +
  '\n' +
  must('-C "$b" add -- messages.txt') +
  '\n' +
  must('-C "$b" commit -m "Forbedre bekreftelsesmelding"') +
  '\n' +
  must('-C "$b" status -sb');

const pushB =
  context +
  verifyCopy('B') +
  String.raw`
$local = & git.exe -C "$b" rev-parse main
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kan ikke lese B sin main.' }
$tracked = & git.exe -C "$b" rev-parse origin/main
if ($LASTEXITCODE -ne 0 -or $local -eq $tracked) { throw 'STOPP: Fant ingen ny commit fra B.' }
` +
  must('-C "$b" push origin main') +
  '\n' +
  must('-C "$b" status -sb');

const fetchA =
  context +
  verifyCopy('A') +
  String.raw`
$mainBefore = & git.exe -C "$a" rev-parse main
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kan ikke lese A sin main.' }
$fileBefore = Get-Content -LiteralPath (Join-Path $a 'messages.txt') -Raw
` +
  must('-C "$a" fetch origin') +
  String.raw`
$mainAfter = & git.exe -C "$a" rev-parse main
$knownRemote = & git.exe -C "$a" rev-parse origin/main
if ($LASTEXITCODE -ne 0 -or $mainBefore -ne $mainAfter -or $knownRemote -eq $mainAfter) { throw 'STOPP: Uventet commit-tilstand etter fetch.' }
$fileAfter = Get-Content -LiteralPath (Join-Path $a 'messages.txt') -Raw
if ($fileBefore -ne $fileAfter) { throw 'STOPP: Fetch skulle ikke endre A sin arbeidsfil.' }
` +
  must('-C "$a" status -sb') +
  '\n' +
  must('-C "$a" --no-pager log --oneline main..origin/main') +
  '\n' +
  must('-C "$a" --no-pager diff main..origin/main -- messages.txt');

const pullA =
  context +
  verifyCopy('A') +
  String.raw`
& git.exe -C "$a" merge-base --is-ancestor main origin/main
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Ikke en fast-forward. Undersoek historikken i stedet.' }
` +
  must('-C "$a" pull --ff-only origin main') +
  String.raw`
$local = & git.exe -C "$a" rev-parse main
$tracked = & git.exe -C "$a" rev-parse origin/main
if ($LASTEXITCODE -ne 0 -or $local -ne $tracked) { throw 'STOPP: A og origin/main stemmer ikke.' }
$content = Get-Content -LiteralPath (Join-Path $a 'messages.txt') -Raw
if ($content -notmatch 'Skjemaet er registrert') { throw 'STOPP: Bekreftelsesmeldingen mangler.' }
` +
  must('-C "$a" status -sb') +
  '\n' +
  must('-C "$a" --no-pager log -2 --oneline');

const pushFromAAgain =
  context +
  verifyCopy('A') +
  String.raw`
` +
  must('-C "$a" fetch origin') +
  String.raw`
$local = & git.exe -C "$a" rev-parse main
$tracked = & git.exe -C "$a" rev-parse origin/main
if ($LASTEXITCODE -ne 0 -or $local -ne $tracked) { throw 'STOPP: A maa vaere oppdatert foer denne ovingen.' }
$filename = Join-Path $a 'index.html'
$before = Get-Content -LiteralPath $filename -Raw
if (-not $before.Contains('Kurset har ledige plasser.')) { throw 'STOPP: HTML-innholdet har endret seg.' }
$after = $before.Replace('Kurset har ledige plasser.', 'Kurset har venteliste.')
$after | Set-Content -LiteralPath $filename -Encoding Ascii
` +
  must('-C "$a" --no-pager diff -- index.html') +
  '\n' +
  must('-C "$a" add -- index.html') +
  '\n' +
  must('-C "$a" commit -m "Vis venteliste paa kurssiden"') +
  '\n' +
  must('-C "$a" push origin main') +
  '\n' +
  must('-C "$a" status -sb');

const editBAgain =
  context +
  verifyCopy('B') +
  String.raw`
$filename = Join-Path $b 'README.txt'
$before = (Get-Content -LiteralPath $filename -Raw).Trim()
if ($before -ne 'Prosjekt: en enkel nettside for et kurs.') { throw 'STOPP: README har annet innhold enn forventet.' }
'Prosjekt: en enkel nettside for et kurs. Kontroller kursstatus.' | Set-Content -LiteralPath $filename -Encoding Ascii
` +
  must('-C "$b" --no-pager diff -- README.txt') +
  '\n' +
  must('-C "$b" add -- README.txt') +
  '\n' +
  must('-C "$b" commit -m "Presiser kontroll av kursstatus"') +
  '\n' +
  must('-C "$b" status -sb');

const rejectedPush =
  context +
  verifyCopy('B') +
  String.raw`
& git.exe -C "$b" push origin main
$pushCode = $LASTEXITCODE
if ($pushCode -eq 0) { throw 'STOPP: Push ble godtatt uventet. Ikke kjoer videre automatisk.' }
Write-Output 'Push ble avvist som forventet. Undersoek foer du velger neste steg.'
` +
  must('-C "$b" fetch origin') +
  '\n' +
  must('-C "$b" status -sb') +
  '\n' +
  must('-C "$b" --no-pager log --oneline --left-right main...origin/main') +
  '\n' +
  must('-C "$b" --no-pager diff main..origin/main -- index.html README.txt');

// Optional GitHub practice. Explicit human intent is required before network push.
const connectGithub =
  context +
  verifyCopy('A') +
  String.raw`
$known = & git.exe -C "$a" remote
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke lese remote-navn.' }
if ($known -contains 'github-oving') { throw 'STOPP: GitHub-adressen er allerede lagt inn. Undersoek den foerst.' }
$url = (Read-Host 'Lim inn HTTPS-adressen til ditt eget nye GitHub-repository').Trim()
if ($url -notmatch '^https://github[.]com/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+([.]git)?$') { throw 'STOPP: Forventet en GitHub HTTPS-adresse.' }
` +
  must('-C "$a" remote add github-oving "$url"') +
  '\n' +
  must('-C "$a" remote -v');
const publishGithub =
  context +
  verifyCopy('A') +
  String.raw`
$url = & git.exe -C "$a" remote get-url github-oving
if ($LASTEXITCODE -ne 0 -or $url -notmatch '^https://github[.]com/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+([.]git)?$') { throw 'STOPP: Mangler gyldig GitHub-ovingsadresse.' }
Write-Output ('Kontroller mottakeren: ' + $url)
` +
  must('-C "$a" --no-pager log --all --stat') +
  String.raw`
$approval = Read-Host 'Skriv PUBLISER bare hvis dette er ditt tomme repo og filene kan deles'
if ($approval -cne 'PUBLISER') { throw 'STOPP: Ingen filer ble publisert.' }
` +
  must('-C "$a" push github-oving main');

export const gitM04Lessons = [
  {
    missionId: 'GIT-M04-O01',
    title: 'Hvorfor dele et Git-prosjekt?',
    goal: 'Forstå hva en remote løser, hva GitHub tilfører og hva som fortsatt er lokalt.',
    skillId: 'GIT-M04-WHY-REMOTE',
    flow: [
      text(
        '### Når flere trenger den samme historikken\n\nI M03 arbeidet du med branches og merge i et lite prosjekt for en påmeldingsside. Forestill deg nå at du skal arbeide videre hjemme, mens en medstudent gjør en endring på skolen. Dere trenger begge tilgang til prosjektets commits. Å lagre en fil på hver maskin gir ikke automatisk den andre maskinen oppdatert Git-historikk.',
      ),
      text(
        'Git registrerer versjoner og utviklingslinjer **lokalt**. GitHub er en nettjeneste som kan lagre Git-repositoryer og administrere deling og samarbeid. Dette er to forskjellige ting: En commit er en Git-operasjon; publisering er en egen handling. Git kan også samarbeide med GitLab, Bitbucket eller et repository på en egen server. Du velger plattform ut fra krav til tilgang, eierskap, arbeidsflyt og drift. GitHub er vanlig, men ikke nødvendig for at Git skal fungere.',
      ),
      text(
        'Et **remote** er et registrert navn på en adresse til et annet Git-repository. Adressen kan være en HTTPS-/SSH-adresse på nettet eller en mappe på samme datamaskin. `origin` er et vanlig navn, særlig etter `clone`. Navnet er ikke en bestemt server eller en garanti for at innhold allerede er sendt. `git remote -v` viser hvilke adresser repositoryet kjenner, men overfører ingenting.',
      ),
      text(
        'I M04 bruker vi først en lokal, delt Git-mappe og to uavhengige arbeidskopier, **A** og **B**. Det er en ekte Git-overføring, men uten GitHub-konto, nett eller innlogging. Slik kan du se nøyaktig hva `push`, `clone`, `fetch` og `pull` gjør. Mot slutten kobler vi dette til hva som endrer seg når adressen faktisk peker på GitHub.',
      ),
      note(
        'En kopi av et repository kan beskytte noe av historikken, men er ikke automatisk en fullstendig sikkerhetskopi. Filer du ikke har committet, commits du ikke har sendt og andre lokale data kan mangle. Verdifullt arbeid trenger også en egen sikkerhetskopi.',
      ),
      question(
        'GIT-M04-E01',
        'Du har committet en rettelse på PC-en din. Medstudenten har en egen arbeidskopi og er på nett. Hva kan medstudenten sikkert vite uten at noen har overført den nye commiten?',
        [
          [
            'a',
            'At GitHub har kopiert den nye commiten fordi begge bruker Git.',
            false,
            'Git registrerte rettelsen i ditt lokale repository. En nettforbindelse alene sender ikke Git-objektene videre.',
          ],
          [
            'b',
            'Ingenting om den nye commiten; den må deles gjennom en overføring eller en annen tilgjengelig kopi.',
            true,
            'Riktig. Commit og overføring er separate hendelser. Selv et GitHub-repo kjenner bare til commits det faktisk har mottatt.',
          ],
          [
            'c',
            'At origin/main på medstudentens PC allerede viser rettelsen fordi origin er konfigurert.',
            false,
            'Origin/main er medstudentens sist kjente tilstand for den eksterne branchen. Den oppdateres ikke kontinuerlig over nett.',
          ],
        ],
        'Hva er det som faktisk flytter Git-historikk mellom repositoryer?',
      ),
      question(
        'GIT-M04-E02',
        'En liten utviklingsgruppe vil lagre og dele Git-historikken på en intern server som de selv drifter. Krever Git at de bruker GitHub?',
        [
          [
            'a',
            'Ja, fordi Git alltid sender commits via GitHubs servere.',
            false,
            'Git er et eget versjonskontrollsystem og kan sende data direkte mellom repositoryer uten GitHub.',
          ],
          [
            'b',
            'Nei, men de må gi opp branches og historikk hvis de velger en annen server.',
            false,
            'Branches og commit-historikk hører til Git, ikke til GitHubs nettgrensesnitt.',
          ],
          [
            'c',
            'Nei. Et tilgjengelig Git-repository kan være mottaker; gruppen må selv ivareta drift og tilgang.',
            true,
            'Riktig. En egen Git-server er mulig, men gruppen får også ansvaret for blant annet tilgjengelighet, tilgangsstyring og sikkerhetskopiering.',
          ],
        ],
        'Skille egenskapene til Git fra tilleggstjenestene rundt det.',
      ),
    ],
  },
  {
    missionId: 'GIT-M04-O02',
    title: 'Opprett et trygt, delt øvingsrepository',
    goal: 'Opprette et bare repository, koble til origin og skille adresse fra faktisk publisert historikk.',
    skillId: 'GIT-M04-REMOTE-SETUP',
    flow: [
      text(
        '### Tre mapper med hver sin rolle\n\nVi lager et nytt eksempel på kurssiden fra M03, ikke en kopi av dine gamle øvingsfiler. I `ProgressPal-Git-M04` kommer `arbeidskopi-A` til å inneholde nettsidens filer og commit-historikk. `delt-repo.git` blir et **bare repository**: det lagrer Git-objekter og referanser, men har ikke en vanlig mappe der du redigerer nettsiden. Senere lager vi `arbeidskopi-B` ved å klone det delte repositoryet.',
      ),
      text(
        'Akkurat som når en server mottar commits, kan det bare repositoryet oppbevare en delt `main`. I dette eksemplet ligger serverrollen på samme datamaskin. Git-kommandoene er reelle; GitHub-funksjoner som kontotilgang, pull requests og review er ikke del av den lokale øvingen.',
      ),
      text(
        '**Før du starter:** Åpne Windows PowerShell 5.1 med vanlig brukertilgang. Du trenger Git for Windows med støtte for `git init --initial-branch` (Git 2.28 eller nyere). Du kan kontrollere dette med `git --version`. Kjør blokkene i rekkefølge. Hver blokk bruker komplette stier til sin egen øvingsmappe; du trenger ikke navigere mellom A og B selv. Oppsettet stopper hvis `ProgressPal-Git-M04` allerede finnes, slik at tidligere arbeid ikke overskrives.',
      ),
      command(
        'Opprett det delte repositoryet og A',
        'Kopier hele blokken som én enhet. Den oppretter en liten `index.html`, en README og en bekreftelsesmelding. Disse er ufarlige testfiler, ikke din faktiske M03-mappe. Blokken lager én start-commit og registrerer adressen `origin`, men sender ikke commiten til mottakeren. Hvis den stopper halvveis, ikke kjør den på nytt eller slett mappen automatisk; undersøk først hva som ble opprettet.',
        setup,
        'origin  .../delt-repo.git (fetch)\norigin  .../delt-repo.git (push)\n## main',
      ),
      text(
        'Se på utskriften fra `git remote -v`. Der er både en fetch- og push-adresse. De forteller hvor A **kan** hente fra og sende til; de beviser ikke at remote har mottatt en commit. `git status -sb` viser at A står på `main`. I neste leksjon overfører vi innholdet.',
      ),
      question(
        'GIT-M04-E03',
        'Etter oppsettet viser `remote -v` en lokal mappe som origin, og A har én commit. Det delte repositoryet har ennå ingen commit. Hva er neste nødvendige handling for å gjøre A sin commit tilgjengelig der?',
        [
          [
            'a',
            'Kjøre `git fetch origin` i A, fordi fetch legger A sine commits i mottakeren.',
            false,
            'Fetch henter fra en remote til den lokale kopien. Retningen er motsatt av det som trengs her.',
          ],
          [
            'b',
            'Kjøre `git push origin main` i A, slik at mottakerens main kan oppdateres.',
            true,
            'Riktig. Push sender nødvendige objekter og ber mottakeren oppdatere sin main. Vi bruker også `-u` én gang for å registrere upstream.',
          ],
          [
            'c',
            'Kjøre `git remote -v` på nytt, fordi den andre visningen fullfører registreringen.',
            false,
            'Remote -v leser bare adresseinformasjon. Den flytter ingen commits.',
          ],
        ],
        'Hva er forskjellen på å registrere en adresse og å overføre historikk?',
      ),
      reflection(
        'GIT-M04-E04',
        'Forklar med egne ord hva som er forskjellen mellom A sin `main`, et bare repository og adressen `origin`. Bruk gjerne din egen utskrift, men ikke lim inn personlige stier.',
      ),
    ],
  },
  {
    missionId: 'GIT-M04-O03',
    title: 'Push og clone: fra én til to arbeidskopier',
    goal: 'Sende historikk, klone den og forstå lokal main, remote main, origin/main, HEAD og upstream.',
    skillId: 'GIT-M04-PUSH-CLONE',
    flow: [
      text(
        '### Først sende, så hente en ny arbeidskopi\n\nA har en lokal commit. Den delte mappen er tom. `git push origin main` ber mottakeren oppdatere sin branch `main` med commits fra A. En push er normalt tillatt når du har skrivetilgang og mottakerens historikk ikke må overskrives. Vi legger til `-u` ved første push: det gir A sin lokale `main` en **upstream**, altså en registrert branch å sammenligne og vanligvis synkronisere med. Det skaper ikke automatisk synkronisering.',
      ),
      command(
        'Send A sin første commit',
        'Denne blokken kontrollerer at mottakerens `main` er tom før den sender. Se deretter etter at `git branch -vv` viser `[origin/main]`. Stopp hvis kommandoen forteller at denne historikken allerede finnes; da har du antakelig gjennomført steget.',
        firstPush,
        '[new branch] main -> main\nbranch main set up to track origin/main\n## main...origin/main',
      ),
      text(
        'Nå finnes samme start-commit både i A og i det delte repositoryet. `main` i A er fortsatt en **lokal branch**. Mottakerens `main` er en egen referanse. `origin/main` i A er A sitt lokale notat om hvor den eksterne branchen sto ved siste relevante overføring. Etter den vellykkede pushen stemmer de overens. De trenger ikke gjøre det senere.',
      ),
      text(
        '`HEAD` viser normalt hvilken lokal branch du arbeider på. Hvis du committer mens du står på `main`, flytter A sin `main` seg. Mottakerens `main` flytter seg ikke før du sender endringen. Dette bygger på samme branch-forståelse som i M03; forskjellen nå er at det finnes flere repositoryer.',
      ),
      question(
        'GIT-M04-E05',
        'A har gjort en ny lokal commit etter sin siste push. `git status -sb` viser `## main...origin/main [ahead 1]`. Ingen andre har sendt endringer. Hva uttrykker `ahead 1`?',
        [
          [
            'a',
            'A har én lokal commit som den sist kjente `origin/main` ikke inneholder.',
            true,
            'Riktig. A ligger ett steg foran den sporede referansen. Status sier ikke at GitHub eller mottakeren allerede har fått commiten.',
          ],
          [
            'b',
            'A mangler én commit som ligger på mottakeren.',
            false,
            'Det ville typisk stått `behind 1`. Ahead betyr at din lokale branch inneholder en ekstra commit.',
          ],
          [
            'c',
            'A er én fil foran mottakeren, uavhengig av antall commits.',
            false,
            'Ahead/behind teller commits i historikken, ikke antall endrede filer.',
          ],
        ],
        'Er det commits, filer eller arbeidskopier Git sammenligner?',
      ),
      text(
        '### Clone lager en ny arbeidskopi\n\nEn medstudent som ikke har prosjektet fra før, kan bruke `git clone`. Da opprettes en ny lokal mappe med repositoryets historikk og arbeidsfiler. Clone oppretter normalt også et remote som heter `origin`, og knytter lokal `main` til `origin/main` når denne er mottakerens standardbranch. Kommandoen slår ikke et prosjekt inn i en tilfeldig eksisterende mappe.',
      ),
      command(
        'Lag arbeidskopi B',
        'Kopier blokken etter vellykket første push. Den oppretter B og viser branch, origin-adresse og siste commit. A og B har nå samme utgangspunkt, men er to selvstendige arbeidskopier.',
        cloneB,
        'Cloning into ...arbeidskopi-B...\n* main ... [origin/main] Opprett kursside\norigin .../delt-repo.git',
      ),
      question(
        'GIT-M04-E06',
        'B er nyklonet. A lager deretter en commit uten å sende den. Begge viser fortsatt `main`. Hvilken påstand er riktig?',
        [
          [
            'a',
            'B sin lokale main flyttes når A committer, fordi branch-navnet er likt.',
            false,
            'A og B er forskjellige repositoryer. Like navn betyr ikke at referansene oppdateres sammen.',
          ],
          [
            'b',
            'Mottakerens main flyttes når A committer, men B må vente på neste clone.',
            false,
            'Mottakeren har ikke fått commiten. B kan hente nye commits senere med fetch; ny clone er ikke nødvendig.',
          ],
          [
            'c',
            'Bare A sin main flyttes. Mottakeren og B kjenner ikke den nye commiten ennå.',
            true,
            'Riktig. Hver kopi har sin egen lokale branch og historikk. Overføring skjer gjennom egne Git-operasjoner.',
          ],
        ],
        'Hva ble faktisk endret ved commiten, og i hvilket repository?',
      ),
      question(
        'GIT-M04-E07',
        'Du har allerede et lokalt prosjekt og mottar adressen til et delt Git-repository med en selvstendig historikk. Hva bør du avklare før du velger mellom `remote add` og `clone`?',
        [
          [
            'a',
            'Om målet er å beholde og koble din eksisterende arbeidskopi, eller å opprette en ny uavhengig kopi; historikkene må vurderes før deling.',
            true,
            'Riktig. Remote add registrerer en adresse i et eksisterende repo. Clone lager en ny kopi. Ingen av dem gir automatisk en trygg sammenslåing av to uavhengige historier.',
          ],
          [
            'b',
            'Om mottakeren bruker main eller master; da er historikkene automatisk kompatible.',
            false,
            'Branch-navn sier ikke om to repositoryer deler samme historie. Det må undersøkes separat.',
          ],
          [
            'c',
            'Om den lokale mappen allerede har mange filer; da vil clone alltid bevare dem og legge til resten.',
            false,
            'Clone lager normalt en egen arbeidskopi og er ikke en metode for å flettes inn i eksisterende filer.',
          ],
        ],
        'Hvilket valg endrer en eksisterende kopi, og hvilket oppretter en ny?',
      ),
    ],
  },
  {
    missionId: 'GIT-M04-O04',
    title: 'En endring fra B: push og fetch',
    goal: 'Observere at fetch oppdaterer kjennskapen til remote uten å endre lokal main eller arbeidsfilene.',
    skillId: 'GIT-M04-FETCH',
    flow: [
      text(
        '### Begge har samme prosjekt, men ikke samme skjerm\n\nB skal forbedre bekreftelsesmeldingen på kurssiden. Dette er en vanlig utviklingsoppgave: en fil endres, kontrolleres og committes. A forblir uendret. Når B sender sin commit, får det delte repositoryet den nye versjonen. A får den ikke automatisk.',
      ),
      command(
        'Endre og committe meldingen i B',
        'Blokken kontrollerer at B er ren og at den opprinnelige meldingen finnes. Den viser endringen i `git diff`, lager en commit og viser at B er én commit foran sin sist kjente remote-branch. Denne blokken **sender ikke** endringen.',
        editB,
        'diff --git a/messages.txt b/messages.txt\n- Melding: Vi har mottatt skjemaet ditt.\n+ Melding: Takk! Skjemaet er registrert.\n## main...origin/main [ahead 1]',
      ),
      question(
        'GIT-M04-E08',
        'B viser `ahead 1` etter commit. A og det delte repositoryet har fortsatt den gamle meldingen. Hva må B gjøre for at mottakeren skal få commiten?',
        [
          [
            'a',
            'Kjøre `git pull --ff-only` i B, siden pull alltid sender lokale commits.',
            false,
            'Pull henter og integrerer fra mottakeren til B. Det sender ikke B sin commit til mottakeren.',
          ],
          [
            'b',
            'Kjøre `git push origin main` i B, forutsatt at mottakeren kan godta oppdateringen.',
            true,
            'Riktig. Push er retningen fra B til det delte repositoryet. Denne gangen ligger B foran uten divergens.',
          ],
          [
            'c',
            'Kjøre `git fetch origin` i A; da henter A automatisk commiten fra B selv om B ikke har sendt den.',
            false,
            'A kan bare hente data som mottakeren faktisk har. B må først dele sin lokale commit.',
          ],
        ],
        'Hvor finnes B sin nye commit akkurat nå?',
      ),
      command(
        'Send B sin commit',
        'Etter en vellykket push har mottakerens `main` endret seg. A sin `main` er fortsatt den gamle. Kontroller at den siste statuslinjen i B ikke viser commits foran remote.',
        pushB,
        'main -> main\n## main...origin/main',
      ),
      text(
        '### Fetch er å hente informasjon, ikke å ta endringen i bruk\n\nI A kan du nå kjøre `git fetch origin`. Git henter nye objekter og oppdaterer blant annet `origin/main`. Men A sin **lokale `main`** og filen `messages.txt` blir stående. Du kan dermed lese commit-historikk og sammenligne filene før du bestemmer om endringen skal integreres. Dette er nyttig når du vil undersøke en kollegas arbeid før det påvirker filene du bruker.',
      ),
      command(
        'Hent til A uten å endre arbeidsfilene',
        'Blokken sammenligner faktisk tilstand før og etter fetch. Deretter viser den status, den nye commiten og endringene i `messages.txt`. Den skal ende med at A er `behind 1`. Ikke kjør pull ennå.',
        fetchA,
        '## main...origin/main [behind 1]\nForbedre bekreftelsesmelding\n- Melding: Vi har mottatt skjemaet ditt.\n+ Melding: Takk! Skjemaet er registrert.',
      ),
      question(
        'GIT-M04-E09',
        'Etter `fetch` viser A `behind 1`, og `git diff main..origin/main -- messages.txt` viser B sin nye tekst. Likevel er den gamle teksten fortsatt i A sin arbeidsfil. Er det en feil?',
        [
          [
            'a',
            'Ja. Fetch skal alltid oppdatere arbeidsfilene; statusen tyder på ødelagt repo.',
            false,
            'Fetch laster ned historie og oppdaterer remote-tracking-referanser. Den er ikke ment å integrere endringen i lokal main.',
          ],
          [
            'b',
            'Nei. A må klones på nytt hver gang origin/main endrer seg.',
            false,
            'En eksisterende arbeidskopi kan hente og integrere senere commits. Ny clone er ikke nødvendig.',
          ],
          [
            'c',
            'Nei. Fetch har oppdatert A sin kunnskap om remote; lokal main og arbeidsfilene er med hensikt uendret.',
            true,
            'Riktig. Det er akkurat dette skillet som gjør fetch nyttig når du vil undersøke før du endrer eget arbeid.',
          ],
        ],
        'Hvilken referanse flyttet seg, og hvilken gjorde det ikke?',
      ),
      reflection(
        'GIT-M04-E10',
        'Forklar hva som var ulikt mellom `main` og `origin/main` i A etter fetch. Ta med én konkret observasjon fra status, logg eller diff og hvorfor filen fremdeles hadde den gamle teksten.',
      ),
    ],
  },
  {
    missionId: 'GIT-M04-O05',
    title: 'Pull når historikken kan flyttes rett fram',
    goal: 'Skille trygg fast-forward-integrering fra fetch, og kontrollere at filene faktisk ble oppdatert.',
    skillId: 'GIT-M04-PULL-FF',
    flow: [
      text(
        '### Fra informasjon til oppdatert arbeidsfil\n\nA har nå lest hva B endret. Ingen nye commits er laget i A siden den delte startcommiten. Derfor ligger A sin `main` **bak** `origin/main`, men de to linjene har ikke gått hver sin vei. Git kan flytte A sin branch fram til den nyere commiten uten å lage en egen merge-commit. Det kalles **fast-forward**.',
      ),
      text(
        '`git pull` består av å hente fra en remote og deretter forsøke å integrere endringene i den aktive lokale branchen. Vi velger `git pull --ff-only origin main`, som bare tillater integrering dersom det kan gjøres som fast-forward. Hvis både A og mottakeren har forskjellige nye commits, stopper kommandoen. Den bestemmer ikke på dine vegne hvordan historikkene skal samles.',
      ),
      command(
        'Integrer den undersøkte endringen i A',
        'Før pull kontrollerer blokken at A har ren arbeidskopi og at `main` er en forløper til `origin/main`. Den kjører så pull og kontrollerer at `messages.txt` faktisk inneholder den nye teksten.',
        pullA,
        'Updating ...\nFast-forward\n## main...origin/main\nForbedre bekreftelsesmelding',
      ),
      question(
        'GIT-M04-E11',
        'A har ren arbeidskopi og viser `behind 1`, uten egne nye commits. Du har allerede undersøkt forskjellen og ønsker den nye teksten i arbeidsfilene. Hvilken handling løser akkurat dette?',
        [
          [
            'a',
            '`git push origin main`, fordi A ligger bak og må sende det den har.',
            false,
            'Push sender i feil retning. A mangler en commit fra remote, og en vanlig push ville ikke oppdatere A sine arbeidsfiler.',
          ],
          [
            'b',
            '`git pull --ff-only origin main`, fordi A kan flyttes fram uten å miste egne commits.',
            true,
            'Riktig. Når lokal main er forløper til den nyere remote-branchen, kan Git fast-forwarde og oppdatere arbeidsfilene.',
          ],
          [
            'c',
            '`git fetch origin`, fordi dette alene gjør A sin arbeidsfil lik B sin.',
            false,
            'Fetch henter historie og oppdaterer den sporede referansen. A har allerede gjort det; arbeidsfilene endres ikke av fetch alene.',
          ],
        ],
        'Hva trenger du nå: mer informasjon, publisering eller integrering?',
      ),
      question(
        'GIT-M04-E12',
        'A får senere `fatal: Not possible to fast-forward, aborting` ved `pull --ff-only`. Hva kan du slutte ut fra den meldingen alene?',
        [
          [
            'a',
            'At Git ikke kunne integrere ved bare å flytte branchen fram; du må undersøke historikk og lokale endringer før du velger metode.',
            true,
            'Riktig. Meldingen alene sier ikke at en bestemt commit er feil eller skal slettes. Det kan være divergens som krever en bevisst integrering.',
          ],
          [
            'b',
            'At den lokale commiten må slettes, ellers kan ingen videre samarbeid foregå.',
            false,
            'En lokal commit kan inneholde nyttig arbeid. Fast-forward er bare én integreringsmåte; sletting følger ikke av feilen.',
          ],
          [
            'c',
            'At GitHub har avvist kontopassordet, siden pull krever tilgang.',
            false,
            'Dette er en melding om integrering av commit-historikk, ikke en autentiseringsmelding. Tilgangsfeil har andre kjennetegn.',
          ],
        ],
        'Hva lover `--ff-only` å gjøre – og hva nekter det å gjøre?',
      ),
    ],
  },
  {
    missionId: 'GIT-M04-O06',
    title: 'Når to lokale endringer konkurrerer',
    goal: 'Oppleve avvist push og undersøke divergerende historikk uten å overskrive commits.',
    skillId: 'GIT-M04-DIVERGENCE',
    flow: [
      text(
        '### Begge endrer prosjektet, men i forskjellige kopier\n\nEtter forrige leksjon har A og B fått den samme bekreftelsesmeldingen inn i historikken. A skal endre teksten på selve kurssiden slik at den sier at kurset har venteliste. B skal oppdatere README med en påminnelse om å kontrollere status før publisering. Begge endringene kan være nyttige. Men B kommer til å arbeide fra sin gamle kjennskap til remote mens A sender sin endring først.',
      ),
      command(
        'A endrer kurssiden og sender oppdateringen',
        'Denne blokken kontrollerer først at A har mottakerens nyeste commit. Deretter endrer den bare `index.html`, viser diffen, committer og sender fra A. B får ingen automatisk beskjed om denne commiten.',
        pushFromAAgain,
        'main -> main\n## main...origin/main',
      ),
      command(
        'B lager sin egen commit uten å hente fra A',
        'B oppdaterer bare `README.txt` og oppretter en ny commit. Den lokale `origin/main` hos B kan fortsatt være foreldet. Denne blokken gjør ingen push; tenk gjennom hva som nå kan skje hvis B prøver.',
        editBAgain,
        'diff --git a/README.txt b/README.txt\n## main...origin/main [ahead 1]',
      ),
      question(
        'GIT-M04-E13',
        'A har allerede pushet en commit om ventelisten. B har en egen README-commit basert på den gamle historikken og har ikke hentet på nytt. Hva vil en vanlig `git push origin main` fra B normalt møte?',
        [
          [
            'a',
            'Et vellykket push fordi filene som er endret, er forskjellige.',
            false,
            'En vanlig push vurderer commit-historikk, ikke bare om filene kan flettes uten innholdskonflikt. B sin commit bygger ikke på mottakerens nye commit.',
          ],
          [
            'b',
            'En automatisk merge på mottakeren som kombinerer A og B uten spørsmål.',
            false,
            'En vanlig push oppretter ikke automatisk merge mellom divergerte branches. Arbeidet må først integreres på egnet måte.',
          ],
          [
            'c',
            'En non-fast-forward-avvisning fordi B ville flyttet mottakerens main bort fra A sin nye commit.',
            true,
            'Riktig. At endringene gjelder ulike filer betyr ikke at B sin commit allerede inneholder A sin commit i historikken.',
          ],
        ],
        'Hva må være sant om commit-slektskap for en vanlig push?',
      ),
      command(
        'Se avvisningen og undersøk historikken',
        'En avvist push er forventet her. Blokken skal **ikke** kjøre med force, slette commits eller integrere noe. Den henter deretter mottakerens tilstand og viser to forskjellige linjer. Les hele feilmeldingen; blir push uventet godtatt, stopper blokken.',
        rejectedPush,
        '[rejected] main -> main (fetch first)\n## main...origin/main [ahead 1, behind 1]\n< ... Presiser kontroll av kursstatus\n> ... Vis venteliste paa kurssiden',
      ),
      text(
        'B har nå en commit som mottakeren ikke har, og mottakeren har en commit som B mangler. `ahead 1, behind 1` beskriver **to divergerende historikker**, ikke en liste over riktige og gale filer. Begge commits kan være verdt å bevare. At endringene gjelder ulike filer betyr ofte at de kan integreres uten tekstkonflikt, men Git må fortsatt ha en bestemt strategi for å samle historikken.',
      ),
      text(
        'Forskjellige feil krever forskjellige vurderinger. Ved `non-fast-forward` undersøker du først historikken. Ved tilgangsfeil undersøker du konto, autentisering og rettigheter. Ved feil remote-adresse kontrollerer du hvilket prosjekt du er koblet til. Ingen av disse feiltypene bør møtes med tilfeldig `--force`, `reset --hard` eller sletting av arbeidskopien. M05 viser hvordan team kan foreslå og gjennomgå endringer før integrering.',
      ),
      question(
        'GIT-M04-E14',
        'Etter fetch viser B `[ahead 1, behind 1]`. README-endringen i B og HTML-endringen fra A er begge ønsket. Hva er den beste vurderingen **før** noe endres videre?',
        [
          [
            'a',
            'Bygg videre på B med enda en commit; da blir B automatisk kompatibel med origin/main.',
            false,
            'Flere commits på B alene gjør ikke at historikken inkluderer A sin commit. Divergensen må håndteres.',
          ],
          [
            'b',
            'Bevar begge commits, undersøk endringene og velg en bevisst integrering; ikke tving mottakeren til å forkaste A.',
            true,
            'Riktig. Først må begge utviklingslinjene forstås. At filene er forskjellige gjør integrering mer oversiktlig, men opphever ikke divergensen.',
          ],
          [
            'c',
            'Hent på nytt med fetch til statusen blir `behind 0`; da er B sin lokale main integrert.',
            false,
            'Fetch oppdaterer B sin kunnskap om mottakeren. Den flytter ikke automatisk B sin lokale main eller integrerer A sin commit.',
          ],
        ],
        'Hvilken handling endrer informasjon, og hvilken endrer selve commit-historikken?',
      ),
      reflection(
        'GIT-M04-E15',
        'Beskriv hva du faktisk observerte i B etter avvist push. Forklar hvorfor forskjellige filendringer ikke er nok til at Git godtar en vanlig push, og hvorfor begge commits bør vurderes før videre arbeid.',
      ),
    ],
  },
  {
    missionId: 'GIT-M04-O07',
    title: 'Fra lokal remote til GitHub i praksis',
    goal: 'Vurdere deling, tilgang og autentisering og bruke Git-forståelsen i nye situasjoner.',
    skillId: 'GIT-M04-GITHUB-TRANSFER',
    flow: [
      text(
        '### Det som er likt – og det som forandrer seg\n\nI øvingen var adressen til `origin` en mappe på din egen datamaskin. Hvis et remote i stedet peker til GitHub, bruker Git fortsatt de samme grunnleggende handlingene: `clone` for å lage en ny arbeidskopi, `fetch` for å hente historikk, `pull` for å hente og integrere og `push` for å foreslå en oppdatering av mottakerens branch. Forskjellen er at du nå trenger nett og riktig tilgang til et repository som noen eier og administrerer.',
      ),
      text(
        'På GitHub kan et repository være **public** eller **private**. Public gjør normalt innholdet lesbart for alle. Private begrenser hvem som kan lese det. Ingen av valgene betyr at alle kan skrive til `main`: rettigheter og branch-regler kan begrense push. Før du deler et prosjekt, må du vite både **hvem som kan lese det** og **hvem som kan gjøre endringer**. GitHub, GitLab og Bitbucket tilbyr ulike administrasjons- og samarbeidsfunksjoner; Git-mekanismene er i stor grad felles.',
      ),
      text(
        '### Forfatteridentitet er ikke innlogging\n\n`git config user.name` og `user.email` legger forfatteropplysninger på commits. De gir ikke adgang til GitHub. Ved HTTPS kan Git Credential Manager hjelpe med innlogging og trygg håndtering av legitimasjon. Med SSH kan en egen nøkkel brukes: den **offentlige** delen registreres hos tjenesten, mens den **private** nøkkelen ikke deles. GitHub CLI er et annet mulig oppsett. Vanlige kontopassord brukes ikke som Git-passord over HTTPS. Aktiver kontoens støttede tofaktorautentisering, og følg tjenestens aktuelle veiledning når du setter opp tilgang.',
      ),
      text(
        '### Valgfri øving med ekte GitHub\n\nDu trenger ikke en konto for å fullføre M04. Hvis du vil prøve samme arbeidsflyt på nettet, opprett et **nytt, tomt repository** under din egen GitHub-konto og velg synlighet bevisst. Bruk bare de syntetiske filene fra arbeidskopi A. Unngå å opprette README eller andre startfiler på GitHub i dette eksemplet, ellers kan mottakeren ha en uavhengig første commit. Legg til GitHub-adressen som et **nytt remote med et annet navn**, for eksempel `github-oving`, i A etter at du har kontrollert hvilken URL du kopierte fra GitHub. Da kan den lokale `origin` fra øvingen få være urørt. En vanlig `git push github-oving main` er en faktisk publisering til kontoen du oppga; gjennomfør den bare hvis du ønsker det. GitHub viser den mottatte commit-historikken i nettgrensesnittet. Bruk ikke skolens, arbeidsgiverens eller andres repository uten avtale.',
      ),
      text(
        '### Valgfri øving med en ekte GitHub-remote\n\nPå GitHub: Velg *New repository*, gi det et nytt navn og velg synlighet bevisst. La repositoryet være helt tomt (ikke lag en automatisk README eller annen første commit). Kopier HTTPS-adressen fra GitHub. Den skal være til et nytt repository **du selv kontrollerer**, ikke skoleprosjekter eller andres arbeid. Du kan også nøye deg med den lokale øvingen; dette er ikke et krav for fullføring.',
      ),
      command(
        'Valgfritt: legg GitHub til som en egen adresse',
        'Kopier bare denne blokken hvis du faktisk vil prøve GitHub og har laget et tomt øvingsrepository. Lim inn din HTTPS-adresse når PowerShell ber om den. Den legges inn som `github-oving`; øvingens lokale `origin` forblir urørt. Kontroller begge adressene i utskriften.',
        connectGithub,
        'origin .../delt-repo.git\ngithub-oving https://github.com/... (fetch/push)',
      ),
      command(
        'Valgfritt: send den ufarlige øvingshistorikken til GitHub',
        'Denne blokken viser historikken og den valgte GitHub-adressen før noe sendes. Den krever at du selv skriver `PUBLISER` i PowerShell for å gjennomføre en ekte push. Stopp dersom filene, historikken, eierforholdet eller synligheten er uklare. Ved HTTPS kan Git be deg logge inn via støttet autentisering. Etter vellykket push kan du åpne repositoryet på GitHub og se commiten der.',
        publishGithub,
        'main -> main (ved første vellykkede push)',
      ),
      text(
        'Disse valgfrie kommandoene sender **bare** det som finnes i arbeidskopi A sin `main`. De sender ikke B sin separate, divergerte README-commit. Hvis GitHub avviser kommandoen, undersøk feilen i stedet for å bruke force. Ingen GitHub-innlogging, token eller publisering skjer gjennom ProgressPal.',
      ),
      note(
        '**Sjekk før publisering:** Se på hvilke filer og historiske commits som skal deles. En API-nøkkel som ble committet tidligere, forsvinner ikke fra historikken om du legger filen i `.gitignore` nå. Private er ikke det samme som hemmelighetssanering. Hvis en reell nøkkel er eksponert, stopp delingen og tilbakekall/roter nøkkelen etter riktig rutine. Ikke lim inn tokens, private SSH-nøkler, sensitivt filinnhold eller personlige stier i ProgressPal.',
      ),
      text(
        'Du kan slå opp kommandoene i Gits offisielle dokumentasjon: `https://git-scm.com/docs/git-remote`, `https://git-scm.com/docs/git-clone`, `https://git-scm.com/docs/git-fetch`, `https://git-scm.com/docs/git-push` og `https://git-scm.com/docs/git-pull`. For konto, synlighet og innlogging: `https://docs.github.com/`. Den lokale øvingen er fullført uten disse nettjenestene.',
      ),
      question(
        'GIT-M04-E16',
        'En medstudent kan klone et offentlig GitHub-repository, men får en feil om at vedkommende mangler skrivetilgang ved push. Hva er den mest relevante forklaringen?',
        [
          [
            'a',
            'En feil i Git, fordi alle som kan klone et offentlig repository også kan pushe.',
            false,
            'Offentlig lesetilgang betyr ikke at noen har skrivetilgang. Dette er normale, separate rettigheter.',
          ],
          [
            'b',
            'At Git mangler `user.email`, som gir tilgang til offentlig GitHub-kode.',
            false,
            'Forfatteridentitet står i commits. Den autentiserer ikke kontoen og gir ingen serverrettigheter.',
          ],
          [
            'c',
            'At lesetilgang og skrivetilgang er forskjellige; riktig konto, rettigheter og samarbeidsmåte må avklares.',
            true,
            'Riktig. Ved bidrag til andres prosjekt kan det være aktuelt å arbeide i egen fork og foreslå endringer med pull request. Det lærer du i M05.',
          ],
        ],
        'Hvilke rettigheter trengs for å lese et prosjekt, og hvilke for å endre mottakerens branch?',
      ),
      question(
        'GIT-M04-E17',
        'Du skal publisere et repo. En gammel commit inneholder en ekte tjenestenøkkel. Du har nå lagt nøkkelfilen i `.gitignore`, og repositoryet skal være privat. Hva er den avgjørende risikoen?',
        [
          [
            'a',
            'Nøkkelen ligger fortsatt i Git-historikken. Stopp publiseringen, fjern den fra det som skal deles, og roter/tilbakekall nøkkelen hvis den kan ha blitt eksponert.',
            true,
            'Riktig. Gitignore fjerner ikke gamle commits, og privat synlighet gjør ikke historiske hemmeligheter trygge. Hvis nøkkelen allerede har vært delt, må den behandles som eksponert.',
          ],
          [
            'b',
            'Ingen risiko, fordi `.gitignore` fjerner alle tidligere commits som omtalte filen.',
            false,
            'Gitignore styrer hovedsakelig hvilke usporede filer Git vurderer. Den skriver ikke om eksisterende historikk.',
          ],
          [
            'c',
            'Bare en risiko hvis du bytter fra private til public etterpå.',
            false,
            'Eksponering kan skje også i private repositoryer, eksempelvis gjennom brukere med tilgang eller senere deling. Nøkkelen bør ikke publiseres i historikken.',
          ],
        ],
        'Hvilke versjoner av filen finnes fortsatt i commit-historikken?',
      ),
      question(
        'GIT-M04-E18',
        'Du kloner et prosjekt fra GitHub og får `main` med ren arbeidskopi. En dag senere viser GitHub en ny commit, men din lokale `git status -sb` viser ingen nye endringer. Du vil først undersøke oppdateringen uten å endre filene. Hva velger du?',
        [
          [
            'a',
            '`git pull --ff-only` med en gang, fordi det bare henter informasjon og aldri endrer arbeidsfilene.',
            false,
            'Pull forsøker også å integrere endringen. Det kan oppdatere arbeidsfilene, selv med ff-only.',
          ],
          [
            'b',
            '`git fetch origin`, og deretter sammenligne `main` med `origin/main`.',
            true,
            'Riktig. Fetch oppdaterer din lokale kjennskap til GitHub-repoet. Etterpå kan du undersøke commit og diff før du avgjør om endringen skal integreres.',
          ],
          [
            'c',
            '`git push origin main`, slik at din arbeidskopi blir oppdatert fra GitHub.',
            false,
            'Push sender i motsatt retning og oppdaterer ikke din arbeidskopi med nye commits fra GitHub.',
          ],
        ],
        'Du vil vite hva som har endret seg før du bestemmer deg for å ta det inn.',
      ),
      text(
        '### Selvstendig anvendelse: et nytt prosjekt\n\nDu overtar vedlikeholdet av en liten nettside. `main` lokalt og `origin/main` var like i går. I dag har en kollega pushet en commit som endrer `config.json`, men du har ikke hentet den. Samtidig har du en egen lokal commit som retter en skrivefeil i `index.html`. Det er ikke gjort endringer i arbeidsfilene etter din commit. Du har lov til å lese det delte repositoryet, men er ikke sikker på om du har lov til å pushe til det. Målet er å forstå begge endringene og beholde dem, uten å publisere eller slette noe før du vet hva du gjør.',
      ),
      question(
        'GIT-M04-E19',
        'Du står i det nye prosjektet som beskrevet over. Hva er den beste første arbeidssekvensen når målet er å undersøke, ikke integrere eller publisere ennå?',
        [
          [
            'a',
            'Prøve `git pull --ff-only` først, deretter undersøke diff hvis Git nekter.',
            false,
            'Med en egen lokal commit og en ny remote-commit vil ff-only normalt stoppe på divergens. Fetch og sammenligning gir informasjon uten forsøk på integrering.',
          ],
          [
            'b',
            'Prøve push først for å finne ut om du har lov, og undersøke remote hvis du blir avvist.',
            false,
            'En prøve-push er en mulig endring på mottakeren dersom du faktisk har skrivetilgang. Det er feil første tiltak når målet uttrykkelig er kun undersøkelse.',
          ],
          [
            'c',
            'Kontrollere remote-adressen og lokal status, hente med fetch og sammenligne de to utviklingslinjene før du velger videre handling.',
            true,
            'Riktig. Dette avklarer hvilken remote du ser på, viser både egen og kollegaens commit og bevarer tilstanden. Rettigheter og integreringsmåte kan vurderes etterpå.',
          ],
        ],
        'Hvilke handlinger er rent undersøkende, og hvilke kan flytte branches eller arbeidsfiler?',
      ),
      reflection(
        'GIT-M04-E20',
        'Bruk situasjonen med `config.json` og `index.html`: Forklar til en medstudent hva `fetch` vil endre, hvorfor `pull --ff-only` ikke nødvendigvis kan løse problemet, og hvilke to forhold du må avklare før du integrerer eller deler arbeidet. Du kan også forklare hva du faktisk så i den lokale øvingen. Svar med egne ord; ingen GitHub-konto eller terminalutskrift er nødvendig.',
      ),
      {
        t: 'recap',
        can: [
          'Forklare Git, GitHub, remote og hvorfor en lokal commit ikke automatisk blir delt.',
          'Skille arbeidskopi A/B, lokal main, mottakerens main, origin/main, HEAD og upstream.',
          'Gjennomføre og undersøke push, clone, fetch og kontrollert pull mellom egne øvingsrepositoryer.',
          'Bruke Git-status, historikk og diff til å forstå avvist push og divergerende commits.',
          'Vurdere tilgang, synlighet, autentisering og historiske hemmeligheter før publisering.',
        ],
        next: 'I M05 lærer du hvordan utviklere foreslår, diskuterer, gjennomgår og integrerer endringer med pull requests. M04 har gitt deg Git-grunnlaget; den neste modulen handler om samarbeidsprosessen.',
      },
    ],
  },
];
