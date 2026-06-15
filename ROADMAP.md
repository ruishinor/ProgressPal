# ProgressPal CS50 Edition Roadmap

## Product Summary

ProgressPal CS50 Edition is an offline-only, single-user learning companion that helps one learner track CS50 progress in small, persistent, gamified steps.

Natural endpoint: offline CS50 MVP.

## Scope Lock

### Product focus

- One learner.
- One course family: CS50 / CS50x.
- Local-first browser app.
- Persistent local progress, XP, levels, achievements, charts, and backup and restore.
- Honest partial-progress tracking for long-form material.

### Retained features

- Progress bars.
- XP.
- Levels.
- Achievements.
- Dashboard.
- Charts.
- Settings.
- Avatar.
- Responsive UI.
- Backup and restore.
- Accessibility and reduced motion support.

### Removed features

- Social features.
- Leaderboards.
- Sync.
- Three personas.
- Fitness tracking.
- Writing or thesis tracking.
- Financial categories.
- Health categories.
- Habit categories.
- Android-first target.
- External integrations.
- Cloud accounts.
- Remote analytics.
- AI coaching or recommendations.
- Multi-course scope.

### Deferred features

- Desktop wrapper.
- Mobile-native wrapper.
- Reminders and notifications.
- Multi-course tracking.
- Cloud backup.

## Hard Constraints

- Offline-only for MVP.
- No external APIs.
- No cloud sync.
- No analytics.
- No authentication.
- No scraping.
- No social mechanics.
- No backend unless a later module proves it is strictly necessary.
- Preserve backwards compatibility once persistence begins.
- Complete work sequentially, module by module.
- Do not treat long videos or readings as binary checkboxes.

## Primary User and Job

- User: one self-directed CS50 learner with uneven energy and focus.
- Job: show what is done, what is next, how effort accumulates, and where to resume.

## MVP Boundary

### MVP must include

- First-run local profile.
- CS50 course map.
- Item progress logging.
- Long-form slice tracking with resume points.
- Study session logging.
- XP ledger and levels.
- Achievements.
- Dashboard.
- Basic insights.
- Import, export, and reset.
- Offline verification.
- Security review.
- README and demo script by the final module.

### MVP must not include

- Login.
- Cloud sync.
- Social comparison mechanics.
- AI.
- CS50 scraping.
- Mobile app wrapper.
- Notifications.
- Custom user-created goal categories.

## Delivery Sequence

| Module | Name                                  | Outcome                                                                                             |
| ------ | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 00     | Repository inspection and state setup | Inspect the workspace, create persistent state documents, and stop before scaffolding.              |
| 01     | Scaffold                              | Create the Vite/React/TypeScript shell, baseline routes, placeholder pages, and validation scripts. |
| 02     | Architecture and folders              | Expand the folder structure, import boundaries, and app architecture intentionally.                 |
| 03     | Domain types                          | Define the required models, constants, and runtime validation helpers.                              |
| 04     | Local database                        | Add Dexie persistence, schema versioning, migrations, and repository functions.                     |
| 05     | CS50 seed data                        | Add locally editable course seed data without overwriting user changes.                             |
| 06     | Design system                         | Build layout primitives, forms, badges, progress bars, and reduced-motion support.                  |
| 07     | Onboarding and profile                | Create the first-run local profile and avatar flow.                                                 |
| 08     | Course map                            | Show the seeded CS50 weeks, assets, and progress rollups.                                           |
| 09     | Long-form progression engine          | Implement slice tracking, interval union, resume points, and partial-progress logging.              |
| 10     | Content detail screen                 | Show one asset, its slice timeline, and progress logging controls.                                  |
| 11     | Study session logging                 | Track general study effort and session metadata.                                                    |
| 12     | XP engine                             | Make gamification deterministic, idempotent, and ledger-based.                                      |
| 13     | Achievement engine                    | Unlock achievements from local progress without duplication.                                        |
| 14     | Dashboard                             | Build the main operational surface.                                                                 |
| 15     | Insights                              | Show progress patterns over time.                                                                   |
| 16     | Settings, backup, import, reset       | Give the learner local data control and safe recovery paths.                                        |
| 17     | Offline hardening                     | Prove the app works locally without network dependency after initial load.                          |
| 18     | Accessibility and UX hardening        | Remove avoidable usability and accessibility defects.                                               |
| 19     | Security and privacy review           | Audit the app for local-only security and privacy risks.                                            |
| 20     | Final CS50 project packaging          | Prepare README, demo assets, and submission-ready documentation.                                    |

## Validation Rule

- Module 00 uses manual document validation only.
- Module 01 and later must pass three consecutive full validation runs with zero errors, zero warnings, and zero unresolved findings.
- A module is not complete until the validation log records three clean passes, adversarial review findings, and a retrospective.

## Module 00 Exit Gate

- Every removed feature is explicitly listed.
- Retained MVP features are explicitly listed.
- No module plan depends on cloud, social, or external APIs.
- The product can be explained in one sentence.
