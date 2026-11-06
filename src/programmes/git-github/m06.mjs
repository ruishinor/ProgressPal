// M06 — Feil og trygg gjenoppretting. Build-time instructional source only.
// Do not register before M05 has been integrated and validated.
const text = (nb) => ({ t: 'text', nb });
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
const reflection = (id, prompt) => ({
  id,
  type: 'reflect',
  prompt,
  choices: null,
  hints: [],
});
const command = (heading, why, script, stdout = '') => [
  text('### ' + heading + '\n\n' + why),
  {
    t: 'code',
    file: 'Kommando – PowerShell 5.1',
    code: '& {\n' + script + '\n}',
    stdin: '',
    stdout,
    error: '',
    error_info: null,
    nb: '',
  },
];
const must = (arguments_) =>
  `& git.exe ${arguments_}\nif ($LASTEXITCODE -ne 0) { throw 'STOPP: Git feilet. Undersøk utskriften og tilstanden før du fortsetter.' }`;
const start = String.raw`$ErrorActionPreference = 'Stop'
$null = Get-Command git.exe -ErrorAction Stop
$documents = [Environment]::GetFolderPath('MyDocuments')
if (-not $documents -or -not (Test-Path -LiteralPath $documents -PathType Container)) { throw 'STOPP: Dokumenter-mappen mangler.' }
$root = Join-Path $documents 'ProgressPal-Git-M06'
$repo = Join-Path $root 'pamelding'
if (-not (Test-Path -LiteralPath (Join-Path $repo '.git') -PathType Container)) { throw 'STOPP: Lag øvingsrepositoryet først.' }
$actual = & git.exe -C "$repo" rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0 -or $actual.Replace('/', '\') -ne $repo) { throw 'STOPP: Feil repository.' }
$branch = & git.exe -C "$repo" branch --show-current
if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw 'STOPP: Øvingsrepositoryet skal stå på main.' }
`;
const init =
  String.raw`$ErrorActionPreference = 'Stop'
$null = Get-Command git.exe -ErrorAction Stop
$documents = [Environment]::GetFolderPath('MyDocuments')
if (-not $documents -or -not (Test-Path -LiteralPath $documents -PathType Container)) { throw 'STOPP: Dokumenter-mappen mangler.' }
$root = Join-Path $documents 'ProgressPal-Git-M06'
if (Test-Path -LiteralPath $root) { throw 'STOPP: M06-øving finnes fra før. Ikke overskriv den.' }
New-Item -Path $root -ItemType Directory -ErrorAction Stop | Out-Null
$repo = Join-Path $root 'pamelding'
` +
  must('init --initial-branch=main "$repo"') +
  '\n' +
  must('-C "$repo" config --local user.name "ProgressPal Oving"') +
  '\n' +
  must('-C "$repo" config --local user.email "oving@example.invalid"') +
  String.raw`
'Paameldingssiden' | Set-Content -LiteralPath (Join-Path $repo 'README.txt') -Encoding Ascii
'Navn: paakrevd' | Set-Content -LiteralPath (Join-Path $repo 'skjema.txt') -Encoding Ascii
'Melding: Kontroller navnet' | Set-Content -LiteralPath (Join-Path $repo 'melding.txt') -Encoding Ascii
` +
  must('-C "$repo" add -- README.txt skjema.txt melding.txt') +
  '\n' +
  must('-C "$repo" commit -m "Opprett pameldingsside"') +
  '\n' +
  must('-C "$repo" status --short') +
  '\n' +
  must('-C "$repo" --no-pager log -1 --oneline');
const staging =
  start +
  String.raw`
$dirty = & git.exe -C "$repo" status --porcelain
if ($LASTEXITCODE -ne 0 -or -not [string]::IsNullOrEmpty(($dirty -join ''))) { throw 'STOPP: Start med ren øvingsstatus.' }
$file = Join-Path $repo 'melding.txt'
if ((Get-Content -LiteralPath $file -Raw).Trim() -ne 'Melding: Kontroller navnet') { throw 'STOPP: Uventet startinnhold.' }
'Melding: Sjekk navnet en gang til' | Set-Content -LiteralPath $file -Encoding Ascii
` +
  must('-C "$repo" --no-pager diff -- melding.txt') +
  '\n' +
  must('-C "$repo" add -- melding.txt') +
  '\n' +
  must('-C "$repo" status --short') +
  '\n' +
  must('-C "$repo" restore --staged -- melding.txt') +
  '\n' +
  must('-C "$repo" status --short') +
  String.raw`
if ((Get-Content -LiteralPath $file -Raw).Trim() -ne 'Melding: Sjekk navnet en gang til') { throw 'STOPP: Arbeidsinnholdet skulle fortsatt finnes.' }
` +
  must('-C "$repo" --no-pager diff -- melding.txt');
const restore =
  start +
  String.raw`
$file = Join-Path $repo 'melding.txt'
$state = & git.exe -C "$repo" status --porcelain
if ($LASTEXITCODE -ne 0 -or (@($state) -join '') -ne ' M melding.txt') { throw 'STOPP: Forventet nøyaktig én ikke-staget melding.txt.' }
if ((Get-Content -LiteralPath $file -Raw).Trim() -ne 'Melding: Sjekk navnet en gang til') { throw 'STOPP: Ikke forkast ukjent filinnhold.' }
` +
  must('-C "$repo" restore -- melding.txt') +
  String.raw`
if ((Get-Content -LiteralPath $file -Raw).Trim() -ne 'Melding: Kontroller navnet') { throw 'STOPP: Restore ga ikke forventet filinnhold.' }
` +
  must('-C "$repo" status --short');
