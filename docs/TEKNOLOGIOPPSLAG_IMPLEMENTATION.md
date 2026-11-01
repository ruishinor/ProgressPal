# Teknologioppslag — lokal implementering 2026-11-01

> **Korrigert lokalkandidat:** [source-verifisert utbedring](TEKNOLOGIOPPSLAG_REMEDIATION.md)
> erstatter søkeorakelet, søkeresultatene og størrelsene nedenfor. Denne eldre
> implementeringsrapporten bevares som historikk; dens søke-PASS var ikke et
> tilstrekkelig relevansbevis. Ingen uavhengig aksept er utført.

**Status: lokal implementering og målrettede akseptansekontroller bestått;
28/28 oppføringer REVIEW-READY. Uavhengig faglig/kodemessig aksept og
utgivelsessertifisering er ikke utført. Den ekstra dependency-auditen er
uavklart fordi npm-endepunktet feilet, exit 1.**

## Identitet og autorisasjon

- Worktree: `C:/00 DEV/In Progress/ProgressPal-TechReference-20261101-203711`.
- Branch: `feat/technology-reference-20261101-203711`.
- Base og fortsatt HEAD: `9b2f5239728cafa1ac4ac43a0c222e36cf2edfec`, lik lokal
  `master` ved start. Worktree var rent. Origin er
  `https://github.com/ruishinor/ProgressPal.git`. Ingen fetch/pull ble gjort;
  fersk fjernstatus er ikke verifisert.
- Oppdraget ble lest komplett som UTF-8 direkte fra
  `C:/Users/alex_/Downloads/ProgressPal_Teknologioppslag_IMPLEMENTATION_EXECUTION_2026-11-01.md`.
  `AGENTS.md`, hele `docs/CURRENT_STATE.md` og de avgrensede kontraktene ble lest.
- Node `24.19.0`, npm `11.10.1`. `npm ci --cache .npm-cache` installerte de
  låste avhengighetene, exit 0. Den nyopprettede cachen ble senere flyttet
  innen dette worktreeet til gitignorert `artifacts/npm-cache/`.
- Alle mutasjoner gjelder dette worktreeet. Ingen commit, staging, push, PR,
  merge, tag, versjonsendring, deployment eller provideroperasjon er utført.
  Ingen uavhengig review eller review-evidence er skrevet.
- Original `ProgressPal` på `edit/achievement-copy-thresholds` ble ikke skrevet
  til av implementeringen. En read-only Git-kontroll der kunne ikke åpne repoet
  i sandboxen. To filhashlesninger av originalens
  `src/lib/activity/achievementData.ts` ga forskjellige SHA-256-verdier:
  `1f3cecb63acee4d5533cc75163c190473c2959cc22b2108aacf4aa084c51fada`
  og senere
  `5c66ffd0b07712f11374b9630913498746c14abece6b36a109a466273f9738ef`.
  Det er en observert samtidig endring utenfor dette worktreeet; aktør og årsak
  er UNKNOWN. Det hevdes derfor ikke at den opprinnelige filen er uendret.

## Avgrenset leveranse og akseptansekriterier

Kriteriene var etablert før ekspansjon: Home → søk/tema → kanonisk oppføring →
forklart intern relasjon → bevart søk/tema; direkteadresse/reload og ukjent ID;
begge programmer; fem primærvalg; ingen elevskriving; navne-/aliasprioritet og
reelle nulltreff; lesbar mobilflate og tastatur; eksisterende offline-cache;
uendrede budsjetter; primærkilder før faglig ferdigmerking.

Implementert:

- Egen funksjon `src/features/technologyReference/` med offentlig entrypoint,
  statisk JSON, ren søkemodell og en normal rullbar leseflate på bokmål.
- Sekundær Home-lenke for begge registrerte programmer. Eksisterende fem
  primærvalg, Fokus og EDU-04 er bevart.
- `/rpg/oppslag` og `/rpg/oppslag/:entryId`, registrert i rutekontrakten;
  URL-parametrene `q` og `tema`, vanlig browserhistorikk, lenker og GET-skjema.
  Søket lagres ikke i elevlagring. Direkteadresser følger den eksisterende
  onboarding-/oppstartskontrakten.
