# Security Policy

## Supported versions

ProgressPal is currently a local-first single-user project. Security review applies to the current active branch and the current release candidate.

| Version / branch                   |                          Supported |
| ---------------------------------- | ---------------------------------: |
| `main` / stable v1                 |                                Yes |
| `rpg/v2` during active development | Yes, for active development review |
| old archived branches              |                                 No |

## Security model

ProgressPal is designed as a local-first browser app.

The intended security and privacy posture is:

- no user accounts;
- no backend;
- no cloud sync in v2;
- no analytics;
- no runtime external course-data fetching;
- no embedded external course content;
- local browser storage only;
- explicit user-controlled backup/export/import/reset.

RPG v2 must preserve this posture unless a future accepted decision changes the product boundary.

## Data storage

ProgressPal stores user data in the browser through IndexedDB.

Users should understand that local browser data can be lost if:

- site data is cleared;
- the browser profile is deleted;
- storage cleanup tools remove browser data;
- the browser removes storage under pressure;
- the user changes device or browser without exporting/importing a backup.

This is a known v2 risk. The v2 mitigation is clear backup/export guidance, not cloud sync.

## What to report

Please report issues involving:

- unintended network requests;
- data corruption or data loss;
- backup/export/import/reset failures;
- cross-site scripting risks;
- unsafe HTML injection;
- unsafe dynamic code execution;
- dependency vulnerabilities;
- accidental use of remote assets or scripts;
- weakening of the local-only guard;
- privacy claims that do not match implementation;
- CS50/Harvard branding or content misuse that could create trust or rights issues.

## What not to report as a security vulnerability

The following are known product limitations unless they involve an implementation bug:

- no account recovery;
- no cloud sync;
- no server-side backup;
- local browser data can be cleared;
- official course links require internet access;
- external official resources are outside ProgressPal’s control.

## Reporting process

If the repository has GitHub private vulnerability reporting enabled, use that.

Otherwise, open a clear issue without posting sensitive exploit details. If sensitive details are required, contact the maintainer privately using the project owner’s preferred contact route before public disclosure.

Include:

- affected branch or commit;
- browser and operating system;
- reproduction steps;
- expected behavior;
- actual behavior;
- screenshots or logs if helpful;
- whether user data was changed, lost, or exposed.

## Disclosure expectation

Please give the maintainer reasonable time to investigate before public disclosure. This is a small project and may not have a formal security response team or bug bounty.

## No bug bounty

There is currently no paid bug bounty program.
