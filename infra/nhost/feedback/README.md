# Tilbakemeldinger: klargjort mottak, ikke aktivert

Denne mappen inneholder et forslag til databaseoppsett og driftsrutiner for private tilbakemeldinger. **Filene er ikke bevis på at noe er installert eller kontrollert hos Nhost eller Vercel.** Ikke sett `FEEDBACK_INTAKE_ENABLED=true` før alle kravene nedenfor er oppfylt.

## Før aktivering

Følgende arbeid krever særskilt godkjenning fra den som forvalter Nhost- og Vercel-miljøene:

1. **Kontroller miljøet.** Bekreft riktig Nhost-prosjekt, databaserolle, PostgreSQL-versjon og hvilke SQL- og Hasura-endringer som allerede er installert. Ta en sikkerhetskopi av berørte metadata før endringer.
2. **Installer databasedelen.** Gjennomgå `up.sql` og kjør migreringen én gang mot riktig PostgreSQL-database. Kontroller at funksjonene virker med den databaserollen Hasura faktisk bruker. Ikke anta at et vellykket SQL-skript betyr at GraphQL-tilgangene er riktige.
3. **Begrens GraphQL-tilgangen.** Registrer svartabellen og funksjonen `submit_feedback` i Hasura med `metadata.json`. Opprett **ingen** tillatelser for anonyme eller vanlige innloggede GraphQL-brukere. Kontroller at disse rollene verken kan lese rapporter, skrive til tabellene eller kalle funksjonen.
4. **Legg inn hemmeligheten på serveren.** Konfigurer `FEEDBACK_NHOST_ADMIN_SECRET` i Vercels servermiljø, basert på den verifiserte Nhost-administratornøkkelen. Nøkkelen skal ikke finnes i `VITE_`-variabler, nettleserkode, logger, PR-er, GitHub Actions eller dokumentasjon.
5. **Kontroller rutingen.** I den faktiske, beskyttede forhåndsvisningen skal `POST /api/feedback` svare med JSON. `GET /api/feedback` skal gi HTTP 405 med JSON. Kontroller samtidig at direkte besøk til appens undersider fortsatt fungerer.
6. **Aktiver reell begrensning av trafikk.** Kontroller at en aktiv regel i Vercels brannmur omfatter `POST /api/feedback` på alle aktuelle vertsnavn, også direkte utrullingsadresser og mulige snarveier rundt beskyttelsen. Et mulig startpunkt er høyst fem forespørsler per ti minutter fra samme kilde; dette er et forslag, **ikke** en bekreftet innstilling. Kan dekning eller faktisk effekt ikke verifiseres, skal mottaket forbli avslått.
7. **Opprett løpende sletting.** Sett opp og kontroller en faktisk planlagt serverjobb, for eksempel gjennom `pg_cron`, som kjører `SELECT progresspal_feedback.purge_expired()`. Kontroller med en syntetisk rapport som er mer enn 90 dager gammel, at jobben utføres og sletter rapporten. En databasefunksjon som finnes i kildekoden, er ikke nok. Undersøk lagringstidene for Nhosts sikkerhetskopier og logger separat.
8. **Prøv mottak og forvaltning.** Bekreft at vedlikeholderen kan lese, behandle og slette rapporter i et privat grensesnitt. Bruk syntetiske meldinger til å kontrollere kvittering, lesing av samme kvittering, gjentatt innsending med samme forespørsels-ID, avvisning ved endret innhold, brannmur og den daglige grensen i databasen. Slett testmeldingene etterpå.
9. **Aktiver først etter godkjenning.** Sett `FEEDBACK_INTAKE_ENABLED=true` bare i miljøer der alle kontrollene er bestått, og følg gjeldende rutiner for utgivelse og produksjonssetting. Ta vare på etterprøvbare testresultater. Oppdater `PRIVACY.md` med bekreftet lagringstid, sletterutine og kontaktmåte.

## Hvilke data mottaket håndterer

En rapport inneholder én kategori, en beskrivelse på 10–4000 tegn og eventuelt en e-postadresse for svar. Brukeren kan frivillig legge ved grov teknisk informasjon: appversjon, nettlesertype, operativsystemtype og kategori for siden. Koden henter ikke automatisk studieopplysninger fra nettleserens lagring. Rapportteksten kan likevel inneholde personopplysninger brukeren selv oppgir.

SQL-kontrakten har en felles grense på **200 nye, aksepterte rapporter per UTC-døgn**, ikke 200 per bruker. En angriper kan bruke opp denne kvoten. Derfor er en verifisert brannmurregel også nødvendig. HTTP 429 kan bety at den felles kvoten er brukt opp. Gjentatt innsending med samme `requestId` og identisk innhold skal ikke bruke en ny plass i kvoten.

