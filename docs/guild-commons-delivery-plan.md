# ProgressPal — Guild Commons implementation and release plan

**Date:** 2026-11-13  
**Status:** implementation-ready planning baseline, NOT an implemented Guild feature or release certificate  
**Repository:** https://github.com/ruishinor/ProgressPal  
**Inspected base:** master cffd41e94785e0d6fea639e5bf4b216377b98510  
**Planning branch:** plan/guild-commons-20261113  
**Audience:** autonomous implementation agent, owner, maintainer, reviewer

## 0. Executive decision

Turn the existing private eight-member Guild into a useful, optional, cross-programme learning commons. Make these actions possible: ask for help, share a short update, express Guild identity, choose a voluntary weekly focus, recognize concrete collective milestones, and review Guild history and aggregate progress. Guild XP and levels illustrate history; they never gate education, features, personal rewards, privileges, admission, or belonging.

The primary metric of product value is not XP or page interaction. It is whether a learner can obtain practical help, find a relevant resource, join an achievable cooperative objective, and see what the group has accomplished without pressure to perform.

**Bounded delivery:** Do not ship the full backlog as one unreviewable social/XP migration. Deliver the ordered independently verifiable slices below, each with genuine focused tests and provider evidence where relevant. Initial release: Guild identity, a private three-note board, clear governance and a stable member roster. Further progression and achievement work follows only after event semantics, consent and account deletion are resolved. A PR is optional, not an automatic substitute for technical validation. No merge, database migration, provider permission change or production deployment is authorized merely by this document.

## 1. Verified baseline and precedence

Read and trust current code over historical narrative. At inspected master cffd41e:
- src/features/social/GroupPage.tsx renders Min uke / Guild / Administrasjon in RPG; Classic has the existing Guild card.
- src/features/social/GroupSession.tsx supports authenticated explicit read, create, join, share week dates, rename, invite/revoke, leave. No messages, resource links, Guild XP, custom About/ethos, votes, activity presence or Guild Chronicle.
- src/lib/cloud/socialPort.ts defines the bounded existing contract; src/lib/cloud/nhost/socialGroup.ts validates authenticated responses and pins the expected user/session.
- infra/nhost/social/up.sql owns private Guild, member and shared-day tables plus the authenticated social_week function. Owner is the first remaining member; administrator departure passes ownership; the last member leaving deletes the Guild. Extra guarded migrations under infra/nhost/social must be inspected before any upgrade.
- src/lib/db/learningWeek.ts derives distinct Oslo dates from locally stored sessions, progress and exercise attempts. Guild sharing is intentional, not automatic. The UI's group target is currently twice current membership, a visual status with no enduring effect.
- src/lib/xp/engine.ts contains programme-owned personal XP transactions and level logic. Personal XP is local and MUST NOT be redefined by Guild progression.
- src/features/microlearning/README.md and SessionRunner.tsx prohibit durable records today. The Utviklerblikk track shares the runner. TechRef reads reference content without learning evidence. Pathways stores voluntary completion, not independently proven proficiency.
- AGENTS.md retains earlier local-first historical boundaries; docs/CURRENT_STATE.md contains more recent optional account/Guild exceptions. Reconcile actual code and latest explicit owner decisions, not older blanket statements.
- docs/ci.md and docs/release-reuse.md require an exact payload-tree-bound schema-v2 review record and a genuine hosted Final candidate certificate before merging. Vercel READY, master CI and public alias are separate release facts.
- Existing social provider state and installed SQL function hash were NOT independently checked during planning. Repository contents are not proof of live installation.

Source-of-intent: the owner's Guild XP revised brief v2 and Guild Social Interactions addendum from 2026-11-13, plus subsequent conversation decisions about collective statistics, optional achievements, About/ethos, member voting, MMO/Duolingo lessons and no level-gating. Those are design sources, not evidence that code exists.

## 2. Five-perspective decision record

