# Personvern

ProgressPal hjelper deg å holde orden på studiearbeidet. Studieopplysningene lagres i utgangspunktet i nettleseren din, i IndexedDB. Standardutgaven kan brukes uten konto. I en utgave med kontobasert oppstart må du logge inn før du får tilgang til studiearbeidet. Har du tidligere knyttet nettleseren til en bekreftet konto, kan du fortsette uten nett når en gyldig, husket økt er tilgjengelig.

Hvilke funksjoner som faktisk er tatt i bruk, står i [prosjektstatusen](docs/CURRENT_STATE.md). Skytjenester og den nye tilbakemeldingsfunksjonen er ikke nødvendigvis tilgjengelige i alle utgaver.

## Opplysninger på denne enheten

ProgressPal lagrer blant annet profil og innstillinger, valgte studieprogrammer, fremdrift, notater, studieøkter, mediehistorikk, bokmerker, oppgavesvar, forsøk, XP, prestasjoner, sikkerhetskopihistorikk og aktivitet du selv registrerer. Aktivitetsdata kommer fra det du legger inn. Appen henter ikke treningsdata fra sensorer. «Min uke» teller ulike kalenderdager i tidssonen Europe/Oslo ut fra lagrede studieøkter, innsendte forsøk og registrerte fullføringer.

Kursinnholdet og Python-miljøet følger med appen. Python-oppgaver kjøres i en egen nettleserarbeider der tilgang til nettverk og lagring er fjernet. Appens service worker mellomlagrer nødvendige filer for bruk uten nett.

## Valgfri konto og sikkerhetskopi i skyen

I standardutgaven er skytjenestene avslått på hver enhet til du velger å slå dem på. Ved innlogging behandler Nhost e-postadresse og innloggingsopplysninger i det konfigurerte prosjektet i Stockholm, Sverige. Det samme gjelder innlogging i en utgave med kontobasert oppstart.

Innloggingsøkten lagres normalt i nettleserfanen eller i minnet. Velger du å forbli innlogget, kan økten lagres i nettleserens lokale lagring. Gjenoppretting via e-postlenke bruker en kortvarig PKCE-kode som bare kan brukes én gang. Innloggingsopplysninger og skyinnstillinger er ikke med i sikkerhetskopiene av studiearbeidet.

Når du selv velger **Sikkerhetskopier nå**, sendes en kopi av studieopplysningene til Nhost. Dette er en manuell sikkerhetskopi, ikke automatisk synkronisering. Nhost og den som drifter ProgressPal kan lese kopien. Tjenesten er utformet for inntil fem sikkerhetskopier per konto, og en ny kopi kan erstatte den eldste. Kopiene blir ikke automatisk slettet når du logger ut eller slår av skytjenestene.

## Automatisk synkronisering

I utgaven med kontobasert oppstart aktiverer innlogging automatisk synkronisering når funksjonen er slått på for utgaven. Når enheten har nett, sendes endringer i studieopplysningene til Nhost, og appen ser etter endringer fra andre enheter.

Synkroniseringen omfatter profil, innstillinger, studieprogrammer, fremdrift, notater, studie- og mediehistorikk, leseposisjoner, lagrede oppgavesvar og resultater, XP, prestasjoner og aktivitet. Kursfiler, innloggingsopplysninger og enhetens historikk over sikkerhetskopier inngår ikke.

Nhost lagrer siste fullførte synkroniserte versjon til den blir erstattet eller kontoen blir slettet hos leverandøren. Nhost og den som drifter tjenesten kan lese disse opplysningene. Utlogging fjerner ikke automatisk kopien i skyen. Dersom ulike enheter har endret de samme dataene, slår ikke appen endringene sammen automatisk. Du kan laste ned begge kopiene før du velger hvilken du vil bruke videre. Endringer som ennå ikke er synkronisert, kan gå tapt hvis nettleserlagringen slettes.

En eksportert fil og en manuell sikkerhetskopi i skyen er egne gjenopprettingsmuligheter, uavhengig av automatisk synkronisering.

## Valgfri Guild

Du velger selv om du vil opprette eller bli med i en Guild når funksjonen er tilgjengelig. Nhost lagrer gruppenavnet, medlemskapet og kallenavnet du velger. Når du deler læringsaktivitet, sendes bare datoene du velger å dele fra inneværende uke i tidssonen Europe/Oslo.

Medlemmene kan se gruppenavnet, kallenavnene og hvor mange læringsdager hvert medlem har delt denne uken. Oppgavesvar, notater, XP og e-postadresser inngår ikke i gruppedelingen. RPG-visningen kan vise Guild-navnet som sist ble bekreftet gjennom en handling i appen. Behandle invitasjonskoder som private. Administratoren kan endre navn og bytte eller deaktivere invitasjonskoden.

