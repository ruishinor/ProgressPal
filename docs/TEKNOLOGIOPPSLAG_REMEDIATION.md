# Teknologioppslag — source-verifisert lokal utbedring, 2026-11-01

**FIXED som avgrenset lokalkandidat; klar for separat faktisk aksept.** De fem
reproduserte søkeavvikene er rettet; orakelet feilet før algoritmeendringen og
består etterpå; målrettet app-/browser-/offline-regresjon består. Dette er
selvreview med selvstendig kildeinspeksjon, ikke uavhengig godkjenning, empirisk
nybegynneraksept, sikkerhets-PASS eller release-sertifisering.

## Identitet, inventar og avgrensning

- Rot: `C:/00 DEV/In Progress/ProgressPal-TechReference-20261101-203711`.
- Origin: `https://github.com/ruishinor/ProgressPal.git`.
- Branch: `feat/technology-reference-20261101-203711`.
- HEAD før/etter: `9b2f5239728cafa1ac4ac43a0c222e36cf2edfec`.
- Start: seks modifiserte tracked og tretten untracked filer; samme inventar som
  eksportbeskrivelsen, ikke en antatt ren baseline. Slutt: seks tracked og fjorten
  untracked; denne handoffen er eneste nye fil utover startinventaret.
- Alle 19 startfiler ble gjennomgått: de tre dokumentene, begge routerfilene,
  Home, rutehjelperen, rutetesten, begge browserfilene, hele featuremappen og de
  fire øvrige feature/app/arkitekturtestene. Ingen samtidige endringer er
  observert i de ni startfilene som denne utbedringen ikke skrev til.
- Denne utbedringen endrer tre produksjonsfiler (`model.ts`, `ReferencePage.tsx`,
  `entries.json`), fire testfiler (modell, eval, app og vanlig browser), tre
  eksisterende dokumenter og denne handoffen. Fullt før-/etterinventar med
  SHA-256: `artifacts/technology-reference/remediation/file-hashes.json`.
- Endelig katalog-SHA-256: `2bdc9c8afd483004dd7cd3a14cdc00bbd6f01fbe8392dda5c04958b260d9310f`.
- Ingen skriving eller inspeksjon i originalarbeidskopien `ProgressPal` var
  nødvendig. Ingen staging, commit, Git-nettverksoperasjon, publisering,
  versjons-/gate-/budsjettendring eller review-evidence. Ingen installasjon.

Startmodellen og -katalogen er bevart lokalt i `before-model.ts` og
`before-entries.json` under samme artifactmappe. De tidligere handoffene
bevares med tydelig historikkbanner, ikke som fortsatt gyldige søkeorakler.

## Bekreftede funn og korrigeringer

| Funn                                                           | Reprodusert årsak                                                            | Konkret korrigering                                                                                                                                                                         |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Java ga JavaScript 300 og syv flere treff                      | Vilkårlig delstreng i lange navn/formål/tekst                                | Hele tekniske ord; ingen enkeltordsøk i brødtekst. Java er fortsatt ukjent, uten ny side. Den korrekte Java-negasjonen beholdes.                                                            |
| Grunnleggende containerkjøring ga Kubernetes 250, deretter API | Feil redaksjonell formålsfrase og feil testorakel                            | Docker får den grunnleggende formålsfrasen; Kubernetes beskrives med orkestrering. Container og Kubernetes vises som forklarte relasjoner til Docker. Begge uriktige testkrav er erstattet. |
| Tegnsetting/spørsmål ga null eller API foran React             | Søkeord og tekst ble normalisert forskjellig; spørsmålsord ble krav          | Felles ordgrense, kort eksplisitt liste spørsmålsord. C#, C++, .NET, CI/CD og Node.js beholder tegnene. Ingen NLP eller fuzzy treff.                                                        |
| API/Drift ga Kubernetes 100                                    | Filter kjørt før løs identitets-/kontekstsammenblanding                      | Identiteten løses globalt før strengt temafilter. Nulltreff gir «Søk i alle temaer» med bevart q; korrekt API-fagtekst er beholdt.                                                          |
| API/React fikk tilfeldig tekststøy                             | Definisjon, eksempel, negasjon og relasjonsforklaring inngikk i samme indeks | Identitet/formål skilles fra støttende omtale og eksplisitte utgående relasjoner, både i modell og UI.                                                                                      |
| Docker → Container sa «Bygger og kjører»                       | Relasjonsetiketten blandet image og kjørende instans                         | Etiketten sier nå «Bygger images og kjører containere».                                                                                                                                     |
| REST/React Native krevde uforklarte fagord i første definisjon | «Distribuerte/tilstandsløse» og «native» før forklaring                      | REST bruker nettverkskommunikasjon/selvstendige forespørsler; native forklares som plattformens egne byggesteiner.                                                                          |