1. **Pedagogy + beginner developer:** Make peer assistance and learning outcomes meaningful without inventing an assessment platform. Learner self-reports remain sufficient. Do not ask for Git history, code evidence, correctness proof, school affiliation or a GitHub account. Do not frame recorded activity as independently certified mastery. No academic gating or mandatory Guild participation.
2. **Game designer + MMO veteran + analyst:** Adapt cooperative missions, collective history, voluntary recognition and a social space; reject WoW-style level perks that disadvantage new Guilds, punitive Guild disbanding, forced streaks, XP-farming social interactions, and permanent inter-Guild ranking. Guild value must remain without XP.
3. **UX + accessibility + human factors:** Preserve a small comprehensible surface, with stable membership ordering, equal-contrast rows, plain Bokmål, explicit opt-in and useful empty states. No yellow/red inactivity borders, automatic opacity fading, last-online indicators or presumptions about illness, work or breaks. Use semantic statuses, not colour alone. Works at 320 CSS px/200% zoom, screen reader, keyboard, both modes and active RPG variants.
4. **Security + privacy + adversary:** Only authenticated current members may read or mutate private Guild content. Derive actor, group and server time from the authenticated provider; never trust client-supplied identity, membership, XP amount, role, completion time or award status. Source identifiers and limits are server allowlisted; dedupe on server; keep local learner records private. Account deletion, leave and rejoin semantics are mandatory.
5. **Principal engineer + QA + SRE + release architect:** Reuse existing Guild/Nhost session adapter and UI tokens. Introduce no WebSocket chat, presence server, push-notification pipeline, autonomous moderation bot, new framework, continuous polling, analytics pipeline, tracking SDK, or routine extra full-suite runs. Use focused tests and exactly the authentic hosted certification required per actual releasable PR; stop on significant provider or data-model mismatch.

## 3. Binding product constraints

- Guild is private, optional, 1–8 members, usable from Level 1. The local learning app remains usable offline and without a Guild.
- All programmes, Pathways, Mikroøkt, Utviklerblikk and TechRef stay accessible without Guild membership.
- A Guild rename never costs XP, levels or achievements. It changes displayed identity, not the persistent group UUID. Change history/confirmation are candidates; any cooldown must be justified, not blindly added.
- Administrator cannot delete or disband a Guild containing other members. Any member may leave. The final member's departure explicitly warns of shared-history deletion. Account deletion follows reviewed cascade lifecycle.
- Personal XP, module XP, progress/assessment, backup and existing local completed status retain their own semantics. Guild XP is additive; no Guild-level benefits, personal boosts, module multipliers or rank-based learning advantage.
- Messages, votes, acknowledgments, link submissions, presence signals, administrator edits, and help requests NEVER generate educational XP or GXP. A real shared weekly goal may earn a separately recorded fixed Guild bonus after reward validation.
- Expose only minimally necessary member data. Avatar/personal programme and level, recent participation and learning summaries are opt-in; missing shared activity is not evidence of inactivity.
- No automatic background sync of local learning events. Manual Guild sharing first, with meaningful preview of what will be submitted. Failed/unknown provider writes never display fictitious success.
- No experimental award catalog or achievement in release before deterministic accounting and retention semantics are proven.
- Avoid expanded prose disclaimers in learner UI. State accurately what is shared and what is recorded; concise natural Norwegian Bokmål.

## 4. Product information architecture (reuse existing route)

Do NOT create five permanent top-level Guild tabs. Preserve the existing Min uke, Guild, Administrasjon navigation; improve Guild interior by compact sections that can progressively expand:

- **Guild heading:** name, optional <=120-character ethos, member count and optional level/progress when implemented. About (<=600-character plain text) behind a concise disclosure or description section. All members can read; administrator edits with confirmation and safe rendering.
- **Felles retning:** current voluntary focus and progress, with a plain explanation of how it is counted. No attendance obligation. Initially static admin proposal; add member vote only in a later, justified slice.
- **Oppslag:** three short private notes maximum, visible without entering a chat. Types: Trenger hjelp, Kan hjelpe, Beskjed, Liten seier. Explicit display of author and date. Help resolution remains authored by original poster.
- **Medlemmer:** all current members in stable join order, nickname, optional avatar/optional programme-qualified personal level, optional coarse positive participation indicator and optionally aggregate contribution. No dimming, red/yellow warning, precise last-online or passive presence. Existing weekly ranking may remain secondary until replaced by a tested roster.
- **Vår historie:** Guild Chronicle from durable, accepted aggregate events only when event ledger exists. First creation, shared weekly objective, true milestone and earned achievement are eligible historical facts. No fabricated history or made-up historical counts.
- **Administration:** invite/revoke, leave, rename, ethos/About edit, later explicit admin handover, removal of offending messages. No free-form access to other members' progress.

