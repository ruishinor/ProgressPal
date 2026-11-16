# Guild Commons — reviewed delivery plan

**Status (2026-11-15):** reviewed revision of the 2026-11-13 planning baseline
on `plan/guild-commons-20261113` (inspected base `cffd41e`). This file
supersedes that baseline's sequencing. It authorizes no merge, provider
migration, flag change or deployment. S1 source merged as PR #103 (off by
default, not installed on Nhost); the owner decisions in §5 are accepted.

The product intent from the baseline stands: a private, optional Guild that
helps a learner get practical help, see what the group is doing and belong
without pressure. Guild value must exist without XP. Nothing here gates
learning, programmes or personal rewards.

## 1. What changed since the baseline

- **Master moved.** PRs #97–#102 changed the release gate (parallel stages,
  60 s per-test budget), Settings and the Hero HUD; none touches the Guild
  contract. PR #95 (first S1 attempt) is paused under the owner's two-failure
  rule: run #199 failed on Markdown formatting the author had not checked,
  run #200 on runner contention that PR #97 later fixed on master.
- **Provider baseline.** The owner reports `social_week`, rename and invites
  configured on `progresspal-g0`. S0's provider inventory therefore reduces
  to one pre-install check (§4, step 1), not a separate slice.
- **S1 review fixes** (applied in this PR, over PR #95): client limits now
  count code points like PostgreSQL `char_length`, so an emoji in a nickname
  or note can no longer make the whole board unreadable; each note shows its
  Oslo date; form controls reuse the shared `TextInput`/`TextArea`/`Select`
  (theme contrast instead of `currentColor` borders); focus returns to the
  Commons heading after a change; administrator handover asks once more;
  textarea line breaks are sent as LF; the SQL probe adds code-point,
  CR-rejection and expiry cases; a behavioural component test covers
  open/read, posting, handover confirmation, membership loss and abort.

## 2. Review of the baseline plan

Findings by perspective. Each is acted on in §3 or recorded as a decision.

| #   | Perspective                  | Finding                                                                                                                                                                                                                       | Action                                                                                                                                                      |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Delivery / release           | The baseline puts provider inventory (S0) before any code, but S1's SQL probe already pins the repository contract, and the owner reports the live base installed. A paper-only slice adds a round without reducing risk.     | Fold S0 into the S1 activation checklist (§4).                                                                                                              |
| R2  | Release / QA                 | Feature-on code is never built or browser-tested by the gate, which builds with the flag off. A flag flip is therefore a release, not a setting.                                                                              | S1-A adds a flag-on Playwright project with one Commons journey; activation then removes the build flag so the gate certifies the shipped code (§4 step 5). |
| R3  | Product / pedagogy           | S2 (opt-in roster with programme, level and status) uploads derived learning data and overlaps the existing weekly day count. Its value is unproven; its privacy cost is certain.                                             | Demote to P3. Replace S2 with a weekly focus (§3, S2) that needs no learning data.                                                                          |
| R4  | Human factors                | The existing "Ukas rangering" ranks up to eight people by shared days. The baseline's own rules reject pressure mechanics, permanent ranking and inactivity signals, yet keep this ranking "secondary".                       | D5 accepted: stable unranked member list (PR #104).                                                                                                         |
| R5  | Architecture / privacy       | S3 is blocked by decisions, not code: a local receipt store is a Dexie schema change (v5 → v6, forbidden without an accepted decision), and claim-once-across-Guilds conflicts with erasing an account's claims.              | Gate S3 on written decisions D1–D4 (§5). No S3 code before them.                                                                                            |
| R6  | Security                     | Commons uses the same global advisory lock as `social_week`, so all Guild writes serialize across the project. Correct for capacity and handover; a throughput limit at scale.                                                | Accept for 1–8-member private Guilds; revisit only with measured contention.                                                                                |
| R7  | Security / data minimization | The Commons read returns every member's opaque `membership` id. It is not a credential (the server derives the actor from the JWT and checks the caller's own id), but only an administrator needs others' ids, for handover. | Accepted for S1; trim to administrator-only when the response next changes.                                                                                 |
| R8  | Retention                    | Expired notes are purged only by that Guild's next Commons call. A dormant Guild keeps expired rows until it is deleted.                                                                                                      | D6 accepted: daily `pg_cron` cleanup job (S1-A, `guild-commons-cleanup.sql`).                                                                               |
| R9  | Operability                  | The flag is build-time (`VITE_PROGRESSPAL_GUILD_COMMONS`). Turning Commons off needs a redeploy; the fast kill switch is removing the Hasura function permission.                                                             | Documented in the provider README rollback section.                                                                                                         |
| R10 | Measurement                  | "Aggregated Guild-local counters" are still data collection.                                                                                                                                                                  | Pilot evidence comes from the existing Send feedback link and owner-run sessions only.                                                                      |
| R11 | Junior developer / DX        | The baseline is long and mixes standing rules with slice detail; an implementer must read 200 lines to find the next action.                                                                                                  | This revision keeps one table of slices and one list of decisions.                                                                                          |