- 28 kanoniske oppføringer fra den autoriserte listen; typer, konkrete
  bruksscenarier, nødvendige skiller, aliasgrupper, tema, redaksjonelle
  formålsord, forklarte retningsbestemte relasjoner og kilde-/kontrolldatoer.
  Muntlig formulering er lagt til de tre representative tekstene; ingen
  mekanisk FAQ eller øvelses-/progresjonsfunksjon er lagt til.
- Eksakt navn prioriteres over eksakt alias, navneord, formålsord og svakere
  teksttreff. Korte ord matches som hele ord, uten tvangsfuzzy.
  Staveforslag er tydelig adskilt fra reelle treff.
- Normal React-tekstgjengivelse, semantiske kontroller, synlig fokus og
  temaavhengige eksisterende fargetokens. Oppstartsloading kommer fra den
  eksisterende RPG-ruteshellen; den statiske katalogen trenger ingen egen
  asynkron lastetilstand. Nulltreff, ukjent tema og ukjent oppførings-ID har
  konkrete meldinger og en vei tilbake.
- Kildelenker laster ingenting automatisk og har `referrerPolicy="no-referrer"`
  og `rel="noopener noreferrer"`.

Ingen database-, backup-, XP-, achievement-, programregistrerings-,
curriculum-, MicroShell-/SessionRunner-, Focus-, Pathways-, cloud-, CSP-,
service-worker-, bundler-, dependency- eller budsjettendring inngår.

## Portene og valg av innholdslagring

**Port 0:** faktisk identitet, rent isolert worktree, verktøy og relevante
rute-/UI-/nettverks-/PWA-/budsjettkontrakter kontrollert.

**Port 1:** API, React og Kubernetes ble skrevet og kildekontrollert først.
De hadde bare gyldige lenker seg imellom. Home-flyten, direkteadresse,
alias/relevans, URL-bevaring og likt databasesnapshot ble kontrollert før
ekspansjon.

**Port 2:** native baseline og treoppføringsbuild ble målt. 30 målrettede
modell-/rute-/localOnly-tester, tre app-/eval-kontroller og en managed cold
offline-test passerte før de resterende 25 tekstene ble lagt til.
Første offlineforsøk avdekket en for streng testlokator, ikke tapt temastat;
den ble erstattet med selectens faktiske tilgjengelige combobox-rolle.

Den eksisterende asset-løsningen ble vurdert som en reell kandidat:

1. `sameOriginAsset.ts` tillater bare avgrensede `content/`-/`runtime/`-paths
   og er eneste nettverksleser i appkoden.
2. `lessonContent.ts` sitt innholdsprovider er programmestyrt og verifiserer
   katalogbundne bytes/SHA-256. Det er ikke et generelt oppslagsprovider.
3. `programvareutvikling-content.mjs` skriver den komplette
   `public/content/offline.json` fra programeksporten. Manuell påhenging ville
   kunne bli overskrevet av neste eksport.
4. SW cacher den oppførte JSON-listen ved installasjon, men native
   `classifyBuildFile` regner all `content/*.json` som curriculum.
   Oppslagstekst kan derfor ikke bare legges der og behandles som «gratis»
   curriculum. En slik variant ville krevd en smal, separat avklart
   eksport-/integritets-/kostnadskontrakt.

Ingen av disse grensene ble utvidet. Den faktisk målte kilden hadde
52 863 B JS-gziprom, så statisk import var den enkleste validerbare løsningen.
Alle tekster inngår i den vanlige hashede bootgrafen og dens eksisterende
install-time-cache. Ingen nye ressurser skjules i en annen budsjettklasse.
Det er ikke påstått at en ny asset-variant er implementert eller testet.

**Port 3:** ekspansjonen fulgte etter bestått Port 2. Hele evalsettet ble
kjørt igjen, sammen med fire nye formuleringer. Alle 28 sider ble undersøkt
i begge temaer ved 320 px, separat 200 % tekst ved 1024 px, og i tillegg
kombinert 320 px/200 % tekst. Endelig managed browserpass: 9/9, ingen retries
eller skips.

## Faktiske størrelser

Native måler er `node scripts/check-build-budget.mjs`, gzip fra Node zlib.
Vites avrundede konsoll-gzip er ikke brukt som budsjettmåling.

