// M03 canonical Bokmål curriculum. Build-time only; not imported into browser JS.
// Requires accepted M01 and M02; keeps their authored lesson/exercise IDs stable.
const text = (nb) => ({ t: 'text', nb });
const note = (nb) => ({ t: 'callout', kind: 'merk', nb });
const command = (heading, explanation, source, stdout = '') => [
  text('### ' + heading + '\n\n' + explanation),
  {
    t: 'code',
    file: 'Kommando – PowerShell 5.1',
    code: '. {\n' + source + '\n}',
    stdin: '',
    stdout,
    error: '',
    error_info: null,
    nb: '',
  },
];
const question = (id, prompt, choices, hint) => ({
  id,
  type: 'mcq',
  prompt,
  hints: [hint],
  options: choices.map(([id, label, correct, feedback]) => ({
    id,
    text: label,
    correct,
    feedback,
  })),
});
const report = (id, prompt) => ({
  id,
  type: 'reflect',
  prompt,
  choices: null,
  hints: [],
});
const stay = String.raw`$practiceRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ProgressPal-Git-M03'
if (-not (Test-Path -LiteralPath (Join-Path $practiceRoot '.git') -PathType Container)) { throw 'STOPP: Fant ikke den separate M03-ovingsmappen.' }
if ((Get-Location).Path -ne $practiceRoot) { throw 'STOPP: Aapne M03-mappen foer du koerer kommandoen.' }
$repoRoot = & git rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0 -or $repoRoot.Replace('/', '\') -ne $practiceRoot) { throw 'STOPP: Git peker paa et annet repository.' }`;
const clean = String.raw`$pending = @(& git status --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke kontrollere Git-status.' }
if ($pending.Count -gt 0) { throw 'STOPP: Du har lokale endringer. Undersoek og ta vare paa dem foer du fortsetter.' }`;
const must = (code) =>
  `& git ${code}\nif ($LASTEXITCODE -ne 0) { throw 'STOPP: Git-kommandoen mislyktes. Undersok status foer du fortsetter.' }`;
