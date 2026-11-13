# Sikkerhet og varsling

## Hvilke versjoner gjelder dette?

Vi tar imot sikkerhetsvarsler om gjeldende `master` og utviklingsversjoner som er under aktiv vurdering. Eldre, arkiverte grener vedlikeholdes ikke. Oppgi gjerne versjon eller commit når du melder fra.

Se [prosjektstatus](docs/CURRENT_STATE.md) for hvilke funksjoner som faktisk er tatt i bruk.

## Hvordan håndterer ProgressPal data?

ProgressPal lagrer studiearbeid i nettleserens IndexedDB. Appen kan brukes uten konto i standardutgaven. Valgfrie skytjenester kan brukes til innlogging, manuelle sikkerhetskopier og Guild. En egen utgave med kontobasert oppstart kan også synkronisere læringsdata automatisk. Hva som er tilgjengelig, avhenger av hvilken utgave som er tatt i bruk.

Når skytjenestene brukes, kan opplysninger sendes til Nhost. Hvilke data som sendes, og når det skjer, er beskrevet i [personvernerklæringen](PRIVACY.md). Appen bruker ikke analyseverktøy eller sporingskapsler. Kursinnhold og Python-miljøet leveres som en del av appen, ikke fra eksterne kurstjenester under bruk.

Den vanlige tilbakemeldingsfunksjonen er adskilt fra studiearbeidet. Mottaket er foreløpig deaktivert mens nødvendige sikkerhets- og driftskontroller verifiseres. Det skal ikke brukes til å varsle om sikkerhetssårbarheter.

## Hva bør du melde fra om?

Vi ønsker særlig å få vite om feil som kan føre til:

- at personopplysninger, studiearbeid eller andre data blir tilgjengelige for uvedkommende;
- tap av eller utilsiktede endringer i lagrede data, sikkerhetskopier eller gjenoppretting;
- uventet overføring av data til eksterne tjenester;
- at uvedkommende kan få tilgang til kontoer, Guild-data eller tilknyttede tjenester;
- usikker behandling av inndata, for eksempel skriptinjeksjon eller kjøring av uønsket kode;
- svakheter i avhengigheter, tilgangskontroll eller andre sikkerhetsmekanismer.

At nettleserdata kan gå tapt når lagringen slettes, eller at lenker til eksterne kurs krever internett, er kjente begrensninger. Meld likevel fra dersom appen oppfører seg annerledes enn beskrevet, eller en feil fører til utilsiktet tap eller tilgang.

## Meld sikkerhetssårbarheter privat

Bruk [privat sikkerhetsvarsling til @RuishiNOR](https://github.com/ruishinor/progresspal-security-intake/security/advisories) og velg **Report a vulnerability**. Du må være innlogget på GitHub.

Repoet som tar imot varslene, er offentlig. Rapportene som sendes gjennom GitHubs private varslingsskjema, er det ikke. Ikke legg inn sårbarhetsdetaljer i vanlige GitHub-saker eller i appens «Meld fra»-skjema. Hvis du ikke kan bruke GitHub, bør du avklare en privat kontaktkanal med vedlikeholder før du deler tekniske detaljer.

Beskriv gjerne:

- hvilken versjon eller side feilen gjelder;
- hvordan feilen kan gjenskapes, og hva du forventet skulle skje;
- hva som faktisk skjedde, og hvilke data eller brukere som kan være berørt;
- relevant nettleser og operativsystem;
- eventuelle skjermbilder eller logger, uten passord, tokens eller andre unødvendige personopplysninger.

Du trenger ikke forsøke å hente ut andre brukeres data for å dokumentere feilen.

## Oppfølging og offentliggjøring

Vi vurderer innkomne varsler og avklarer videre oppfølging gjennom den private rapporten. Avtal eventuell offentliggjøring med vedlikeholder, slik at feilen kan undersøkes og berørte brukere kan beskyttes først. Prosjektet tilbyr ikke dusør for sikkerhetsfunn.

Vanlige forslag, spørsmål om innhold og andre feil som ikke gjelder sikkerhet, hører hjemme i den ordinære tilbakemeldingskanalen når den er tilgjengelig.

---

# Security and vulnerability reporting

## Which versions are covered?

We accept security reports about the current `master` branch and development versions under active review. Older, archived branches aren't maintained. Please include a version or commit if you know it.

See the [project status](docs/CURRENT_STATE.md) for which features are actually in use.

## How does ProgressPal handle data?

ProgressPal saves study work in your browser's IndexedDB database. The standard version can be used without an account. Optional cloud services support sign-in, manual backups, and Guild. A separate account-first version may also sync learning records automatically. What you can use depends on the version you're running.

When cloud services are used, information may be sent to Nhost. The [privacy information](PRIVACY.md) explains what gets sent and when. The app doesn't use analytics tools or tracking cookies. Course content and the Python runtime are included with the app rather than fetched from outside course services while you're using them.

The regular feedback form is separate from your study records. Its submission service is currently disabled while the required security and operational checks are completed. Don't use it to report security vulnerabilities.

## What should you report?

Please let us know about problems that could lead to:

- someone gaining access to personal information, study work, or other data they shouldn't be able to see;
- saved data or backups being lost or changed unexpectedly, including problems with restoring them;
- data being sent to outside services without the expected action or permission;
- unauthorised access to accounts, Guild information, or related services;
- unsafe handling of input, such as script injection or unwanted code execution;
- weaknesses in dependencies, access controls, or other security measures.

Some limitations are expected: browser data can be lost when storage is cleared, and links to outside courses need an internet connection. Still, report it if the app behaves differently from what it says it does, or a bug causes unexpected data loss or access.

## Report vulnerabilities privately

Use [private vulnerability reporting for @RuishiNOR](https://github.com/ruishinor/progresspal-security-intake/security/advisories) and select **Report a vulnerability**. You'll need to sign in to GitHub.

The repository that accepts reports is public, but reports submitted through GitHub's private vulnerability reporting form are not. Don't post vulnerability details in public GitHub issues or the app's regular **Meld fra** feedback form. If you can't use GitHub, agree on a private way to contact the maintainer before sharing technical details.

Please include, where you can:

- the affected version or page;
- steps to reproduce the issue and what you expected to happen;
- what actually happened, including any data or users that might be affected;
- your browser and operating system, if relevant;
- any useful screenshots or logs, without passwords, tokens, or unnecessary personal information.

You don't need to access anyone else's data to demonstrate a vulnerability.

## What happens after you report?

We review incoming reports and discuss next steps through the private report. Please coordinate any public disclosure with the maintainer so the issue can be investigated and affected users protected first. There is no paid bug bounty programme.

Suggestions, questions about course content, and bugs that aren't security vulnerabilities belong in the regular feedback channel when it's available.