De siste to er redaksjonelle funn fra denne kildeinspeksjonen, ikke påståtte
brukerobservasjoner. Ingen ny feil i database, backup, XP, PWA eller Fokus ble
reprodusert, og disse områdene ble ikke omarbeidet.

## Søkeoracle, før og etter

Orakelet ble skrevet før produksjonsendringene: brukerintensjon, relevante
førstesvar, tillatte sekundære begreper og nullkontroller står per rad i
`before-search.json` og testens `cases`. Alt utenfor den aktuelle radens
relevanslister avvises som støy. `Kubernets` og sammenskrevet teknisk stavemåte
kan gi tydelig forslag, aldri et automatisk identitetstreff. Den første
oraclekladden var for streng mot nettopp slike forslag for Nodejs/SQLServer/
ReactNative; dette ble adjudikert før algoritmeendringen. Deretter feilet
førtesten med **22 assertionbrudd i 19 av 44 situasjoner**, exit 1. Ettertesten bruker samme 44 rader
og forventninger og består. Ingen forventning ble svekket for å godta nye treff.
Den eksplisitte tabellen med intensjon, relevante/sekundære/irrelevante svar og
nulltreff finnes også i `artifacts/technology-reference/remediation/oracle.md`.

Gjeldende rangering: navn 500, alias 400, hele navneord/flere navngitte begreper
300, eksakt redaksjonelt formål 250, dekkende ord i ett formål 200. Bare når
ingen slike svar finnes, kan minst to ord dekket av summary/purpose/example
gi omtale 100. Negasjoner/distinctions og relasjonsprosa er ikke søkeindeks.
Utgående redaksjonelle relasjoner fra sterkeste svar gir separat merket 50;
ingen rekursjon, ingen relasjoner uten et direkte svar i valgt tema. Alle
navn/alias er fortsatt testet separat. Fritekstsøket har ingen stemming,
synonyminferens eller generell språkforståelse: nye bøyninger og formuleringer
kan fortsatt gi null. API/React får nyttige sammenhenger uten påstått synonymi.

Tabellen viser faktisk full rangering. `R` = separat relatert, `O` = separat
omtale. Øvrige ettertreff er direkte navn/alias/formål. Ingen R/O var merket
slik i førkandidaten. «Ingen» er reelt null, og forslag er aldri treff.

