# Utviklerblikk: Databaser – SQL/MySQL

Local implementation from upstream `c7f04b816cfa8b155df0b4a6986ddac86668ba77`
(v1.8.0), refreshed on 2026-10-26. Its 24 accepted activities remain intact.
The UX/UU candidate `fc910a5` and Activity candidate `d14ebf6` were unmerged
local work at preflight; neither was imported. Their registry/count-test changes
and their JavaScript budget consumption are integration overlaps.
`CURRENT_STATE.md` contains older release prose; live Git/package identity was
used as instructed. No version, release policy or budget change is part of SQL.

## Scope and learning decisions

Generelt partly teaches information dependencies and missing data. It does not
practise relational keys, SQL construction, query results, writes, JOIN or
aggregation. None of these SQL skills was meaningfully assessed in the baseline.

Six independently selectable activities each contain one explanation and three
assessments, ending with transfer. Four cards keep the reading and SQL inspection
bounded. The 4–5 minute metadata is an authoring estimate, not learner timing.

| Reference | Activity                       | Assessed reasoning                                                                                                     |
| --------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| SQL84-01  | Hvordan henger data sammen?    | Interpret records and keys; follow an enforced foreign key; choose a customer reference despite shared phone numbers   |
| SQL84-02  | Finn riktig informasjon        | Assemble SELECT/AND/sort; predict DESC/LIMIT; transfer filtering to available short books                              |
| SQL84-03  | Legg til og endre data         | Assemble a targeted UPDATE; predict DELETE targets; diagnose a missing WHERE in a price update                         |
| SQL84-04  | Koble sammen tabeller          | Construct ON; predict repeated joined IDs; find a customer without orders using LEFT JOIN/IS NULL                      |
| SQL84-05  | Tell, grupper og sammenlign    | Predict COUNT(\*) versus COUNT(column); assemble GROUP BY; interpret AVG/MIN/MAX with missing delivery time            |
| SQL84-06  | Finn feilen før den gjør skade | Correct a column and NULL comparison; distinguish row writes, DDL and transaction recovery; parameterize hostile input |

`SQL84-01`–`06` and `SK-SQL-01` are track-owned authoring references, not Campaign
skills, lessons or learner evidence. The validator supports that distinction.
Exercises check authored choices/token sequences. They do **not** execute SQL or
accept arbitrary equivalent queries. No installation, account, network service,
SQL runtime, persistence or dependency was added. Static imports use the existing
`content-utviklerblikk` chunk and service-worker boot-asset discovery.

## Fictional fixture and expected results

Reference dialect: **MySQL 8.4 LTS**, InnoDB, enforced foreign keys and normal
`ONLY_FULL_GROUP_BY`. Relevant subsets of the schema/data are repeated on every
assessment card, using labelled records that reflow as prose rather than a wide
visual table. Each question starts from its displayed data; writes do not carry
over to later cards.

```sql
CREATE TABLE deltakere (
  id INT PRIMARY KEY,
  navn VARCHAR(40) NOT NULL,
  alder INT NOT NULL,
  epost VARCHAR(80)
) ENGINE = InnoDB;
CREATE TABLE pameldinger (
  id INT PRIMARY KEY,
  deltaker_id INT NOT NULL,
  aktivitet VARCHAR(20) NOT NULL,
  status VARCHAR(3) NOT NULL,
  FOREIGN KEY (deltaker_id) REFERENCES deltakere(id)
) ENGINE = InnoDB;
INSERT INTO deltakere (id, navn, alder, epost) VALUES
  (1, 'Ada', 17, 'ada@eksempel.no'), (2, 'Bo', 20, NULL),
  (3, 'Ada', 22, 'ada3@eksempel.no'), (4, 'Dina', 30, 'dina@eksempel.no');
INSERT INTO pameldinger (id, deltaker_id, aktivitet, status) VALUES
  (101, 1, 'SQL', 'ja'), (102, 1, 'Web', 'nei'), (103, 2, 'SQL', 'ja');
```

This is a reproducible reference, not an automatically executed database setup.
It must only be used in an empty disposable schema, never against existing data.

- Inclusive 18–25 filter gives IDs 2 and 3, Bo then Ada by ascending age.
  The OR distractor matches all four. Ages are distinct, so no sort tie exists.
- At least 20, descending age, limit 2 gives Dina and Ada (ID 3).
- UPDATE by `id = 102` changes one value; by `deltaker_id = 1` it matches
  101 and 102, although 101 is already `ja`. Matched and changed counts differ.
- DELETE by `deltaker_id = 1` removes 101 and 102, not their parent participant.
- INNER JOIN returns `(1,101), (1,102), (2,103)` with explicit ordering.
  There is no implicit one-to-one relationship. LEFT JOIN transfer finds customer
  8; customer 7 has orders 90 and 91 and is excluded by the NULL test.
- COUNT(\*) / COUNT(epost) gives 4 / 3. SQL has 2 registrations; Web 1, including
  the `nei` row. GROUP BY uses only the group key and an aggregate in SELECT.
- Delivery times 2, 4 and NULL give AVG 3, MIN 2, MAX 4; no claim is made about
  the still-undelivered package. Decimal display precision is not assessed.
- `email` is unknown; `epost = NULL` is not true. `epost IS NULL` finds ID 2.
- Transfer datasets are fully stated on their cards: books 11–13; goods 7–8;
  customers 7–8 with orders 90–91; delivery times 2, 4, NULL. The hostile input
  scenario assesses separation of code and data, not collation-dependent matches.

Only tasks asking for an ordered sequence use a specified ORDER BY. No answer
depends on case-sensitive matching or an unspecified collation. Numeric values
are unquoted; text values use single quotes. No HAVING, advanced SQL or database
administration is needed to meet the introductory outcomes.