const softReset =
  start +
  String.raw`
$state = & git.exe -C "$repo" status --porcelain
if ($LASTEXITCODE -ne 0 -or -not [string]::IsNullOrEmpty(($state -join ''))) { throw 'STOPP: Øvingen krever ren status.' }
$before = & git.exe -C "$repo" rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kan ikke lese startcommit.' }
$file = Join-Path $repo 'skjema.txt'
if ((Get-Content -LiteralPath $file -Raw).Trim() -ne 'Navn: paakrevd') { throw 'STOPP: Uventet innhold.' }
'Navn: paakrevd; Telefon: valgfritt' | Set-Content -LiteralPath $file -Encoding Ascii
` +
  must('-C "$repo" add -- skjema.txt') +
  '\n' +
  must('-C "$repo" commit -m "Beskriv valgfritt telefonfelt"') +
  String.raw`
$after = & git.exe -C "$repo" rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $after -eq $before) { throw 'STOPP: Ingen ny commit.' }
` +
  must('-C "$repo" reset --soft HEAD~1') +
  String.raw`
$now = & git.exe -C "$repo" rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $now -ne $before) { throw 'STOPP: HEAD peker ikke på forventet startcommit.' }
` +
  must('-C "$repo" status --short') +
  '\n' +
  must('-C "$repo" --no-pager diff --staged -- skjema.txt') +
  String.raw`
if ((Get-Content -LiteralPath $file -Raw).Trim() -ne 'Navn: paakrevd; Telefon: valgfritt') { throw 'STOPP: Endringen i arbeidsfilen mangler.' }`;
const mixedReset =
  start +
  String.raw`
$state = & git.exe -C "$repo" status --porcelain
if ($LASTEXITCODE -ne 0 -or (@($state) -join '') -ne 'M  skjema.txt') { throw 'STOPP: Forventet nøyaktig én staget skjema.txt.' }
` +
  must('-C "$repo" restore --staged -- skjema.txt') +
  '\n' +
  must('-C "$repo" status --short') +
  String.raw`
if ((Get-Content -LiteralPath (Join-Path $repo 'skjema.txt') -Raw).Trim() -ne 'Navn: paakrevd; Telefon: valgfritt') { throw 'STOPP: Arbeidsinnholdet er endret.' }
` +
  must('-C "$repo" --no-pager diff -- skjema.txt');
const stash =
  start +
  String.raw`
$state = & git.exe -C "$repo" status --porcelain
if ($LASTEXITCODE -ne 0 -or (@($state) -join '') -ne ' M skjema.txt') { throw 'STOPP: Forventet nøyaktig én ikke-staget skjema.txt.' }
` +
  must('-C "$repo" stash push -m "M06 uferdig telefonfelt" -- skjema.txt') +
  '\n' +
  must('-C "$repo" stash list') +
  '\n' +
  must('-C "$repo" status --short') +
  '\n' +
  must('-C "$repo" stash show -p "stash@{0}"') +
  '\n' +
  must('-C "$repo" stash apply "stash@{0}"') +
  String.raw`
if ((Get-Content -LiteralPath (Join-Path $repo 'skjema.txt') -Raw).Trim() -ne 'Navn: paakrevd; Telefon: valgfritt') { throw 'STOPP: Apply ga feil resultat.' }
` +
  must('-C "$repo" status --short') +
  '\n' +
  must('-C "$repo" stash list');
const reflog =
  start +
  String.raw`
$state = & git.exe -C "$repo" status --porcelain
if ($LASTEXITCODE -ne 0 -or (@($state) -join '') -ne ' M skjema.txt') { throw 'STOPP: Forventet det gjeninnførte telefonfeltet.' }
` +
  must('-C "$repo" add -- skjema.txt') +
  '\n' +
  must('-C "$repo" commit -m "Registrer telefonfelt lokalt"') +
  String.raw`
$important = & git.exe -C "$repo" rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke lese den nye commiten.' }
` +
  must('-C "$repo" reset --mixed HEAD~1') +
  String.raw`
$after = & git.exe -C "$repo" rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $after -eq $important) { throw 'STOPP: Referansen flyttet seg ikke.' }
` +
  must('-C "$repo" reflog -5') +
  '\n' +
  must('-C "$repo" --no-pager show --stat "$important"') +
  String.raw`
& git.exe -C "$repo" show-ref --verify --quiet refs/heads/recovery-m06
if ($LASTEXITCODE -eq 0) { throw 'STOPP: Recovery-branchen finnes fra før.' }
if ($LASTEXITCODE -ne 1) { throw 'STOPP: Kan ikke undersøke branchnavnet.' }
` +
  must('-C "$repo" branch recovery-m06 "$important"') +
  '\n' +
  must('-C "$repo" --no-pager log recovery-m06 -1 --oneline') +
  '\n' +
  must('-C "$repo" status --short');
