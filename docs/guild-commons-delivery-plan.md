# Guild Commons — reviewed delivery plan

**Status (2026-11-15):** reviewed revision of the 2026-11-13 planning baseline
on `plan/guild-commons-20261113` (inspected base `cffd41e`). This file
supersedes that baseline's sequencing. It authorizes no merge, provider
migration, flag change or deployment. S1 source is the PR that adds this file;
it is off by default and not installed on Nhost.

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

| #   | Perspective                  | Finding                                                                                                                                                                                                                       | Action                                                                                                                                              |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Delivery / release           | The baseline puts provider inventory (S0) before any code, but S1's SQL probe already pins the repository contract, and the owner reports the live base installed. A paper-only slice adds a round without reducing risk.     | Fold S0 into the S1 activation checklist (§4).                                                                                                      |
| R2  | Release / QA                 | Feature-on code is never built or browser-tested by the gate, which builds with the flag off. A flag flip is therefore a release, not a setting.                                                                              | Activation PR adds one Commons journey to the existing account-sync Playwright project with stubbed GraphQL, plus a flag-on build and bundle check. |
| R3  | Product / pedagogy           | S2 (opt-in roster with programme, level and status) uploads derived learning data and overlaps the existing weekly day count. Its value is unproven; its privacy cost is certain.                                             | Demote to P3. Replace S2 with a weekly focus (§3, S2) that needs no learning data.                                                                  |
| R4  | Human factors                | The existing "Ukas rangering" ranks up to eight people by shared days. The baseline's own rules reject pressure mechanics, permanent ranking and inactivity signals, yet keep this ranking "secondary".                       | **Owner decision D5**: keep, soften to an unranked list, or remove. Not changed silently here.                                                      |
| R5  | Architecture / privacy       | S3 is blocked by decisions, not code: a local receipt store is a Dexie schema change (v5 → v6, forbidden without an accepted decision), and claim-once-across-Guilds conflicts with erasing an account's claims.              | Gate S3 on written decisions D1–D4 (§5). No S3 code before them.                                                                                    |
| R6  | Security                     | Commons uses the same global advisory lock as `social_week`, so all Guild writes serialize across the project. Correct for capacity and handover; a throughput limit at scale.                                                | Accept for 1–8-member private Guilds; revisit only with measured contention.                                                                        |
| R7  | Security / data minimization | The Commons read returns every member's opaque `membership` id. It is not a credential (the server derives the actor from the JWT and checks the caller's own id), but only an administrator needs others' ids, for handover. | Accepted for S1; trim to administrator-only when the response next changes.                                                                         |
| R8  | Retention                    | Expired notes are purged only by that Guild's next Commons call. A dormant Guild keeps expired rows until it is deleted.                                                                                                      | Truthful wording kept in the provider README; scheduled housekeeping is D6, not hidden in S1.                                                       |
| R9  | Operability                  | The flag is build-time (`VITE_PROGRESSPAL_GUILD_COMMONS`). Turning Commons off needs a redeploy; the fast kill switch is removing the Hasura function permission.                                                             | Documented in the provider README rollback section.                                                                                                 |
| R10 | Measurement                  | "Aggregated Guild-local counters" are still data collection.                                                                                                                                                                  | Pilot evidence comes from the existing Send feedback link and owner-run sessions only.                                                              |
| R11 | Junior developer / DX        | The baseline is long and mixes standing rules with slice detail; an implementer must read 200 lines to find the next action.                                                                                                  | This revision keeps one table of slices and one list of decisions.                                                                                  |

## 3. Revised slices

Each slice is one PR with focused tests, its own payload-bound self-review
and one hosted `Final candidate`. Provider SQL lands as files first and is
applied only on separate owner authorization.

