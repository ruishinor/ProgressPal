# Epic A validation readiness

Date: 2026-09-25. **A6 ACCEPTED; A7 eligible after A6 closure commit.**

A6 implementation: `d7c591e6c2fc15475f375007705b717b203b00dd`.
Tree: `0d77438da16aaafe75135fe15e892af240356ef2`.
The local integration branch has fast-forwarded to this implementation. The
current documentation-only commit records closure; verify its resulting exact
HEAD/tree and clean state before A7 readiness.

Executed A6 evidence:

- Valid baseline mechanism RED: 7 XP rows materialized; expected target 0.
- Corrected focused A6/probe/architecture: 18/18; coupled A1–A5: 107/107.
- Full isolated precommit: 673/673 unit/integration; 74/74 E2E.
- Fresh exact-commit native release: PASS; 21 commands; 0 warnings/retries/skips.
- Native formatter/lint/typecheck/build/bundle/circular/audit: PASS; 0 vulnerabilities.
- One coherent two-store child transaction, two queries, targeted unlocks,
  O(H_xp) scan, no XP bulk array, O(1) accumulator/error state, zero passive writes.
- Both shared variants and independent child/HUD retries preserved.

Release evidence and hashes: `A6_CLOSURE_RECORD.md`.
Coverage: `A6_ACCEPTANCE_COVERAGE.md`.
Toolchain: Node v24.19.0/npm 11.10.1.

A7 readiness must be fresh and aggregate; the previous A0 observations are
historical. Investigate stored-row validation error propagation in existing
streaming paths using actual reads, then freeze A7 coverage before implementation.
Local acceptance does not claim remote CI or authorize publication. No remote
mutation has occurred.
