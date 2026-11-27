// M07 — Git og GitHub i et utviklingsprosjekt.
// Canonical build-time instructional source; no runtime or GitHub integration.
// The practice remote is a local bare Git repository, not a GitHub PR.
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
const reflection = (id, prompt) => ({
  id,
  type: 'reflect',
  prompt,
  choices: null,
  hints: [],
});
const command = (heading, explanation, script, stdout = '') => [
  text('### ' + heading + '\n\n' + explanation),
  {
    t: 'code',
    file: 'Kommando – Windows PowerShell 5.1',
    code: '& {\n' + script + '\n}',
    stdin: '',
    stdout,
    error: '',
    error_info: null,
    nb: '',
  },
];

// All exercise operations remain under a collision-checked new folder in Documents.
// Content files use UTF-8 without BOM and LF to avoid line-ending ambiguity.
const writeHelper = String.raw`function Write-PracticeFile([string]$path, [string]$contents) {
  $lf = [string][char]10
  $crlf = ([string][char]13) + $lf
  $utf8 = New-Object System.Text.UTF8Encoding -ArgumentList $false
  [System.IO.File]::WriteAllText($path, $contents.Replace($crlf, $lf), $utf8)
}`;
const base = String.raw`$ErrorActionPreference = 'Stop'
$null = Get-Command git.exe -ErrorAction Stop
$null = Get-Command node.exe -ErrorAction Stop
$docs = [Environment]::GetFolderPath('MyDocuments')
if (-not $docs -or -not (Test-Path -LiteralPath $docs -PathType Container)) { throw 'STOPP: Dokumenter-mappen mangler.' }
$root = Join-Path $docs 'ProgressPal-Git-M07'
$a = Join-Path $root 'utvikler-A'
$b = Join-Path $root 'utvikler-B'
$remote = Join-Path $root 'felles.git'
if (-not (Test-Path -LiteralPath (Join-Path $a '.git') -PathType Container) -or
    -not (Test-Path -LiteralPath (Join-Path $b '.git') -PathType Container) -or
    -not (Test-Path -LiteralPath (Join-Path $remote 'HEAD') -PathType Leaf)) { throw 'STOPP: M07-fixturen mangler. Gjennomfør oppsettet først.' }
$actualA = & git.exe -C "$a" rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0 -or $actualA.Replace('/', '\') -ne $a) { throw 'STOPP: Feil arbeidskopi A.' }
$actualB = & git.exe -C "$b" rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0 -or $actualB.Replace('/', '\') -ne $b) { throw 'STOPP: Feil arbeidskopi B.' }
${writeHelper}`;
// Use a function rather than interpolating the helper into a String.raw literal.
const guard = base.replace('${writeHelper}', writeHelper);
const must = (commandText) =>
  commandText +
  "\nif ($LASTEXITCODE -ne 0) { throw 'STOPP: Kommando feilet. Les utskriften før du gjør noe mer.' }";
const clean = (copy, branch) =>
  String.raw`$onBranch = & git.exe -C "${copy}" branch --show-current
if ($LASTEXITCODE -ne 0 -or $onBranch -ne '${branch}') { throw 'STOPP: Uventet branch.' }
$pending = & git.exe -C "${copy}" status --porcelain
if ($LASTEXITCODE -ne 0 -or -not [string]::IsNullOrEmpty(($pending -join ''))) { throw 'STOPP: Arbeidskopien har endringer. Undersøk status; ikke rydd automatisk.' }`;
const setup = String.raw`$ErrorActionPreference = 'Stop'
$null = Get-Command git.exe -ErrorAction Stop
$null = Get-Command node.exe -ErrorAction Stop
$docs = [Environment]::GetFolderPath('MyDocuments')
if (-not $docs -or -not (Test-Path -LiteralPath $docs -PathType Container)) { throw 'STOPP: Dokumenter-mappen mangler.' }
$root = Join-Path $docs 'ProgressPal-Git-M07'
if (Test-Path -LiteralPath $root) { throw 'STOPP: M07-mappen finnes allerede. Ikke overskriv den.' }
New-Item -ItemType Directory -Path $root -ErrorAction Stop | Out-Null
$a = Join-Path $root 'utvikler-A'
$b = Join-Path $root 'utvikler-B'
$remote = Join-Path $root 'felles.git'
${writeHelper}
`;
const setupBody =
  setup.replace('${writeHelper}', writeHelper) +
  String.raw`
` +
  must('& git.exe init --bare --initial-branch=main "$remote"') +
  '\n' +
  must('& git.exe init --initial-branch=main "$a"') +
  '\n' +
  must('& git.exe -C "$a" config --local user.name "M07 Utvikler A"') +
  '\n' +
  must('& git.exe -C "$a" config --local user.email "a@example.invalid"') +
  '\n' +
  String.raw`
Write-PracticeFile (Join-Path $a 'README.md') @'
# Påmelding – lokalt undervisningsprosjekt

Åpne index.html i nettleseren. Ingen registreringer sendes eller lagres.
Kontroller funksjonsreglene med node.exe kontroller.cjs fra prosjektmappen.
Endringer skal begrunnes og gjennomgås før de tas inn i felles main.
'@
Write-PracticeFile (Join-Path $a 'index.html') @'
<!doctype html>
<html lang="nb">
<head><meta charset="utf-8"><title>Påmelding</title></head>
<body>
  <h1>Påmelding til arrangement</h1>
  <form id="skjema">
    <label for="navn">Navn</label>
    <input id="navn" name="navn" required>
    <label for="telefon">Telefon (valgfritt)</label>
    <input id="telefon" name="telefon">
    <button type="submit">Kontroller påmelding</button>
  </form>
  <p id="resultat" role="status" aria-live="polite"></p>
  <script src="valider.js"></script>
  <script src="app.js"></script>
</body>
</html>
'@
Write-PracticeFile (Join-Path $a 'valider.js') @'
function vurderPaamelding(navn, telefon) {
  const ryddigNavn = String(navn).trim();
  if (!ryddigNavn) return 'Skriv inn navn.';
  return 'Klar for: ' + ryddigNavn;
}
if (typeof module !== 'undefined') module.exports = { vurderPaamelding };
'@
Write-PracticeFile (Join-Path $a 'app.js') @'
const skjema = document.getElementById('skjema');
skjema.addEventListener('submit', (event) => {
  event.preventDefault();
  const navn = skjema.elements.namedItem('navn').value;
  const telefon = skjema.elements.namedItem('telefon').value;
  document.getElementById('resultat').textContent = vurderPaamelding(navn, telefon);
});
'@
Write-PracticeFile (Join-Path $a 'kontroller.cjs') @'
const assert = require('node:assert/strict');
const { vurderPaamelding } = require('./valider.js');
assert.equal(vurderPaamelding('', ''), 'Skriv inn navn.');
assert.equal(vurderPaamelding('   ', ''), 'Skriv inn navn.');
assert.equal(vurderPaamelding('Ada', ''), 'Klar for: Ada');
console.log('PASS: navn og tomt valgfritt telefonfelt');
'@
Write-PracticeFile (Join-Path $a 'oppgave.md') @'
# Bestilling fra arrangøren

Et navn er påkrevd. Telefon er frivillig.
Dersom telefon fylles ut, må den inneholde akkurat åtte siffer (0–9).
Ugyldig telefon skal gi meldingen: Telefon må ha åtte siffer.
Tom telefon skal fortsatt være gyldig. Ingen persondata skal lagres.
'@
` +
  must(
    '& git.exe -C "$a" add -- README.md index.html valider.js app.js kontroller.cjs oppgave.md',
  ) +
  '\n' +
  must('& git.exe -C "$a" commit -m "Opprett lokal påmeldingsside"') +
  '\n' +
  must('& git.exe -C "$a" remote add origin "$remote"') +
  '\n' +
  must('& git.exe -C "$a" push -u origin main') +
  '\n' +
  must('& git.exe clone --branch main "$remote" "$b"') +
  '\n' +
  must('& git.exe -C "$b" config --local user.name "M07 Utvikler B"') +
  '\n' +
  must('& git.exe -C "$b" config --local user.email "b@example.invalid"') +
  '\n' +
  must('& node.exe (Join-Path $a "kontroller.cjs")') +
  '\n' +
  must('& git.exe -C "$a" status --short') +
  '\n' +
  must('& git.exe -C "$b" status --short');