| Sp?rring / tema                                      | Faktisk f?r (id:poeng)                                                                            | Faktisk etter (id:poeng, klasse)                                | Forslag etter |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------- |
| Java                                                 | javascript:300, node-js:200, frontend:100, html:100, npm:100, react:100, typescript:100, vite:100 | Ingen                                                           | Ingen         |
| JavaScript                                           | javascript:500, node-js:200, frontend:100, html:100, npm:100, react:100, typescript:100, vite:100 | javascript:500, node-js:50 R, typescript:50 R                   | Ingen         |
| hvordan kjøre containere                             | kubernetes:250, api:100, container:100, docker:100                                                | docker:250, container:50 R, kubernetes:50 R                     | Ingen         |
| API?                                                 | Ingen                                                                                             | api:500, kubernetes:50 R, react:50 R, rest:50 R                 | Ingen         |
| React?                                               | Ingen                                                                                             | react:500, api:50 R, react-native:50 R                          | Ingen         |
| K8s?                                                 | Ingen                                                                                             | kubernetes:400, api:50 R, container:50 R, docker:50 R           | Ingen         |
| SQL Server?                                          | Ingen                                                                                             | sql-server:500, relational-database:50 R, sql:50 R              | Ingen         |
| Hva er API?                                          | Ingen                                                                                             | api:500, kubernetes:50 R, react:50 R, rest:50 R                 | Ingen         |
| Hva er en database                                   | Ingen                                                                                             | database:500, relational-database:50 R                          | Ingen         |
| Hva brukes Kubernetes til?                           | Ingen                                                                                             | kubernetes:500, api:50 R, container:50 R, docker:50 R           | Ingen         |
| Hva er React                                         | api:100, react:100                                                                                | react:500, api:50 R, react-native:50 R                          | Ingen         |
| API / Drift                                          | kubernetes:100                                                                                    | Ingen                                                           | Ingen         |
| API                                                  | api:500, javascript:100, kubernetes:100, react:100, rest:100                                      | api:500, kubernetes:50 R, react:50 R, rest:50 R                 | Ingen         |
| React                                                | react:500, react-native:300, api:100, npm:100, typescript:100, vite:100                           | react:500, api:50 R, react-native:50 R                          | Ingen         |
| React Native                                         | react-native:500, react:100                                                                       | react-native:500, react:50 R                                    | Ingen         |
| Postgres                                             | postgresql:400, relational-database:100                                                           | postgresql:400, relational-database:50 R, sql:50 R              | Ingen         |
| Azure AD                                             | microsoft-entra-id:400                                                                            | microsoft-entra-id:400, authentication:50 R, authorization:50 R | Ingen         |
| SQL                                                  | sql:500, sql-server:300, postgresql:100, relational-database:100                                  | sql:500, relational-database:50 R, sql-server:50 R              | Ingen         |
| SQL Server                                           | sql-server:500, sql:100                                                                           | sql-server:500, relational-database:50 R, sql:50 R              | Ingen         |
| Go                                                   | go:500                                                                                            | go:500, backend:50 R                                            | Ingen         |
| teste nettsider automatisk                           | playwright:250                                                                                    | playwright:250, frontend:50 R                                   | Ingen         |
| lagre data                                           | database:250, postgresql:200, backend:100                                                         | database:250, postgresql:200, relational-database:50 R          | Ingen         |
| registrerer historikk                                | git:100, github:100                                                                               | git:100 O                                                       | Ingen         |
| K8s                                                  | kubernetes:400                                                                                    | kubernetes:400, api:50 R, container:50 R, docker:50 R           | Ingen         |
| Kubernets                                            | Ingen                                                                                             | Ingen                                                           | kubernetes    |
| autentisering autorisasjon                           | authentication:100, authorization:100, microsoft-entra-id:100                                     | authentication:300, authorization:300, microsoft-entra-id:50 R  | Ingen         |
| innlogging organisasjoner                            | microsoft-entra-id:100                                                                            | microsoft-entra-id:100 O                                        | Ingen         |
| komponenter skjermen                                 | react:200                                                                                         | react:100 O                                                     | Ingen         |
| Hva er Node.js?                                      | Ingen                                                                                             | node-js:500, javascript:50 R, npm:50 R                          | Ingen         |
| Hvordan installere pakker?                           | Ingen                                                                                             | npm:250, node-js:50 R, react:50 R                               | Ingen         |
| Hva er forskjellen på autentisering og autorisasjon? | Ingen                                                                                             | authentication:300, authorization:300, microsoft-entra-id:50 R  | Ingen         |
| Hva brukes React Native til?                         | Ingen                                                                                             | react-native:500, react:50 R                                    | Ingen         |
| surdeigsstarter                                      | Ingen                                                                                             | Ingen                                                           | Ingen         |
| slette surdeigsstarter                               | Ingen                                                                                             | Ingen                                                           | Ingen         |
| MSDB                                                 | Ingen                                                                                             | Ingen                                                           | Ingen         |
| C#                                                   | Ingen                                                                                             | Ingen                                                           | Ingen         |
| .NET                                                 | Ingen                                                                                             | Ingen                                                           | Ingen         |
| CI/CD                                                | Ingen                                                                                             | Ingen                                                           | Ingen         |
| C++                                                  | Ingen                                                                                             | Ingen                                                           | Ingen         |
| god                                                  | css:100                                                                                           | Ingen                                                           | Ingen         |
| Django                                               | Ingen                                                                                             | Ingen                                                           | Ingen         |
| ReactNative                                          | Ingen                                                                                             | Ingen                                                           | react-native  |
| Nodejs                                               | Ingen                                                                                             | Ingen                                                           | node-js       |
| SQLServer                                            | Ingen                                                                                             | Ingen                                                           | sql-server    |