## Sources and qualifications

The supplied **Kajanan Sothilingam, Brukerhåndbok i SQL – Fra A til Å**, all six
pages, was read using text extraction. Its introductory sequence informed this
category; the activities and fictional data are newly authored. Its blanket
semicolon claim is client-dependent. Its DROP warning is qualified: SQL rollback
is unavailable for ordinary DROP TABLE, while backup recovery is another matter.

Official MySQL 8.4 documentation checked on 2026-10-26:

- [SELECT](https://dev.mysql.com/doc/refman/8.4/en/select.html),
  [NULL](https://dev.mysql.com/doc/refman/8.4/en/problems-with-null.html)
  and [JOIN](https://dev.mysql.com/doc/refman/8.4/en/join.html).
- [CREATE TABLE](https://dev.mysql.com/doc/refman/8.4/en/create-table.html)
  and [foreign keys](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html).
- [UPDATE](https://dev.mysql.com/doc/refman/8.4/en/update.html)
  and [DELETE](https://dev.mysql.com/doc/refman/8.4/en/delete.html).
- [Aggregate functions](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)
  and [GROUP BY](https://dev.mysql.com/doc/refman/8.4/en/group-by-handling.html).
- [Prepared statements](https://dev.mysql.com/doc/refman/8.4/en/sql-prepared-statements.html),
  [transactions](https://dev.mysql.com/doc/refman/8.4/en/commit.html)
  and [rollback limitations](https://dev.mysql.com/doc/refman/8.4/en/cannot-roll-back.html).

No compatible MySQL test environment was available. **Database execution is NOT
VERIFIED.** Syntax and semantics were checked against these sources, with explicit
row-by-row reasoning. Focused TypeScript tests independently cross-check fixture
arithmetic and authored answer keys; they are neither a SQL parser nor MySQL
execution. SQLite was not used as a substitute. No server or container was installed.

Preliminary SELECT is an inspection habit, not protection from concurrent writes.
The transaction exercise explicitly assumes no concurrent writer and ordinary
InnoDB row writes before COMMIT. DDL is excluded from that recovery recipe.
Parameter binding is through a driver API; the illustrated `?` is not a finished
query for a console and does not parameterize identifiers.

Implementation review covers SQL/dataset consistency, assessment ambiguity and
transfer, beginner reading load, architecture/preservation, and adversarial
safety/accessibility checks. It is implementer review, not independent acceptance.
Browser automation can check layout, controls, focus, axe findings and offline
reload; it cannot establish real screen-reader usability or measured learner pace.

## Local verification

PASS on the final application content:

- `npm test -- tests/programmes/sqlMysqlContent.test.ts tests/programmes/utviklerblikkContent.test.ts tests/domain/microlearningTrack.test.ts tests/architecture/microlearningBoundary.test.ts`
  — 83 tests in four files, including bank/programme validation, source/ID rules,
  preservation and independent fixture arithmetic. A further 117 focused tests in
  `practiceModel.test.ts`, `microSession.test.tsx` and `microTrackRoute.test.tsx`
  passed earlier in this run; subsequent edits changed prose, not engine contracts.
- `npm run typecheck`, `npm run lint`, targeted `prettier --check` and
  `git diff --check`. Existing activity definitions, engine/domain, dependencies,
  service worker, chunk configuration and budget scripts are unchanged.
- Production build through `npm run build` and the native managed E2E runner;
  `node scripts/check-build-budget.mjs`: JavaScript gzip **434,910 / 435,000 B**
  (baseline 429,222 B), largest JS chunk **468,843 / 500,000 B**, CSS **14,182 B**,
  curriculum **126,984 B**, runtime **6,398,912 B**; no budget violation.
- `npm run test:e2e -- sql-mysql.spec.ts --project=chromium` — three journeys:
  every SQL card on desktop (assembly by keyboard), wrong select/hint/retry,
  category entry, Back/Forward/exit, all cards at 320 × 568 with 200% root text,
  and an unopened SQL activity assembled after offline reload.
- `npm run test:e2e -- sql-mysql.spec.ts --project=chromium --grep 'representative SQL assembly'`
  — one additional journey: ordinary mobile SQL and assembly screenshots,
  incorrect assembly, empty retry, explanation, focus and axe on actual question
  controls at ordinary/enlarged text. No axe violations in scanned states.
  Seven saved screenshots were visually inspected. Layout checks found no
  horizontal overflow or clipping; page scrolling remains available.

The first Vitest invocation could not rename its sandbox cache; the first browser
invocation could not reach its own sandbox loopback preview. Neither executed
successful tests; the successful retries ran outside that sandbox. Playwright
emitted an environment-only NO_COLOR/FORCE_COLOR warning; it did not affect the
tests. No full release gate, dependency installation outside this worktree,
independent-review evidence, push, merge or deployment was performed.

Five implementer review passes considered: (1) MySQL semantics and deterministic
results; (2) beginner comprehension, transfer and distractors; (3) preservation
and contract integration; (4) unsafe writes, NULL, JOIN multiplicity and recovery;
(5) rendered layout, keyboard/retry/offline behaviour and final diff integrity.
Repeated explanations were shortened and redundant cards removed before final
browser verification. The six activities retain all nine introductory outcomes.

Remaining limitations: actual MySQL execution, physical-device zoom and assistive
technology testing are NOT VERIFIED. Completion times are unmeasured. The remaining
**90 B JavaScript headroom** is an integration constraint, especially alongside
the unmerged UX/UU and v1.9.0 work; remeasure their combined candidate without
silently raising the limit. Independent source/pedagogy/SQL review and controlled
integration, then normal release certification, remain separately authorized work.