const inspect =
  guard +
  '\n' +
  clean('$a', 'main') +
  '\n' +
  clean('$b', 'main') +
  '\n' +
  must('& git.exe -C "$a" --no-pager log -1 --oneline') +
  '\n' +
  must('& git.exe -C "$a" remote -v') +
  '\n' +
  must('& git.exe -C "$a" status --short') +
  '\n' +
  must('& node.exe (Join-Path $a "kontroller.cjs")');

const aFirst =
  guard +
  '\n' +
  clean('$a', 'main') +
  '\n' +
  must('& git.exe -C "$a" switch -c feature/telefon') +
  String.raw`
$file = Join-Path $a 'valider.js'
$original = [System.IO.File]::ReadAllText($file)
$needle = "  return 'Klar for: ' + ryddigNavn;"
if (-not $original.Contains($needle)) { throw 'STOPP: Uventet valider.js. Ikke overskriv.' }
$new = "  const nummer = String(telefon);" + [string][char]10 +
       "  if (nummer !== '' && nummer.length !== 8) return 'Telefon må ha åtte siffer.';" + [string][char]10 + $needle
Write-PracticeFile $file $original.Replace($needle, $new)
` +
  must('& node.exe (Join-Path $a "kontroller.cjs")') +
  '\n' +
  must('& git.exe -C "$a" --no-pager diff -- valider.js') +
  '\n' +
  must('& git.exe -C "$a" add -- valider.js') +
  '\n' +
  must('& git.exe -C "$a" --no-pager diff --staged -- valider.js') +
  '\n' +
  must('& git.exe -C "$a" commit -m "Kontroller lengden på telefonnummer"') +
  '\n' +
  must('& git.exe -C "$a" push -u origin feature/telefon') +
  '\n' +
  must('& git.exe -C "$a" status --short');

const bReview =
  guard +
  '\n' +
  clean('$b', 'main') +
  '\n' +
  must('& git.exe -C "$b" fetch origin') +
  '\n' +
  must(
    '& git.exe -C "$b" --no-pager log --oneline origin/main..origin/feature/telefon',
  ) +
  '\n' +
  must(
    '& git.exe -C "$b" --no-pager diff origin/main..origin/feature/telefon -- valider.js',
  ) +
  '\n' +
  must('& git.exe -C "$b" status --short');

const aReviewFix =
  guard +
  '\n' +
  clean('$a', 'feature/telefon') +
  String.raw`
$file = Join-Path $a 'valider.js'
$tests = Join-Path $a 'kontroller.cjs'
$source = [System.IO.File]::ReadAllText($file)
$old = "if (nummer !== '' && nummer.length !== 8)"
if (-not $source.Contains($old)) { throw 'STOPP: Uventet telefonkontroll.' }
$originalTests = [System.IO.File]::ReadAllText($tests)
$anchor = "console.log('PASS: navn og tomt valgfritt telefonfelt');"
if (-not $originalTests.Contains($anchor)) { throw 'STOPP: Uventet testfil.' }
$more = "assert.equal(vurderPaamelding('Ada', 'abcdefgh'), 'Telefon må ha åtte siffer.');" + [string][char]10 +
        "assert.equal(vurderPaamelding('Ada', '1234567'), 'Telefon må ha åtte siffer.');" + [string][char]10 +
        "assert.equal(vurderPaamelding('Ada', '12345678'), 'Klar for: Ada');" + [string][char]10
Write-PracticeFile $tests $originalTests.Replace($anchor, $more + "console.log('PASS: navn og telefonkrav');")
& node.exe (Join-Path $a 'kontroller.cjs')
if ($LASTEXITCODE -eq 0) { throw 'STOPP: Den bevisst mangelfulle kontrollen ble ikke fanget. Undersøk fixturen.' }
Write-Host 'FORVENTET RØD TEST: åtte bokstaver ble feilaktig godtatt.'
$fixed = "if (nummer !== '' && !/^[0-9]{8}$/.test(nummer))"
Write-PracticeFile $file $source.Replace($old, $fixed)
` +
  must('& node.exe (Join-Path $a "kontroller.cjs")') +
  '\n' +
  must('& git.exe -C "$a" --no-pager diff -- valider.js kontroller.cjs') +
  '\n' +
  must('& git.exe -C "$a" add -- valider.js kontroller.cjs') +
  '\n' +
  must(
    '& git.exe -C "$a" commit -m "Avvis telefon med andre tegn enn åtte siffer"',
  ) +
  '\n' +
  must('& git.exe -C "$a" push origin feature/telefon') +
  '\n' +
  must('& git.exe -C "$a" status --short');

const bParallel =
  guard +
  '\n' +
  clean('$b', 'main') +
  '\n' +
  must('& git.exe -C "$b" switch -c feature/hjelpetekst') +
  String.raw`
$file = Join-Path $b 'index.html'
$original = [System.IO.File]::ReadAllText($file)
$needle = '<input id="telefon" name="telefon">'
if (-not $original.Contains($needle)) { throw 'STOPP: Uventet skjema. Ikke skriv over.' }
$more = '<input id="telefon" name="telefon" aria-describedby="telefon-hjelp">' + [string][char]10 +
        '    <p id="telefon-hjelp">Telefon er valgfritt. Hvis du skriver inn telefon, bruk åtte siffer.</p>'
Write-PracticeFile $file $original.Replace($needle, $more)
` +
  must('& git.exe -C "$b" --no-pager diff -- index.html') +
  '\n' +
  must('& git.exe -C "$b" add -- index.html') +
  '\n' +
  must('& git.exe -C "$b" commit -m "Forklar telefonfeltet i skjemaet"') +
  '\n' +
  must('& git.exe -C "$b" push -u origin feature/hjelpetekst') +
  '\n' +
  must('& git.exe -C "$b" status --short');

const integrate =
  guard +
  '\n' +
  clean('$b', 'feature/hjelpetekst') +
  '\n' +
  must('& git.exe -C "$b" switch main') +
  '\n' +
  must('& git.exe -C "$b" fetch origin') +
  '\n' +
  must(
    '& git.exe -C "$b" --no-pager log --oneline origin/main..origin/feature/telefon',
  ) +
  '\n' +
  must(
    '& git.exe -C "$b" --no-pager diff origin/main..origin/feature/telefon -- valider.js kontroller.cjs',
  ) +
  '\n' +
  must('& git.exe -C "$b" merge --no-ff --no-edit origin/feature/telefon') +
  '\n' +
  must('& node.exe (Join-Path $b "kontroller.cjs")') +
  '\n' +
  must('& git.exe -C "$b" merge --no-ff --no-edit feature/hjelpetekst') +
  '\n' +
  must('& node.exe (Join-Path $b "kontroller.cjs")') +
  '\n' +
  must('& git.exe -C "$b" --no-pager log --graph --oneline -8') +
  '\n' +
  must('& git.exe -C "$b" status --short') +
  '\n' +
  must('& git.exe -C "$b" push origin main');

const aSync =
  guard +
  '\n' +
  clean('$a', 'feature/telefon') +
  '\n' +
  must('& git.exe -C "$a" switch main') +
  '\n' +
  must('& git.exe -C "$a" fetch origin') +
  '\n' +
  must('& git.exe -C "$a" --no-pager log --oneline main..origin/main') +
  '\n' +
  must('& git.exe -C "$a" merge --ff-only origin/main') +
  '\n' +
  must('& node.exe (Join-Path $a "kontroller.cjs")') +
  '\n' +
  must('& git.exe -C "$a" status --short');