If cards become too tall, use in-page disclosures or a compact Guild-local section navigation; validate actual 320px and 200% text behavior before adding more tabs.

## 5. Ordered deliverable slices (each independently validated)

### S0 — Baseline, contract and threats (NO product code)

Entry: refresh HEAD and compare base to this plan, inspect open Guild PR/branches and changed contracts. Inventory actual GitHub SHA and provider state where authorized; read AGENTS.md, CURRENT_STATE, ci, release reuse and release review schema. Inspect social SQL, guarded rename/member-invite migrations, Hasura metadata, Auth deletion hooks, Guild client, existing tests, bundle budgets, backup/sync boundaries.

Create a short test matrix of actor A/B same Guild, C different Guild, D signed out, switched-account, stale membership, administrator exit, final-member exit and Auth delete. Decide current installed social_week function body hash BEFORE writing an upgrade; source hash differs from provider contract only when verified. If no authorized provider access is available, plan in Git; do not apply a guessed provider migration.

Exit: documented current-vs-intended contract and risk list; no code mutation until source differences and retention are understood.

### S1 — Guild About and private three-note board (first functional slice)

New private persistence, not a local chat:
- Guild metadata: ethos (0–120 chars) and About (0–600 chars), nullable/empty by default. Guild ID and XP unaffected by editing.
- Message records: GUID, group ID, author identity scoped to current membership, type enum, plain-text body 1–280 characters, created/updated/expiry timestamps set by server, status active/resolved/withdrawn where needed. Max three currently active unexpired messages per Guild; max one active note per member.
- Only author may edit/withdraw/mark own help resolved; administrator may remove others' messages but cannot rewrite them. Exactly three visible note cards in ordinary Guild UI. No hidden chat history, avatars sourced from external URL, image upload, links auto-rendering, mentions, reactions, direct messages, push alerts or read receipts.
- Default message expiry: 7 days. Expired rows do not show and cannot be renewed without explicitly re-posting; if renewal is wanted later, add a separately tested cooldown. Do not silently evict a still-active note to make room.
- Capacity is enforced transactionally on the server under the SAME serialized Guild membership lock, not by client disabled buttons. Race for final slot yields one accepted message only. Logical expiry may be evaluated at read; write must clean or ignore expired rows under lock. Do not write a PostgreSQL partial unique index predicate involving now(), which is not immutable.
- Read and write membership authorization must be rechecked inside the RPC; derive actor from injected Hasura session, group from current member row, verify membership reference on mutations. Forbids cross-Guild reads, author spoofing, admin impersonation, stale device writes and disposed-session render.
- Removing a member clears that member's notes, without deleting other members' notes. Expired rows may be physically deleted on bounded authorized maintenance/write; do not claim physical deletion until observed. Final Guild deletion clears all Guild notes. For any retained abuse record, separately justify its period, access, disclosure and deletion.
- Add an explicit authenticated Guild-scoped RPC (e.g. progresspal_social.guild_commons_v1) with a private response table or documented compatible Hasura contract. Do not broaden arbitrary table visibility; DO NOT edit/reinstall social_week blindly. Inspect actual Hasura permissions, role grants and guarded live upgrade path first.
- Client transport uses current authenticated session pinning, expected-user check, AbortSignal and fail-closed response validation. No cloud request when cloud disabled and no Guild auto-read purely from opening unrelated UI.
- Render in both RPG and Classic; reuse existing Card/RpgPanel/UI tokens. Explain full-board and expired/withdrawn states, show the three notes, preserve keyboard focus after edit, support no-JS? (not required), 320px and 200% text, reduced motion, all themes.
- User copy in Bokmål; no marketing tone. Suggested headings: Oppslag, Trenger hjelp, Kan hjelpe, Beskjed, Liten seier, Rediger, Fjern, Løst, Guildens om oss / Om Guilden. Review wording before publication; do not add editorial-copy snapshot tests.

