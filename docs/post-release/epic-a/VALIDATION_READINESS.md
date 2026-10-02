# Epic A validation readiness

> **Historical record.** This describes the state at the time it was written. The live state, baseline and next steps are in [`docs/CURRENT_STATE.md`](../../CURRENT_STATE.md). Retained unchanged as evidence.

Date: 2026-09-25. **A7 ACCEPTED; EPIC A LOCALLY CLOSED.**

Accepted A7 implementation: `5068bb6b6cfd30407a003f2856a3ee00b0f0819a`.
Certified tree: `084e4a4345431bdad0832184d6712c41be884731`.
Parent / accepted A6 closure integration state:
`bb6c3e052bdeeba3734e96dfc2f657e26c0b2e7e`.

The local integration branch `postrelease/01-read-architecture` was verified as
an ancestor of the A7 story branch and fast-forwarded only to the accepted A7
implementation. The working tree was clean at that exact implementation before
this documentation-only closure delta.

Executed A7 evidence:

- Probe-free malformed-row RED reproduced the stored-row validation defect on the
  actual scoped readers; the accepted A6 Badges reader remained the control.
- The repair preserves Dexie's transaction-aware promise chain and propagates the
  first cursor/projection error instead of returning a partial summary or ledger.
- All seven required RPG routes passed aggregate access and all-store nonmutation
  checks.
- Hub/HUD/Hero coherence and 1x/10x catalogue/history behavior passed with fixed
  query counts and zero hidden source-history materialization.
- Resource and Focus save outcomes matched subsequent Hub/Badges reads; repeated
  saves produced no duplicate XP/unlocks.
- Backup/export/restore/reset, schema/rules, UI/copy/navigation and accepted A1–A6
  contracts remained within the frozen A7 boundary.
- Focused authoritative validation: 38/38.
- Coupled candidate validation: 209/209.
- Fresh exact-commit native release: PASS; 21 commands; 0 warnings/retries/skips.
- Full exact-release validation: 706/706 unit/integration; 74/74 E2E.
- Formatter/lint/typecheck/build/bundle/circular/audit: PASS; 0 vulnerabilities.

Release evidence:
`artifacts/release-evidence/2026-09-25T13-34-18-555Z-epic-a-a7-pass-1.json`

Release evidence SHA-256:
`E51913F90ED401C41C98DD3A46CA7302CC50A16E0349500BE8D1ADF831C2AFE2`

Release review SHA-256:
`5A57CB76B38DABA4415F4EE5636542AA37F3992D763B063BD8C2521A8C51661A`

Coverage: `A7_ACCEPTANCE_COVERAGE.md`.
Closure record: `A7_CLOSURE_RECORD.md`.
Toolchain: Node v24.19.0 / npm 11.10.1.

The first exact-release attempt was invalidated by the environment (`ENOSPC`)
during dependency installation/evidence writing. No product evidence was inferred
from that failed layer. After disk headroom was restored, a new fresh exact-commit
clone completed the native release gate successfully against the same immutable
commit/tree.

Epic A has no remaining local acceptance story. Local closure does not claim
remote CI or publication. No push, remote merge, deployment, tag, version change,
cloud work or Epic B work is authorized by this closure.
