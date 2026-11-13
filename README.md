# ProgressPal

ProgressPal er en nettleserbasert læringsapp som hjelper deg å øve, holde oversikt over studiearbeidet og fortsette der du slapp. Appen er utviklet med _local-first_ som utgangspunkt: studieopplysningene lagres først i nettleseren din, og grunnleggende læringsfunksjoner skal kunne brukes uten konto i standardutgaven.

Prosjektets kildekode omfatter studieprogrammene **CS50x** og **Programvareutvikling**, det tverrgående Git- og GitHub-sporet **Pathways**, og visningene **Classic** og **RPG**. Tilgang til valgfrie kontotjenester, automatisk synkronisering og **Guild** avhenger av utgave og utrullingsstatus. [Gjeldende prosjektstatus](docs/CURRENT_STATE.md) skiller mellom det som finnes i kildekoden, det som er testet, og det som faktisk er tatt i bruk.

ProgressPal er ikke en offisiell kurs- eller eksamensplattform og gir ikke sertifisering eller automatisk verifisering av ferdigheter du har brukt utenfor appen.

## Lagring, personvern og sikkerhet

Studiearbeid lagres i nettleserens IndexedDB. Nettleserdata kan gå tapt hvis du sletter nettstedsdata, bytter nettleserprofil eller enheten svikter. Eksporter en sikkerhetskopi dersom du vil ta vare på arbeidet utenfor nettleseren.

Valgfrie Nhost-tjenester kan håndtere innlogging, manuelle sikkerhetskopier, synkronisering og Guild. En manuell sikkerhetskopi er ikke det samme som automatisk synkronisering. Les [Personvern](PRIVACY.md) for hvilke opplysninger som kan sendes, og når det skjer.

Sikkerhetssårbarheter skal meldes privat, ikke gjennom vanlige tilbakemeldinger. Se [Sikkerhet og varsling](SECURITY.md). Den nye tilbakemeldingsfunksjonen i PR #93 er forberedt, men mottaket skal være avslått til nødvendige kontroller hos leverandørene er bekreftet.

## Teknisk oppbygning

Frontend er bygget med Vite, React, TypeScript, React Router, Dexie/IndexedDB og Zod. CSS brukes til visuell utforming. Vitest og Playwright brukes til tester. Den lokale databasen er arbeidslageret; valgfrie skytjenester har egne kontrakter og kan ikke betraktes som aktive bare fordi kode eller knapper finnes.

## Utvikling og kontroll

Prosjektet bruker **Node 24** og **npm 11**. Installer avhengighetene fra låsefilen og start utviklingsserveren:

```bash
npm ci
npm run dev
```

Bruk relevante lokale kontroller når du gjør endringer:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run check:bundle
npm run check:circular
```

`npm run test` kjører Vitest-testene, og `npm run test:e2e` kjører nettlesertestene. Bruk målrettede tester under utvikling når det er tilstrekkelig. `npm run validate` starter den særskilte releasekontrollen `verify:release`, som krever en ren Git-kandidat og korrekt dokumentert review. Se [CI og utgivelse](docs/ci.md). En bestått lokal test er ikke det samme som en godkjent utgivelse eller en oppdatert produksjonsadresse.

## Utgivelser og historikk

Taggen `v1.3.0-local-first-proof` og grenen `freeze/rpg-product-completion-2026-09-16` dokumenterer tidligere milepæler. Den løpende statusen, beslutningene og gjeldende releasegrunnlaget ligger i [prosjektstatusen](docs/CURRENT_STATE.md).

Kildefiler for utgivelse skal pakkes fra riktig Git-commit med `git archive`, slik at reglene for `export-ignore` blir fulgt. Ikke lag en kildeutgivelse ved å zippe en arbeidsmappe med lokale filer eller testartefakter.

## Opphavsrett og tilknytning

ProgressPal er et uavhengig prosjekt. Det er ikke utviklet, sponset eller godkjent av Harvard University, CS50, edX eller OpenCourseWare. Kursmateriale og varemerker tilhører sine respektive rettighetshavere. Appen kan lenke til offisielle læringsressurser, men er ikke en erstatning for kursenes egne innleverings- eller vurderingssystemer.

Lisensvilkårene står i [LICENSE](LICENSE).

---

# ProgressPal (English)

ProgressPal is a browser-based learning app that helps you practise, keep track of your studies, and pick up where you left off. It follows a _local-first_ approach: your study records are saved in your browser first, and the standard version supports core learning activities without an account.

The codebase includes **CS50x** and **Software Development** (_Programvareutvikling_), the cross-programme Git and GitHub learning track **Pathways**, and the **Classic** and **RPG** interfaces. Optional account services, automatic sync, and **Guild** depend on which version you're using and which features have actually been rolled out. The [current project status](docs/CURRENT_STATE.md) separates what's in the code from what's been tested and what's available to users.

ProgressPal isn't an official course or exam platform. It doesn't issue certificates or automatically verify skills you've demonstrated outside the app.

## Storage, privacy, and security

Your study work is saved in your browser's IndexedDB database. You can lose that data if you clear site storage, switch browser profiles, or lose access to your device. Export a backup if you want a copy you can keep outside the browser.

Optional Nhost services can handle sign-in, manual cloud backups, sync, and Guild. A manual backup is not the same thing as automatic sync. See [Privacy](PRIVACY.md) for what information can be sent and when.

Report security vulnerabilities privately, not through the regular feedback form. See [Security and vulnerability reporting](SECURITY.md). The new feedback feature in PR #93 has been prepared, but submissions must remain disabled until the required provider-side checks are complete.

## How it's built

The frontend uses Vite, React, TypeScript, React Router, Dexie/IndexedDB, and Zod, with CSS for styling. Tests use Vitest and Playwright. The local database is the working copy of your data. Optional cloud services have separate rules and data contracts; the presence of code or a button does not mean a service has been enabled.

## Development and checks

The project uses **Node 24** and **npm 11**. Install the locked dependencies and start the development server:

```bash
npm ci
npm run dev
```

Run the relevant local checks for your change:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run check:bundle
npm run check:circular
```

`npm run test` runs the Vitest tests, and `npm run test:e2e` runs the browser tests. Focused tests are often enough during development. `npm run validate` runs the separate `verify:release` gate, which requires a clean Git candidate and a correctly documented review. See [CI and releases](docs/ci.md). Passing local tests does not, by itself, approve a release or update the live production site.

## Releases and project history

The tag `v1.3.0-local-first-proof` and branch `freeze/rpg-product-completion-2026-09-16` preserve earlier milestones. Ongoing work, decisions, and the current release baseline are recorded in the [project status](docs/CURRENT_STATE.md).

Build source-release archives from the correct Git commit with `git archive` so the tracked `export-ignore` rules are respected. Don't create a source release by zipping a working folder that may contain local files or test artifacts.

## Copyright and affiliations

ProgressPal is an independent project. It isn't developed, sponsored, endorsed, or maintained by Harvard University, CS50, edX, or OpenCourseWare. Course materials and trademarks belong to their respective owners. The app may link to official learning resources, but it doesn't replace a course's own submission or assessment system.

See [LICENSE](LICENSE) for the licence terms.