**Governance dependency:** before any administrator removal/moderation can ship, implement safe explicit administrator transfer or accept a bounded documented first-admin limitation as a non-critical operational risk after review. The existing first-remaining-member ownership model means transfer affects social_week authorization; do NOT introduce a second conflicting administrator authority. If changing administrator semantics requires reinstalling the existing function or migration cannot be safely tested, ship author-only notes first and stage administrator moderation/transfer separately.

S1 test exit: authenticated role/membership access, simultaneous third-slot writes, duplicate per-author, expired note not counting capacity, Unicode length limits, edited-after-exit rejection, note lifecycle on leave/delete, disabled cloud silence, async account switch, XSS-as-text, screen-reader and responsive flow. Add no general-purpose chat or notification framework. Verify disposable Postgres, Hasura/JWT, and live installation separately.

### S2 — Voluntary identity and useful member roster

Keep existing stable member order. Let each member explicitly share or withdraw a bounded avatar selection, optional programme and its associated personal level, positive 7-day shared-contribution indicator or a manually selected coarse status (Tar en pause / Kan hjelpe / Tar gjerne imot oppmuntring). NEVER infer last-online or absence from unshared dates. Do not show real names, exact login timestamps, raw progress, inferred competence, unconsented XP/level or study schedules.

Store voluntary visibility/consent per member; withdrawal and member departure clear it from Guild-visible storage. Device/profile changes are not automatically uploaded unless explicitly authorized by learner. Build optional status only if the associated workflow offers real value; do not create a presence service.

S2 exit: opt-in/withdrawal, account-switch behavior, profile privacy, no opacity/contrast degradation and no automatic network reads outside explicit Guild interaction.

### S3 — Durable Guild learning contribution ledger and statistics

Do this only after real catalog and retention design, since it touches local learning evidence and cloud authority.

Server:
- New versioned Guild contribution RPC with server-canonical, allowlisted source kinds and fixed amounts. Never trust client numeric XP, caller/role/group fields, source correctness or client-chosen server time.
- Two ledger categories: accepted unique member learning-contribution events; collective weekly Guild milestone events. Deduplicate durable once-per-source account claims across Guilds, including restore/retry/reopen. Limit recurring claims by canonical Oslo week. Store group and contribution identity needed for proper accounting and deletion; distinguish active member statistics from lifetime Guild contribution totals.
- Guild total = accepted distinct ledger credits; level is pure derived function, not an incremented cached counter. Candidate curve T(L)=25*L*(L-1), starting L1=0; thresholds L2=50, L3=150, L4=300, L5=500, L10=2250. Recalculate 1/2/4/8 member scenarios and course source totals BEFORE fixing numbers.
- Existing personal XP milestone candidates: CS50x and Programvareutvikling server-allowlisted awards worth floor(0.20 * eligible personal award XP), not deducted; must inspect actual sourceType/sourceId policy and prevent a client from inventing an award. Server can enforce catalogue and replay but cannot independently prove local learning.
- New Guild-only candidates: Mikroøkt first genuinely completed authored practice session +3 and a later-week bounded reinforcement +1 (max three per member/week); Utviklerblikk each distinct authored activity +4; TechRef explicit Brukt i en oppgave +1 per distinct reference entry, max three per week; Pathways saved lesson completed +3 once, full authored module +12 once.
- Never award XP for simply opening, searching, visiting a page, URL navigation to a done screen, hints, incorrect answers, replies, voting or inviting.
- One weekly group success bonus candidate +20 GXP per Guild/Oslo week; freeze target based on actual membership and first qualifying share, with distinct-participant rule when Guild has >1 member. Joining/leaving midweek cannot retroactively change a frozen target. Server-authored time and transaction ensure only one bonus despite parallel shares.
- Guild levels do not change any personal or educational functionality, irrespective of level. No global Guild ranking.

Local:
- Pathways progress includes saved completion but reopening may rewrite completedAt. Emit deterministic distinct completion identity on eligible transitions, not repeated award. No re-evaluation of existing programme exercises.
- Mikroøkt/Utviklerblikk currently prohibit persistence. A new minimal opt-in receipt is a **deliberate storage/architecture exception**; design needed for Dexie migration, backup/export/import, sync, account binding and device restarts. Do not silently break no-storage tests or claim the receipt is synchronized. Do not preserve answers or scoring.
- TechRef needs an intentional voluntary confirmation that a term was used in a real task. Do not score mere article access, search or click.
- All Guild sharing is manual with preview, opt-in and server acknowledgement; offline learners remain functional. No retroactive claiming of work without an explicitly designed consent/time boundary.

