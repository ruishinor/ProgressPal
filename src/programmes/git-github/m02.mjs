// M02 canonical Bokmål teaching content. Build-time only; not imported by the app.
// M01 remains authored separately in source.mjs, with stable exercise identities.
const text = (nb) => ({ t: 'text', nb });
const note = (nb) => ({ t: 'callout', kind: 'merk', nb });
const command = (title, explanation, code, output = '') => [
  text('### ' + title + '\n\n' + explanation),
  {
    t: 'code',
    file: 'Kommando – PowerShell 5.1',
    code: '. {\n' + code + '\n}',
    stdin: '',
    stdout: output,
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
const stay =
  "if (-not $practiceRoot -or (Get-Location).Path -ne $practiceRoot -or -not (Test-Path -LiteralPath (Join-Path $practiceRoot '.git') -PathType Container)) { throw 'STOPP: Du er ikke i M02-ovingsrepoet. Finn den separate ovingsmappen for M02 forst.' }";
const setup = String.raw`$ErrorActionPreference = 'Stop'
$null = Get-Command git -ErrorAction Stop
$documents = [Environment]::GetFolderPath('MyDocuments')
if (-not $documents -or -not (Test-Path -LiteralPath $documents -PathType Container)) {
  throw 'STOPP: Fant ikke Dokumenter-mappen.'
}
$practiceRoot = Join-Path $documents 'ProgressPal-Git-M02'
if (Test-Path -LiteralPath $practiceRoot) {
  throw 'STOPP: M02-ovingsmappen finnes allerede. Ikke overskriv den.'
}
New-Item -ItemType Directory -Path $practiceRoot -ErrorAction Stop | Out-Null
Set-Location -LiteralPath $practiceRoot
& git init -b main
if ($LASTEXITCODE -ne 0) { throw 'STOPP: git init mislyktes.' }
& git config --local user.name 'ProgressPal Oving'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: lokal Git-identitet mislyktes.' }
& git config --local user.email 'oving@example.invalid'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: lokal Git-identitet mislyktes.' }
@'
{
  "maxRegistrations": 20,
  "sendConfirmation": true
}
'@ | Set-Content -LiteralPath 'settings.json' -Encoding Ascii
'Pameldingstest: normalgrensen er 20.' | Set-Content -LiteralPath 'README.txt' -Encoding Ascii
& git add -- settings.json README.txt
if ($LASTEXITCODE -ne 0) { throw 'STOPP: kunne ikke stage A.' }
& git commit -m 'Opprett pameldingsinnstillinger'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: kunne ikke committe A.' }
@'
{
  "maxRegistrations": 200,
  "sendConfirmation": true
}
'@ | Set-Content -LiteralPath 'settings.json' -Encoding Ascii
& git add -- settings.json
if ($LASTEXITCODE -ne 0) { throw 'STOPP: kunne ikke stage B.' }
& git commit -m 'Juster kapasitet for test'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: kunne ikke committe B.' }
'Kontaktinfo legges til for arrangorene.' | Add-Content -LiteralPath 'README.txt' -Encoding Ascii
'Bruk hjelpeteksten ved sporsmal fra deltakere.' | Set-Content -LiteralPath 'support.txt' -Encoding Ascii
& git add -- README.txt support.txt
if ($LASTEXITCODE -ne 0) { throw 'STOPP: kunne ikke stage C.' }
& git commit -m 'Legg til hjelpetekst og kontaktinfo'
if ($LASTEXITCODE -ne 0) { throw 'STOPP: kunne ikke committe C.' }
Write-Host 'Tre commits i: ' $practiceRoot
& git --no-pager log --oneline -3
if ($LASTEXITCODE -ne 0) { throw 'STOPP: kunne ikke lese historikken.' }`;

export const gitM02Lessons = [
  {
    missionId: 'GIT-M02-O01',
    title: 'Når en gammel versjon er riktig',
    goal: 'Lære å finne tidligere versjoner uten å miste nyere arbeid.',
    skillId: 'GIT-M02-PROBLEM',
    flow: [
      text(
        '### Tre måter å lese historikken på\n\n- `git log`: Hvilke commits finnes?\n- `git show`: Hva ligger i en bestemt commit?\n- `git diff`: Hva er forskjellen mellom to versjoner?\n\nPowerShell-koden rundt dem beskytter øvingsmappen. Etter en pause går du tilbake til M02-mappen og undersøker status før du fortsetter.',
      ),
      text(
        '### Fra M01 til M02\n\nI M01 opprettet du et repository, valgte endringer med staging og lagde commits. Nå bruker vi historikken til å løse et problem. Du trenger ikke GitHub eller et nytt studieprogram. Vi lager en **egen M02-mappe**, slik at arbeidet ditt fra M01 blir liggende urørt.',
      ),
      text(
        'Tenk deg en enkel påmeldingsløsning. Den har en innstillingsfil som begrenser antall påmeldinger til 20. Etter flere endringer står det plutselig 200. Samtidig har noen lagt til nyttig kontaktinformasjon og en hjelpetekst. Dette er et vanlig utviklerproblem: én endring er feil, men ikke alt som kom etterpå er feil.',
      ),
      text(
        'Du kunne kopiert hele prosjektmappen fra da grensen var 20. Men da ville du også fjernet den nye kontakten og hjelpeteksten. En **målrettet rettelse** betyr å undersøke historikken, identifisere akkurat hva som bør endres, og registrere en ny commit som bevarer annet nyttig arbeid.',
      ),
      note(
        'Git kan vise hva som faktisk ligger i ulike commits, men kan ikke alene avgjøre hvilket krav som er riktig. Et gammelt tall kan være tilsiktet endret. Kontroller derfor oppgaven eller avtalte krav før du reparerer.',
      ),
      question(
        'GIT-M02-E01',
        'Du finner en gammel mappe der grensen er 20. Hvorfor er det ikke nok å erstatte dagens prosjekt med hele den mappen?',
        [
          [
            'a',
            'Da mister du også nyttige senere endringer, som kontaktinformasjon og hjelpetekst.',
            true,
            'Riktig. Du må bevare de senere forbedringene og bare korrigere det konkrete avviket.',
          ],
          [
            'b',
            'Fordi Git automatisk nekter å lese gamle filer.',
            false,
            'Git lar deg lese gamle commits. Problemet er at en ukritisk tilbakekopiering kan fjerne nyere, riktig arbeid.',
          ],
          [
            'c',
            'Fordi alle senere commits må være feil når én innstilling er feil.',
            false,
            'En feil i én fil forteller ikke at senere commits er feil. De må vurderes hver for seg.',
          ],
        ],
        'Spør deg hva som vil skje med filene som kom til etter den gamle versjonen.',
      ),
      text(
        'I resten av modulen skal du kunne fortelle hva du undersøkte, hva du fant, hvorfor du valgte en bestemt rettelse, og hvordan du kontrollerte resultatet.',
      ),
    ],
  },
  {
    missionId: 'GIT-M02-O02',
    title: 'Lag en egen historikk å undersøke',
    goal: 'Lage et øvingsrepo med tre commits du kan sammenligne.',
    skillId: 'GIT-M02-FIXTURE',
    flow: [
      text(
        '### Tre måter å lese historikken på\n\n- `git log`: Hvilke commits finnes?\n- `git show`: Hva ligger i en bestemt commit?\n- `git diff`: Hva er forskjellen mellom to versjoner?\n\nPowerShell-koden rundt dem beskytter øvingsmappen. Etter en pause går du tilbake til M02-mappen og undersøker status før du fortsetter.',
      ),
      text(
        'Vi lager en liten, oppdiktet påmeldingsløsning. Du trenger **Windows PowerShell 5.1** og Git (fra M01). Kommandoen lager mappen `ProgressPal-Git-M02` i Dokumenter, med sin egen `.git`-historikk. Hvis mappen allerede finnes, stopper oppsettet. Du må aldri slette en eksisterende mappe bare for å kjøre eksemplet på nytt.',
      ),
      text(
        'Oppsettet lager tre commits: **A** oppretter `settings.json` med grense 20, **B** endrer grensen til 200, og **C** legger til hjelpetekst og kontaktinfo. Det skjer ingen opplasting eller kontakt med GitHub. `user.name` og `user.email` settes bare for dette øvingsrepoet. M01-mappen og andre prosjekter skal ikke brukes.',
      ),
      command(
        'Opprett den separate øvingen',
        'Åpne en ny PowerShell 5.1 og lim inn hele blokken samlet. Les først at den ikke overskriver en mappe som finnes. `git init -b main` krever Git 2.28 eller nyere.',
        setup,
        'Tre commits i: <Dokumenter>\\ProgressPal-Git-M02\n<unik hash> Legg til hjelpetekst og kontaktinfo\n<unik hash> Juster kapasitet for test\n<unik hash> Opprett pameldingsinnstillinger',
      ),
      text(
        'Git lager ulike commit-hasher på forskjellige maskiner. De identifiserer commits, men skal **ikke** sammenlignes tegn for tegn med eksemplet. Du skal derimot se tre commits i riktig rekkefølge. Lukkes PowerShell, åpner du en ny og navigerer tilbake til `ProgressPal-Git-M02` før du fortsetter; definer `$practiceRoot` på nytt slik:',
      ),
      command(
        'Finn tilbake til øvingen senere',
        'Dette gjenoppretter bare PowerShell-variabelen og arbeidsmappen. Det endrer ingen filer.',
        String.raw`$practiceRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ProgressPal-Git-M02'
if (-not (Test-Path -LiteralPath (Join-Path $practiceRoot '.git') -PathType Container)) {
  throw 'STOPP: fant ikke M02-ovingsrepoet.'
}
Set-Location -LiteralPath $practiceRoot
& git status --short
if ($LASTEXITCODE -ne 0) { throw 'STOPP: Git fant ikke repoet.' }`,
        '',
      ),
      note(
        'Oppsettet er en øving, ikke et krav om at ProgressPal kan kontrollere datamaskinen din. Får du en feil, les meldingen og behold mappen. Ikke bruk `reset --hard`, `clean`, slett `.git` eller tøm andre mapper for å forsøke igjen.',
      ),
      question(
        'GIT-M02-E02',
        'Etter oppsettet er `git status --short` tomt. Hva betyr det?',
        [
          [
            'a',
            'Git viser ingen endringer som venter på neste commit.',
            true,
            'Riktig. Git sammenligner arbeidsfilene og staging med gjeldende commit. Det sier ingenting om kravet om maks 20 er oppfylt.',
          ],
          [
            'b',
            'Innstillingen 200 må derfor være korrekt.',
            false,
            'En ren Git-status sier bare at den siste registrerte versjonen samsvarer med arbeidsfilene, ikke at løsningen følger kravene.',
          ],
          [
            'c',
            'De tre commitene har blitt sendt til GitHub.',
            false,
            'Git-status viser ikke at noe er publisert. Øvingen har ingen remote, og lokale commits lastes ikke automatisk opp.',
          ],
        ],
        'Skill mellom «ingen ulagrede Git-endringer» og «innholdet oppfyller alle krav».',
      ),
      report(
        'GIT-M02-E03',
        'Fortell kort hva du fikk til:\n\n- Lagde du tre commits?\n- Hva viste historikken?\n- Stoppet du underveis eller trengte hjelp?\n\nIkke ta med private filstier, passord eller personopplysninger.',
      ),
    ],
  },
  {
    missionId: 'GIT-M02-O03',
    title: 'Les commits, HEAD og tidligere filer',
    goal: 'Finne relevant commit i historikken og skille mellom historisk lesing og endring av nåværende filer.',
    skillId: 'GIT-M02-HISTORY',
    flow: [
      text(
        'Etter en pause går du tilbake til den eksisterende `ProgressPal-Git-M02`-mappen. Kontroller mappe og `git status`, og les `git log --oneline` før du fortsetter fra riktig commit. Oppsettet i første leksjon skal ikke kjøres en gang til når øvingsmappen finnes. Hvis historikken ikke stemmer med forventningen, stopp i stedet for å opprette nye commits.',
      ),
      text(
        '### Commits er spor, ikke fasit\n\n`git log --oneline` viser en forkortet oversikt med nyeste commit først. Git viser en kort hash og commit-meldingen. En melding forteller hva forfatteren mente å gjøre, men er ikke et bevis for at koden ble riktig. For å se hva som faktisk er registrert, bruker du `git show`.',
      ),
      command(
        'Les de tre siste commitene',
        'Arbeid videre i `ProgressPal-Git-M02`, som du laget i leksjon 2, «Lag en egen historikk å undersøke». `--no-pager` hindrer at terminalen åpner en egen visning du må avslutte.',
        `${stay}\n& git --no-pager log --oneline -3\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke lese historikken.' }`,
        '<hash C> Legg til hjelpetekst og kontaktinfo\n<hash B> Juster kapasitet for test\n<hash A> Opprett pameldingsinnstillinger',
      ),
      text(
        '**HEAD** viser normalt til gjeldende commit via den aktive branchen. I øvingen, med tre commits, er `HEAD` commit C, `HEAD~1` er B, og `HEAD~2` er A. `~1` betyr første forelder, ikke «en filversjon» eller «første linje». I mer avansert historikk kan en commit ha flere foreldre; det kommer vi tilbake til når du lærer merge.',
      ),
      command(
        'Se hva en tidligere commit gjorde',
        'Undersøk B uten å flytte HEAD eller overskrive dagens filer.',
        `${stay}\n& git --no-pager show --stat HEAD~1\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke vise commit.' }`,
        'B endret settings.json',
      ),
      command(
        'Les tidligere filinnhold',
        'Et kolon etter commit-referansen betyr at du ber om en **fil slik den var lagret i den commiten**. Du leser historikken; arbeidsfilen endres ikke.',
        `${stay}\n& git --no-pager show 'HEAD~2:settings.json'\n& git --no-pager show 'HEAD:settings.json'\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke lese historisk fil.' }`,
        'A: "maxRegistrations": 20\nC: "maxRegistrations": 200',
      ),
      text(
        'Sammenlign dette med det du ser i Notisblokk: `settings.json` på disken er foreløpig fortsatt 200. `git show HEAD~2:settings.json` har bare skrevet gammel filtekst i terminalen. Det er ikke en gjenopprettingskommando.',
      ),
      question(
        'GIT-M02-E04',
        'I øvingen viser `git show HEAD~2:settings.json` grensen 20, men `git show HEAD:settings.json` viser 200. Hva kan du konkludere med?',
        [
          [
            'a',
            'Git har registrert ulike verdier i to commits, men du må fortsatt kontrollere hvilket krav som gjelder.',
            true,
            'Riktig. Historikken viser forskjellen, men behovet for rettelse avgjøres ved å sammenholde innholdet med gjeldende krav.',
          ],
          [
            'b',
            'Git har allerede endret dagens arbeidsfil tilbake til 20.',
            false,
            'git show leser og viser gammel filtekst. Det skriver ikke endringer til arbeidsfilen din.',
          ],
          [
            'c',
            'Den nyeste commit-meldingen beviser at 200 er riktig.',
            false,
            'En commit-melding beskriver intensjonen bak endringen, men kan ikke bekrefte at implementasjonen følger kravene.',
          ],
        ],
        'Hva viser Git om filen, og hvem kan fortelle deg hvilket krav som gjelder?',
      ),
      question(
        'GIT-M02-E05',
        'Hvor ligger det nyttige kontaktarbeidet når `HEAD` er C?',
        [
          [
            'a',
            'I den nåværende historikken og arbeidsfilene; et ukritisk bytte til A kan kaste det bort.',
            true,
            'Riktig. C inneholder senere dokumentasjon. Det er nettopp derfor vi skal rette den aktuelle verdien uten å erstatte hele prosjektet.',
          ],
          [
            'b',
            'Bare i commit A, siden A er den eldste versjonen.',
            false,
            'A ble laget før kontaktinformasjonen. Du må undersøke C og bevare den delen som fortsatt er nyttig.',
          ],
          [
            'c',
            'Ingenting fra commit C kan brukes fordi commit B har en feil.',
            false,
            'En feil i B gjør ikke kontaktinformasjonen fra C feil. Commitene kan inneholde både feilaktig og riktig arbeid.',
          ],
        ],
        'Se på hvilken commit som la til kontaktinformasjon og hva du trenger å bevare.',
      ),
    ],
  },
  {
    missionId: 'GIT-M02-O04',
    title: 'Sammenlign før du velger tiltak',
    goal: 'Lese en meningsfull diff og skille mellom registrert, staged og ennå ikke staged innhold.',
    skillId: 'GIT-M02-COMPARE',
    flow: [
      text(
        '### Forskjellen er viktigere enn filnavnet\n\n`git show` kan vise én commit eller en tidligere fil. `git diff` sammenligner innhold. Uten commit-referanser viser `git diff` normalt endringer i arbeidsfiler som ennå ikke er staged. Med to commit-referanser sammenlignes de to lagrede versjonene. `-- settings.json` avgrenser sammenligningen til akkurat den filen.',
      ),
      command(
        'Sammenlign A med C',
        'Før den lille rettelsen viser denne sammenligningen endringen fra 20 til 200. Linjene med `-` og `+` viser fjernet og lagt til tekst i diffen.',
        `${stay}\n& git --no-pager diff 'HEAD~2' HEAD -- settings.json\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke sammenligne versjonene.' }`,
        '-  "maxRegistrations": 20,\n+  "maxRegistrations": 200,',
      ),
      text(
        'Dette viser forskjellen mellom A og C, men ikke alene hvem som innførte avviket. `git show HEAD~1` viser endringen i B, mens `git show HEAD` viser endringen i C. Dermed kan du undersøke **hvilken commit** som faktisk endret den aktuelle filen.',
      ),
      command(
        'Se endringen i commit B',
        'Legg merke til at B endret settings.json, mens C la til nyttig dokumentasjon.',
        `${stay}\n& git --no-pager show --format=short 'HEAD~1' -- settings.json\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke undersøke endringen.' }`,
        '-  "maxRegistrations": 20,\n+  "maxRegistrations": 200,',
      ),
      question(
        'GIT-M02-E06',
        'Du ser `- "maxRegistrations": 20` og `+ "maxRegistrations": 200` i diffen. Hvordan bør dette tolkes?',
        [
          [
            'a',
            'Den undersøkte endringen erstattet 20 med 200 i filinnholdet som Git sammenligner.',
            true,
            'Riktig. Minuslinjen er den tidligere teksten, plusslinjen er den nye. Diffen viser hva som ble endret. Du må selv sjekke om det passer med kravet.',
          ],
          [
            'b',
            'Begge tall er nå aktive samtidig i settings.json.',
            false,
            'Minus og pluss betyr ikke at begge linjene finnes i den nyeste filen. Diffen viser før og etter.',
          ],
          [
            'c',
            'En plusslinje betyr alltid at endringen er godkjent og trygg.',
            false,
            'Pluss betyr lagt til i sammenligningen. Det er ikke en kvalitets- eller sikkerhetsvurdering.',
          ],
        ],
        'Diff er en beskrivelse av innholdsforskjell, ikke en kvalitetsrapport.',
      ),
      text(
        'Alternativene er nå tydelige. Du kan hente en hel gammel mappe og miste C, forsøke historikkendring du ennå ikke trenger, eller oppdatere bare den feilaktige verdien og lage en ny commit. Vi velger den siste metoden fordi kravet er kjent og de nyere dokumentasjonsendringene skal bevares.',
      ),
      question(
        'GIT-M02-E07',
        'Hva er det beste neste steget når du har bekreftet at kravet fortsatt er maksimalt 20, og C inneholder nyttig informasjon?',
        [
          [
            'a',
            'Rette verdien i dagens settings.json, undersøke diffen og registrere rettelsen som en ny commit.',
            true,
            'Riktig. Du beholder de nyere forbedringene og lager en ny commit som viser rettelsen.',
          ],
          [
            'b',
            'Kopiere hele A over prosjektet, for A har riktig verdi.',
            false,
            'Da kan du miste forbedringene i C. En riktig gammel verdi betyr ikke at hele den gamle prosjektmappen skal brukes.',
          ],
          [
            'c',
            'Slette .git-mappen så Git ikke lenger viser feilen.',
            false,
            'Det ødelegger lokal historikk uten å rette årsaken. Historikken er informasjonen du trenger for å forstå feilen.',
          ],
        ],
        'Tenk på hvilket tiltak som endrer minst mulig og lar historikken fortelle hva du gjorde.',
      ),
    ],
  },
  {
    missionId: 'GIT-M02-O05',
    title: 'Rett feilen og behold senere arbeid',
    goal: 'Rette én verdi, sjekke diff og staging area, lage en commit og se om resten er bevart.',
    skillId: 'GIT-M02-CORRECT',
    flow: [
      text(
        '### Før du skriver\n\nKontroller at du fortsatt er i den separate M02-mappen og at `git status --short` er tom. Har du andre endringer, ikke fortsett automatisk. Les hva som er endret, og bevar arbeidet før du bestemmer deg. Læringsmålet er å rette **bare** `maxRegistrations`, ikke å fjerne nyttige filer.',
      ),
      command(
        'Sjekk før rettelsen',
        'Denne kontrollen nekter å gå videre dersom du har endret eller staged noe uventet i M02-mappen.',
        `${stay}\n$status = & git status --porcelain\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke lese status.' }\nif ($status) { throw 'STOPP: ovingsmappen har andre endringer. Undersok dem forst.' }\n& git --no-pager show 'HEAD:settings.json'\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke lese siste registrerte innstillinger.' }`,
        '"maxRegistrations": 200',
      ),
      command(
        'Åpne innstillingene i Notisblokk',
        'Endre **bare** `"maxRegistrations": 200` til `"maxRegistrations": 20` og lagre filen. La `sendConfirmation` stå som `true`. Du bruker filen på disken, ikke en historisk kopi.',
        `${stay}\nnotepad.exe (Join-Path $practiceRoot 'settings.json')`,
        '',
      ),
      command(
        'Undersøk arbeidsfilens endring',
        'Nå viser `git diff` det som er endret i arbeidsfilen, men ennå ikke staged. Du skal se én tallendring og ingen endring i README.txt eller support.txt.',
        `${stay}\n& git --no-pager diff -- settings.json\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke lese diff.' }`,
        '-  "maxRegistrations": 200,\n+  "maxRegistrations": 20,',
      ),
      text(
        '**Viktig forskjell:** Dette er ikke en tilbakeføring av hele prosjektet. Du har beholdt dagens dokumentasjon og supporttekst. Du er i ferd med å lage en **ny** commit som forklarer reparasjonen.',
      ),
      command(
        'Velg bare rettelsen',
        'Staging bestemmer hva neste commit skal inneholde. Undersøk det staged utvalget før du registrerer det.',
        `${stay}\n& git add -- settings.json\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke stage rettelsen.' }\n& git --no-pager diff --cached -- settings.json\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke lese staged diff.' }`,
        '-  "maxRegistrations": 200,\n+  "maxRegistrations": 20,',
      ),
      question(
        'GIT-M02-E08',
        'Du har staged settings.json, men ikke laget ny commit. Hva viser `git show HEAD:settings.json`?',
        [
          [
            'a',
            'Fremdeles 200, fordi HEAD er siste commit og staging ennå ikke lager en ny commit.',
            true,
            'Riktig. Staging endrer utvalget til neste commit, ikke historien som HEAD peker på.',
          ],
          [
            'b',
            '20, siden git add alltid flytter HEAD til nytt innhold.',
            false,
            'git add legger innhold i staging area. Først en ny commit flytter grenen og dermed vanligvis HEAD til den nye registreringen.',
          ],
          [
            'c',
            'Ingenting, fordi git show bare virker etter push til GitHub.',
            false,
            'git show leser lokal Git-historikk. Det krever verken nettverk eller GitHub-konto.',
          ],
        ],
        'Skille mellom arbeidsfilen, staging area og siste lagrede commit.',
      ),
      command(
        'Registrer rettelsen',
        'Sjekk at bare innstillingens ene endring er staged. Denne kommandoen nekter commit hvis andre filer er staged.',
        `${stay}\n$staged = & git diff --cached --name-only\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke lese staged filer.' }\nif (@($staged).Count -ne 1 -or @($staged)[0] -ne 'settings.json') { throw 'STOPP: feil filer i staging. Undersok forst.' }\n& git commit -m 'Rett kapasitet uten a fjerne senere forbedringer'\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke registrere rettelsen.' }`,
        '',
      ),
      command(
        'Kontroller resultatet',
        'Du skal nå ha **fire commits**. Innstillingen er 20 i HEAD. README og support.txt inneholder fortsatt de senere forbedringene. En tom status betyr at øvingen ikke har nye lokale endringer.',
        `${stay}\n& git --no-pager log --oneline -4\n& git --no-pager show 'HEAD:settings.json'\n& git --no-pager show 'HEAD:README.txt'\n& git --no-pager show 'HEAD:support.txt'\n& git status --short\nif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke kontrollere sluttresultatet.' }`,
        'HEAD:settings.json har 20; README.txt og support.txt inneholder senere tekst; status er tom.',
      ),
      note(
        'Har du et annet resultat, undersøk status og diffs før du gjør mer. Ikke slett historikken eller bruk destruktiv reset for å få øvingen til å se riktig ut. Det er legitimt å stoppe og beskrive hvor du står.',
      ),
      report(
        'GIT-M02-E09',
        'Fortell kort:\n\n- Hvor fant du feilen?\n- Hva rettet du, og hvorfor?\n- Hvordan sjekket du at de nyere endringene ble beholdt?\n\nDu kan også fortelle hvor du stoppet. Ikke ta med private opplysninger.',
      ),
    ],
  },
  {
    missionId: 'GIT-M02-O06',
    title: 'Prøv selv: Skal du egentlig endre noe?',
    goal: 'Bruke Git-historikken og et endret krav til å avgjøre om et rapportert problem faktisk trenger en kodeendring.',
    skillId: 'GIT-M02-TRANSFER',
    flow: [
      text(
        '### Et annet utviklingsproblem\n\nEt prosjekt sender normalt en automatisk bekreftelse etter påmelding. Du får nå meldingen: «Bekreftelsene kommer ikke fram; få dem tilbake». I historikken ser du en commit som endret `sendConfirmation` fra `true` til `false`. Men i en senere oppgavebeskrivelse står det at bekreftelser nå håndteres manuelt av arrangøren, for å unngå doble utsendelser.',
      ),
      text(
        'Du får ikke fasiten fra den som meldte feilen. Dette er ikke en kopi av den første øvingen med andre filnavn: her kan **det riktige tiltaket være å ikke endre koden**. Undersøk hva som faktisk skjer, sammenlign med gjeldende krav, og forklar konklusjonen. Om kravet er uavklart, skal du heller ikke gjette.',
      ),
      question(
        'GIT-M02-E10',
        'Du bekrefter at den gjeldende bestillingen sier «manuelle bekreftelser, ingen automatisk utsending». Historikken viser `true` → `false`. Hva bør du gjøre?',
        [
          [
            'a',
            'Ikke automatisk endre tilbake til true. Dokumenter at dagens innstilling følger kravet, og avklar eventuelle andre symptomer.',
            true,
            'Riktig. Git viser hva som ble endret; det er gjeldende behov og observert atferd som avgjør om det er en feil som skal rettes.',
          ],
          [
            'b',
            'Alltid hente den eldste versjonen tilbake, fordi den hadde true.',
            false,
            'Den eldste verdien er ikke automatisk riktig. Kravet ble endret for å unngå doble bekreftelser.',
          ],
          [
            'c',
            'Slette hele endringshistorikken for å bli kvitt feilmeldingen.',
            false,
            'Å slette historikk fjerner ikke et kravavvik, og her har du ennå ikke påvist at det finnes et avvik.',
          ],
        ],
        'Hva er forskjellen på «endret siden før» og «feil i forhold til dagens krav»?',
      ),
      question(
        'GIT-M02-E11',
        'Kravet er uklart, og commit-meldingen sier bare «juster varsling». Hva er den beste konklusjonen akkurat nå?',
        [
          [
            'a',
            'Undersøk hva som ble endret. Spør hva som gjelder før du endrer koden.',
            true,
            'Riktig. Du bruker Git til å finne fakta om endringen, men antar ikke at en kort melding eller et symptom avgjør kravspørsmålet.',
          ],
          [
            'b',
            'Commit-meldingen viser at dagens oppførsel er feil.',
            false,
            'En commit-melding er et hint om intensjonen bak arbeidet. Den kan være ufullstendig eller misvisende.',
          ],
          [
            'c',
            'Gjennomfør samme rettelse som i forrige øving, siden det også gjelder en innstillingsfil.',
            false,
            'Samme filtype betyr ikke samme problem. Først må du finne årsak og gjeldende krav.',
          ],
        ],
        'Du kan vite hva Git registrerte uten å vite hvilken løsning oppgaven egentlig trenger.',
      ),
      report(
        'GIT-M02-E12',
        'Forklar med egne ord: Hva ville du undersøkt i historikken, hvilken informasjon trenger du om gjeldende krav, og når ville du rettet, ventet eller latt filen være uendret? Sammenlign gjerne med første øving. Du kan beskrive en uavklart vurdering.',
      ),
      {
        t: 'recap',
        can: [
          'Lese git log og forklare hva HEAD, HEAD~1 og en commit-referanse peker på.',
          'Bruke git show til å undersøke historisk filinnhold uten å endre dagens arbeidsfiler.',
          'Bruke git diff til å sammenligne commits, arbeidsfil og staging og tolke endringene.',
          'Rette et konkret avvik med ny commit og kontrollere at nyttig senere arbeid er bevart.',
          'Vurdere om endringen faktisk er en feil i forhold til gjeldende krav.',
        ],
        next: 'Nå kan du forstå én utviklingslinje over tid. Neste modul, M03, er tilgjengelig og lærer deg å arbeide på egne branches, samle endringer og løse konflikter. Åpne den fra Pathways-oversikten.',
      },
    ],
  },
];