| Måling, B                    |  Baseline | Tre oppføringer | Endelig kandidat |         Uendret grense |
| ---------------------------- | --------: | --------------: | ---------------: | ---------------------: |
| All JS gzip, inkl. SW/worker |   417 137 |         421 549 |          430 271 |                470 000 |
| Største rå JS-chunk          |   422 610 |         434 719 |          468 358 |                500 000 |
| All CSS gzip                 |    16 115 |          16 401 |           16 397 | 40 000 (varsel 25 000) |
| Curriculum gzip              |   126 984 |         126 984 |          126 984 |                150 000 |
| Pakket runtime gzip          | 6 398 912 |       6 398 912 |        6 398 912 |              7 000 000 |

Ingen overskridelser, varsler eller produksjons-source maps. JS øker
13 134 B gzip; kandidaten har 39 729 B igjen til JS-grensen og 31 642 B til
største rå chunk-grense. Ingen oppdeling/refaktor av bundleren var nødvendig.

Hele oppslagsressursen, målt separat for synlighet: forfatter-JSON er
48 272 B rå / 11 231 B gzip; minifisert JSON er 40 134 B rå / 10 878 B gzip.
Dette er diagnostiske innholdsmål, **allerede inkludert i JS-totalen**, ikke
en ekstra ressurs som skal summeres oppå den. Faktisk kompilert marginal
gzip påvirkes også av kompresjon sammen med kode.

Den ferske browsercachen inneholder 3 963 403 B dekodede response-bodies,
registrert per path i `artifacts/technology-reference/cache-footprint.json`.
Det er ikke overføringsgzip eller browserens faktiske diskallokering.
Boot-JS/CSS øker samlet 47 178 rå B fra baseline; de faste assets,
curriculum og runtime-listen er uendret. Et tilsvarende baseline-cacheinnhold
kan derfor beregnes til 3 916 225 B, men **ble ikke målt i en baseline-browser**.
Den eksakte fysiske disk-/cachemetadataoverheaden er UNKNOWN. Python-WASM
ligger ikke i den ferske installcachen; runtime cacher som før ved første bruk.

Kald offline-test: bare onboarding/eksisterende Dashboard ble besøkt online.
Et nytt tab-vindu åpnet deretter den aldri besøkte Kubernetes-adressen offline,
fulgte API-lenken, reloaded og returnerte til K8s/Drift. Første install uten
noen cache lover ikke offline.

## Kontroller og faktiske resultater