Privacy decision required before coding schema: after account deletion, personally identifiable ledger/source markers must be erased or de-identified consistent with a truthful retention policy, while any retained Guild aggregate must not falsely be called anonymous in an eight-member group. Claim-once across Guilds and permanent dedupe after account erasure can conflict. Document how this is resolved; if unresolved, DO NOT ship claimed lifetime counts or irrevocable achievements. No storing personal lesson notes, answers, code, real names, or raw study logs.

S3 exit: deterministic accounting/curve, representative source allowlist, sourceId collision checks, dual-device same-account retry, membership/clock/caps, migration/restore, fairness simulation by programme and group size, privacy lifecycle and explicit transport errors. Provider authorization/Hasura/JWT and SQL transaction concurrency must be proven, not inferred from TS unit tests.

### S4 — Collective stats, Guild Chronicle and achievements

Use accepted Guild events as the ONLY source of durable facts:
- Distinguish current unique accounts who recorded completion of all Utviklerblikk track activities, current members who recorded a Pathways track complete, unique account × module completions, Guild-level milestone total, distinct member contribution this Oslo week, and collective successful-week count.
- One-time uniqueness is by stable account + canonical course/track/module/source ID, not repeated clicks or changes to completedAt. Label counts as registrert, not certified learning.
- A Chronicle is a compact dated event list: creation, first multi-member contribution, weekly focus success, distinct educational milestones, Guild levels and Guild achievements. Do not synthesize a history for periods before recording was activated; show Registrert siden [date]. Avoid storing raw, identifiable learning events when aggregates suffice.
- Guild achievement catalogue is separate from personal recognition. Suggested first triggers: first three distinct contributors, 100 GXP, first Guild weekly goal, multiple distinct Pathways completions, two distinct Utviklerblikk track completions, four successful weeks. Validate achievable thresholds. Never make badges educational prerequisites.
- Permanent Guild achievement belongs to Guild. Optional member commemorative badge may be assigned to members present and voluntarily active within seven days at the trigger; no one loses Guild status or existing access for being absent, and no extra XP from issuing a badge.
- Prevent circular Guild event -> award -> another GXP claim. Server-side transactional triggers and unique achievement IDs. Read-only historical rendering must not re-issue notifications on refresh.
- Lifetime distinct accounts ever joined is **deferred** until privacy retention/erasure is resolved. Distinct count after an account is erased must be truthful. Do not use pseudonymization as automatic anonymization.
- Guild historical page remains private, accessible in Classic/RPG and fully readable at 320px/200%.

S4 exit: time ordering, exact one-time semantics, consent scope, leave/rejoin, deletion, historical records, partial network failure, accessible badges/chronicle.

### S5 — Weekly focus / cooperative expeditions (post-baseline)

Begin with ONE administrator-proposed optional weekly focus, applicable to all programmes; do not make a new quest/assessment engine. A focus defines a broadly useful outcome: practice problem solving, use Git, explain a concept, help a peer. A learner may fulfil it through appropriate existing tasks and intentional self-report. Make helpful participation meaningful but do not grant GXP for messages, votes or unverified reciprocal endorsements.

If real demand justifies member choice, introduce one-vote-per-current-member asynchronous voting with exact Oslo cutoff, one valid vote per account (can change before deadline), small predefined topic catalogue, stable tie rule and plain results. No administrator weighted vote, no pressure to vote, no new group moderator roles.

Do not promise automatically validated peer help. A three-note board is not a reply/chat system; any help workflow must work with a clear outside-the-app next step or a narrowly scoped explicit single assistance acknowledgment. Never claim an in-app solution was provided when the board only records a request or a resolved flag.

S5 exit: weekly timing, votes, membership changes, no double-count, cross-programme objectives, clear manual self-report semantics, offline/late participation, participation not compulsory.