## 3. Revised slices

Each slice is one PR with focused tests, its own payload-bound self-review
and one hosted `Final candidate`. Provider SQL lands as files first and is
applied only on separate owner authorization.

| Slice                                     | Scope                                                                                                                                                                        | Depends on                            | Exit evidence                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **S1 — Commons board** (PR #103, merged)  | Ethos/About, three private seven-day notes (help, offer, notice, win), author edit/withdraw/resolve, admin remove, admin handover consistent with `social_week`. Flag off.   | —                                     | SQL probe; client and component Vitest; lint, types, build and bundle with flag off; hosted gate. |
| **S1-A — Activation**                     | Source: D6 cleanup job, real-PostgreSQL concurrency and cron probe, flag-on browser journey. Then the owner-run §4 install and an activation PR that removes the build flag. | S1 merged; owner authorization for §4 | §4 checklist recorded with outputs.                                                               |
| **S2 — Weekly focus**                     | One administrator-set focus line per Oslo week (≤120 code points), shown to members; no counting, no XP, no vote. Optional self-report "jeg jobbet med dette" deferred.      | S1-A pilot feedback                   | Probe for week rollover (DST), admin-only write, reset on new week.                               |
| **S3 — Contribution ledger**              | Server-allowlisted, deduplicated contribution claims; derived Guild total.                                                                                                   | Executable D1–D4 lifecycle contract   | As baseline S3 exit, plus restore/two-device duplicate tests.                                     |
| **S4 — Chronicle and Guild achievements** | Dated history from accepted ledger events only.                                                                                                                              | S3                                    | As baseline S4 exit.                                                                              |
| **P3 backlog**                            | Opt-in roster details (old S2), member voting on focus, resource shelf, cooperative bonus.                                                                                   | Pilot demand                          | Separate proposal each.                                                                           |

Unchanged from the baseline and binding for every slice: messages, votes,
links, presence, invites and admin edits never earn XP or GXP; no presence,
last-online, dimming or inactivity colours; no global Guild ranking; no
background upload of local learning events; failed or unknown writes never
show success; learner copy in plain Bokmål without disclaimers beyond what the
action needs.

## 4. S1 activation checklist (owner-run)

Steps 1–3 and 5 change the live provider and each need explicit owner
authorization. Run them in the Nhost SQL Console of `progresspal-g0`.

1. **Inventory, read-only.** Export the installed definitions of
   `progresspal_social.social_week`, `members` and the member-removal trigger;
   confirm `member_order` is `GENERATED ALWAYS AS IDENTITY` and the
   `member-invites` upgrade is present. Stop on any difference from
   `up.sql` + `rename-guild.sql` + `member-invites.sql`.
2. **Install.** Apply `guild-commons-v1.sql` as the role that owns
   `progresspal_social`, then the two operations in
   `guild-commons-metadata.json`. Do not reapply `metadata.json`.
3. **Live contract.** With synthetic accounts A, B (same Guild), C (other
   Guild) and an anonymous call: A posts, B cannot edit A's note, C reads only
   its own Guild, anonymous is `unauthenticated`, a fourth note in a full board
   is `full`, handover moves `isAdmin` in both `guild_commons_v1` and
   `social_week` and clears the invite. Record the responses. The frontend
   flag is not a security boundary: from this step on the RPC is callable
   directly by any signed-in `user`, so its own checks are the boundary.
4. **Cleanup job (D6).** Apply `guild-commons-cleanup.sql` as the same role.
   Verify and, if needed, unschedule as described in the provider README.
5. **Frontend.** Activation PR: remove the build flag so Commons ships in the
   build the gate certifies (the gate builds with default variables, so a
   Vercel-only variable would ship code the gate never ran), and move
   `e2e/guild-commons.spec.ts` into the default project.
6. **Rollback.** Remove the Hasura function permission and tracking; keep the
   tables. Unscheduling the cleanup job is independent. Destructive rollback
   needs a separate retention decision.

**Status 2026-11-16:** steps 1–4 done on `progresspal-g0` (see the provider
README's live status). Open before step 5: the cleanup job's first run
(`cron.job_run_details`, job 2, after 03:45 UTC) and one Commons read with a
real signed-in test account returning `ok` or `membership-changed`. S2 may be
developed on its own branch meanwhile; it ships after step 5.

**S2 source (2026-11-16):** `guild-focus-v1.sql` and the client are in source,
behind the same build flag; the SQL is not installed. The focus travels
beside `group`, so the S1 client and the S2 client each work with either
provider version. Installing it is a separate owner step after step 5
(provider README, "Guild weekly focus"). R7 is deliberately not folded into
S2, to keep the S1 response contract unchanged.

Already verified without the live provider (S1-A source PR): the PGlite
contract probe; `probe-guild-commons-postgres.mjs` on disposable PostgreSQL
16.15 with pg_cron 1.6 (lock serialization, final-slot race, two-device post,
cleanup registration, repeat safety, execution and isolation from other jobs);
the flag-on browser journey against a simulated provider.

## 5. Accepted owner decisions (2026-11-15)

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Applies to |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| D1  | No Dexie v6 for the first S3. Claims come only from existing persisted, eligible learning evidence. Mikroøkt/Utviklerblikk receipts wait until their migration, backup, restore, account binding and sync behaviour are justified and testable.                                                                                                                                                                                                                                                  | S3         |
| D2  | Account deletion erases the account's Guild claims and totals are recalculated; no shadow identifier is kept for lifetime deduplication. Leaving a Guild, withdrawing one contribution and erasing an account are distinct operations. Dependent achievements are reconciled truthfully.                                                                                                                                                                                                         | S3, S4     |
| D3  | Provisional catalogue: +3 GXP for an explicitly shared, eligible, uniquely identified saved Pathways lesson completion; +20 GXP for one qualifying collective weekly milestone from deliberately shared days under server-set weekly rules. Nothing for messages, links, votes, navigation, invitations, admin actions or repeated claims. Verify the source catalogue and simulate 1/2/4/8 members before S3 release. No percentage conversion of personal XP; personal XP semantics unchanged. | S3         |
| D4  | Every contribution needs a per-share preview and an affirmative action. No standing authorization or background upload. No success shown before server acknowledgement. Withdrawal follows D2.                                                                                                                                                                                                                                                                                                   | S3         |
| D5  | The weekly ranking becomes a stable, unranked member list that keeps the shared day counts and infers no inactivity. Implemented in PR #104.                                                                                                                                                                                                                                                                                                                                                     | Guild card |
| D6  | Bounded physical cleanup with the existing `pg_cron` (1.6, verified live by the owner): one daily job deletes notes whose `expires_at` has passed, at most 24 hours after expiry. Database cleanup only; provider backups keep their own retention. No separate service.                                                                                                                                                                                                                         | S1-A       |