// This intentionally seeds a historical defect ONLY in the disposable local
// teaching remote. It is not a model for shipping known bad code to users.
const seedRegression =
  guard +
  '\n' +
  clean('$b', 'main') +
  String.raw`
$file = Join-Path $b 'valider.js'
$source = [System.IO.File]::ReadAllText($file)
$needle = "if (nummer !== '' && !/^[0-9]{8}$/.test(nummer))"
if (-not $source.Contains($needle)) { throw 'STOPP: Mangler forventet telefonvalidering.' }
$problem = "if (nummer === '' || !/^[0-9]{8}$/.test(nummer))"
Write-PracticeFile $file $source.Replace($needle, $problem)
` +
  must('& git.exe -C "$b" --no-pager diff -- valider.js') +
  '\n' +
  must('& git.exe -C "$b" add -- valider.js') +
  '\n' +
  must(
    '& git.exe -C "$b" commit -m "Øvingshendelse: regresjon i telefonkontroll"',
  ) +
  '\n' +
  must('& git.exe -C "$b" push origin main') +
  String.raw`
& node.exe (Join-Path $b 'kontroller.cjs')
if ($LASTEXITCODE -eq 0) { throw 'STOPP: Den planlagte regresjonen ble ikke påvist av testen.' }
Write-Host 'FORVENTET FEIL: tomt, valgfritt telefonfelt avvises feilaktig.'`;

const diagnose =
  guard +
  '\n' +
  clean('$a', 'main') +
  '\n' +
  must('& git.exe -C "$a" fetch origin') +
  '\n' +
  must('& git.exe -C "$a" --no-pager log --oneline main..origin/main') +
  '\n' +
  must('& git.exe -C "$a" merge --ff-only origin/main') +
  '\n' +
  must('& git.exe -C "$a" --no-pager show --stat HEAD') +
  String.raw`
& node.exe (Join-Path $a 'kontroller.cjs')
if ($LASTEXITCODE -eq 0) { throw 'STOPP: Forventet regresjon ble ikke funnet.' }
Write-Host 'REGRESJON OBSERVERT: Undersøk koden og commit-historikken før retting.'
` +
  must('& git.exe -C "$a" --no-pager show --format=short HEAD -- valider.js') +
  '\n' +
  must('& git.exe -C "$a" status --short');

const fixForward =
  guard +
  '\n' +
  clean('$a', 'main') +
  '\n' +
  must('& git.exe -C "$a" switch -c feature/rett-telefon') +
  String.raw`
$file = Join-Path $a 'valider.js'
$source = [System.IO.File]::ReadAllText($file)
$bad = "if (nummer === '' || !/^[0-9]{8}$/.test(nummer))"
$good = "if (nummer !== '' && !/^[0-9]{8}$/.test(nummer))"
if (-not $source.Contains($bad)) { throw 'STOPP: Regresjonen har annet innhold. Ikke gjett.' }
Write-PracticeFile $file $source.Replace($bad, $good)
` +
  must('& node.exe (Join-Path $a "kontroller.cjs")') +
  '\n' +
  must('& git.exe -C "$a" --no-pager diff -- valider.js') +
  '\n' +
  must('& git.exe -C "$a" add -- valider.js') +
  '\n' +
  must('& git.exe -C "$a" commit -m "Behold tom telefon som gyldig"') +
  '\n' +
  must('& git.exe -C "$a" push -u origin feature/rett-telefon') +
  '\n' +
  must('& git.exe -C "$a" status --short');

const finish =
  guard +
  '\n' +
  clean('$b', 'main') +
  '\n' +
  must('& git.exe -C "$b" fetch origin') +
  '\n' +
  must(
    '& git.exe -C "$b" --no-pager diff origin/main..origin/feature/rett-telefon -- valider.js',
  ) +
  '\n' +
  must(
    '& git.exe -C "$b" merge --no-ff --no-edit origin/feature/rett-telefon',
  ) +
  '\n' +
  must('& node.exe (Join-Path $b "kontroller.cjs")') +
  '\n' +
  must('& git.exe -C "$b" push origin main') +
  '\n' +
  must('& git.exe -C "$b" status --short') +
  '\n' +
  must('& git.exe -C "$b" --no-pager log -6 --oneline') +
  '\n' +
  must('& git.exe -C "$a" switch main') +
  '\n' +
  must('& git.exe -C "$a" fetch origin') +
  '\n' +
  must('& git.exe -C "$a" merge --ff-only origin/main') +
  '\n' +
  must('& node.exe (Join-Path $a "kontroller.cjs")') +
  '\n' +
  must('& git.exe -C "$a" status --short');