### S6 — Optional Guild resources and later experiments

Only after a useful pilot, consider a five-item private resource shelf with concise reason-for-use labels. User links require safety policy (allowed protocol, sanitization, no preview fetch, URL limits, no secret-bearing URLs, bounded text); internal TechRef/Pathways links preferred. No XP for link creation.

Optional cooperative Guild-only bonus Samarbeidsløft: after successful week, next Oslo week each distinct member earns at most +5 GXP for the Guild with their first qualifying new shared contribution; max 8 accepted credits/40 GXP, no personal XP, no stacking, no self-trigger and no transfer. DO NOT ship without validated ordinary GXP totals and demonstrated motivation value. No virtual Guild Hall, paid cosmetics, mandatory streak, live presence, direct messaging, last-online monitoring, global Guild leaderboards, perks tied to Guild level, or second learning system.

## 6. Data model and API review checklist

Use additive, versioned changes after actual provider inspection. Candidate private entities: Guild metadata extension, GuildNote, optional GuildMemberDisplayPrefs, GuildContributionClaim, GuildWeek, GuildAchievement, GuildEvent, optional GuildVote, with minimal unique keys and FKs. Do not create all tables in S1.

S1 candidate response contract must be strictly parsed using Zod and bounded: noteId, type, author nickname or privacy-safe account display, text, createdAt/expiresAt, own/admin flags, optional status; plus Guild ethos/About, current membership reference and explicit failure enums. Keep unreadable server responses fail-closed. Client input has operation-specific allowlisted keys; unknown fields rejected. Use existing server advisory lock discipline and membership identity, with exact auth/user role checks.

Migration design:
1. Baseline current actual function body hash, metadata permissions and exact tables.
2. SQL up and non-destructive down/disable access plan; no destructive rollback of live member data.
3. Disposable PostgreSQL test and concurrent transaction cases.
4. Hasura metadata tracking and JWT role verification with two Guilds and anonymous actor.
5. Existing backup/sync/privacy smoke and no new unauthorized tables exposed.
6. Provider activation only under separate explicit owner authorization; client displays feature unavailable if new RPC absent; old Guild functions continue.
7. Observe installed hash, GraphQL permission and API response; do not infer deployment success from SQL file/PR merge.

No new third-party dependency unless a concrete unmet requirement and maintained alternative comparison is documented. Avoid GXP counters maintained independently from their ledger without reconciliation.

## 7. Concrete test matrix

- **Access:** own Guild reads; unrelated Guild data rejected; anonymous denied; session/JWT role spoof denied; direct private-table queries denied; stale membership and swapped user rejected; admin transfer consistent across all RPCs.
- **Notes:** 0/1/2/3 active, full capacity, 8-member contention, simultaneous final slot, one note per member, Unicode 280 boundary, controls/newline/HTML safely rendered as plain text, expired vs active, author edit, admin removal, no silent eviction, leave/delete cleanup.
- **Progression:** duplicate/cross-Guild source claim, manual share consent, restored backup, two devices, week rollover and DST Oslo, fake source kind/XP, reopened Pathways, direct URL to micro done, max weekly GXP, level formula, weekly award exactly once.
- **Community:** 1/2/8 members, low participation, return after break, optional badge eligibility, Guild rename doesn't remove XP, last member deletion only, administrator handover, private data withheld on opt-out.
- **Quality:** Classic/RPG, all four RPG visual variants when supported, light/dark, 320px width, actual 200% zoom and text-size expansion, keyboard tab/focus/escape, screen reader roles/live messages, reduced motion, no clipped content and offline fallback.
- **Release:** changed-file formatting/lint, targeted Vitest and Node SQL probes, managed Playwright affected journeys, TypeScript, build/bundle budget, no circular import, exact branch/tree review and native hosted Final candidate. Do not generate or claim passing tests that were never run.

Do not test cosmetic prose strings as invariants. Test functional states, role/semantics, permissions, failure behavior and accessibility.

## 8. Autonomous delivery workflow (read-first and fail-closed)