const setup = String.raw`$ErrorActionPreference = 'Stop'
$null = Get-Command git -ErrorAction Stop
$documents = [Environment]::GetFolderPath('MyDocuments')
if (-not $documents -or -not (Test-Path -LiteralPath $documents -PathType Container)) { throw 'STOPP: Dokumenter-mappen finnes ikke.' }
$practiceRoot = Join-Path $documents 'ProgressPal-Git-M03'
if (Test-Path -LiteralPath $practiceRoot) { throw 'STOPP: M03-mappen finnes fra foer. Behold den; ikke overskriv.' }
New-Item -ItemType Directory -Path $practiceRoot -ErrorAction Stop | Out-Null
Set-Location -LiteralPath $practiceRoot
& git init -b main
if ($LASTEXITCODE -ne 0) { throw 'STOPP: git init mislyktes.' }
& git config --local user.name 'ProgressPal Oving'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: lokal user.name mislyktes.' }
& git config --local user.email 'oving@example.invalid'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: lokal user.email mislyktes.' }
@'
<!doctype html>
<html lang="nb">
<head><meta charset="utf-8"><title>Paamelding</title></head>
<body>
<h1>Paamelding til kurs</h1>
<p id="status">Paameldingen er aapen.</p>
</body>
</html>
'@ | Set-Content -LiteralPath 'index.html' -Encoding Ascii
'Prosjekt: enkel side for kurs-paamelding.' | Set-Content -LiteralPath 'README.txt' -Encoding Ascii
'Bekreftelse: Takk for paameldingen.' | Set-Content -LiteralPath 'messages.txt' -Encoding Ascii
& git add -- index.html README.txt messages.txt
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke velge startfilene.' }
& git commit -m 'Opprett enkel paameldingsside'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke opprette start-commit.' }
& git status --short
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Kunne ikke lese status.' }`;
export const gitM03Lessons = [
  {
    missionId: 'GIT-M03-O01',
    title: 'Hvorfor arbeide med branches?',
    goal: 'Forstå ulike utviklingslinjer og begrensningene ved branching før du endrer et prosjekt.',
    skillId: 'GIT-M03-BRANCH-CONCEPT',
    flow: [
      text(
        'Her er det `git branch`, `git switch`, `git merge`, `git status` og `git diff` som er Git-ferdighetene. PowerShell-delen rundt kommandoene sjekker mappen og at det ikke finnes uventet arbeid. En «STOPP» betyr at du skal undersøke tilstanden, ikke fjerne filer for å få kontrollen grønn. Etter en pause finner du tilbake til samme M03-mappe og undersøker aktiv branch og status før du fortsetter.',
      ),
      text(
        '### Fra historikk til flere utviklingslinjer\n\nI M01 lærte du å lage commits. I M02 lærte du å lese historikken og rette en feil uten å miste senere nyttige endringer. Nå skal du prøve noe nytt: Du vil legge til en bekreftelsesmelding på en påmeldingsside, men samtidig må hovedversjonen kunne brukes til andre endringer.',
      ),
      text(
        'En **branch** (gren) er et bevegelig navn som peker på en commit. Når du gjør en ny commit mens du står på en branch, flyttes navnet videre til den nye commiten. Den aktive branchen vises normalt ved **HEAD**, som forteller Git hvor nye commits skal havne. Commits i andre branches forsvinner ikke bare fordi du bytter aktiv branch.',
      ),
      text(
        'I en liten oppgave kan du arbeide direkte på `main`. En branch er nyttig når du vil prøve en funksjon, rette en feil eller holde forskjellige endringer atskilt en stund. En branch gir ikke automatisk en sikkerhetskopi, tilgangskontroll eller korrekt kode. Uregistrerte arbeidsendringer trenger særlig omtanke når du bytter gren.',
      ),
      text(
        'I M03 arbeider vi **bare lokalt**. Du trenger ingen GitHub-konto. Senere, i M04, lærer du hvordan lokale branches forholder seg til et eksternt repository. Branch-navn som `feature/kvittering` er beskrivende konvensjoner, ikke egne typer Git-objekter.',
      ),
      question(
        'GIT-M03-E01',
        'Du lager en branch for en ny funksjon. Hva er den viktigste fordelen akkurat nå?',
        [
          [
            'a',
            'Du kan registrere sammenhengende funksjonsendringer på en egen utviklingslinje før de samles med main.',
            true,
            'Riktig. Branch-navnet peker på sin egen commit-historikk. Senere kan du vurdere hvordan endringene skal samles.',
          ],
          [
            'b',
            'Den nye branchen blir automatisk kopiert til GitHub og sikret mot datatap.',
            false,
            'En lokal branch ligger fortsatt i samme repository. Den er ikke automatisk delt eller en separat sikkerhetskopi.',
          ],
          [
            'c',
            'Git garanterer at alle commits på branchen fungerer og kan merges uten problemer.',
            false,
            'Git registrerer filendringer, men tester ikke at en funksjon fungerer. Ulike branches kan også endre samme område og gi konflikt.',
          ],
        ],
        'Skille mellom å organisere endringer og å garantere at de er riktige eller trygge.',
      ),
      question(
        'GIT-M03-E02',
        'Hva skjer vanligvis med HEAD etter at du har byttet fra main til feature/kvittering?',
        [
          [
            'a',
            'HEAD peker på den aktive feature-branchen, slik at nye commits havner på den utviklingslinjen.',
            true,
            'Ja. HEAD viser hvor du står. Den aktive branchen flytter seg når du lager nye commits.',
          ],
          [
            'b',
            'HEAD og main blir alltid samme navn og får alltid samme commits.',
            false,
            'HEAD følger den aktive branchen. Main flytter seg ikke når du committer på en annen branch.',
          ],
          [
            'c',
            'HEAD fjerner alle tidligere commits fordi du starter en helt ny historikk.',
            false,
            'En ny branch opprettes normalt fra en eksisterende commit og deler historikken fram til forgreningen.',
          ],
        ],
        'Hva er det Git trenger å vite for å plassere en ny commit?',
      ),
    ],
  },
  {
    missionId: 'GIT-M03-O02',
    title: 'Lag en trygg branch i en egen mappe',
    goal: 'Opprette et isolert repository og undersøke hvordan branches opprettes og vises.',
    skillId: 'GIT-M03-SETUP',
    flow: [
      text(
        'Her er det `git branch`, `git switch`, `git merge`, `git status` og `git diff` som er Git-ferdighetene. PowerShell-delen rundt kommandoene sjekker mappen og at det ikke finnes uventet arbeid. En «STOPP» betyr at du skal undersøke tilstanden, ikke fjerne filer for å få kontrollen grønn. Etter en pause finner du tilbake til samme M03-mappe og undersøker aktiv branch og status før du fortsetter.',
      ),
      text(
        'Vi lager `ProgressPal-Git-M03` i Dokumenter, med en liten oppdiktet HTML-side, en README og en meldingsfil. Bruk Windows PowerShell 5.1 og Git 2.28+. Dette er en **ny** mappe, ikke M01/M02-mappen eller et av dine egne prosjekter. Kommandoen nekter å bruke et navn som allerede finnes.',
      ),
      command(
        'Opprett en separat M03-øving',
        'Kopier hele blokken samlet i PowerShell. Den gjør kun endringer i den nye øvingsmappen og setter oppdiktet Git-identitet **lokalt** i denne mappen.',
        setup,
        '[main] Opprett enkel paameldingsside\n(Tom utskrift fra git status --short)',
      ),
      command(
        'Sjekk hvilket sted du arbeider',
        'Hver ny PowerShell-økt må først finne den samme M03-mappen. Hvis den ikke finnes, stopper kommandoen. Denne blokken kan brukes for å komme tilbake etter en pause.',
        String.raw`$practiceRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ProgressPal-Git-M03'
if (-not (Test-Path -LiteralPath (Join-Path $practiceRoot '.git') -PathType Container)) { throw 'STOPP: Fant ikke M03-repoet.' }
Set-Location -LiteralPath $practiceRoot
& git branch --show-current
& git status --short
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Git fant ikke repositoryet.' }`,
        'main',
      ),
      command(
        'Opprett en egen utviklingslinje',
        'Start bare fra en ren øvingstilstand. `switch -c` lager branchen og bytter til den i én operasjon.',
        `${stay}\n${clean}\n${must('switch -c feature/kvittering')}\n${must('branch --show-current')}\n${must('branch --list')}`,
        'feature/kvittering\n* feature/kvittering\n  main',
      ),
      text(
        'På dette tidspunktet peker både `main` og `feature/kvittering` på samme start-commit. Det er **ikke** laget en ny commit ved å opprette branchen. Først når du registrerer en filendring på feature-branchen, begynner de å peke på forskjellige commits.',
      ),
      question(
        'GIT-M03-E03',
        'Rett etter `git switch -c feature/kvittering` viser Git to branches. Hva vet du om historikken?',
        [
          [
            'a',
            'Begge kan peke på samme start-commit. Et nytt branchnavn alene lager ingen ny commit.',
            true,
            'Riktig. En branch er en referanse til en commit. Først når du committer noe på den aktive branchen, flytter dens referanse seg.',
          ],
          [
            'b',
            'Den nye branchen må allerede inneholde en ny fil og en ny commit.',
            false,
            'Opprettelsen av branchen registrerer ikke automatisk en ny filendring eller commit.',
          ],
          [
            'c',
            'Main blir slettet når Git oppretter feature/kvittering.',
            false,
            'Main ligger fortsatt i repositoryet. Det er nettopp poenget at du kan ha flere utviklingslinjer.',
          ],
        ],
        'Tenk på forskjellen mellom et navn på en commit og en ny commit.',
      ),
      report(
        'GIT-M03-E04',
        'Fikk du opprettet en separat mappe og branch? Hva viste branch --list, og var status ren? Beskriv også om noe stoppet eller du trengte hjelp. Ikke lim inn private stier eller andre sensitive opplysninger.',
      ),
    ],
  },
  {
    missionId: 'GIT-M03-O03',
    title: 'Gjør en endring utenfor main',
    goal: 'Registrere en endring på feature-branchen og kontrollere at main fortsatt peker på sin tidligere commit.',
    skillId: 'GIT-M03-DIVERGENCE',
    flow: [
      text(
        'Når du fortsetter M03 etter en pause, finn `ProgressPal-Git-M03`-mappen og kontroller aktiv branch med `git branch --show-current` samt arbeidsstatus med `git status`. Arbeid videre på den branchen forrige steg brukte; en ny terminal bytter ikke automatisk Git-branch. Opprett ikke samme branch eller commit på nytt uten å undersøke historikken.',
      ),
      text(
        'Du skal legge til en tydelig bekreftelse på påmeldingssiden. Fordi du står på `feature/kvittering`, kan du lage en ny commit uten at `main` flytter seg. **Arbeidsfilene** i øvingsmappen oppdateres når du bytter gren; dette er ikke to uavhengige mapper.',
      ),
      command(
        'Rediger HTML på feature-branchen',
        'Sjekk at branchen er riktig, og åpne `index.html` i Notisblokk. Legg inn linjen `<p id="kvittering">Vi bekrefter påmeldingen.</p>` rett før `</body>`. Lagre og lukk Notisblokk.',
        `${stay}\n${clean}\nif ((& git branch --show-current) -ne 'feature/kvittering') { throw 'STOPP: Du maa staa paa feature/kvittering.' }\nnotepad.exe (Join-Path $practiceRoot 'index.html')`,
        '',
      ),
      command(
        'Se den nye filendringen',
        'Kontroller at linjen ble lagt til, og at den eneste endrede filen er `index.html`. Hvis det ser annerledes ut, stopp og undersøk før du registrerer noe.',
        `${stay}\n${must('--no-pager diff -- index.html')}\n${must('status --short')}`,
        '+<p id="kvittering">Vi bekrefter påmeldingen.</p>\n M index.html',
      ),
      command(
        'Registrer endringen på feature-branchen',
        'Staging og commit fungerer akkurat som i M01. Kontroller at bare `index.html` er endret før du lager commiten.',
        `${stay}\nif ((& git branch --show-current) -ne 'feature/kvittering') { throw 'STOPP: Feil branch.' }\nif (@(& git diff --name-only).Count -ne 1 -or @(& git diff --name-only)[0] -ne 'index.html') { throw 'STOPP: Uventet filutvalg.' }\n$changes = @(& git status --porcelain)\nif ($LASTEXITCODE -ne 0 -or $changes.Count -ne 1 -or $changes[0] -ne ' M index.html') { throw 'STOPP: Uventet Git-status. Undersoek andre filer foer commit.' }\n${must('add -- index.html')}\n${must("commit -m 'Legg til bekreftelse paa paameldingssiden'")}\n${must('branch -v')}`,
        'feature/kvittering peker nå på den nye commiten. main peker fremdeles på start-commiten.',
      ),
      command(
        'Undersøk begge utviklingslinjene',
        'Grafen viser historikken for begge branches. Bytt deretter til `main` først etter at arbeidsmappen er ren, og se at bekreftelseslinjen ikke finnes i denne versjonen.',
        `${stay}\n${clean}\n${must('--no-pager log --graph --oneline --decorate --all')}\n${must('switch main')}\n${must("--no-pager show 'HEAD:index.html'")}`,
        'main: HTML-siden er ennå uten bekreftelseslinjen. feature/kvittering har den.',
      ),
      note(
        'Ikke bruk `switch -f`, `reset --hard` eller slett mapper for å bytte gren. Git kan nekte vanlig switching når det ellers ville risikert ulagrede endringer. Det er en beskyttelse du skal forstå, ikke omgå.',
      ),
      question(
        'GIT-M03-E05',
        'Du har committet bekreftelseslinjen på feature/kvittering og byttet til main. Hvorfor vises ikke linjen i main sin index.html?',
        [
          [
            'a',
            'Main peker fortsatt på sin egen commit. Feature-committen er ikke integrert der ennå.',
            true,
            'Riktig. Du har laget en ny commit på feature-branchen, men main flyttes ikke før du aktivt integrerer endringene.',
          ],
          [
            'b',
            'Git har slettet feature-committen fordi du byttet branch.',
            false,
            'Committen finnes fortsatt og er tilgjengelig via feature/kvittering. Sjekk `git log --all` for begge linjene.',
          ],
          [
            'c',
            'Bekreftelsen kan bare vises hvis du først oppretter GitHub-konto.',
            false,
            'Hele øvingen er lokal Git. GitHub er ikke nødvendig for å lagre, bytte eller merge branches.',
          ],
        ],
        'Hva peker de to branchnavnene på etter en commit på bare den ene?',
      ),
    ],
  },
  {
    missionId: 'GIT-M03-O04',
    title: 'Samle to utviklingslinjer med merge',
    goal: 'Forstå forgrening, sammenfletting og forskjellen mellom automatisk merge og verifisert funksjonalitet.',
    skillId: 'GIT-M03-MERGE',
    flow: [
      text(
        '`main` skal nå få en nyttig oppdatering av prosjektbeskrivelsen, mens den separate feature-branchen allerede har den nye bekreftelseslinjen. Når begge branches har nye commits etter sitt felles utgangspunkt, sier vi at historikkene har **skilt lag** (divergert). Da kan Git prøve å samle endringene med `merge`.',
      ),
      command(
        'Legg til hjelpetekst på main',
        'Du står på `main` med ren status. Legg til én ekstra linje i README. Dette er et annet arbeid enn HTML-bekreftelsen.',
        `${stay}\n${clean}\nif ((& git branch --show-current) -ne 'main') { throw 'STOPP: Du maa staa paa main.' }\n'Kontakt arrangoren ved sporsmaal om paamelding.' | Add-Content -LiteralPath (Join-Path $practiceRoot 'README.txt') -Encoding Ascii\n${must('add -- README.txt')}\n${must("commit -m 'Legg til kontaktinformasjon'")}`,
        '',
      ),
      text(
        'Nå finnes det en ny commit på hver branch siden forgreningen. Den ene endrer HTML; den andre endrer README. Git kan normalt kombinere dem automatisk fordi filendringene ikke konkurrerer om samme innhold. Det betyr likevel ikke at Git har testet om påmeldingssiden virker som ønsket.',
      ),
      command(
        'Undersøk grenene og merge feature inn i main',
        'Sjekk aktiv branch og ren status før sammenslåingen. `--no-edit` bruker Gits foreslåtte merge-melding uten å åpne en tekstredigerer. Ikke gjett hvilken gren du står på.',
        `${stay}\n${clean}\nif ((& git branch --show-current) -ne 'main') { throw 'STOPP: Merge skal skje inn i main.' }\n${must('--no-pager log --graph --oneline --decorate --all')}\n${must('merge --no-edit feature/kvittering')}\n${must('status --short')}`,
        'Merge made by the ort strategy.\n(Tom status)',
      ),
      command(
        'Kontroller hva som ble bevart',
        'Det ferdige resultatet skal inneholde både bekreftelsen i HTML og kontakten i README. Historikken skal nå vise en merge-commit med to foreldre.',
        `${stay}\n${must("--no-pager show 'HEAD:index.html'")}\n${must("--no-pager show 'HEAD:README.txt'")}\n${must('--no-pager log --graph --oneline --decorate --all -6')}\n${must('rev-list --parents -n 1 HEAD')}`,
        'Begge endringene finnes; HEAD har to parent-commits.',
      ),
      text(
        'En **fast-forward** skjer når main ikke har fått noen nye commits siden feature-branchen ble opprettet. Git kan da flytte main-referansen fram uten å lage en ekstra merge-commit. I vår øving hadde begge branches nye commits, og derfor oppstår en ekte merge-commit med to foreldre. Du trenger ikke bruke `--no-ff` bare for å tvinge fram et bestemt utseende.',
      ),
      question(
        'GIT-M03-E06',
        'Hvorfor ble det en merge-commit med to foreldre i dette tilfellet?',
        [
          [
            'a',
            'Begge branches hadde egne nye commits etter felles utgangspunkt. Merge-committen samler de to historiene.',
            true,
            'Riktig. Den viser hva main var før sammenslåingen, og hvilket feature-arbeid som ble tatt inn.',
          ],
          [
            'b',
            'Fordi Git alltid lager en merge-commit hver gang du skriver git merge.',
            false,
            'Hvis bare feature-branchen ligger foran main, kan Git fast-forwarde uten ekstra merge-commit.',
          ],
          [
            'c',
            'Fordi README og HTML må ha identisk innhold før Git kan merge.',
            false,
            'Filer kan gjerne være forskjellige. Her kunne Git integrere uavhengige endringer automatisk.',
          ],
        ],
        'Hva er forskjellen mellom divergerte utviklingslinjer og et branchnavn som bare peker lenger fram?',
      ),
      question(
        'GIT-M03-E07',
        'Git svarte at mergebearbeidet lyktes, og status er tom. Hva er fortsatt viktig å gjøre?',
        [
          [
            'a',
            'Kontrollere at både endringene og den forventede funksjonaliteten faktisk er riktige.',
            true,
            'Riktig. Git kan forene filinnhold uten å vite om løsningen følger krav, fungerer i nettleseren eller består tester.',
          ],
          [
            'b',
            'Anta at applikasjonen er feilfri fordi Git ikke viste noen konflikt.',
            false,
            'Fravær av tekstkonflikter sier ingenting sikkert om logiske feil eller nye kravbrudd.',
          ],
          [
            'c',
            'Slette all historikk fra begge branches for å frigjøre plass.',
            false,
            'Historikken forklarer hvordan endringene ble utviklet og samlet; å slette den er ikke del av vanlig kvalitetskontroll.',
          ],
        ],
        'Git kan sammenligne og kombinere filer. Hvilke oppgaver krever fortsatt menneskelig vurdering eller tester?',
      ),
    ],
  },
  {
    missionId: 'GIT-M03-O05',
    title: 'Forstå og løse en reell merge-konflikt',
    goal: 'Undersøke konkurrerende endringer i samme tekstlinje og fullføre en bevisst løsning med ren Git-status.',
    skillId: 'GIT-M03-CONFLICT',
    flow: [
      text(
        '### Når Git trenger en avgjørelse\n\nVi skal nå endre **samme linje** i `messages.txt` på to branches. Den ene forbedrer meldingen slik at den forteller at praktisk informasjon kommer senere. Den andre presiserer at påmeldingen er registrert. Begge er rimelige endringer. Git kan ikke vite om du vil beholde én av dem eller kombinere dem.',
      ),
      command(
        'Lag en egen branch for meldingsarbeidet',
        'Ta utgangspunkt i den ferdig mergede main. Begynn bare hvis status er ren, slik at andre endringer ikke blandes inn.',
        `${stay}\n${clean}\nif ((& git branch --show-current) -ne 'main') { throw 'STOPP: Forventet main.' }\n${must('switch -c feature/melding')}\n${must('branch --show-current')}`,
        'feature/melding',
      ),
      command(
        'Endre den samme meldingen på feature',
        'Oppdater filen med den nye teksten. Dette er en kontrollert tekstfil i den særskilte M03-mappen.',
        `${stay}\n${clean}\nif ((& git branch --show-current) -ne 'feature/melding') { throw 'STOPP: Feil branch.' }\n'Bekreftelse: Takk! Praktisk informasjon sendes senere.' | Set-Content -LiteralPath (Join-Path $practiceRoot 'messages.txt') -Encoding Ascii\n${must('add -- messages.txt')}\n${must("commit -m 'Forklar naar praktisk informasjon kommer'")}`,
        '',
      ),
      command(
        'Lag en annen endring av samme linje på main',
        'Bytt tilbake med ren status, endre meldingen til et annet, men rimelig forslag, og registrer endringen.',
        `${stay}\n${clean}\n${must('switch main')}\n'Bekreftelse: Paameldingen er registrert.' | Set-Content -LiteralPath (Join-Path $practiceRoot 'messages.txt') -Encoding Ascii\n${must('add -- messages.txt')}\n${must("commit -m 'Presiser at paameldingen er registrert'")}`,
        '',
      ),
      command(
        'Forsøk å merge, og undersøk konflikten',
        'Denne gangen **forventer** vi at merge stopper. Det er ikke feil som skal skjules. Se filen og statusen før du bestemmer deg. Ingen annen fil skal være i konflikt.',
        `${stay}\n${clean}\nif ((& git branch --show-current) -ne 'main') { throw 'STOPP: Merge skal skje inn i main.' }\n& git merge --no-edit feature/melding\nif ($LASTEXITCODE -eq 0) { throw 'STOPP: Forventet merge-konflikt oppsto ikke. Undersoek historikken.' }\n& git status --short\nGet-Content -LiteralPath (Join-Path $practiceRoot 'messages.txt')`,
        'CONFLICT (content): Merge conflict in messages.txt\nUU messages.txt\n<<<<<<< HEAD\nBekreftelse: Paameldingen er registrert.\n=======\nBekreftelse: Takk! Praktisk informasjon sendes senere.\n>>>>>>> feature/melding',
      ),
      text(
        'Mellom `<<<<<<< HEAD` og `=======` står forslaget i **main**. Mellom `=======` og `>>>>>>> feature/melding` står forslaget fra den andre branchen. Markørene er ikke ferdig tekst. Du må lese begge forslagene og velge hva sluttfilen faktisk skal si. Git gjør ikke denne faglige vurderingen for deg.',
      ),
      command(
        'Løs konflikten gjennom redigering',
        'Åpne `messages.txt` i Notisblokk og erstatt **hele konfliktområdet**, inkludert markørene, med én linje: `Bekreftelse: Paameldingen er registrert. Praktisk informasjon sendes senere.` Lagre og lukk. Nå kombinerer du den nyttige betydningen fra begge versjonene.',
        `${stay}\nif (-not (Test-Path -LiteralPath (Join-Path (Join-Path $practiceRoot '.git') 'MERGE_HEAD'))) { throw 'STOPP: Forventet merge er ikke aktiv.' }\nnotepad.exe (Join-Path $practiceRoot 'messages.txt')`,
        'Bekreftelse: Paameldingen er registrert. Praktisk informasjon sendes senere.',
      ),
      command(
        'Kontroller løsningen og fullfør merge',
        'Før commit må meldingen være akkurat som avtalt. Kontrollen nekter å stage markørtekst eller en uventet løsning. `git add` markerer konflikten som løst; deretter oppretter du merge-commit.',
        `${stay}\n$expected = 'Bekreftelse: Paameldingen er registrert. Praktisk informasjon sendes senere.'\n$actual = @(Get-Content -LiteralPath (Join-Path $practiceRoot 'messages.txt'))\nif ($actual.Count -ne 1 -or $actual[0] -ne $expected) { throw 'STOPP: Meldingen er ikke loest som avtalt. Undersoek den foer du fortsetter.' }\n$unmerged = @(& git diff --name-only --diff-filter=U)\nif ($LASTEXITCODE -ne 0 -or $unmerged.Count -ne 1 -or $unmerged[0] -ne 'messages.txt') { throw 'STOPP: Uventet konfliktstatus.' }\n${must('add -- messages.txt')}\n${must('diff --cached --check')}\n${must("commit -m 'Samle de to meldingsforbedringene'")}\n${must('status --short')}\n${must('--no-pager log --graph --oneline --decorate --all -8')}`,
        'Status er tom. Konfliktmarkørene finnes ikke lenger, og merge-committen har to foreldre.',
      ),
      note(
        'Hvis du blir usikker, stopp og undersøk. `git merge --abort` kan normalt avbryte en pågående merge og gjenopprette tilstanden før merge, **men** kan ha begrensninger når det fantes lokale endringer før sammenslåingen. Derfor kontrollerer vi ren status *før* hver merge. Ikke bruk `reset --hard`, `clean` eller «velg vår/deres» uten å forstå hva som går tapt.',
      ),
      question(
        'GIT-M03-E08',
        'Etter `git merge feature/melding` står det `UU messages.txt`. Hva forteller Git deg?',
        [
          [
            'a',
            'Begge branches har gjort uforenlige endringer av samme område, og filen er ennå ikke løst.',
            true,
            'Riktig. UU markerer en uavklart konflikt. Se begge forslagene og kravene før du redigerer og stager den ferdige løsningen.',
          ],
          [
            'b',
            'Meldingsfilen er korrekt, men GitHub mangler innlogging.',
            false,
            'Dette er en lokal tekstkonflikt. GitHub og nettforbindelse har ingen rolle i denne øvingen.',
          ],
          [
            'c',
            'Git har slettet én av branchene og meldingsfilen kan ikke gjenopprettes.',
            false,
            'Begge utviklingslinjene og commitene finnes. Git lar deg undersøke forslagene og løse innholdet i arbeidsfilen.',
          ],
        ],
        'Hva viser status om en fil Git ennå ikke har kunnet integrere?',
      ),
      question(
        'GIT-M03-E09',
        'Hvilken handling fullfører en korrekt merge-konfliktløsning?',
        [
          [
            'a',
            'Undersøk forslagene, skriv ønsket sluttinnhold uten konfliktmarkører, stage filen og commit merge.',
            true,
            'Riktig. Du tar et innholdsvalg som både er faglig begrunnet og registrert i Git-historikken.',
          ],
          [
            'b',
            'La konfliktmarkørene stå igjen og commit dem som om de var vanlig tekst.',
            false,
            'Markørene er Gits hjelp til å vise konflikt, ikke en ferdig melding til brukere. De må fjernes som del av en faktisk løsning.',
          ],
          [
            'c',
            'Slett .git for å fortsette med den fila som ligger i Notisblokk.',
            false,
            'Da mister du lokal historikk og selve grunnlaget for å forstå sammenslåingen. Det løser ikke innholdsspørsmålet.',
          ],
        ],
        'Hva bør filen inneholde når brukeren faktisk åpner den etter merge?',
      ),
      report(
        'GIT-M03-E10',
        'Beskriv hva som skjedde med de to branches, hva konfliktmarkørene viste, hvorfor du valgte akkurat sluttmeldingen, og hvordan du kontrollerte merge. Skriv også om du stoppet eller brukte hjelp. Ikke del private filstier.',
      ),
    ],
  },
  {
    missionId: 'GIT-M03-O06',
    title: 'Prøv selv: Når automatisk merge ikke er nok',
    goal: 'Overføre branch- og mergeforståelsen til et annet utviklingsproblem som ikke nødvendigvis gir en tekstkonflikt.',
    skillId: 'GIT-M03-TRANSFER',
    flow: [
      text(
        '### Et nytt scenario\n\nDere lager en enkel påmeldingstjeneste. Én branch oppdaterer `settings.json` slik at maksgrensen går fra 20 til 30 deltakere. En annen branch oppdaterer `index.html`, men lar fortsatt teksten «Kun 20 plasser» stå. Git merger endringene automatisk fordi de ligger i forskjellige filer. Etter merge sier konfigurasjonen **30**, mens siden viser **20**.',
      ),
      text(
        'Dette er **ikke** en merge-konflikt i Gits tekniske betydning. Filene kunne kombineres. Likevel er produktet selvmotsigende. Det demonstrerer skillet mellom automatisk håndtering av tekst og den faglige jobben med krav, forståelse, testing og kvalitetssikring. I et team må noen avklare hvilken grense som gjelder, og gjøre en ny målrettet rettelse.',
      ),
      question(
        'GIT-M03-E11',
        'Git har merget uten konflikt, men den ferdige løsningen viser både 20 og 30 plasser. Hva er mest presist?',
        [
          [
            'a',
            'Det var ingen tekstkonflikt, men resultatet har en funksjonell uoverensstemmelse som må undersøkes mot kravet.',
            true,
            'Riktig. Git kan sette sammen filer som teknisk sett ikke kolliderer, selv om produktets atferd og tekst blir inkonsistent.',
          ],
          [
            'b',
            'Git må ha tatt feil; en vellykket merge skal også verifisere brukerkrav og UI-tekst.',
            false,
            'Git foretar ikke produkt- eller funksjonstester. Det er utviklernes ansvar å undersøke resultatet.',
          ],
          [
            'c',
            'Alle commits etter forgreningen bør slettes uten å undersøke dem.',
            false,
            'Du vet ennå ikke hvilken endring som er feil. Undersøk krav, innhold og historikk før du bestemmer rettelse.',
          ],
        ],
        'Hva vet Git om tekstlige endringer, og hva vet Git ikke om produktets mening?',
      ),
      question(
        'GIT-M03-E12',
        'Begge branches endret samme linje til ulike tekster. Kollegene er uenige om formuleringen. Hva er riktig neste steg?',
        [
          [
            'a',
            'Les begge alternativer, avklar hvilken formulering kravene støtter, og registrer den valgte løsningen.',
            true,
            'Riktig. Git synliggjør konflikten, men ordvalget og eventuelle kompromisser krever menneskelig vurdering.',
          ],
          [
            'b',
            'Velg alltid teksten fra feature-branchen fordi den er nyere.',
            false,
            '«Nyere» er ikke samme som faglig riktig. Begge commits kan være nye etter forgreningen.',
          ],
          [
            'c',
            'Velg alltid teksten fra main fordi main ikke kan inneholde feil.',
            false,
            'Main er en navngitt utviklingslinje, ikke et kvalitetsstempel. Innholdet må vurderes på egne premisser.',
          ],
        ],
        'Hvorfor kan ikke Git velge mellom to gyldige, men forskjellige kravtolkninger?',
      ),
      report(
        'GIT-M03-E13',
        'Beskriv med egne ord forskjellen mellom en branch, en commit og en merge. Forklar når du ville opprettet en branch, hva du ville kontrollert etter merge, og hva du ville gjort hvis Git ikke viste konflikt, men to filer motsa hverandre. Du kan rapportere delvis gjennomføring.',
      ),
      {
        t: 'recap',
        can: [
          'Forklare at en branch er et navn på en commit, og at HEAD vanligvis følger den aktive branchen.',
          'Opprette en feature-branch, kontrollere status, committere og bytte mellom branches.',
          'Skille fast-forward fra en merge-commit etter divergerte utviklingslinjer.',
          'Lese konfliktmarkører, forstå hvorfor Git stoppet og gjennomføre en begrunnet løsning.',
          'Forstå at vellykket merge ikke betyr at funksjonalitet og krav er verifisert.',
        ],
        next: 'I M04 går du videre fra lokal Git til å hente og dele historikk mellom prosjektkopier. Du lærer hva en *remote* er, forskjellen på din lokale *branch* og historikken du henter fra andre, og når du bruker `clone`, `fetch`, `push` og `pull`. Du finner M04 i Pathways-oversikten. De lokale øvingene kan du gjøre uten GitHub-konto.',
      },
    ],
  },
];