JSON-rapportene inneholder poeng, matchklasse, alias og full forklaring per treff.
De fire holdoutspørsmålene er Node.js, installere pakker, autentisering kontra
autorisasjon, og formålet med React Native; ingen fikk nye katalogsøkeord.

## Redaksjonell status for alle 28

Alle felter, alias og retningsbestemte relasjoner ble lest. **RR** betyr
review-klar etter dette selvreviewet, ikke godkjent av en fagredaktør/nybegynner.
Primæradressene i den bevarte kildelisten ble åpnet på nytt 2026-11-01.

| Oppføring          | Status og konkret vurdering                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| API                | RR. Grensesnitt, ikke synonym for REST; nettlesereksempel trenger ingen egen backend. Relasjonene beskriver tilbydere.                    |
| React              | RR. Bibliotek, komponent/tilstand forklart; varig lagring og forretningsregler skilles. React Native er separat.                          |
| Kubernetes         | RR. Ønsket tilstand er ikke oppetidsgaranti; runtime/CRI skilles fra Docker. Bare orkestreringsord som direkte containerformål.           |
| REST               | RR. Første definisjon forenklet; eksempel forklarer forespørsel uten skjult samtalehistorikk. Alle REST-krav er ikke en full leksjon her. |
| Frontend           | RR. Brukerflaten, ikke en påstand om at alle løsninger trenger en server. Inputkontroll gir ikke serverautorisasjon.                      |
| Backend            | RR. Systemrolle, ikke et språk eller synonym for database; konkret bestillingskontroll.                                                   |
| HTML               | RR. Markering av struktur og mening; knappens utseende erstatter ikke semantikk.                                                          |
| CSS                | RR. Presentasjon skilles fra HTML; ingen falsk programmeringsspråkalias.                                                                  |
| JavaScript         | RR. Språk og nettleser-API skilles; korrekt «ikke Java» beholdt uten falskt Java-treff.                                                   |
| TypeScript         | RR. Statisk kontroll er forklart og erstatter ikke validering ved kjøring/testing.                                                        |
| React Native       | RR. Rammeverk og plattformens egne byggesteiner forklart; ikke React-alias. Kilden har et varsel om eldre API-detaljer, se under.         |
| Node.js            | RR. Kjøremiljø utenfor nettleseren; ikke språk/npm. Eksempel er et lokalt skript.                                                         |
| Database           | RR. Organisert datasamling, ikke krav om sky eller relasjonsmodell.                                                                       |
| Relasjonsdatabase  | RR. Rader/kolonner og kundereferanse forklarer modellen; produkt og SQL skilles.                                                          |
| SQL                | RR. Språk, ikke SQL Server; SELECT-eksempel og produktdialekter avgrenses.                                                                |
| PostgreSQL         | RR. Produkt/SQL/modell skilles; Postgres er kildebekreftet alias. «Objektrelasjonelt» er presist, men mer avansert enn tabell-eksempelet. |
| SQL Server         | RR. Produkt/T-SQL skilles fra SQL; MSSQL kalles uttrykkelig søkealias. MSDB gis ingen falsk identitet.                                    |
| Git                | RR. Lokal versjonshistorikk og commit forklares; publisering/GitHub er separat.                                                           |
| GitHub             | RR. Samarbeidsplattform; forklarte Git-, branch- og pull request-roller.                                                                  |
| npm                | RR. Verktøy/register/nettsted, ikke Node.js; pakker påstås ikke automatisk trygge.                                                        |
| Vite               | RR. Utviklingsserver/produksjonsfiler skilles; bygg er ikke brukerflytbevis.                                                              |
| Playwright         | RR. Nettleserautomatisering/testkjører; miljø og faktisk kjørte forventninger avgrenser beviset.                                          |
| Container          | RR. Prosess/image/instans/VM skilles; isolasjon påstås ikke som full sikkerhetsgaranti.                                                   |
| Docker             | RR. Bygge image og kjøre container skilles, også i relasjonsetiketten; korrekt grunnleggende formål.                                      |
| Go                 | RR. Språk/kompilering forklart; Golang er kallenavn, ikke annet språk. Ingen treff i «god».                                               |
| Autentisering      | RR. Identitetskontroll, ikke automatisk tilgang til alle data; autorisasjonslenken har riktig retning.                                    |
| Autorisasjon       | RR. Tillatelse til handling/data skilles fra innlogging.                                                                                  |
| Microsoft Entra ID | RR. Identitetstjeneste; Azure AD/AAD er tidligere navn. Windows Server AD skilles. Navnedato kildebekreftet.                              |