Datoer delt fra flere enheter telles én gang per dato. Hvis du senere endrer dine lokale oppføringer, kan den personlige ukeoversikten bli annerledes enn datoene du allerede har delt. Eldre datoer slutter å vises når en ny uke begynner og fjernes fra medlemmets lagrede deling ved neste deling. Når du forlater Guilden, slettes medlemskapet og de delte datoene. Det samme skjer ved sletting av kontoen hos leverandøren. En tom Guild slettes. Hvis administratoren forlater gruppen, overtar det første gjenværende medlemmet, og den tidligere invitasjonskoden slutter å virke.

## Eksport, gjenoppretting og sletting

En lokal eksport eller manuell sikkerhetskopi i skyen inneholder lagrede studieopplysninger. Guild-medlemskap og delte datoer håndteres separat.

Gjenoppretting fra fil godtar sikkerhetskopier i skjema-versjon 5. Etter validering og bekreftelse erstatter gjenopprettingen de lokale dataene. Eldre eksporterte skjemaer blir avvist. Eksisterende lokale databaser med skjema-versjon 4 oppgraderes på stedet. Funksjonene for tilbakestilling avhenger av om nettleseren er knyttet til en synkronisert konto.

For å fjerne den lokale kopien fra en kontotilknyttet nettleser bør du først eksportere endringer som ikke er synkronisert, deretter logge ut og slette nettstedets lagring i nettleseren. Konto, kopier i skyen og Guild-medlemskap må håndteres separat. Velg **Forlat Guilden** for å fjerne medlemskap og delte datoer.

Hvis du sletter nettleserdata eller avinstallerer nettleseren, kan studiearbeid gå tapt. En eksportert fil kan oppbevares utenfor nettleseren. Personer med tilgang til nettleserprofilen eller eksportfilene dine kan også få tilgang til opplysningene der.

## Nettverk og eksterne tjenester

Nettstedet leverer appen og filene den trenger. Lenker til eksterne kurs åpner andre nettsteder med egne personvernregler. De valgfrie konto-, sikkerhetskopi-, synkroniserings- og Guild-funksjonene bruker Nhost når de er aktive. ProgressPal har ikke egne analyseverktøy, sporingskapsler eller en ekstern KI-tjeneste.

## Frivillig tilbakemelding – foreløpig ikke aktivert

Den planlagte **Meld fra**-funksjonen er adskilt fra studieopplysningene. Når den aktiveres, sendes en melding bare etter at du selv velger **Send inn**. Innsendingen inneholder kategori og beskrivelsen du skriver. E-postadressen blir bare med hvis du fyller den inn.

Du kan i tillegg velge å legge ved appversjon, nettlesertype, operativsystemtype og hvilken del av appen du bruker. Full nettadresse, studieprogresjon, oppgavesvar, notater, passord, sikkerhetskopier og konto-ID blir ikke lagt ved automatisk. Beskrivelsen kan likevel inneholde personopplysninger du selv skriver inn.

Meldingen skal gå gjennom en Vercel-funksjon til et eget skjema i Nhost-databasen, der bare de som vedlikeholder tjenesten, skal ha tilgang. Mottaket er **avslått** inntil tilgangskontroll, beskyttelse mot misbruk, sletting og oppsett hos leverandøren er kontrollert. Planen er å slette råmeldingene etter 90 dager, men automatisk sletting er **ikke bekreftet i drift**. Logger og sikkerhetskopier hos leverandørene kan ha andre lagringstider.

En feilmelding ved innsending betyr ikke nødvendigvis at rapporten ikke kom fram. Ved et nytt forsøk skal den samme meldingsreferansen brukes; appen er laget for å beholde denne referansen hvis leveringen er usikker.