| Slice                                     | Scope                                                                                                                                                                      | Depends on                     | Exit evidence                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| **S1 — Commons board** (this PR)          | Ethos/About, three private seven-day notes (help, offer, notice, win), author edit/withdraw/resolve, admin remove, admin handover consistent with `social_week`. Flag off. | —                              | SQL probe; client and component Vitest; lint, types, build and bundle with flag off; hosted gate. |
| **S1-A — Activation**                     | Install SQL + metadata on `progresspal-g0`, verify A/B/C/anonymous live, add the flag-on Playwright journey, set the Vercel variable.                                      | S1 merged; owner authorization | §4 checklist recorded with outputs.                                                               |
| **S2 — Weekly focus**                     | One administrator-set focus line per Oslo week (≤120 code points), shown to members; no counting, no XP, no vote. Optional self-report "jeg jobbet med dette" deferred.    | S1-A pilot feedback            | Probe for week rollover (DST), admin-only write, reset on new week.                               |
| **S3 — Contribution ledger**              | Server-allowlisted, deduplicated contribution claims; derived Guild total.                                                                                                 | D1–D4 accepted                 | As baseline S3 exit, plus restore/two-device duplicate tests.                                     |
| **S4 — Chronicle and Guild achievements** | Dated history from accepted ledger events only.                                                                                                                            | S3                             | As baseline S4 exit.                                                                              |
| **P3 backlog**                            | Opt-in roster details (old S2), member voting on focus, resource shelf, cooperative bonus.                                                                                 | Pilot demand                   | Separate proposal each.                                                                           |

Unchanged from the baseline and binding for every slice: messages, votes,
links, presence, invites and admin edits never earn XP or GXP; no presence,
last-online, dimming or inactivity colours; no global Guild ranking; no
background upload of local learning events; failed or unknown writes never
show success; learner copy in plain Bokmål without disclaimers beyond what the
action needs.

## 4. S1 activation checklist (owner-run, after merge)

1. On `progresspal-g0`, export the current definitions of
   `progresspal_social.social_week`, `members` and the member-removal trigger;
   confirm `member_order` is `GENERATED ALWAYS AS IDENTITY` and the
   `member-invites` upgrade is present. Stop on any difference from
   `up.sql` + `rename-guild.sql` + `member-invites.sql`.
2. Apply `guild-commons-v1.sql` as the source role, then the two operations in
   `guild-commons-metadata.json`. Do not reapply `metadata.json`.
3. With synthetic accounts A, B (same Guild), C (other Guild) and an anonymous
   call: A posts, B cannot edit A's note, C reads only its own Guild,
   anonymous is `unauthenticated`, a fourth note in a full board is `full`,
   handover moves `isAdmin` in both `guild_commons_v1` and `social_week` and
   clears the invite. Record the responses.
4. Activation PR: flag-on Playwright journey and build; then set
   `VITE_PROGRESSPAL_GUILD_COMMONS=true` in Vercel.
5. Rollback: remove the function permission and tracking in Hasura; keep the
   tables. Destructive rollback needs a separate retention decision.

## 5. Owner decisions that block later slices

| ID  | Decision                                                                                                                                                                            | Blocks            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| D1  | Local receipt store for Mikroøkt/Utviklerblikk completions: accept a Dexie v6 migration (with backup/export/import and sync coverage), or derive claims only from existing records. | S3                |
| D2  | Account erasure versus claim-once: are an erased account's claims deleted (totals may drop) or de-identified (and how is that described truthfully in an eight-member group)?       | S3, S4            |
| D3  | Which existing personal XP sources may be shared as Guild contributions, and the fixed GXP catalogue, after a 1/2/4/8-member simulation.                                            | S3                |
| D4  | Consent model: per-share preview only, or a standing opt-in with withdrawal.                                                                                                        | S3                |
| D5  | Keep, soften or remove "Ukas rangering" (R4).                                                                                                                                       | — (current UI)    |
| D6  | Scheduled purge of expired notes in dormant Guilds, or accept purge-on-use.                                                                                                         | Retention wording |