const revert =
  start +
  String.raw`
$state = & git.exe -C "$repo" status --porcelain
if ($LASTEXITCODE -ne 0 -or (@($state) -join '') -ne ' M skjema.txt') { throw 'STOPP: Forventet ikke-staget skjema.txt fra reflog-øvelsen.' }
$file = Join-Path $repo 'skjema.txt'
if ((Get-Content -LiteralPath $file -Raw).Trim() -ne 'Navn: paakrevd; Telefon: valgfritt') { throw 'STOPP: Uventet filinnhold.' }
` +
  must('-C "$repo" add -- skjema.txt') +
  '\n' +
  must('-C "$repo" commit -m "Ta inn valgfritt telefonfelt"') +
  String.raw`
'Navn: paakrevd; Telefon: paakrevd' | Set-Content -LiteralPath $file -Encoding Ascii
` +
  must('-C "$repo" add -- skjema.txt') +
  '\n' +
  must('-C "$repo" commit -m "Feil: krev telefonnummer"') +
  String.raw`
$remote = Join-Path $root 'delt-repo.git'
$other = Join-Path $root 'arbeidskopi-B'
if ((Test-Path -LiteralPath $remote) -or (Test-Path -LiteralPath $other)) { throw 'STOPP: Remote eller B finnes allerede.' }
` +
  must('init --bare --initial-branch=main "$remote"') +
  '\n' +
  must('-C "$repo" remote add origin "$remote"') +
  '\n' +
  must('-C "$repo" push -u origin main') +
  '\n' +
  must('clone --branch main "$remote" "$other"') +
  String.raw`
$otherHead = & git.exe -C "$other" rev-parse HEAD
$mainHead = & git.exe -C "$repo" rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $otherHead -ne $mainHead) { throw 'STOPP: B mottok ikke feilcommiten.' }
$bad = & git.exe -C "$repo" rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kan ikke finne feilcommit.' }
` +
  must('-C "$repo" --no-pager show --stat "$bad"') +
  '\n' +
  must('-C "$repo" revert --no-edit "$bad"') +
  '\n' +
  must('-C "$repo" push origin main') +
  '\n' +
  must('-C "$other" fetch origin') +
  String.raw`
$originalInB = & git.exe -C "$other" rev-parse main
$updatedInB = & git.exe -C "$other" rev-parse origin/main
if ($LASTEXITCODE -ne 0 -or $originalInB -ne $bad -or $updatedInB -eq $bad) { throw 'STOPP: Fetch ga feil historikk i B.' }
$now = & git.exe -C "$repo" rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $now -eq $bad) { throw 'STOPP: Revert opprettet ikke ny commit.' }
if ((Get-Content -LiteralPath $file -Raw).Trim() -ne 'Navn: paakrevd; Telefon: valgfritt') { throw 'STOPP: Feilen er ikke reversert.' }
` +
  must('-C "$repo" --no-pager log -3 --oneline') +
  '\n' +
  must('-C "$repo" status --short');