**Sikkerhetssårbarheter skal ikke meldes gjennom dette skjemaet.** Bruk [privat sikkerhetsvarsling på GitHub](https://github.com/ruishinor/progresspal-security-intake/security/advisories). Se også [sikkerhetsinformasjonen](SECURITY.md).

---

# Privacy

ProgressPal helps you keep track of your study work. By default, your study records are stored in your browser, using IndexedDB. You can use the standard version without an account. In a version that starts with account sign-in, you need to sign in before accessing your study work. If your browser has already been linked to a verified account, you may be able to keep studying offline when a valid remembered session is available.

See the [project status](docs/CURRENT_STATE.md) for which features are actually in use. Cloud services and the new feedback feature may not be available in every version.

## Information stored on your device

ProgressPal stores your profile and preferences, selected programmes, progress, notes, study sessions, media history, bookmarks, exercise answers and attempts, XP, achievements, backup history, and activity you enter yourself. Activity records come from your own entries. The app doesn't collect exercise data from sensors. **Min uke** (My Week) counts distinct calendar days in the Europe/Oslo time zone, based on saved study sessions, submitted attempts, and recorded completions.

Course content and the Python runtime are bundled with the app. Python exercises run in a dedicated browser worker with network and storage access removed. The app's service worker caches the files needed for offline use.

## Optional account and cloud backups

In the standard version, cloud services stay off on each device until you turn them on. When you sign in, Nhost processes your email address and sign-in credentials in the configured project in Stockholm, Sweden. The same applies when you sign in through an account-first version.

Your sign-in session is normally kept in the browser tab or in memory. If you choose to stay signed in, the session can be saved in your browser's local storage. Recovery through an email link uses a short-lived, single-use PKCE verifier. Sign-in credentials and cloud preferences aren't included in backups of your study work.

When you choose **Sikkerhetskopier nå** (Back up now), a copy of your study records is sent to Nhost. This is a manual backup, not automatic sync. Nhost and the ProgressPal service operator can read the copy. The service is designed to keep up to five backups per account, and a new backup may replace the oldest one. Signing out or switching off cloud services doesn't automatically delete those backups.

## Automatic sync

In the account-first version, signing in starts automatic sync when that feature is enabled for the version you're using. When you're online, changes to your study records are sent to Nhost, and the app checks for changes from your other devices.

Sync covers your profile, preferences, programmes, progress, notes, study and media history, reading positions, saved exercise answers and results, XP, achievements, and activity records. Course files, sign-in credentials, and your device's backup history aren't included.

Nhost keeps the latest completed synced version until it's replaced or your account is deleted at the provider. Nhost and the service operator can read this information. Signing out doesn't automatically remove the cloud copy. If two devices have changed the same data, the app doesn't merge those changes automatically. You can download both copies before choosing which one to continue with. Changes that haven't synced yet may be lost if you clear your browser's storage.

An exported file and a manual cloud backup are separate ways to recover your data. Neither is the same as automatic sync.

## Optional Guild

When Guild is available, you choose whether to create or join one. Nhost stores the Guild name, your membership, and the nickname you choose. When you share learning activity, only the dates you choose from the current week in the Europe/Oslo time zone are sent.

Members can see the Guild name, other members' nicknames, and how many learning days each person has shared this week. Exercise answers, notes, XP, and email addresses aren't part of Guild sharing. The RPG interface can show the last Guild name you confirmed through an action in the app. Keep invitation codes private. The administrator can change the Guild's name and replace or disable its invitation code.

Dates shared from different devices are counted once per date. If you later edit your local records, your personal weekly view may no longer match the dates you've already shared. Older dates stop appearing when a new week begins and are removed from a member's stored shared dates the next time that member shares. Leaving a Guild removes your membership and shared dates. Deleting your account at the provider does the same. Empty Guilds are deleted. If the administrator leaves, the first remaining member takes over, and the previous invitation code stops working.

## Exporting, restoring, and deleting data

A local export or manual cloud backup contains your saved study records. Guild membership and shared dates are managed separately.

Restoring from a file accepts schema-version 5 backups. After validation and confirmation, the restore replaces your local data. Older exported schemas are rejected. Existing local databases using schema version 4 are upgraded in place. The available reset options depend on whether the browser is linked to a synced account.

To remove the local copy from a browser linked to your account, first export any changes that haven't synced. Then sign out and clear the site's storage in your browser. Your account, cloud backups, and Guild membership have separate controls. Choose **Forlat Guilden** (Leave Guild) to remove your membership and shared dates.

Clearing browser data or uninstalling the browser can mean losing your study work. An exported file gives you a copy to keep somewhere else. Anyone with access to your browser profile or exported files may also be able to read the records they contain.

## Network access and external services

The website delivers the app and the files it needs. Links to outside courses open other websites with their own privacy practices. Optional account, backup, sync, and Guild features use Nhost when enabled. ProgressPal doesn't use its own analytics service, tracking cookies, or an external AI service.

## Voluntary feedback — not enabled yet

The planned **Meld fra** (Send feedback) feature is separate from your study records. Once enabled, it sends a report only when you explicitly select **Send inn** (Submit). The report contains the category and description you enter. Your email address is included only if you provide it.

You can also choose to attach the app version, browser type, operating system type, and the area of the app you're using. Your full URL, study progress, exercise answers, notes, passwords, backups, and account ID aren't added automatically. Your description can still contain personal information if you choose to include it.

The report is designed to pass through a Vercel function into a separate schema in the Nhost database, accessible only to authorised maintainers. **Submissions remain disabled** until access controls, abuse protection, deletion, and provider configuration have been checked. The plan is to delete the original reports after 90 days, but automatic deletion has **not been verified in operation**. Provider logs and backups may have different retention periods.

An error during submission doesn't necessarily mean the report failed to arrive. A retry should use the same report reference; the app is designed to keep that reference when delivery is uncertain.

**Don't use this form to report security vulnerabilities.** Use [private vulnerability reporting on GitHub](https://github.com/ruishinor/progresspal-security-intake/security/advisories) instead. See also [Security and vulnerability reporting](SECURITY.md).