1. Verify clean working tree, HEAD, upstream origin/master, remote PRs and files BEFORE mutation. On Windows PowerShell 5.1, use simple native commands, not generated large wrappers or nested node -e quoting. Use a new isolated worktree/branch from freshly fetched master for each releasable slice, preserving all owner files and worktrees. Never force-push, reset, clean or overwrite unrelated work.
2. Inspect directly affected implementation, tests, guard SQL and README. Maintain an explicit small change contract for the slice. Prefer the project's existing tools, libraries, components and copy decisions. Do not add process scaffolding or new tests where existing tests can be extended.
3. Implement S1 first. Stop early on a provider compatibility conflict, blocked auth/JWT check, unexpected data migration, or external permission requirement; preserve a precise stopped state and remaining runnable actions. Do not weaken security or fabricate a fallback provider.
4. Run proportional focused validation: static lint/format/typecheck, relevant Vitest, SQL disposable role/membership tests, few managed Playwright cases, build/bundle and basic audit as appropriate. Report exact commands and results. Do not repeatedly run the full suite or introduce copy-policing tests.
5. Perform actual adversarial and accessibility review of the exact candidate. PASS is the default when evidence supports it; a self-review is acceptable if identified honestly. Material P0/P1 issues block; don't demand an independent human by ceremony.
6. Create the actual schema-v2 payload-tree-bound review in docs/release-reviews only after the final payload is fixed. The evidence-only commit must not change the payload. Never manufacture the SHA, test result, CI pass or reviewer provenance.
7. Open a focused PR to master only if implementation is tested and migration strategy is defensible. Use a draft PR when provider activation is intentionally pending and clearly distinguish source merge readiness from feature availability. The normal hosted Final candidate must certify the exact PR synthetic merge before authorized merge.
8. User's request authorizes planning, an isolated branch and proposing a PR where defensible; it does **not** authorize merging, executing migrations in real Nhost, or changing Vercel production. Treat those as separate actions requiring explicit authority under repository rules.
9. After any separately authorized merge, verify master check/decision, Vercel deployment source and actual public alias independently. No assumption that PR success implies production. Keep rollback scoped to function permissions/feature access; never destructive rollback shared Guild records.
10. Close each slice with: exact base/head SHA, paths changed, evidence obtained/not obtained, provider state, data lifecycle decision, unresolved risk, PR URL if any, recommendation and STOP reason if applicable.

## 9. Delivery priorities, anti-scope and decision gates

**P0:** S0 + S1. Guild identity plus three-note board, moderation and governance consistency. Useful without XP. Proceed only with authenticated source contract; if unavailable, keep code/plan in isolated branch and avoid pretending it is usable.
**P1:** S2 and the safe portion of S3: opt-in roster and server ledger foundation with narrowly verified milestone sources. Full S3 must wait for receipt/backup/account-erasure decisions.
**P2:** S4 Chronicle/achievements and S5 simple cooperative focus after S3 events are trustworthy.
**P3:** Resource shelf, member voting, acknowledgments and optional Guild-only bonus only if actual Guild users indicate need.

Do not require every P2/P3 capability for a useful initial release. Do not release an empty Guild Chronicle that invents numbers. Never introduce gated courses or new app-wide progression changes merely to populate Guild widgets.

## 10. Pilot success/stop metrics without passive analytics

Evaluate with volunteer feedback or aggregated Guild-local counters, not hidden telemetry. Suggested outcome checks: Did a member get useful help? Did shared weekly focus make it easier to know what to practice? Is the board usually full? Are notes stale? Do learners understand which activity they chose to share? Do members report embarrassment or pressure? Can small Guilds with one or two regular participants still use it? Can members return after a long break without punitive UI?

Avoid recording private messages for external analytics; no new tracking service. If the board is rarely used, remove/reshape it rather than adding XP to force usage. If weekly goals create pressure, soften or remove them. If source rewards are imbalanced across programmes, recalibrate the GXP catalogue before release, not personal course XP.

## 11. Current execution record and stopping condition

This document is the first scoped deliverable on branch plan/guild-commons-20261113. It is a planning artifact, **not** implementation, tested source code, SQL installation, CI pass, release review or a basis for an unconditional merge. No PR is justified solely because a plan file exists. Next action for an authorized implementing agent is S0 refresh and a separately isolated S1 product-code candidate, not a massive all-in-one PR. Existing Guild functionality and production remain untouched by this plan.