Materielle kildeavgjørelser er kontrollert mot [Docker](https://docs.docker.com/get-started/docker-overview/),
[Kubernetes CRI](https://kubernetes.io/docs/concepts/containers/cri/),
[runtimeintegrasjon](https://kubernetes.io/docs/setup/production-environment/container-runtimes/),
[Fielding kapittel 5](https://roy.gbiv.com/pubs/dissertation/rest_arch_style.htm),
[React Native-komponenter](https://reactnative.dev/docs/intro-react-native-components),
[Postgres-navnepolicy](https://www.postgresql.org/about/policies/project-name/)
og [Entra-navneendring](https://learn.microsoft.com/en-us/entra/fundamentals/new-name).
React Native-kilden varsler at enkelte eldre API-detaljer trenger oppdatering;
teksten vår bruker bare den generelle komponentmodellen, støttet også av
introduksjonen. Det er ikke belegg for nyarkitektur-/ytelsesløfter. Ingen nødvendig
kilde var utilgjengelig i dette passet. Lenkene er levende dokumentasjon, ikke
immutable kildesnapshots; datoen er kontrolltidspunkt, ikke varig garanti.

Ingen konkret gjenværende redaksjonell HOLD er identifisert i selvreviewet.
Bare tre `spoken`-felt er fortsatt til stede; ingen standardmanus er lagt til.
Kort definisjon, formål, fiktivt eksempel og sammenligning gir materiale til å
forklare med egne ord. Om nybegynneren faktisk kan gjøre det etter lesing er
**UNKNOWN** uten faktisk observasjon. Ingen læringseffekt eller innholdsaksept
er dokumentert av denne økten.

## UX, UU og Fokus

UI-endringen er begrenset til resultatforklaringer, separat navngitt gruppe for
relaterte begreper/omtaler og filterets gjenopprettingslenke. Alle lenker bevarer
q/tema der det er riktig; å fjerne filter beholder q. Nullkontroller får ingen
tilfeldig reserveoppføring. Direktebesøk beholder den synlige topplenken
«Tilbake til søk og tema»: ett lenkevalg når søkeflaten, uten å duplisere skjema
på 28 leseflater. Ingen observert flytfeil begrunnet ekstra artikkelsøkefelt.
Dette er en kilde-/browserbasert vurdering, ikke testet nybegynnerpreferanse.

Home-inngangen gir samme oppslag til begge programmer og bevarer fem primærvalg.
En senere Fokus-hub kunne samle Studieøkt, Mikroøkt, Utviklerblikk og oppslag,
men ville også kreve avklaring av navigasjonsnivå og skillet mellom pågående
studieøkt og fritt oppslag. Den beslutningen er åpen og utsatt; ingenting er
flyttet eller bygget om i Fokus nå.

## Verifikasjon og mål

Node 24.19.0, npm 11.10.1, eksisterende låste avhengigheter. Rålogger ligger i
`artifacts/technology-reference/remediation/`.

| Kontroll                                                                                                | Faktisk resultat                                                                       |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Før-eval, ny oracle mot uendret startmodell                                                             | exit 1; 22 assertionbrudd, før-resultater skrevet før assertions                       |
| Serialisert fokusgruppe: feature/catalog/eval/app, ruter, featuregrense, localOnly, RPG, SW og SW-cache | exit 0; 118/118 i ni filer                                                             |
| Endelig app-/modell-/evalkontroll etter testselector-/assertionretting                                  | exit 0; 63/63 i tre filer, ingen skips                                                 |
| Målrettet ESLint, alle berørte TS/TSX                                                                   | exit 0, max-warnings 0                                                                 |
| Målrettet Prettier, hele kandidatens 20 tekstfiler                                                      | exit 0                                                                                 |
| `npm run typecheck`                                                                                     | exit 0                                                                                 |
| `npm run build`                                                                                         | exit 0; Vite rapporterte 766 ms byggtid, ikke brukerlastetid                           |
| `npm run check:bundle`                                                                                  | exit 0, ingen budsjettvarsel, overskridelse eller prod-source maps                     |
| Én managed Playwright-gruppe, de to feature-spesifikasjonene                                            | exit 0; 9/9, ingen skip/retry, 1,4 min; runner ryddet egen server                      |
| Én bounded `npm run audit`, fetch-retries=0, timeout=10000                                              | exit 1, advisory-endepunktfeil; dependency security UNKNOWN, ingen audit-/release-PASS |
| `git diff --check`, full porcelain/untracked-inventering                                                | exit 0; filhashoversikt omfatter også utrackede filer                                  |

Browsergruppen kontrollerte begge programmer, tastatur/fokus/historikk/reload,
filterfjerning, API?/Hva er React?/containerkjøring/Java, alle 28 artiklers
reflow i light/dark ved 320px/100%, 1024px/200% og 320px/200% root-tekst. Axe
kontrollerte søk, ny sekundærgruppe ved desktop og API/React/Kubernetes i
stressoppsettene. Ingen funn eller målt horisontal overflow/vertikal klipping.
Ett ferdigprodusert light/320/200/API-skjermbilde ble visuelt lest. Native
browserzoom, fysisk enhet og faktisk skjermleser er **NOT TESTED**.
Browserlogger har bare et ikke-materielt NO_COLOR/FORCE_COLOR-varsel om
terminalfarger; dette påvirker ikke søk/innhold. Git varsler om utilgjengelig
global ignore-fil; repooperasjonene fullførte og lokalt ignorerte artifacts
ble holdt utenfor kandidatstatusen.

Cold offline åpnet en aldri besøkt kanonisk side i ny fane etter at bare den
eksisterende onboarding/Dashboard-flyten var besøkt online; relasjon, reload og
retur til K8s/Drift bestod. Cachen har **3 965 379 B dekodede response-bodies**,
ikke fysisk diskforbruk eller overføringsgzip. Packaged Python-WASM ligger som
før utenfor fersk boot-cache og caches ved første bruk. Ingen SW-/asset-/CSP-endring.
Ingen uventet ekstern request ble observert i oppslagsflyten, og den syntetiske
appflyten beholdt identiske snapshots av alle elevtabeller. Dette er avgrensede
regresjonsbevis, ikke en full sikkerhetsgjennomgang.

| Native budsjettmål         | Målt sluttkandidat, B |     Uendret grense, B |
| -------------------------- | --------------------: | --------------------: |
| All JS gzip, med worker/SW |               430 860 |               470 000 |
| Største rå JS              |               470 334 |               500 000 |
| All CSS gzip               |                16 397 | 40 000; varsel 25 000 |
| Curriculum gzip            |               126 984 |               150 000 |
| Runtime gzip               |             6 398 912 |             7 000 000 |

Måler: `scripts/check-build-budget.mjs`, som bruker Node zlib og inkluderer
oppslagsteksten i ordinær JS. Sammenlignet med **tidligere rapporterte**, ikke
nyoppbygde førmål 430 271/468 358 B er delta +589 B JS gzip / +1 976 B største
rå chunk; CSS er lik. Ubrukt sluttmargin er 39 140 B JS gzip / 29 666 B rå chunk.
**Budsjettene beholdes.** Den faktiske lasten og marginen begrunner ingen økning,
reduksjon eller endring av delt gate. Eksisterende statiske bootgraf gir testet
offline; flytting til curriculumasset ville kreve exporter-/integritets-/SW-arbeid
og budsjettklassifisering uten påvist behov. Ingen bundleroppdeling, CMS eller
indeksavhengighet er introdusert. Relevant vedlikeholdsgjeld som faktisk er
redusert: sammenblandet søkegrunnlag, misvisende relevanstester og umerkede
sekundærtreff. Ingen generell størrelsesopprydding.

Varm Node CPU-måling av samme 44 queryrader, 3 oppvarmingsrunder og 880 målte
søk per modell: før p50 **0,533 ms**, p95 **0,791 ms**; etter p50 **0,084 ms**,
p95 **0,361 ms**. Ingen ytelsespåstand for mobil/lesing/nettverk: målingen
isolerer kun modellkall på denne maskinen. Råmålinger og kjørbart måleskript
er i `search-timing.json` / `measure-search.mjs` i artifactmappen.

Full release-gate, fullsuite, sirkulær fullanalyse og release-review ble ikke
kjørt. Ingen ny importgrense eller dependency ble lagt til; målrettet lagtest
og TypeScript dekker den faktiske endringen.

## Syv forskjellige reviewpass

1. **Kilde/risiko:** leste implementasjonen og alle 28 tekster, inventerte/hashbandt
   startens 19 filer og sporet Home/ruter/offline. Ingen materiell endring i
   integrasjon, elevlagring eller originalarbeidskopi.
2. **Søkeoracle:** dømte de to Kubernetes-kravene og API/Drift-kravet som uriktige
   ut fra brukerintensjon og fagkilder; skrev 44-raders forventninger før retting.
   Ny oracle ga reell rød baseline, ikke bare gamle grønne tester.
3. **Retrieval:** hele tekniske ord, avgrensede spørsmål, feltskille og global
   identitet før filter. Forklarte, ett-hopp relasjoner bevarer nyttig sammenheng.
4. **Fag/pedagogikk:** alle oppføringer/relasjoner/kilder vurdert, Docker-etikett
   presisert, to definisjoner gjort mer selvforklarende. Ingen 25 nye manus;
   faktisk læringsaksept forblir ukjent.
5. **UX/UU:** direkte svar og støtte er synlig skilt; filter kan fjernes med q
   bevart. Artikkelens eksisterende tilbakevei er tilstrekkelig i kontrollert
   flyt. Fokus-hub er fortsatt separat åpen beslutning.
6. **Teknikk/ytelse:** målte produksjonsbuild, modell-CPU og boot-cache; beholdt
   budsjetter/offlinearkitektur; 118 tester og ni browsertilfeller består.
   Auditens utilgjengelige endepunkt er UNKNOWN, ikke pyntet til PASS.
7. **Adversarial motlesning:** samme evalsett før/etter, Java/JavaScript,
   navnegrenser, teknisk tegnsetting, spørsmålsord, filtre og negative kontroller.
   Uklare sekundærtreff kan ikke bli navn/alias i UI. En intern filtercallback-feil
   under utvikling og ugyldige RTL-selectoropsjoner ble fanget og rettet; ikke
   videreført som orkelforventning. Ingen simulerte uavhengige reviewers.

**NEXT ACTIONABLE:** Gjennomfør én separat faglig og nybegynnerrettet aksept av
denne konkrete kataloghashen og 44-query før/etter-rapporten: en fagperson som
ikke skrev rettelsen skal kontrollere definisjoner/alias/relasjonsretning og
observere en faktisk nybegynners oppslag av API, React, containerkjøring og
ett ukjent navn, etterfulgt av forklaring med egne ord. Lever konkrete funn og
aksept/HOLD. Dette oppretter ingen release-review-evidence og autoriserer ingen
commit, PR, push, merge eller deploy.