export const gitM06Lessons = [
  {
    missionId: 'GIT-M06-O01',
    title: 'Før du angrer: finn ut hva som skjedde',
    goal: 'Undersøke arbeidsfiler, staging og historikk og skille et observert problem fra en antatt årsak.',
    skillId: 'GIT-M06-DIAGNOSE',
    flow: [
      text(
        '### En god reparasjon begynner med en undersøkelse\n\nI M05 gjennomgikk to utviklere en forbedring av påmeldingssiden. Nå kan brukere fortsatt skrive ugyldige opplysninger i et bestemt tilfelle. En utvikler sier: «Vi kan bare angre siste commit.» Men feilen kan ligge i en arbeidsfil, en staget endring, en lokal commit eller en commit som allerede er delt. Å velge kommando før dette er kjent, kan fjerne arbeid uten å løse problemet.',
      ),
      text(
        'En **working tree** er filene du ser og redigerer. **Staging/index** er utvalget Git vil ta med i neste commit. **HEAD** peker vanligvis på den aktive branchens siste commit. Disse kan inneholde forskjellig innhold. `git status` viser hva som er endret og staged, `git diff` viser ikke-stagede endringer, `git diff --staged` viser staged innhold, og `git log` eller `git show` undersøker registrerte commits. Ingen av disse trenger å endre filene.',
      ),
      text(
        'Spør først: Hva har vi faktisk observert? Hvilken branch står vi på? Finnes det nyttige lokale endringer? Er den problematiske commiten delt med andre? Hva ønsker vi bevart? Er det nødvendig å flytte historikken, eller holder det å rette koden videre? Dette er ikke administrasjon for sin egen skyld: svarene avgjør hvilken reparasjon som er trygg.',
      ),
      question(
        'GIT-M06-E01',
        'En utvikler sier at «siste commit er feil». `git status` viser samtidig at to andre filer er endret, men ikke staget. Hva bør utvikleren gjøre først?',
        [
          [
            'a',
            'Kjøre `git reset --hard HEAD~1` for å komme tilbake til en ren tilstand.',
            false,
            'Hard reset kan overskrive de uregistrerte arbeidsendringene. Vi vet ennå ikke om siste commit eller arbeidsfilene forårsaker feilen.',
          ],
          [
            'b',
            'Undersøke status, relevante diffs og commiten for å finne årsaken og avklare hva som må bevares.',
            true,
            'Riktig. Her finnes både committet og ucommittet arbeid. Diagnosen må skille dem før historikken eller filene endres.',
          ],
          [
            'c',
            'Kjøre `git revert HEAD` umiddelbart fordi revert alltid er uten risiko.',
            false,
            'Revert lager en ny endring og kan gi konflikter eller uønskede konsekvenser. Den er heller ikke nødvendigvis relevant for de to arbeidsfilene.',
          ],
        ],
        'Hvilken informasjon mangler før du kan velge en muterende kommando?',
      ),
      question(
        'GIT-M06-E02',
        '`git diff` er tom, men `git diff --staged` viser en endring i `melding.txt`. Hva vet du?',
        [
          [
            'a',
            'Det finnes en staget endring som skiller seg fra HEAD; vanlig diff viser ikke denne forskjellen.',
            true,
            'Riktig. Staging kan inneholde en endring selv om arbeidsfilen for øyeblikket er lik staging.',
          ],
          [
            'b',
            'Filen må allerede være committet, siden vanlig diff er tom.',
            false,
            'En staget endring er ennå ikke det samme som en commit.',
          ],
          [
            'c',
            'Git har mistet filinnholdet, siden de to diff-kommandoene viser ulikt resultat.',
            false,
            'De to kommandoene sammenligner forskjellige tilstander og kan derfor vise forskjellige resultater.',
          ],
        ],
        'Hvilke to tilstander sammenligner hver diff?',
      ),
    ],
  },
  {
    missionId: 'GIT-M06-O02',
    title: 'Restore: behold eller forkast riktig endring',
    goal: 'Skille unstage fra å forkaste ikke-stagede endringer og utføre trygg filrettet praksis.',
    skillId: 'GIT-M06-RESTORE',
    flow: [
      text(
        '### «Angre» er to forskjellige oppgaver\n\nTenk at du retter teksten i `melding.txt`, men legger filen i staging ved en feil. Hvis du vil beholde teksten og bare ta den ut av staging, er `git restore --staged -- melding.txt` relevant. Den tar utgangspunkt i HEAD for staging, men lar arbeidsfilen være. Derimot kan `git restore -- melding.txt` erstatte ikke-staget innhold i arbeidsfilen med innholdet fra staging. Det siste kan forkaste arbeid.',
      ),
      text(
        'Med `--source=<commit>` kan du velge en annen kilde for filinnholdet. Det oppretter ikke en commit av seg selv. `git restore` er heller ikke en garanti for å hente tilbake en fil Git aldri har sporet. Et eksakt filnavn og `--` gjør det tydelig hva du påvirker; unngå brede mønstre når du lærer.',
      ),
      command(
        'Opprett M06-øving i Dokumenter',
        'Åpne Windows PowerShell 5.1. Hele blokken oppretter bare `ProgressPal-Git-M06` med syntetiske tekstfiler, egen lokal forfatteridentitet og én commit. En eksisterende mappe blir ikke overskrevet. Hvis oppsettet stopper halvveis, undersøk den nye mappen; ikke kjør alt på nytt.',
        init,
        'Opprett pameldingsside\nIngen filer vises i kort status når arbeidskopien er ren.',
      ),
      command(
        'Legg feil fil i staging, og ta den ut igjen',
        'Kjør bare etter første oppsett. Følg utskriften: `M  melding.txt` før unstage og ` M melding.txt` etterpå. Innholdet i arbeidsfilen skal fortsatt være den nye teksten.',
        staging,
        'M  melding.txt\n M melding.txt',
      ),
      question(
        'GIT-M06-E03',
        'Etter `git restore --staged -- melding.txt` viser status ` M melding.txt`. En medstudent sier at filen nå er tilbake til originalen. Er det riktig?',
        [
          [
            'a',
            'Ja, fordi restore alltid overskriver arbeidsfilen.',
            false,
            'Her var målet bare staging. Den ikke-stagede endringen ligger fortsatt i arbeidsfilen.',
          ],
          [
            'b',
            'Nei. Filen er fortsatt endret i working tree, men endringen er ikke staged.',
            true,
            'Riktig. Statusens høyre M viser en endring i arbeidsfilen som ennå ikke er staged.',
          ],
          [
            'c',
            'Nei, Git har opprettet en ny commit med den nye teksten.',
            false,
            'Restore lager ingen commit. Ingen historikk er blitt registrert av dette trinnet.',
          ],
        ],
        'Hva betyr forskjellen på venstre og høyre kolonne i kort status?',
      ),
      command(
        'Forkast bare denne kjente øvingsendringen',
        'Blokken avviser ukjente endringer og kontrollerer nøyaktig hvilken fil og tekst som skal forkastes. **Dette er en reell overskriving av den syntetiske arbeidsfilen.** Den gamle teksten kommer tilbake fra staging, som i dette tilfellet fortsatt er lik HEAD.',
        restore,
        'Ren status; Melding: Kontroller navnet',
      ),
      question(
        'GIT-M06-E04',
        'Du har brukt to timer på en ikke-staget endring og har ingen annen kopi. Hva er den viktige risikoen ved `git restore -- filnavn`?',
        [
          [
            'a',
            'At commiten på GitHub automatisk blir slettet.',
            false,
            'Vanlig filrettet restore endrer ikke i seg selv GitHub sin branchhistorikk.',
          ],
          [
            'b',
            'At ikke-staget filinnhold kan overskrives av staging, slik at arbeidet ikke nødvendigvis kan hentes fra Git.',
            true,
            'Riktig. Du må vite at filinnholdet kan forkastes og at ønsket versjon faktisk finnes et annet sted.',
          ],
          [
            'c',
            'At alle branches blir slått sammen til én.',
            false,
            'Filrettet restore slår ikke sammen branches. Her ville kommandoen bare endret innholdet i den valgte arbeidsfilen.',
          ],
        ],
        'Hvilken av de tre tilstandene ber denne kommandoen Git om å endre?',
      ),
    ],
  },
  {
    missionId: 'GIT-M06-O03',
    title: 'Reset: hva skjer med en lokal commit?',
    goal: 'Skille soft, mixed og hard og forstå hvorfor delt historikk krever andre vurderinger.',
    skillId: 'GIT-M06-RESET',
    flow: [
      text(
        '### En commit er registrert, men ennå ikke delt\n\nDu har laget en lokal commit som kombinerer to endringer du heller vil organisere separat. `git reset --soft HEAD~1` flytter den aktive branchens referanse én commit bakover, men beholder både staging og arbeidsfiler. Du kan da kontrollere og omorganisere endringene før ny commit. `--mixed` flytter også referansen, men tilpasser staging til målet; arbeidsfilene beholdes.',
      ),
      text(
        '`--hard` flytter også referansen, men tilpasser i tillegg arbeidsfilene og kan overskrive lokale endringer. Ikke bruk den som allmenn «reparasjonsknapp». Disse beskrivelsene gjelder reset av en commit/referanse. Filrettet reset har en annen bruksmåte og flytter ikke branchens HEAD.',
      ),
      command(
        'Gjør én upublisert commit om til staged endring',
        'Blokken krever ren main, oppretter en ny syntetisk commit og flytter deretter main tilbake med `--soft`. Den kontrollerer at filinnholdet og staging er bevart. Ingen remote blir berørt.',
        softReset,
        'M  skjema.txt\n+ Navn: paakrevd; Telefon: valgfritt',
      ),
      command(
        'Ta endringen ut av staging og behold arbeidsfilen',
        'Vi bruker her en filrettet restore av staging, ikke en ny commit-reset. Det demonstrerer samme relevante sluttforskjell som `reset --mixed` kunne ha gitt: HEAD på gammel commit og en ikke-staget arbeidsendring.',
        mixedReset,
        ' M skjema.txt',
      ),
      question(
        'GIT-M06-E05',
        'Du vil gjøre om en upublisert commit, men ønsker at endringene fortsatt skal være staged for en ny commit. Hvilken variant passer best?',
        [
          [
            'a',
            '`git reset --mixed HEAD~1`.',
            false,
            'Mixed ville som hovedregel ta endringene ut av staging. Arbeidsfilene beholdes, men ikke staging-utvalget.',
          ],
          [
            'b',
            '`git reset --soft HEAD~1`.',
            true,
            'Riktig. Soft flytter branchreferansen, mens staging og working tree beholdes. Bruk det bare etter kontroll av upublisert historie.',
          ],
          [
            'c',
            '`git reset --hard HEAD~1`.',
            false,
            'Hard ville også kunne overskrive arbeidsfilene. Det er ikke ønsket her.',
          ],
        ],
        'Hvilken variant lar både index og working tree stå igjen?',
      ),
      question(
        'GIT-M06-E06',
        'En commit ligger allerede på `main` som flere har hentet. Hvorfor er lokal reset og påfølgende force-push et problematisk standardråd?',
        [
          [
            'a',
            'Fordi det kan omskrive delt historie som andre arbeider videre på, og krever koordinering og særskilt vurdering.',
            true,
            'Riktig. Lokal og delt historikk har ulike konsekvenser. Ofte er en ny korrigerings- eller revert-commit bedre egnet.',
          ],
          [
            'b',
            'Fordi reset ikke finnes for branches som heter main.',
            false,
            'Git-kommandoen er ikke begrenset av branchnavnet. Risikoen skyldes deling og historikkendring.',
          ],
          [
            'c',
            'Fordi enhver reset automatisk sletter repositoryet fra GitHub.',
            false,
            'Reset lokalt endrer ikke direkte en GitHub-branch. Problemet oppstår blant annet ved forsøk på å erstatte delt historikk.',
          ],
        ],
        'Har andre utviklere allerede bygget arbeid på commiten?',
      ),
    ],
  },
  {
    missionId: 'GIT-M06-O04',
    title: 'Stash: legg arbeid til side, og hent det tilbake',
    goal: 'Forstå midlertidig lagring, begrensninger og trygg tilbakeføring av egne arbeidsendringer.',
    skillId: 'GIT-M06-STASH',
    flow: [
      text(
        '### Arbeidet er uferdig, men noe annet haster\n\nDu er halvveis i telefonfeltet på påmeldingssiden. En kollega spør om du kan undersøke en annen feil. Du vil ikke lage en halvferdig commit bare for å rydde arbeidsfilen. `git stash push` kan lagre relevante arbeidsendringer lokalt og gi deg en renere arbeidskopi. Du kan se oppføringer med `git stash list` og innholdet med `git stash show -p`.',
      ),
      text(
        'En vanlig stash omfatter normalt sporede filendringer, men tar ikke automatisk med nye, ikke-sporede filer. Det finnes egne valg for disse. Stash er lokal, midlertidig arbeidslagring, ikke en backupstrategi. `stash apply` forsøker å legge endringene tilbake mens oppføringen beholdes; `stash pop` forsøker også å fjerne oppføringen når tilbakeføringen lykkes. Nyere endringer i arbeidsfilene kan gi konflikter.',
      ),
      command(
        'Legg til side og før tilbake en kjent fil',
        'Øvingsfilen fra forrige leksjon er ikke-staget. Blokken kontrollerer dette før den oppretter en navngitt stash, viser hva som er lagret, og bruker `apply` uten å slette stash-oppføringen.',
        stash,
        'stash@{0}: On main: M06 uferdig telefonfelt\n M skjema.txt',
      ),
      question(
        'GIT-M06-E07',
        'Du har en endret, sporet fil og en helt ny, ikke-sporet fil. Du kjører vanlig `git stash push`. Hva må du være oppmerksom på?',
        [
          [
            'a',
            'At den ikke-sporede filen normalt blir stående utenfor stash dersom du ikke velger noe annet.',
            true,
            'Riktig. Kontroller status og hva stash faktisk inneholder. Ikke anta at alt arbeid ligger i stash.',
          ],
          [
            'b',
            'At både filene automatisk blir publisert til remote.',
            false,
            'Stash lagrer endringer lokalt i Git-repositoryet. Kommandoen publiserer ikke filene og utfører ingen push til remote.',
          ],
          [
            'c',
            'At Git oppretter to nye commits på main.',
            false,
            'Stash har egen intern lagringsmekanisme og betyr ikke at du har laget ordinære commits på main.',
          ],
        ],
        'Har Git allerede sporet begge filene?',
      ),
      question(
        'GIT-M06-E08',
        'Etter `stash apply` ser du riktig filinnhold, og `git stash list` viser fortsatt oppføringen. Er dette i seg selv en feil?',
        [
          [
            'a',
            'Ja, apply skal alltid fjerne stash-oppføringen.',
            false,
            'Det ville vært feil forventning. Apply beholder oppføringen som utgangspunkt.',
          ],
          [
            'b',
            'Nei, apply forsøker å føre tilbake endringene uten å fjerne stash-oppføringen automatisk.',
            true,
            'Riktig. Den kan fortsatt finnes for kontroll. Fjern den bare med et bevisst valg etter vurdering.',
          ],
          [
            'c',
            'Ja, fordi arbeidsfilen må være ren etter apply.',
            false,
            'Poenget er nettopp å hente arbeidsendringene tilbake. En endret arbeidsfil er derfor forventet.',
          ],
        ],
        'Hva er forskjellen på apply og pop?',
      ),
    ],
  },
  {
    missionId: 'GIT-M06-O05',
    title: 'Reflog: finn en commit som ikke lenger vises',
    goal: 'Undersøke lokal referansehistorikk og sikre en tidligere commit uten å love full datagjenoppretting.',
    skillId: 'GIT-M06-REFLOG',
    flow: [
      text(
        '### En commit ser ut til å ha forsvunnet\n\nEtter en kontrollert flytting av en lokal branch viser vanlig `git log` ikke lenger den nyeste commiten du laget. Det betyr ikke nødvendigvis at commit-objektet allerede er borte. **Reflog** er Gits lokale opptegnelser over hvor HEAD og andre referanser tidligere har pekt. Den kan gi et spor til en tidligere commit.',
      ),
      text(
        'Reflog er ikke delt med andre slik commits kan deles. Oppføringene varer heller ikke nødvendigvis evig; de kan utløpe, og objekter som ikke lenger kan nås, kan bli ryddet opp. Reflog kan ikke gjenopprette vilkårlige filer som aldri har vært kjent for Git. Du må undersøke at den identifiserte commiten faktisk inneholder arbeidet du leter etter.',
      ),
      command(
        'Opprett, flytt og finn en lokal commit',
        'Blokken starter med den gjeninnførte arbeidsendringen fra stash. Den lager en commit, husker den faktiske SHA-en, flytter lokal main tilbake med `--mixed`, viser reflog og commitinnhold, og oppretter en egen `recovery-m06`-branch på akkurat den commiten. Den bruker ingen hardkodet reflog-indeks.',
        reflog,
        'HEAD@{...}: reset: moving to HEAD~1\nrecovery-m06 ... Registrer telefonfelt lokalt',
      ),
      question(
        'GIT-M06-E09',
        'Etter reset finner du en tidligere commit i `git reflog`. Hva er en trygg neste handling dersom den inneholder nyttig arbeid?',
        [
          [
            'a',
            'Kontrollere commiten med `git show` og opprette en egen referanse til den før videre inngrep.',
            true,
            'Riktig. Reflog gir en ledetråd. Innholdet må undersøkes, og en branch kan gjøre den aktuelle commiten lett tilgjengelig igjen.',
          ],
          [
            'b',
            'Kjøre `git reset --hard` uten å sjekke hvilken commit som er funnet.',
            false,
            'Det kan overskrive arbeidsendringer og bygger på en uprøvd antakelse om hvilken commit du trenger.',
          ],
          [
            'c',
            'Slette alle stash-oppføringer for at reflog skal gjenopprette filen.',
            false,
            'Stash og reflog er ulike mekanismer. Å slette stash kan fjerne en annen mulig kilde til arbeid.',
          ],
        ],
        'Har du verifisert hva den tidligere referansen peker på?',
      ),
      question(
        'GIT-M06-E10',
        'Et nytt tekstutkast ble aldri lagt i Git eller committet. Filen slettes senere. Hva kan du love at reflog vil gjøre?',
        [
          [
            'a',
            'Hente hele filen, siden reflog registrerer alle skriveoperasjoner i mappen.',
            false,
            'Reflog registrerer referansebevegelser, ikke alle filredigeringer.',
          ],
          [
            'b',
            'Hente filen hvis minst én annen i gruppen bruker samme branchnavn.',
            false,
            'Et branchnavn hos andre betyr ikke at filens aldri-registrerte innhold finnes i deres Git-historikk.',
          ],
          [
            'c',
            'Ingenting sikkert: reflog kan hjelpe med tidligere commits, men ikke love gjenoppretting av aldri-registrert filinnhold.',
            true,
            'Riktig. Undersøk andre kopier eller editorhistorikk hvis de finnes, men ikke presenter dette som en Git-garanti.',
          ],
        ],
        'Hva slags hendelser registrerer reflog faktisk?',
      ),
    ],
  },
  {
    missionId: 'GIT-M06-O06',
    title: 'Revert: korriger uten å skrive om delt historie',
    goal: 'Forstå ny reverserende commit, avhengigheter og kontroll av funksjonelt resultat.',
    skillId: 'GIT-M06-REVERT',
    flow: [
      text(
        '### Feilen er allerede en del av felles historie\n\nEtter en gjennomgått PR blir et telefonnummer plutselig obligatorisk, selv om det skulle være valgfritt. Andre utviklere har allerede hentet main. Her kan det være bedre å lage en ny korrigerende commit enn å flytte main bakover. `git revert <commit>` lager normalt en ny commit som reverserer endringene som den valgte commiten innførte. Den opprinnelige commiten blir fortsatt synlig i historikken.',
      ),
      text(
        'En revert er ikke alltid beste løsning. Andre commits kan avhenge av koden som reverseres, og revert kan selv gi konflikter. Noen ganger er **fix forward** — en ny rettelse — mer presist. En merge commit er et mer komplisert tilfelle fordi Git må vite hvilken foreldrelinje som skal regnes som hovedlinjen. Det er ikke en obligatorisk kommandoøving her.',
      ),
      command(
        'Lag og reverser en kjent feil i lokal historie',
        'Blokken krever en bestemt, kontrollert tilstand fra forrige leksjon. Den registrerer først det valgfrie telefonfeltet, innfører deretter en konkret feil og oppretter en ny revert-commit. Den sender feilcommiten til en ny lokal bare remote og kloner en arbeidskopi B som mottar den. Deretter oppretter den revert-commit i A, pusher denne og lar B hente den med fetch. Den kontrollerer at B sin lokale main fortsatt peker til feilcommiten mens B sin origin/main peker til rettelsen. Ingen GitHub-konto er nødvendig.',
        revert,
        'Revert "Feil: krev telefonnummer"\nRevert ...\nFeil: krev telefonnummer',
      ),
      question(
        'GIT-M06-E11',
        'Revert-commiten er opprettet og testet. Hvilket utsagn beskriver historikken riktig?',
        [
          [
            'a',
            'Den problematiske commiten er slettet fra all historikk.',
            false,
            'Revert legger normalt til en ny commit. Den opprinnelige commiten forblir registrert.',
          ],
          [
            'b',
            'En ny commit reverserer den valgte endringen; tidligere historikk bevares.',
            true,
            'Riktig. Det er nettopp derfor revert ofte passer bedre i delt historie.',
          ],
          [
            'c',
            'Revert har automatisk fjernet alle andre feil som er registrert i repositoryet.',
            false,
            'Revert er rettet mot konkrete endringer. Den verifiserer ikke hele funksjonaliteten.',
          ],
        ],
        'Hva viser `git log` etter en vanlig revert?',
      ),
      question(
        'GIT-M06-E12',
        'En feilaktig commit er fulgt av to nyttige commits som bygger videre på deler av samme funksjon. Hva må vurderes før revert?',
        [
          [
            'a',
            'Om reverseringen også kan påvirke senere arbeid, og om en målrettet ny rettelse er bedre.',
            true,
            'Riktig. Tidsrekkefølge alene avgjør ikke om en revert gir ønsket sluttresultat.',
          ],
          [
            'b',
            'Bare om `git status` viser ren working tree; det garanterer at funksjonen virker.',
            false,
            'Ren Git-status er ikke en funksjonell test og sier ingenting om avhengighetene i senere commits.',
          ],
          [
            'c',
            'Bare om commitmeldingen inneholder ordet «feil».',
            false,
            'Commitmeldingens ordlyd er ikke bevis for hvilke endringer eller avhengigheter en revert påvirker.',
          ],
        ],
        'Hvilken faktisk kode kan bli reversert, og hvem er avhengig av den?',
      ),
    ],
  },
  {
    missionId: 'GIT-M06-O07',
    title: 'Velg trygg handling i en ny situasjon',
    goal: 'Gjøre en begrunnet beslutning om lokal endring, delt historie og begrenset gjenoppretting.',
    skillId: 'GIT-M06-DECIDE',
    flow: [
      text(
        '### Nå er det din vurdering\n\nDu har sett hvordan to endringer som begge omtales som «feil», kan ligge på helt forskjellige steder. Før en reparasjon må du vite om du ønsker å bevare en arbeidsfil, endre staging, flytte en lokal referanse eller lage en ny commit. En kommando kan være teknisk riktig og samtidig uegnet for situasjonen. Ikke velg en metode før du kan beskrive hva den skal endre.',
      ),
      text(
        '### Nytt prosjekt: registrering til et arrangement\n\nTo utviklere vedlikeholder en enkel registreringsside. En tidligere PR ble merget til `main` og hentet av begge. Etter publisering ser de at en valgfri e-postadresse feilaktig blir obligatorisk. En annen utvikler har allerede begynt en ny funksjon som bruker den samme valideringskoden. På din egen maskin har du samtidig en ikke-staget endring i `bekreftelse.txt` med en nyttig melding som ikke er kopiert eller committet. Du skal ikke slette den. Teamet trenger å rette den publiserte feilen uten å overskrive hverandres arbeid.',
      ),
      question(
        'GIT-M06-E13',
        'Hva er den beste første handlingen i arrangementssiden?',
        [
          [
            'a',
            'Kjøre `reset --hard HEAD~1` slik at hele arbeidskopien blir lik den forrige commiten.',
            false,
            'Dette kan overskrive den nyttige lokale meldingen og løser ikke den delte historikken hos de andre.',
          ],
          [
            'b',
            'Undersøke lokal status og den problematiske commiten, bevare meldingen og kartlegge avhengigheten før valg av ny rettelse eller revert.',
            true,
            'Riktig. Først må vi sikre lokalt arbeid og forstå hvilken delt kode en korrigering vil berøre.',
          ],
          [
            'c',
            'Kjøre force-push av en eldre main fordi feilen opprinnelig kom fra en PR.',
            false,
            'Det kan omskrive delt historikk og ignorere både senere arbeid og den lokale meldingen.',
          ],
        ],
        'Hva er delt, hva er lokalt og hva må bevares?',
      ),
      question(
        'GIT-M06-E14',
        'En kollega foreslår revert av hele PR-endringen, men den nyere funksjonen er avhengig av deler av denne koden. Hvilken vurdering er mest relevant?',
        [
          [
            'a',
            'Revert er alltid riktig så lenge PR-en hadde godkjenning.',
            false,
            'Godkjenning sier ikke at en full reversering er korrekt i den nye tilstanden.',
          ],
          [
            'b',
            'Velge mellom en målrettet korrigerende commit og revert ut fra faktisk kode, avhengigheter, kontroller og risiko.',
            true,
            'Riktig. Fix forward kan bevare nyttig funksjonalitet; revert kan være relevant når det er tryggere å ta ut endringen samlet.',
          ],
          [
            'c',
            'Fjerne begge utviklernes lokale branches; da løses feilen uten nye commits.',
            false,
            'Sletting av branches løser ikke programfeilen og kan gjøre arbeid vanskeligere å finne igjen.',
          ],
        ],
        'Hva skjer med senere endringer hvis hele den tidligere endringen reverseres?',
      ),
      question(
        'GIT-M06-E15',
        'Etter at teamet har valgt og integrert en korrigering, er alle Git-kontroller grønne. Hva er en forsvarlig konklusjon?',
        [
          [
            'a',
            'Endringen er kontrollert innenfor de aktuelle kontrollenes omfang; funksjonen og relevante avhengigheter må fortsatt vurderes mot behovet.',
            true,
            'Riktig. Ren status, grønn CI eller vellykket merge beviser ikke universell funksjonell korrekthet.',
          ],
          [
            'b',
            'Alle brukernes registreringer er dermed dokumentert korrekte.',
            false,
            'Git-kontroller og CI beviser ikke i seg selv hvordan reelle brukere og data påvirkes.',
          ],
          [
            'c',
            'Det er unødvendig å undersøke historikken siden Git automatisk reparerer regressjoner.',
            false,
            'Git bevarer og endrer versjoner, men avgjør ikke automatisk hva programmet burde gjøre.',
          ],
        ],
        'Hva ble faktisk kontrollert?',
      ),
      reflection(
        'GIT-M06-E16',
        'Forklar med egne ord hvordan du ville håndtert arrangementssiden. Beskriv hvilke opplysninger du først trenger, hvordan du bevarer `bekreftelse.txt`, hva du må vurdere før fix forward eller revert, og hvordan du ville kontrollert resultatet. Du trenger ikke dele en faktisk Git-logg eller bruke GitHub.',
      ),
      {
        t: 'recap',
        can: [
          'Undersøke Git-status, staged og ikke-staged diff og commit-historikk før endring.',
          'Skille restore, reset, revert, stash og reflog ut fra hvilken tilstand de påvirker.',
          'Utføre avgrenset unstage, restore, soft reset, stash/apply, reflog-basert sikring og revert i et syntetisk repository.',
          'Forklare hvorfor delt historikk, aldri-registrerte filer og senere avhengigheter endrer risikovurderingen.',
          'Velge og begrunne neste sikre handling i et nytt problem uten å bruke destruktiv opprydding.',
        ],
        next: 'M07 samler disse ferdighetene i ett lite utviklingsprosjekt: opprettelse, endringer, branches, samarbeid, review, kontroll og trygg feilretting i sammenheng.',
      },
    ],
  },
];
