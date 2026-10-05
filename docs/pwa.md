# Installable PWA (v1.6.0)

ProgressPal installs as a standalone app from Chromium browsers (desktop and Android) and can be added to the iOS Home Screen. Installation adds metadata only: the app, its routes, its service worker and its local data model are the ones the browser already runs. No dependency or service-worker framework was added.

## What ships

| File                                        | Purpose                                                                                                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public/manifest.webmanifest`               | `id`, `start_url` and `scope` are `/` (the router sends `/` to `/rpg`, and every route is in scope); `display: standalone`; name and short name `ProgressPal` (the product name of OD-6, programme-neutral).                   |
| `public/icons/icon-192.png`, `icon-512.png` | Install icons (`any`); the 512 icon is also declared `maskable`.                                                                                                                                                               |
| `public/icons/apple-touch-icon.png`         | 180×180 iOS Home Screen icon.                                                                                                                                                                                                  |
| `index.html`                                | Links the manifest and the touch icon and sets `apple-mobile-web-app-title`. The `<title>` and viewport are unchanged.                                                                                                         |
| `public/sw.js`                              | The manifest, the icons and the static artwork join the explicit install-time precache (`STATIC_ASSET_URLS`; categories below), so an installed app launched offline still resolves them. A cache-version bump refreshes them. |
| `scripts/generate-pwa-icons.mjs`            | Regenerates the icons, deterministically, with Node's `zlib` only.                                                                                                                                                             |

**Static precache (`STATIC_ASSET_URLS`).** Fixed same-origin files cached at install, by category:

- Install and PWA files: `/manifest.webmanifest`, `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/apple-touch-icon.png`.
- Avatar images: the original `/assets/character-profile.png` and the three alternatives under `/assets/avatars/` (`avatar-auburn-braid.png`, `avatar-short-curls.png`, `avatar-wavy-bob.png`).
- Programme #2 achievement badges: seven `p2-*.webp` files under `/assets/badges/`.

Everything else the service worker caches is outside this list: the boot set discovered from the production HTML, the listed programme content, and the Python runtime files cached on first use. Adding a static file means adding it to the list and bumping `CACHE_VERSION` with the package version.

**Icon source.** ProgressPal has no separate logo. The icons reuse the shipped character artwork (`public/assets/character-profile.png`, 384×384, a medallion on black). Nothing is upscaled: the art sits unscaled on a 512 canvas of its own black background, and every painted pixel lies within about 154 px of the centre, inside the maskable safe zone (radius 204.8 px). Smaller sizes are area-averaged downscales. A dedicated product mark would be an owner branding decision. If one is made, change the generator's input and rerun it.

**Colours.** `theme_color` and `background_color` are both `#6a6f76`, the theme-neutral canvas `src/styles/rpg-shell.css` already paints before the learner's saved theme is known. The default theme preference is `system`, so a launch splash cannot know the palette either. Classic's warm canvas was not used.

## Deliberately not added

- **`viewport-fit=cover`.** The RPG mobile navigation, toasts and reward notices already read `env(safe-area-inset-*)`. Turning the insets on would also extend the wide browser layouts under a landscape iPhone notch, and those layouts have no inset handling. Without it, iOS letterboxes the page and the existing CSS stays correct. This is unverified on a device.
- **A static `meta theme-color`.** It would recolour the browser chrome in browser mode (Android Chrome, Safari). The colour lives in the manifest only, so only the installed window uses it.
- **A favicon, install prompt, shortcuts, persistent-storage request, notifications, background sync.** None is needed for installability, and each would change browser behaviour or add product surface.
- **`apple-mobile-web-app-capable`.** It is deprecated, iOS reads `display` from the manifest, and Chromium logs a console warning for it.

## Update behaviour (unchanged)

Navigations are network-first, so an online launch always gets fresh HTML. The browser checks `/sw.js` on navigation (Vercel serves it `no-cache`). A new worker installs only after its boot set is cached, then takes over (`skipWaiting`, `clients.claim`) and purges older ProgressPal caches. An installed window follows exactly the same rules as a tab.

A known pre-existing limit applies equally to long-lived tabs: a page that is still running when a new release activates keeps its old code, and it can fail to load an old hashed file it never fetched (for example, the Python worker). Reloading fixes it. The v1.3 review accepted this; atomic build-stamped caches would be a larger change.

## Storage honesty

Installing is not a backup and not sync. Learner data stays in this site's IndexedDB on the device. On desktop and Android Chromium, the installed app shares the browser's storage for the site. On iPhone and iPad, a Home Screen app has its own storage, separate from Safari: progress made in Safari does not appear there. Use backup export and import to move it. Uninstalling the app or clearing site data can delete the data. The same text is in `PRIVACY.md`.

## Evidence

- `tests/architecture/webAppManifest.test.ts`: the manifest fields; each icon's real PNG size against its declared size; opaque maskable and touch icons; the shell links; the colour's provenance; every install file present in the precache.
- `e2e/offline.spec.ts`, test "is installable and launches its start URL offline": Chromium's own `Page.getAppManifest` and `Page.getInstallabilityErrors` report no errors. Then, offline, `start_url` cold-starts into RPG Home with the learner's data, and the manifest and icons are served from cache. The test needs the full Chromium build (`channel: 'chromium'`, installed by `npx playwright install chromium`), because the default headless shell reports no installability errors even for a manifest without icons. It also needs a persistent profile in a short OS temp path: an off-the-record context always reports `in-incognito`, and on Windows a profile under `test-results/` exceeds the path limit, so the service worker never activates.