| Kommando / kontroll                                                                                                                                                             | Resultat                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm ci --cache .npm-cache`                                                                                                                                                     | exit 0, 334 installerte pakker, initial audit rapporterte 0 sårbarheter      |
| `npm run typecheck` etter siste TS-endring                                                                                                                                      | exit 0                                                                       |
| `npx eslint <alle endrede TS/TSX-filer> --max-warnings 0`                                                                                                                       | exit 0                                                                       |
| `npx prettier --check <endrede kilde-/test-/dokumentfiler>`                                                                                                                     | exit 0; alle 19 endrede/nyopprettede tekstfiler kontrollert                  |
| `npm run build` / managed runner sitt Vite-build                                                                                                                                | exit 0                                                                       |
| `npm run check:bundle` / samme native måler                                                                                                                                     | exit 0; tall over                                                            |
| Seks berørte rute-/lag-/SW-guardfiler + feature/app/eval, serialisert Vitest                                                                                                    | 104/104, 9 filer, exit 0 før siste søkekorreksjon                            |
| `npm test -- tests/features/technologyReference.test.ts tests/features/technologyReferenceEvaluation.test.ts tests/app/technologyReference.test.tsx` etter siste søkekorreksjon | 60/60, 3 filer, exit 0                                                       |
| `npm run test:e2e -- e2e/technology-reference.spec.ts e2e/technology-reference.offline.spec.ts`                                                                                 | 9/9, exit 0, managed server ryddet                                           |
| `git diff --check`                                                                                                                                                              | exit 0                                                                       |
| Diffkontroll av programmer, db, backup, SW, Vite, scripts og package/lockfile                                                                                                   | exit 0; ingen endring                                                        |
| `npm run audit -- --cache artifacts/npm-cache`                                                                                                                                  | exit 1, advisory-endepunkt utilgjengelig; samme resultat ved ett nytt forsøk |

De tidligere mislykkede kontrollene er ikke skjult: feil antagelse om et
svakt API-tematreff, for streng label-lokator, utvidet Drift-forventning,
Node 24s påkrevde JSON-importattributt i Playwright, og RTLs manglende `exact`
rolleopsjon ble rettet i testene. Faktiske søkedefekter for MSDB og Go ble
rettet som beskrevet under. Det ble ikke brukt en fullsuite til å finne
stale forventninger én etter én.

Browserfunn: alle 28 leseflater uten målt horisontal overflow/vertikal
tekstklipping i de oppførte dimensjonene. Axe på søkeflaten og alle tre
representative artikler i hvert tema/størrelsesoppsett ga ingen funn.
Tastaturkontroller undersøkte felt → tema → søk, synlig outline, lenke via
Enter og main-fokus ved rutebytte. Skjermleser på fysisk enhet og native
browserzoom er NOT TESTED; 200 % er root-font stress, ikke en slik sertifisering.
Ingen uventet ekstern request ble observert under oppslagsflyten i noen av
programmene. En integrasjonstest sammenligner alle elevtabeller før/etter
leseflyten og finner identiske snapshots.

Skjermbilder og rå JSON-rapporter ligger lokalt under
`artifacts/technology-reference/`. To representative opptak ble også visuelt
lest. Ingen full lokal suite eller release-gate er kjørt; oppdraget forbød
full release-gate. Ingen security-/produksjonssertifisering hevdes.

## Seks materielle selvgjennomganger

1. **Produkt/brukeroppgave:** egen referanseflate og sekundær inngang;
   ingen sjekkliste, quiz, XP, progresjon eller krav til rekkefølge. Begge
   programmer når samme kanoniske innhold, med fem bevarte primærvalg.
2. **Pedagogikk:** API forklares uten backendkrav; React skiller komponent,
   forretningsregler og varig lagring; Kubernetes skiller måltilstand og
   garanti, runtime og Docker. Påstander om oppetid/isolasjonsgaranti er
   bevisst unngått. Egne fiktive scenarioer gjør aktører og handlinger konkrete.
3. **IA/lenker:** første snitt lenket bare mellom eksisterende oppføringer.
   Nå valideres alle mål, unike ID-er/navn/alias, temaer og kildedatoer.
   C#/.NET er ikke slått sammen eller gitt uautoriserte sider.
4. **Relevans/tvetydighet:** negert MSDB-omtale skapte et faktisk feilaktig
   svakt treff og ble fjernet fra indeksert oppslagstekst. Hele rangeringslisten
   avdekket også Go inne i «god»; korte ord krever nå hele ord. Aliasene og de
   19 evalspørringene kontrolleres separat fra staveforslag.
5. **Arkitektur/offline/UU:** dagens målinger erstattet historisk 23 B-antagelse.
   Den programmestyrte asset-pakkeren ble ikke misbrukt. Vanlig boot-cache ga
   dokumentert offlinefunksjon uten fetch-/policyendring. Separate reflow- og
   tekstforstørrelseskontroller suppleres av kombinert stress, med oppgitte
   begrensninger.
6. **Adversarial QA/scope:** alle elevtabeller forble identiske gjennom
   leseflyten; ukjent ID og reelle nulltreff gir gjenopprettbar UI; eksterne
   kilder lastes bare ved lenkefølging. Audit-endepunktfeilen rapporteres som
   uavklart, ikke PASS. Originalens samtidige endring er eksplisitt skilt fra
   egne mutasjoner. Ingen simulerte uavhengige reviewere er brukt.

## Gjenværende grenser og neste handling

[Kildeproveniens og full per-spørring-evaluering](TEKNOLOGIOPPSLAG_SOURCES_AND_SEARCH.md)
angir alle 28 oppføringer som REVIEW-READY, med eksakte URL-er og kontrolldato.
Katalogens SHA-256 er
`dcdf5af25d2f87055272e34e412ea8bb42e5c1941d2f4ce011c3346bc1b82cd7`.
Dette identifiserer redaksjonelt materiale, ikke uavhengig aksept.

**NEXT ACTIONABLE (ikke utført):** La en faktisk uavhengig fag-/kodereviewer
gjennomgå dette worktreeets fulle lokale diff og den ovennevnte kataloghashen,
med særlig vekt på de 28 forklaringene, alias-/relasjonsretningene og
søkeresultatene. Reviewer skal levere konkrete funn og aksept/HOLD uten å
utgi implementeringens selvsjekk for uavhengig bevis. Etter aksept må eieren
separat autorisere eventuell commit og GitHub-/CI-/releaseprosess; da må et
tilgjengelig npm-audit-endepunkt, kandidatbundet review og ordinær sertifisering
være lukket før noen produksjonshandling. Ingen av disse Git-/releasehandlingene
er autorisert eller utført av denne leveransen.