Tilbakemeldingene skal ikke publiseres som GitHub-saker. **Sikkerhetssårbarheter hører ikke hjemme her.** De skal meldes gjennom [privat sikkerhetsvarsling for ProgressPal](https://github.com/ruishinor/progresspal-security-intake/security/advisories). Denne kanalen er opprettet og rapporteringsfunksjonen er aktivert i GitHub-innstillingene; tilgjengeligheten fra en ekstern rapportørkonto må fortsatt kontrolleres.

## Behandling og sletting

Rapportene skal bare være tilgjengelige for autoriserte vedlikeholdere i Nhost. Behandle nye rapporter i mottaksrekkefølge, oppdater status til `triaged` eller `resolved` og slett råopplysninger ved begrunnede forespørsler. Ikke kopier meldinger eller e-postadresser til en offentlig sak uten tillatelse.

Den planlagte slettefunksjonen fjerner rårapporter som er eldre enn 90 dager. **Dette er ikke en dokumentert slettetid før en gjentakende jobb er satt opp og verifisert.** Nhosts og Vercels infrastruktur- og HTTP-logger samt sikkerhetskopier kan ha egne lagringstider. Ikke lov sletting av disse uten dokumentasjon.

## Stans ved feil

Sett `FEEDBACK_INTAKE_ENABLED=false` og kontroller at dette også gjelder den aktive utrullingen. `disable.sql` er en alternativ, reverserbar stans i databasen; den vil avvise innsendinger selv med gyldig servernøkkel. Ikke slett databasskjemaet eller eksisterende rapporter som del av en normal stans.

Ansvar for nøkkelbytte, nødstans, overvåking, sletting og håndtering av rapporter må være plassert før aktivering. Inntil dette er bekreftet, er mottaket **ikke klart for bruk**.

---

# Feedback intake: prepared, not enabled

This folder contains a proposed database setup and operating instructions for private product feedback. **These files do not prove that anything has been installed or checked in Nhost or Vercel.** Do not set `FEEDBACK_INTAKE_ENABLED=true` until every requirement below has been met.

## Before enabling the service

The following work needs separate approval from whoever manages the Nhost and Vercel environments:

1. **Check the environment.** Confirm the correct Nhost project, database role, PostgreSQL version, and which SQL and Hasura changes are already installed. Back up any metadata that may be affected before making changes.
2. **Apply the database migration.** Review `up.sql` and run it once against the intended PostgreSQL database. Check that the functions work under the database role Hasura actually uses. A successful SQL run doesn't prove the GraphQL permissions are right.
3. **Restrict GraphQL access.** Track the response table and `submit_feedback` function in Hasura using `metadata.json`. Grant **no permissions** to anonymous or ordinary signed-in GraphQL users. Verify that those roles cannot read reports, write to the tables, or call the function.
4. **Keep the secret on the server.** Set `FEEDBACK_NHOST_ADMIN_SECRET` in Vercel's server environment using the verified Nhost admin credential. Never put it in `VITE_` variables, browser code, logs, pull requests, GitHub Actions, or documentation.
5. **Check the routes.** On the actual protected preview, `POST /api/feedback` must return JSON, and `GET /api/feedback` must return an HTTP 405 response in JSON. Check that opening the app's deeper routes directly still works.
6. **Put effective rate limiting in place.** Verify an active Vercel firewall rule for `POST /api/feedback` on every relevant hostname, including direct deployment URLs and any path that might bypass the intended protection. A possible starting limit is five requests per ten minutes from one source. That's a proposal, **not a verified setting**. If you can't verify the rule's coverage and effect, keep submissions disabled.
7. **Set up recurring deletion.** Configure and verify a real scheduled server-side job, such as `pg_cron`, that runs `SELECT progresspal_feedback.purge_expired()`. Use a synthetic report older than 90 days to confirm that the job runs and deletes the report. Having the database function in source code is not enough. Check Nhost's log and backup retention separately.
8. **Test submission and administration.** Confirm that an authorised maintainer can read, triage, and delete reports through a private interface. Use synthetic reports to check receipts, reading back the correct receipt, retrying with the same request ID, rejecting a reused ID with changed content, the firewall, and the database's daily limit. Remove the test reports afterwards.
9. **Enable only after approval.** Set `FEEDBACK_INTAKE_ENABLED=true` only in environments where every check has passed. Follow the established release and deployment process, and keep inspectable evidence of the results. Update `PRIVACY.md` with the verified retention period, deletion procedure, and contact route.

## What the service handles

Each report contains one category, a description between 10 and 4,000 characters, and an optional email address for replies. The user may also choose to include limited technical details: app version, browser type, operating system type, and page category. The code does not automatically read study records from browser storage. A person can still put personal information in the text they write.

The SQL contract sets a shared limit of **200 newly accepted reports per UTC day**, not 200 per user. An attacker could use up that allowance, which is why verified firewall protection is also required. HTTP 429 may mean the shared limit has been reached. Resubmitting the same `requestId` with identical content must not count as a new report.

Reports must not be published as GitHub issues. **Security vulnerabilities don't belong in this feedback service.** Use [ProgressPal's private vulnerability reporting channel](https://github.com/ruishinor/progresspal-security-intake/security/advisories). The repository has been created and GitHub's private reporting feature enabled, but access from a separate reporter account still needs to be verified.

## Handling and deleting reports

Only authorised maintainers should be able to access reports in Nhost. Work through new reports in the order received, update the status to `triaged` or `resolved`, and delete the original personal information when a justified request is received. Don't copy report text or email addresses into public issues without permission.

The planned deletion function removes original reports older than 90 days. **That is not a verified retention period until a recurring job has been set up and tested.** Nhost and Vercel may keep infrastructure logs, HTTP logs, and backups for different lengths of time. Don't promise deletion of those records without evidence.

## Stop submissions if something goes wrong

Set `FEEDBACK_INTAKE_ENABLED=false` and verify that the active deployment is also disabled. `disable.sql` offers another reversible stop at the database level; it rejects submissions even with a valid server credential. Don't drop the schema or destroy existing reports as part of a normal shutdown.

Before enabling the service, assign responsibility for secret rotation, emergency shutdown, monitoring, deletion, and report handling. Until that's confirmed, the service is **not ready to use**.