export const gitM07Lessons = [
  {
    missionId: 'GIT-M07-O01',
    title: 'Du overtar et lite utviklingsprosjekt',
    goal: 'Forstå oppgaven, eksisterende funksjon og hva som må være sant før prosjektet kan leveres.',
    skillId: 'GIT-M07-OPPDRAG',
    flow: [
      text(
        '### JavaScript du trenger i denne øvingen\n\n- `function`: En del av koden du kan bruke flere ganger.\n- `String(navn).trim()`: Gjør navnet om til tekst og fjerner mellomrom i starten og slutten.\n- `return`: Gir resultatet tilbake til koden som kaller funksjonen.\n- `require(...)`: Henter inn kode, for eksempel funksjonen og testverktøyet i Node.js.\n- `assert.equal(faktisk, forventet)`: Sjekker om resultatet er som forventet.\n\nDu trenger ikke lære resten av JavaScript nå. En bestått test forteller at de testede tilfellene virker.',
      ),
      text(
        '### Fra enkeltkommandoer til en arbeidsflyt\n\nI M01–M06 lærte du å registrere versjoner, undersøke historikk, arbeide på branches, dele endringer, behandle en pull request og rette Git-feil. Nå skal du bruke dette i sammenheng. Du overtar en enkel påmeldingsside for et arrangement sammen med en annen utvikler. Den første versjonen fungerer med navn. Telefonfeltet vises, men blir ennå ikke validert. Arrangøren har bedt om en endring: Hvis noen oppgir telefon, skal nummeret inneholde nøyaktig åtte siffer. Et tomt telefonfelt skal fortsatt være tillatt.',
      ),
      text(
        'En utviklingsoppgave handler ikke først og fremst om å få noe nytt inn i en commit. Den handler om å finne ut hva som trengs, gjøre en avgrenset endring og kontrollere virkningen. Vi bruker **akseptansekriterier**: forhold vi kan undersøke for å avgjøre om oppgaven er løst. Her er kravene til skjemaet:\n\n- Navn er påkrevd.\n- Tomt telefonfelt: godtas.\n- `12345678`: godtas.\n- `1234567`: avvises.\n- `abcdefgh`: avvises.\n- Ingen påmeldinger skal lagres.\n\nTest disse tilfellene. Git-status alene kan ikke fortelle deg om skjemaet virker.',
      ),
      text(
        'Prosjektet består av `index.html` (skjemaet brukeren ser), `app.js` (kobler skjemaet til resultatet), `valider.js` (avgjør om inndata skal godkjennes), `kontroller.cjs` (noen enkle maskinelle kontroller), `oppgave.md` (bestillingen) og `README.md` (hvordan prosjektet brukes). `main` er felles utviklingslinje. Utvikler A arbeider med valideringen. Utvikler B forbedrer skjemaets hjelpetekst. Du skal se hvordan begge endringer kan bli del av samme produkt.',
      ),
      note(
        'Dette er et lokalt øvingsprosjekt med syntetiske filer. Det sender ingen påmeldinger, bruker ingen ekte telefonnumre og krever ikke GitHub-konto. To arbeidskopier simulerer to utviklere; det betyr ikke at en annen person faktisk har reviewet arbeidet ditt. En separat, valgfri GitHub-øvelse kommer senere.',
      ),
      question(
        'GIT-M07-E01',
        'Arrangøren sier: «Telefon er valgfritt, men må ha åtte siffer når det oppgis.» Hvilket testtilfelle følger direkte av kravet?',
        [
          [
            'a',
            'Tomt telefonfelt må avvises.',
            false,
            'Valgfritt betyr at brukeren kan la feltet stå tomt. Å avvise det ville endre bestillingen.',
          ],
          [
            'b',
            'Åtte bokstaver må avvises, selv om lengden er åtte tegn.',
            true,
            'Riktig. Kravet gjelder siffer, ikke bare antall tegn. `abcdefgh` bryter kravet.',
          ],
          [
            'c',
            'Ethvert telefonnummer med mer enn åtte tegn er gyldig dersom navnet er fylt ut.',
            false,
            'Navn og telefon har ulike regler. Gyldig navn opphever ikke telefonkravet.',
          ],
        ],
        'Hva er forskjellen mellom åtte tegn og åtte siffer?',
      ),
      question(
        'GIT-M07-E02',
        'Du skal starte en endring i et eksisterende repository. Hva må du undersøke før du begynner å skrive i filene?',
        [
          [
            'a',
            'Branch, lokale endringer, oppgavebeskrivelsen og hvilke filer som faktisk påvirkes.',
            true,
            'Riktig. Dette gir en kjent starttilstand og reduserer risiko for å blande eller overskrive annet arbeid.',
          ],
          [
            'b',
            'Kontrollere bare at `git status` er ren, og avklare oppgavens krav først etter at endringen er committet.',
            false,
            'Ren status er nyttig, men forteller ikke hva du er bedt om å endre eller hvilke kriterier som gjelder.',
          ],
          [
            'c',
            'Kjøre `git pull` før status og branch er undersøkt, slik at du automatisk får riktig utgangspunkt.',
            false,
            'Pull kan endre den aktive branchen. Undersøk først hva du står på og hvilket arbeid som må bevares.',
          ],
        ],
        'Hvilke opplysninger trenger en utvikler for å vite hva som kan endres trygt?',
      ),
      text(
        '### Fra oppgave til ferdig endring\n\n1. Undersøk prosjektet og avgrens oppgaven.\n2. Opprett en branch.\n3. Gjør endringen og sjekk at den virker.\n4. Vis diffen og få tilbakemelding når det er relevant.\n5. Rett eventuelle problemer, merge og sjekk prosjektet igjen.\n\nArbeidsrekkefølgen kan variere fra prosjekt til prosjekt.',
      ),
    ],
  },
  {
    missionId: 'GIT-M07-O02',
    title: 'Lag og undersøk prosjektet',
    goal: 'Lage et lokalt øvingsprosjekt og undersøke filene, historikken og Git-statusen før du endrer noe.',
    skillId: 'GIT-M07-OVERSIKT',
    flow: [
      text(
        'Før oppsett: åpne vanlig **Windows PowerShell 5.1** og kjør `git --version` og `node --version` hver for seg. Begge må gi en versjon; Git må være 2.28 eller nyere for oppsettkommandoen. Hvis en kommando ikke finnes, stopp her, følg den offisielle installasjonsveiledningen for Git eller Node.js, åpne en ny terminal og kontroller på nytt. På en administrert maskin følger du skolens eller arbeidsgiverens regler. Du trenger ingen GitHub-konto. Øvingen bruker `node.exe` til lokale JavaScript-tester; PowerShell-blokkene rundt `git.exe` og `node.exe` sjekker mapper, branch og feil før de fortsetter.',
      ),
      text(
        '### Tre mapper, to utviklere, ett felles Git-repository\n\nDu skal arbeide i `ProgressPal-Git-M07` under Dokumenter. `utvikler-A` og `utvikler-B` er to arbeidskopier. `felles.git` er en lokal **bare remote** som lagrer Git-objekter og branches, men ingen vanlig arbeidsfilvisning. Begge utviklerne kan sende og hente commits via den. Ingen av mappene har forbindelse til GitHub. Kommandoene bruker absolutte mappebaner og lokale Git-identiteter slik at eksisterende prosjekter ikke berøres.',
      ),
      text(
        'Åpne **Windows PowerShell 5.1** som vanlig bruker. Du trenger Git med støtte for `--initial-branch` og Node.js for den lille testfilen; begge må allerede være installert. Følgende oppsett lager en ny mappe og stopper dersom mappen finnes. Ikke lim inn koden i et eksisterende prosjekt. Hvis oppsettet stopper underveis, undersøk den opprettede M07-mappen før du vurderer videre tiltak; ikke slett den automatisk.',
      ),
      command(
        'Opprett et reelt, lokalt prosjekt',
        'Kopier hele blokken i Windows PowerShell 5.1. Den lager filene, en første commit, lokal remote og utviklerkopi B. Den siste kontrollen skal vise at de to arbeidskopiene ikke har lokale endringer, og at de opprinnelige funksjonstestene består.',
        setupBody,
        'PASS: navn og tomt valgfritt telefonfelt\nIngen linjer under status --short for A og B.',
      ),
      text(
        'Åpne deretter `index.html` fra `utvikler-A` i nettleseren. Prøv navnet «Ada» med tom telefon. Skjemaet skal gi «Klar for: Ada». Skriv så `abcdefgh` i telefonfeltet. Den første versjonen gir fremdeles en bekreftelse: det er den konkrete mangelen vi skal arbeide med. Nettleseren og Node-kontrollen undersøker forskjellige ting: Node-kontrollen undersøker returverdier fra valideringsfunksjonen, mens du selv ser om skjemaet viser resultatet. Ingen av dem er en full tilgjengelighets- eller produksjonstest.',
      ),
      command(
        'Finn kjent starttilstand',
        'Blokken leser branch, remote og historikk fra A, og kontrollerer at begge kopier står på ren `main`. `log` viser en commit for grunnversjonen. `status --short` skal være tom.',
        inspect,
        'Opprett lokal påmeldingsside\nPASS: navn og tomt valgfritt telefonfelt',
      ),
      question(
        'GIT-M07-E03',
        'Utvikler A committer en lokal endring, men har ennå ikke pushet. Utvikler B ser ingen ny commit etter å ha undersøkt sin egen lokale main. Hva er den riktige forklaringen?',
        [
          [
            'a',
            'B må installere GitHub, fordi Git ikke kan dele historikk lokalt.',
            false,
            'Den lokale bare remoten er tilstrekkelig for å dele commits. GitHub er en separat plattform.',
          ],
          [
            'b',
            'A sin lokale commit blir ikke automatisk en del av remoten eller B sin historikk.',
            true,
            'Riktig. Git lagrer først commiten lokalt. Push og deretter fetch/integrering er egne handlinger.',
          ],
          [
            'c',
            'B kan kjøre `git switch feature/telefon` for å hente A sin commit, selv om ingen remote har mottatt den.',
            false,
            'Å bytte branch kan ikke hente commits som bare finnes i en annen, udelt arbeidskopi.',
          ],
        ],
        'Hvor finnes den nye commiten før noen har pushet den?',
      ),
      reflection(
        'GIT-M07-E04',
        'Forklar med egne ord hva `utvikler-A`, `utvikler-B` og `felles.git` brukes til. Hva viser ren status? Beskriv også hva som faktisk skjedde i nettleseren med telefonverdien `abcdefgh`.',
      ),
    ],
  },
  {
    missionId: 'GIT-M07-O03',
    title: 'Fra oppgave til forslag på egen branch',
    goal: 'Gjøre en liten kodeendring, sjekke staging area og lage en commit med bare den endringen.',
    skillId: 'GIT-M07-ENDRING',
    flow: [
      text(
        'Fortsetter du etter å ha lukket terminalen, åpner du Windows PowerShell på nytt og undersøker den eksisterende `ProgressPal-Git-M07`-mappen. `utvikler-A` og `utvikler-B` har hver sin branch og Git-status, mens `felles.git` er den lokale delte historikken. Kjør ikke oppsettet igjen når mappen finnes. Hvis du ble avbrutt midt i en blokk, bruk Git-status og logg for å finne siste gjennomførte steg før du velger neste handling. Ikke gjenta en push, branch-opprettelse eller commit uten å vite om den allerede lyktes.',
      ),
      text(
        '### Løs én oppgave om gangen\n\nUtvikler A skal begynne på telefonvalideringen. `main` representerer den delte grunnversjonen; `feature/telefon` brukes for arbeidet som ennå ikke er integrert. I første forsøk kontrollerer A bare lengden. Vi lar en svakhet stå igjen med vilje, slik at en senere review kan avdekke den. Dette er en **øvingskandidat**, ikke en anbefaling om å integrere kjent ufullstendig kode.',
      ),
      command(
        'Gjør første endring og del feature-branchen',
        'Kjør etter oppsett og inspeksjon. Blokken kontrollerer ren `main`, oppretter en branch, endrer bare `valider.js`, viser diff og staged diff, committer og pusher til den lokale remoten. Den første testfilen kontrollerer foreløpig navn og tom telefon, ikke hele det nye telefonkravet.',
        aFirst,
        'PASS: navn og tomt valgfritt telefonfelt\n[new branch] feature/telefon',
      ),
      text(
        '### Hvorfor er det ikke ferdig?\n\nKoden avviser `1234567` fordi lengden er sju, men den godtar også `abcdefgh` fordi lengden er åtte. Den eksisterende testen består, men dekker ikke denne forskjellen. Her ser du hvorfor en grønn test ikke betyr at alle akseptansekriterier er oppfylt. En god beskrivelse av forslaget bør derfor si: «Jeg har lagt inn en lengdekontroll og kontrollert de opprinnelige testene. Jeg har ikke kontrollert at alle tegn er siffer.»',
      ),
      question(
        'GIT-M07-E05',
        'A har brukt `git add -- valider.js`. `git diff --staged` viser bare valideringen, mens README er uendret. Hva er den presise konklusjonen?',
        [
          [
            'a',
            'Den neste commiten vil ta med den staged endringen i valider.js, ikke automatisk alle prosjektfiler som er synlige på disken.',
            true,
            'Riktig. Staging bestemmer hvilke endringer som inngår i neste commit.',
          ],
          [
            'b',
            'README blir slettet fra historikken fordi den ikke ble lagt til på nytt.',
            false,
            'En fil Git allerede følger, blir fortsatt med i den nye versjonen selv om den ikke er endret.',
          ],
          [
            'c',
            'Push oppretter automatisk en GitHub-PR for den staged filen.',
            false,
            'Push deler commits med en remote. Den lokale remoten har ingen PR-funksjon.',
          ],
        ],
        'Hva velger staging, og hva bevarer Git fra tidligere commits?',
      ),
      question(
        'GIT-M07-E06',
        'Forslaget godtar `abcdefgh` som telefon og den eksisterende Node-testen er grønn. Hva bør A rapportere før gjennomgang?',
        [
          [
            'a',
            'At prosjektet er produksjonsklart fordi Node ikke fant feil.',
            false,
            'Testene undersøker bare tilfellene de inneholder; det nye kriteriet er ennå ikke oppfylt.',
          ],
          [
            'b',
            'At lengdekontrollen er innført, men at sifferkravet ikke er dekket og må korrigeres før integrering.',
            true,
            'Riktig. En presis endringsbeskrivelse skiller utført arbeid fra gjenstående risiko.',
          ],
          [
            'c',
            'At alle akseptansekriteriene er oppfylt fordi push til remoten lyktes.',
            false,
            'Push overfører commits, men vurderer ikke om endringen oppfyller kravene.',
          ],
        ],
        'Hva er observert, og hva er fortsatt uoppfylt?',
      ),
      text(
        'En forståelig commit-melding sier noe om endringen, ikke at arbeidet nødvendigvis er perfekt. En ufullstendig feature branch kan være et legitimt sted å be om tidlig tilbakemelding. Det er noe annet enn å integrere den i felles `main` før vesentlige krav er oppfylt.',
      ),
    ],
  },
  {
    missionId: 'GIT-M07-O04',
    title: 'En review som fører til bedre kode',
    goal: 'Undersøke forslaget til en annen utvikler, finne en feil og rette den.',
    skillId: 'GIT-M07-REVIEW',
    flow: [
      text(
        '### Se endringen fra B sitt ståsted\n\nUtvikler B har fått i oppdrag å vurdere A sitt forslag. B kjenner kriteriene fra `oppgave.md`, men har ikke A sine lokale arbeidsfiler. Før gjennomgang henter B remote-referansene med `fetch`, leser committen og sammenligner `origin/feature/telefon` med `origin/main`. Dette endrer ikke B sin lokale `main`. En konkret gjennomgang begynner med **hva endringen skal oppnå**, ikke med om Git lot den pushes.',
      ),
      command(
        'Undersøk feature-branchen fra B',
        'Kjør i PowerShell. B forblir på ren `main`. Les diffen mot kravteksten: `nummer.length !== 8` sjekker lengde, ikke at alle tegn er siffer.',
        bReview,
        "+  if (nummer !== '' && nummer.length !== 8) ...",
      ),
      text(
        '### En begrunnet tilbakemelding\n\nB kan si: «I bestillingen står det åtte **siffer**, men løsningen kontrollerer bare at teksten har åtte tegn. `abcdefgh` har riktig lengde og blir feilaktig godtatt. Legg gjerne til en kontroll for dette tilfellet og endre betingelsen.» Det er en etterprøvbar feil med et eksempel. «Jeg liker ikke måten du skrev dette på» er derimot ikke tilstrekkelig begrunnelse for å blokkere en endring.',
      ),
      text(
        'En ny kontroll bør først vise at den konkrete mangelen finnes. Deretter kan koden endres. Slik vet utvikleren hvilken feil som ble rettet, i stedet for å endre koden til testen tilfeldigvis blir grønn. I øvingen legger A til tre testtilfeller: åtte bokstaver skal avvises, sju siffer skal avvises, åtte siffer skal godtas. Den første kjøringen **skal feile** for bokstavtilfellet. Blokken retter deretter valideringen til å bruke et mønster som krever åtte siffer.',
      ),
      command(
        'Reproduser reviewfunnet, rett og send ny commit',
        'Kjør på A sin rene `feature/telefon`. Se på den forventede røde testen og den etterfølgende grønne testen. Ingen historikk blir omskrevet: A lager en ny commit på samme branch og pusher den til lokal remote.',
        aReviewFix,
        'FORVENTET RØD TEST: åtte bokstaver ble feilaktig godtatt.\nPASS: navn og telefonkrav',
      ),
      question(
        'GIT-M07-E07',
        'A legger til en test for `abcdefgh`. Testen feiler før kodeendringen og består etterpå. Hva viser dette?',
        [
          [
            'a',
            'At den påviste feilen nå håndteres i testens konkrete tilfelle, men ikke at alle mulige feil er borte.',
            true,
            'Riktig. Rød-til-grønn demonstrerer den målrettede korrigeringen. Testdekningen har fortsatt grenser.',
          ],
          [
            'b',
            'At GitHub har gjennomført en formell review og godkjent PR-en.',
            false,
            'Dette var lokal Git og lokal testkjøring. Det ble ikke opprettet noen GitHub-PR.',
          ],
          [
            'c',
            'At det ikke lenger er nødvendig å undersøke diffen eller historikken.',
            false,
            'Testen viser om den sjekkede funksjonen virker. Diff og historikk viser hva du endret.',
          ],
        ],
        'Hva sjekker denne testen?',
      ),
      question(
        'GIT-M07-E08',
        'B ønsker å endre variabelnavnet «nummer» ut fra personlig smak, men har ikke påvist misforståelser eller en prosjektstandard. Hva er en relevant respons?',
        [
          [
            'a',
            'Avvis enhver reviewkommentar som ikke beskriver en sikkerhetsfeil.',
            false,
            'Navn og lesbarhet kan være legitime temaer, men bør diskuteres saklig.',
          ],
          [
            'b',
            'Vurder om det faktisk forbedrer lesbarhet eller følger en avtalt standard, og forklar valget.',
            true,
            'Riktig. Skill mellom det programmet må gjøre, og ting som bare handler om smak.',
          ],
          [
            'c',
            'Gjør endringen straks for å unngå uenighet, selv om det ikke er en dokumentert feil.',
            false,
            'Review skal vurderes etter faktisk nytte og teamets regler, ikke ved at alle preferanser behandles som pålegg.',
          ],
        ],
        'Hva skiller en påvist mangel fra en diskutabel preferanse?',
      ),
      reflection(
        'GIT-M07-E09',
        'Beskriv reviewfunnet i egne ord: Hvilket krav var ikke oppfylt, hvilket eksempel avslørte det, hvordan ble endringen kontrollert, og hvorfor er en ny korrigerende commit mer informativ enn å late som første forslag var feilfritt?',
      ),
    ],
  },
  {
    missionId: 'GIT-M07-O05',
    title: 'To utviklere, én felles historikk',
    goal: 'Forstå parallelt arbeid og integrere avgrensede endringer med etterfølgende kontroll.',
    skillId: 'GIT-M07-INTEGRERING',
    flow: [
      text(
        '### Mens A retter koden, arbeider B videre\n\nUtvikler B har sin egen oppgave. I `index.html` står det at telefon er valgfritt, men ingen hjelpetekst forteller hvilke verdier feltet godtar. B legger til forklaringen «Hvis du skriver inn telefon, bruk åtte siffer». Samtidig sørger `aria-describedby` for at hjelpeteksten knyttes til telefonfeltet, også for programvare som leser opp skjemaet. B trenger ikke endre A sin valideringsfunksjon. Dette er to forskjellige endringer som likevel skal fungere sammen.',
      ),
      command(
        'Utvikler B lager sin egen feature branch',
        'Kjør etter at A har pushet den korrigerte valideringen. B står fortsatt på sin egen `main`. Blokken lager `feature/hjelpetekst`, endrer bare `index.html`, viser diff, committer og pusher til lokal remote. B endrer ikke A sin branch.',
        bParallel,
        'Ny feature/hjelpetekst på lokal remote; B har ren arbeidsstatus.',
      ),
      text(
        '### Integrering er en faglig beslutning\n\nFør B integrerer, bør vedkommende se hvilken versjon A faktisk har pushet. Den første A-commiten inneholdt en feil, men den andre rettet den. `git fetch` oppdaterer B sine remote-tracking-referanser. En diff mot `origin/feature/telefon` viser koden som foreslås tatt inn. B skal ikke bare anta at navnet på en branch beskriver dens faktiske innhold.',
      ),
      command(
        'Kontroller og integrer begge endringene',
        'Blokken krever ren B-branch og går tilbake til B sin `main`. Deretter henter den remote-referansene, viser A sin endring, integrerer A-arbeidet, kjører Node-kontroller, integrerer B sin hjelpetekst, kontrollerer igjen og pusher den samlede historikken til lokal `main`. `--no-ff` beholder to tydelige mergehendelser for denne øvingen. Vanlige prosjekter kan bruke andre mergepolicyer.',
        integrate,
        'PASS: navn og tomt valgfritt telefonfelt\nPASS: navn og tomt valgfritt telefonfelt',
      ),
      command(
        'La A hente den ferdige felles historikken',
        'A sin lokale `main` er fremdeles den opprinnelige grunnversjonen. Blokken går fra A sin feature branch til ren `main`, henter endringene og bruker `--ff-only` for å flytte `main` framover uten å lage en ekstra mergecommit. Hvis historikken har endret seg uventet, stopper den i stedet for å tvinge en løsning.',
        aSync,
        'PASS: navn og tomt valgfritt telefonfelt',
      ),
      text(
        'Å åpne `index.html` i nettleseren er fortsatt nødvendig for å se den faktiske opplevelsen: Hjelpeteksten skal vises, åtte siffer skal godtas og ugyldige tegn skal gi feilmelding. Node-testene kontrollerer valideringsfunksjonen, ikke skjemaets visuelle utforming eller tilgjengelighet. En konfliktfri merge kan fortsatt inneholde en funksjonell feil.',
      ),
      question(
        'GIT-M07-E10',
        'B har to branches: `feature/hjelpetekst` endrer HTML, mens `origin/feature/telefon` endrer validering og tester. Hva er et rimelig første tiltak før integrering i B sin main?',
        [
          [
            'a',
            'Undersøke siste remote-tilstand, diffs og relevante kontroller for begge endringene.',
            true,
            'Riktig. Endringene gjelder ulike filer, men skal fungere sammen i samme brukerflyt.',
          ],
          [
            'b',
            'Slette HTML-endringen fordi funksjonskoden ble skrevet først.',
            false,
            'Rekkefølgen arbeidet ble laget i, avgjør ikke om hjelpeteksten har verdi.',
          ],
          [
            'c',
            'Pushe A sin arbeidsmappe direkte over B sin main uten å undersøke historie.',
            false,
            'Det omgår forståelig integrering og kan overskrive eller skjule annet arbeid.',
          ],
        ],
        'Hva må B vite om begge forslagene før de samles?',
      ),
      question(
        'GIT-M07-E11',
        'B har merget begge branches, og `git status --short` er tom. Hva forteller det?',
        [
          [
            'a',
            'At ingen feil kan oppstå ved påmelding.',
            false,
            'Ren Git-status sier ikke om skjemaet virker eller ser riktig ut.',
          ],
          [
            'b',
            'At arbeidskopien ikke har ventende endringer, men funksjon og akseptansekriterier må fortsatt kontrolleres.',
            true,
            'Riktig. Git-status og produktets faktiske atferd er forskjellige kontrollområder.',
          ],
          [
            'c',
            'At GitHub har godkjent begge pull requests.',
            false,
            'All integrering her skjedde i lokal Git uten GitHub.',
          ],
        ],
        'Hva observerer Git, og hva må et produkt kontrolleres for?',
      ),
      question(
        'GIT-M07-E12',
        'Etter B sin push er A sin `main` uendret, men `origin/main` er oppdatert etter `git fetch`. Hva er forskjellen?',
        [
          [
            'a',
            '`origin/main` er en lokal remote-tracking-referanse; A sin `main` må integrere den nye historikken separat.',
            true,
            'Riktig. Fetch oppdaterer kunnskapen om remoten, ikke automatisk den aktive lokale branchen.',
          ],
          [
            'b',
            '`origin/main` er en GitHub-review og oppdaterer automatisk HTML-filen i A sin arbeidskopi.',
            false,
            'Remote-tracking er en Git-mekanisme og ingen reviewtjeneste.',
          ],
          [
            'c',
            'B sine commits er slettet fra felles.git fordi A sin main ikke flyttet seg.',
            false,
            'Remote-commitene finnes fremdeles; A sin lokale branch har bare ikke integrert dem ennå.',
          ],
        ],
        'Hvilken referanse flyttes av fetch, og hvilken krever en egen integrering?',
      ),
      reflection(
        'GIT-M07-E13',
        'Beskriv med egne ord hvordan A og B arbeidet på forskjellige branches. Hvilke commits ble delt via den lokale remoten, hvorfor trengte A en fetch/fast-forward etter B sin integrering, og hvilke deler av påmeldingssiden ville du kontrollert i nettleseren?',
      ),
    ],
  },
  {
    missionId: 'GIT-M07-O06',
    title: 'En regresjon i felles historikk',
    goal: 'Bruke M06-kunnskap i et faktisk prosjekt: undersøke konsekvenser før trygg korrigering.',
    skillId: 'GIT-M07-KORRIGERING',
    flow: [
      text(
        '### Selv gjennomgåtte endringer kan gi nye problemer\n\nTenk deg at en senere endring i telefonvalideringen gjør at tomt telefonfelt blir avvist, selv om feltet skal være valgfritt. Dette kalles en **regresjon**: noe som tidligere fungerte i henhold til kravet, fungerer ikke lenger. Feilen kan oppdages av en bruker, en utvikler eller en test. Det første steget er å undersøke den observerte atferden og historikken, ikke å gjette en reset-kommando.',
      ),
      note(
        'Neste blokk oppretter med vilje en feilaktig commit på `main` i den **syntetiske lokale øvingsremoten**, slik at du kan undersøke delt historikk. Dette er en kontrollert undervisningshendelse, ikke anbefalt arbeidspraksis. I ekte prosjekter skal en kjent feil ikke med vilje publiseres for å demonstrere Git.',
      ),
      command(
        'Opprett en historisk feil bare i øvingsfixturen',
        'Kjør etter integreringen. B sin `main` må være ren og oppdatert. Blokken endrer én kjent betingelse, oppretter en syntetisk regresjonscommit i den lokale remoten og kjører en test som **skal feile**. Ingen ekte GitHub-branch eller brukerdata påvirkes.',
        seedRegression,
        'FORVENTET FEIL: tomt, valgfritt telefonfelt avvises feilaktig.',
      ),
      command(
        'Undersøk feilen fra A sin arbeidskopi',
        'A henter B sin nye commit. `log` og `show` lar deg se hva som er endret. Deretter feiler testen for tom telefon. Les både den konkrete forskjellen i `valider.js` og akseptansekriteriet før du velger et tiltak.',
        diagnose,
        'REGRESJON OBSERVERT: Undersøk koden og commit-historikken før retting.',
      ),
      text(
        '### Hvorfor ikke bare flytte main bakover?\n\nDen problematiske commiten finnes nå i `felles.git` og er tilgjengelig for begge utviklere. En lokal `git reset` på A sin main ville ikke i seg selv endre B sin historikk eller reparere delt kode. En force-push som overskriver delt historikk kan dessuten skade samarbeid. I dette tilfellet er den defekte endringen liten og isolert. En **fix forward** med en ny korrigerende commit beholder en forståelig historikk. En vanlig `git revert` av den problematiske, ikke-merge-commiten kunne også vært en kandidat etter kontroll av avhengigheter. Ingen av dem er automatisk best i enhver situasjon.',
      ),
      command(
        'Rett feilen videre på egen branch',
        'A oppretter en ny branch fra aktuell main, retter den konkrete betingelsen, kontrollerer at alle tilfellene i `kontroller.cjs` består, oppretter en commit og pusher forslaget til lokal remote. Ingen historikk omskrives.',
        fixForward,
        'PASS: navn og tomt valgfritt telefonfelt',
      ),
      command(
        'Integrer korrigeringen og kontroller begge kopier',
        'B henter og undersøker den korrigerende endringen, integrerer den på sin main, kjører testen og pusher. A oppdaterer deretter main med fast-forward. De opprinnelige og korrigerende commitene finnes fortsatt i historikken.',
        finish,
        'PASS i B og PASS i A; begge arbeidskopiene har ren status.',
      ),
      question(
        'GIT-M07-E14',
        'En feilaktig commit ligger i felles main og er hentet av begge utviklere. Hvorfor er `git reset --hard HEAD~1` i A sin arbeidskopi ingen fullstendig teamreparasjon?',
        [
          [
            'a',
            'Fordi lokal reset ikke i seg selv endrer den delte historikken eller B sine commits, og hard reset kan overskrive lokale endringer.',
            true,
            'Riktig. Man må ta hensyn til både lokal tilstand, delt historikk og arbeid som skal bevares.',
          ],
          [
            'b',
            'Fordi Git automatisk sletter alle remotes etter en hard reset.',
            false,
            'Reset fjerner ikke automatisk remotes. Risikoen gjelder særlig referanser og lokale filer.',
          ],
          [
            'c',
            'Fordi GitHub alltid krever en rebase for å reparere en feil.',
            false,
            'GitHub er ikke involvert her, og rebase er ikke en universell reparasjonsmetode.',
          ],
        ],
        'Hvor finnes den feilaktige commiten nå, og hva ville A sin reset faktisk påvirke?',
      ),
      question(
        'GIT-M07-E15',
        'Hva er forskjellen på fix forward og revert i det beskrevne prosjektet?',
        [
          [
            'a',
            'Begge sletter den opprinnelige commiten fullstendig fra alle arbeidskopier.',
            false,
            'Begge kan gjennomføres ved å lage nye commits som bevarer den opprinnelige historikken.',
          ],
          [
            'b',
            'Fix forward retter problemet med ny kode; revert lager en ny commit som forsøker å reversere den tidligere endringen.',
            true,
            'Riktig. Valget avhenger av faktiske endringer, senere avhengigheter og ønsket sluttresultat.',
          ],
          [
            'c',
            'Revert er det samme som å ta en fil ut av staging.',
            false,
            'Unstage påvirker index. Revert korrigerer committet innhold ved hjelp av en ny commit.',
          ],
        ],
        'Hvilket innhold endres, og hvordan bevares historikken?',
      ),
      question(
        'GIT-M07-E16',
        'Etter korrigeringen består alle Node-testene og begge arbeidskopiene er rene. Hvilken konklusjon er forsvarlig?',
        [
          [
            'a',
            'Den dekkede valideringen består testene, og Git-tilstanden er ren; skjemaets faktiske bruk og andre konsekvenser kan fortsatt kreve kontroll.',
            true,
            'Riktig. Testene har et avgrenset omfang; Git-status bekrefter ingen generell brukeropplevelse.',
          ],
          [
            'b',
            'Alle mulige feil i produktet er nå utelukket.',
            false,
            'Et begrenset sett tester kan ikke bevise fravær av alle feil.',
          ],
          [
            'c',
            'Den opprinnelige regresjonscommiten er usynlig for alle fordi den ble korrigert.',
            false,
            'Fix forward bevarer både den feilaktige og den korrigerende commiten i historikken.',
          ],
        ],
        'Hvilke to kontrolltyper har du faktisk gjennomført?',
      ),
    ],
  },
  {
    missionId: 'GIT-M07-O07',
    title: 'Fra lokal øving til GitHub og overlevering',
    goal: 'Forstå hvordan lokal Git-øving skiller seg fra GitHub, og forklare arbeidet til en annen utvikler.',
    skillId: 'GIT-M07-OVERLEVERING',
    flow: [
      text(
        '### Hva ville vært annerledes på GitHub?\n\nI øvingen brukte du `felles.git` til push, fetch og merge på datamaskinen din. Du øvde på samarbeid uten å opprette en pull request på GitHub. En GitHub pull request ville i tillegg gitt et eget forslag med base/head, samtale, reviewtråder og eventuelle automatiserte status checks. Disse mekanismene oppstår **ikke** bare fordi du pusher en branch til en lokal Git-remote. Når et team har regler om godkjenning, må de følges før merge. En godkjent PR eller grønn CI er fremdeles ikke et bevis på at produktet er feilfritt.',
      ),
      text(
        '### Valgfritt: Prøv en pull request på GitHub\n\nBruk et eget repo med bare øvingsfiler. Følg GitHubs veiledning for å opprette repo og logge inn.\n\n1. Opprett en feature branch og push den.\n2. Åpne en PR med `main` som base og feature-branchen som head.\n3. Beskriv hva endringen skal gjøre og hva du har sjekket.\n4. Se på endrede filer, review og status checks.\n5. Merge når du har tillatelse og endringen er klar.\n\nDu trenger ikke gjøre denne øvingen for å fullføre M07.',
      ),
      note(
        'Ikke publiser dine faktiske skole- eller jobbprosjekter som del av øvingen. Ikke lim inn tokens, nøkler, passord, personopplysninger eller terminalutskrifter med hemmeligheter i ProgressPal eller offentlige PR-er. Et repository som er satt til private, er ikke en erstatning for å gjennomgå hva du deler.',
      ),
      text(
        '### En overlevering andre faktisk kan bruke\n\nTenk at du skal forklare den ferdige påmeldingssiden til en medstudent som ikke fulgte øvingen. Si hva som ble forbedret, hvilke branches eller commits som representerer arbeidet, hvilke tilfeller som er kontrollert, og hva kontrollene **ikke** beviser. Nevn for eksempel at funksjonen aksepterer tom telefon og åtte siffer, avviser bokstaver, og at hjelpeteksten er oppdatert. Oppgi at skjemaet ikke lagrer data. Hvis du ikke har åpnet siden i nettleseren etter integrering, si det i stedet for å skrive «alt fungerer».',
      ),
      question(
        'GIT-M07-E17',
        'B har pushet en merge til `felles.git` og ønsker å skrive «Pull request godkjent på GitHub» i overleveringen. Hva er korrekt?',
        [
          [
            'a',
            'Det er korrekt siden enhver Git-merge automatisk oppretter en PR.',
            false,
            'Pull requests er en separat samarbeidsmekanisme på GitHub.',
          ],
          [
            'b',
            'B kan oppgi at endringene ble undersøkt og merget lokalt, men ikke at en faktisk GitHub-PR ble opprettet eller godkjent.',
            true,
            'Riktig. Overleveringen må skille utført Git-arbeid fra ikke-utført plattformarbeid.',
          ],
          [
            'c',
            'B må slette lokal historikk og kopiere kodemappen til GitHub for å bevise review.',
            false,
            'Sletting av Git-historikk har ingen slik funksjon og kan miste verdifullt arbeid.',
          ],
        ],
        'Hvilke hendelser kan den lokale Git-historikken faktisk dokumentere?',
      ),
      question(
        'GIT-M07-E18',
        'En utvikler skriver «klar for produksjon» fordi valideringstesten er grønn. Hvilken informasjon mangler i dette prosjektet?',
        [
          [
            'a',
            'Ingenting; all teknisk kontroll er fullført når én testfil består.',
            false,
            'En enkelt funksjonstest dekker ikke nettleser, tilgjengelighet, distribusjon, drift eller faktiske brukssituasjoner.',
          ],
          [
            'b',
            'Sjekk hele skjemaet og hva som kreves før publisering. Øvingen har ingen backend og blir ikke satt i produksjon.',
            true,
            'Riktig. M07 leverer et lokalt øvingsprosjekt, ikke en publisert tjeneste.',
          ],
          [
            'c',
            'Bare en bekreftelse på at den lokale branchen er pushet til en remote.',
            false,
            'En push dokumenterer deling av commits, ikke funksjonell kontroll eller produksjonsberedskap.',
          ],
        ],
        'Hvilke deler av produktet har testen undersøkt, og hva er utenfor omfanget?',
      ),
      reflection(
        'GIT-M07-E19',
        'Skriv en kort overlevering til en medstudent: Beskriv behovet, de viktigste endringene, hvilke kontroller du faktisk gjennomførte, hvilken Git-historikk som er delt, og ett konkret forhold som fortsatt bør undersøkes. Skill lokal Git fra eventuelt faktisk GitHub-arbeid.',
      ),
    ],
  },
  {
    missionId: 'GIT-M07-O08',
    title: 'Prøv selv: en ny endring fra start til slutt',
    goal: 'Planlegge, gjennomføre og kontrollere en ny avgrenset utviklingsoppgave med tidligere Git-kunnskap.',
    skillId: 'GIT-M07-SELVSTENDIG',
    flow: [
      text(
        '### Den avsluttende oppgaven\n\nPåmeldingssiden har fått en ny bestilling: Navn på mer enn 40 tegn skal gi meldingen «Navn er for langt.» Navn på nøyaktig 40 tegn skal fortsatt godtas. Eksisterende regler om tomt navn og telefon skal bevares. Du skal arbeide i det samme **syntetiske** M07-prosjektet etter at den forrige regresjonen er rettet, og du må unngå å blande inn andre endringer. En kollega vurderer samtidig å endre overskriften i `index.html`, men har ennå ikke sendt en ny commit. Du kjenner derfor ikke den fremtidige overskriften; oppgaven krever ikke at du gjetter den.',
      ),
      text(
        '### Gjør endringen selv\n\n1. Undersøk branch, Git-status, historikk og krav.\n2. Opprett en egen branch for navneendringen.\n3. Finn navnekontrollen i `valider.js`. Legg til grensen på 40 tegn uten å endre telefonreglene.\n4. Oppdater `kontroller.cjs`. Test navn på 40 tegn, 41 tegn, tomt navn og et gyldig navn med gyldig eller tomt telefonfelt.\n5. Undersøk diffen, velg innholdet til neste commit og lag en commit med en tydelig melding.\n6. Hvis kollegaen senere pusher en endring, hent og undersøk den før merge.\n\nKollegaen har ikke pushet den nye overskriften ennå.',
      ),
      text(
        'Du trenger bare én liten JavaScript-detalj for denne endringen: `ryddigNavn.length` gir lengden på navnet etter at mellomrom i starten og slutten er fjernet. Kontroller først at navnet ikke er tomt; vurder deretter grensen. Bruk syntetiske testnavn med enkle bokstaver. I en virkelig løsning må teamet avklare hva «40 tegn» betyr for sammensatte tegn og emoji; JavaScripts `.length` teller ikke alltid tegn slik brukeren oppfatter dem.',
      ),
      text(
        'Før du mener at oppgaven er ferdig, må du kunne forklare hva du kontrollerte i kode og nettleser, hvilke filer som ble endret, om den lokale branchen er delt, og om arbeidet faktisk er integrert i lokal felles main. Du kan bruke tidligere M01–M06-leksjoner og vanlig dokumentasjon. Målet er å velge riktige handlinger ut fra tilstanden, ikke å kunne alle kommandoer utenat.',
      ),
      question(
        'GIT-M07-E20',
        'Du skal innføre maksimal navnelengde 40 tegn. En test for 41 tegn feiler før endringen, men består etterpå. Testen for 40 tegn feiler fortsatt. Hva er den riktige vurderingen?',
        [
          [
            'a',
            'Oppgaven er ferdig, siden minst én ny test ble grønn.',
            false,
            'Bestillingen sier også at 40 tegn skal godtas. Et grønt negativt testtilfelle kompenserer ikke for dette bruddet.',
          ],
          [
            'b',
            'Endringen er foreløpig ikke korrekt; undersøk grensebetingelsen og kontroller både 40 og 41 tegn før integrering.',
            true,
            'Riktig. En grense må vurderes på begge sider, ellers kan en tilsynelatende riktig avvisning skjule en ny feil.',
          ],
          [
            'c',
            'Slett testfilen for 40 tegn for å få en ren testkjøring.',
            false,
            'Å fjerne en relevant test gjør ikke produktet riktig; det skjuler bare informasjon.',
          ],
        ],
        'Hvilke to utfall krever bestillingen på hver side av grensen?',
      ),
      question(
        'GIT-M07-E21',
        'Kollegaen sier at en overskriftsendring er under arbeid, men ingen commit finnes ennå i den delte remoten. Hva kan du konkludere om din feature branch?',
        [
          [
            'a',
            'Du må gjette innholdet i kollegaens uferdige endring og merge den nå.',
            false,
            'Git kan ikke hente en commit som ennå ikke er delt. Ikke bygg beslutningen på oppdiktet innhold.',
          ],
          [
            'b',
            'Du kan arbeide på din avgrensede branch med kjent historikk, og undersøke senere commits når de faktisk er tilgjengelige.',
            true,
            'Riktig. Skill kjent delt historikk fra varslet, uferdig arbeid.',
          ],
          [
            'c',
            'Du må omskrive hele main med force-push for å hindre at overskriften endres.',
            false,
            'Det er både unødvendig og risikabelt for delt arbeid.',
          ],
        ],
        'Hva vet du om remote nå, og hva er bare et varsel om mulig framtidig arbeid?',
      ),
      question(
        'GIT-M07-E22',
        'Du har laget og testet navnelengdeendringen, men har ikke pushet branchen. Hva bør du fortelle en annen utvikler?',
        [
          [
            'a',
            '«Ny validering er lokalt committet og kontrollert mot oppgitte testtilfeller; den er ennå ikke delt eller integrert.»',
            true,
            'Riktig. Den beskriver både faktisk utført arbeid og gjenstående samarbeid.',
          ],
          [
            'b',
            '«Endringen er merget på GitHub», fordi den lokale commiten finnes.',
            false,
            'En lokal commit er ikke automatisk en push, PR eller merge på GitHub.',
          ],
          [
            'c',
            '«Alt er klart for produksjon», fordi testene bestod.',
            false,
            'Disse lokale testene gir ingen produksjonssertifisering.',
          ],
        ],
        'Hvilke hendelser har du faktisk gjennomført?',
      ),
      reflection(
        'GIT-M07-E23',
        'Fortell hvordan du jobbet med navnelengden:\n\n- Hva sjekket du i Git før du begynte?\n- Hvilke navn testet du?\n- Hva kom med i commiten?\n- Delte eller merget du endringen?\n- Hva gjenstår, eller hvor stoppet du?\n\nDu kan beskrive det du fikk til, selv om du ikke ble ferdig.',
      ),
      {
        t: 'recap',
        can: [
          'Undersøke et eksisterende prosjekt og omsette et konkret behov til akseptansekriterier.',
          'Gjennomføre en avgrenset endring på egen branch med undersøkt staging, commits og funksjonskontroll.',
          'Dele Git-historikk, gjennomgå en endring og forklare forskjellen på lokal Git-reviewøving og en faktisk GitHub pull request.',
          'Integrere parallelle endringer og kontrollere prosjektet som helhet.',
          'Undersøke en regresjon i delt historikk og velge en forholdsmessig korrigerende handling.',
          'Overlevere hva som faktisk er gjort, verifisert og fortsatt usikkert.',
        ],
        next: 'I M01 og M02 jobbet du med å lagre endringer og undersøke historikken. M03 og M04 tok for seg *brancher*, sammenslåing og deling av arbeid. I M05 og M06 øvde du på samarbeid, feilretting og å hente fram tidligere arbeid. M07 samlet dette i et lite prosjekt. Bruk gjerne de samme stegene i dine egne prosjekter, og gå tilbake til leksjonene når du trenger å repetere.',
      },
    ],
  },
];
