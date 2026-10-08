# src/features/settings

The Settings surface shared by the Classic route (`/settings`) and the RPG route (`/rpg/settings`): profile, programme, local export / import / reset, and — on the unreleased Epic G branch only — the **optional cloud backup card** and the **email-link landing page** (`/cloud/callback`).

## Cloud backup card (Epic G, unreleased)

Scope: the smallest usable account, manual backup and manual restore UI over the already-reviewed `src/lib/cloud` and `src/lib/cloudBackup`. It is Settings only: no navigation entry, HUD, dashboard or onboarding control. It adds **no stylesheet byte** and no inline style (existing `Card`, `Button`, `FormField`, `TextInput`, `Select`, `Checkbox` and the `backup-preview`, `action-row`, `data-action__error` classes only); the CSS budget is unchanged.

| File                               | Role                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `components/CloudBackupCard.tsx`   | off / signed-out / signed-in states, device-local on/off, focus after a state change   |
| `components/CloudSignInPanel.tsx`  | email and password, stay signed in on this device, sign in, create account, turn off   |
| `components/CloudBackupPanel.tsx`  | Back up now, Check again, backup list, sign out; composes the backup service           |
| `components/CloudRestorePanel.tsx` | choose one backup, download and check, warning, acknowledgement, local export, replace |
| `components/CloudNotice.tsx`       | one factual result (alert for a failure or unknown outcome, status otherwise)          |
| `cloudModel.ts`                    | every sentence the learner reads about the cloud, as pure functions                    |
| `cloudDependencies.ts`             | what the card is composed from (a test seam; production passes nothing)                |
| `routes/CloudCallbackPage.tsx`     | the email-link landing page                                                            |

### Rules

- **Nothing runs by itself.** No request on mount, on navigation, on a timer or on focus. The only effects subscribe to the account's local state, move keyboard focus, or (on the callback page) complete the link once. Every cloud request is a button the learner pressed (`tests/architecture/cloudUi.test.ts`, `cloudSettingsAccount.test.tsx`, `cloudSettingsApp.test.tsx`, `e2e/cloud-settings.spec.ts`).
- **Off by default and silent.** While off, the card is one sentence and one button; nothing reaches the network (`e2e/cloud-off-zero-traffic.spec.ts`).
- **No invented freshness.** The card never says or implies that the cloud copy is current, latest, newer, older, synced or up to date, and never compares it with this device. The only ordering shown is the server's stored time. `cloudModel.test.ts` scans every sentence for that vocabulary.
- **An unknown outcome is its own state.** It is never worded as stored and never as not stored, and offers **Check again** (the retained attempt is in memory only; there is no outbox or monitor).
- **Restore verifies before it offers and asks before it replaces.** Download and check writes nothing. When this device holds learner data the destructive warning is shown, an acknowledgement is required, and the existing local-file export is offered first; the last button is the only step that changes this device, through the existing atomic restore inside the app's local-mutation runner. It is disabled while this tab cannot write locally (read-only, stale, another tab) or a local import or reset is running. A failed verification leaves local data exactly as it was.
- **Deliberately absent:** account deletion (G7), password reset or change, synchronisation, automatic backup, dirty tracking, a status or history system (G8), privacy-policy text (G9), rollout controls (G10).

## Email-link landing page

`CloudCallbackPage` never reads the address. It asks `getCloudAccount().completeEmailLink()` (no argument) to handle the link: that reads the browser location once, removes every callback-shaped parameter, and only then exchanges the one-time code. The page renders outside both shells, once (a ref guards React's development double-run), shows nothing the link carried, writes nothing to the console, and ends every result at `/rpg/settings` (replacing its own history entry). The provider-side redirect settings are the owner's step: `infra/nhost/README.md` ("Callback URLs").

## Known copy to revisit in G8/G9 (not changed here)

The RPG Settings "Local-first and course boundary" card and its lede ("Stored only in this browser on this device"), the onboarding screen ("no account, no cloud sync") and the shell badge ("Offline only") make local-only statements. Those statements are true for the released build and for the default (cloud off) state, and are pinned by existing tests; they become inaccurate for a learner who turns the cloud card on. They belong to the status (G8) and privacy-text (G9) tranches and are intentionally left alone here.
