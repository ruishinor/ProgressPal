# Branch archive procedure (documentation only — nothing executed)

Captured 2026-07-18 on branch `cx/release-1.3.0-remediation` per remediation
roadmap Phase 8 item H6.

**No branch deletion, tag creation, or any other git mutation was executed by
the agent.** This document only records the procedure. Creating the archive
tags and deleting the branches are separate, owner-approved acts.

## Branch inventory at capture time

`git branch -a` output (local branches; remote-tracking refs omitted from the
table but noted below):

| Branch                                      | Tip SHA                                    | Commits beyond `master` (`git rev-list --count master..<branch>`) | Merged into `master` |
| ------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- | -------------------- |
| `docs/close-ux-07-status`                   | `9dd21ba6fc80ea20b1526e1e212b41e3c4fc9574` | 0                                                                 | yes                  |
| `hotfix/vercel-spa-routing`                 | `b1799ba3861fcf1db020fc4fe6c91b67ae50f902` | 0                                                                 | yes                  |
| `milestone/m20.5-cs50-content-visible`      | `34e0be77bcabbb4d4ae24ca1999b84c34206a535` | 0                                                                 | yes                  |
| `release/v1.2-local-first-proof`            | `0d7aa364b5b0bf5606bf2d89eb5d52aa2d75534c` | 0                                                                 | yes                  |
| `rpg/00a-baseline-hygiene`                  | `6d6f901a28d09e682a41b74f42b3defd2b409bf4` | 0                                                                 | yes                  |
| `rpg/01-engine-adapter-contract`            | `9b925e3dbb3d8d92ea073131d7bb975c2ca488a0` | 0                                                                 | yes                  |
| `rpg/01b-character-avatar-asset`            | `ed67e23c1b3789fb195492e09a934514ba63972a` | 0                                                                 | yes                  |
| `rpg/01c-document-avatar-asset-patch`       | `701369e7b35fced810c4c4eb25b188d1b8643f61` | 0                                                                 | yes                  |
| `rpg/real-shell-v2`                         | `0287b9923670de4db99515c413c33f79da13f17d` | 0                                                                 | yes                  |
| `rpg/shell-01b-rpg-chrome-boundary`         | `c90415961770abef4d0bfd414fe74d308f5b7fa7` | 0                                                                 | yes                  |
| `rpg/shell-01c-mobile-viewport-containment` | `f27ceae46082b33aadd1f455ba6f3c8f90af0b85` | 0                                                                 | yes                  |
| `rpg/v2`                                    | `8254ae24af6d63b01eb01cf446b5a376220b4aa8` | 0                                                                 | yes                  |
| `ux/00-remediation-roadmap`                 | `5364aae424bc6778a16ca83272c6d5092412bb68` | 0                                                                 | yes                  |
| `ux/01-plain-language-terminology`          | `a2e0cecc3cd2e6e21a2d2495dee6e4137fa0e2e7` | 0                                                                 | yes                  |
| `ux/02-lecture-page-learner-first`          | `794fe069d78390150fac64938414816b23b16a20` | 0                                                                 | yes                  |
| `ux/03-problem-set-learner-first`           | `683a10bc078fce6d605582c81aeb49edbe5c1aee` | 0                                                                 | yes                  |
| `ux/04-gamified-progress-loop`              | `62d8d038498b2f8be83b476e42885ed96bc064d7` | 0                                                                 | yes                  |
| `ux/05-save-history-repair-path`            | `e109d8f8588e49aabfdc608ed70e15b380cc9554` | 0                                                                 | yes                  |
| `ux/06-onboarding-simplification`           | `803503e4b8244ee36f2b6195dc0b3a4f47f10b77` | 0                                                                 | yes                  |
| `ux/07-local-cs50-guide-content`            | `9f8eca391171f8d81a8b9312466bf50a6082b70d` | 0                                                                 | yes                  |

`master` at capture time: `67ed6af836ec46f136bc5622aa68c8745c8bcf40`.

Notes:

- Every branch above is fully merged into `master` with zero commits ahead.
  In particular, `rpg/real-shell-v2` (tip `0287b99`) has **zero commits
  beyond `master`** — its work landed via merge commit `75694b2` (PR #27).
- Remote-tracking refs also exist under `origin/` for most of these branches
  (all except `docs/close-ux-07-status`, `rpg/00a-baseline-hygiene`, and
  `rpg/01-engine-adapter-contract`, which are local-only). Remote branch
  deletion, if ever desired, is a separate owner decision and is out of scope
  here.
- Active branches excluded from archiving: `master` (default) and
  `cx/release-1.3.0-remediation` (current remediation branch).
- Historical release tags `v1.2.0-local-first-proof` and
  `v1.2.1-local-first-proof` are immutable records and are not branches;
  they are never touched.

## Archive procedure (to be executed only with explicit owner approval)

For each branch `<name>` in the table above:

1. **Create the archive tag at the recorded tip:**

   ```bash
   git tag archive/<name> <sha>
   ```

   Example:

   ```bash
   git tag archive/rpg/real-shell-v2 0287b9923670de4db99515c413c33f79da13f17d
   ```

2. **Verify the tag before any deletion.** Confirm the tag points at the
   recorded tip and that the tip commit is reachable:

   ```bash
   git log archive/<name> -1
   ```

   The reported commit SHA must equal the `<sha>` recorded in the table
   above. If it does not, stop — do not delete the branch.

3. **Delete the branch only after owner approval** of that specific branch:

   ```bash
   git branch -d <name>
   ```

   `git branch -d` (not `-D`) is deliberate: it refuses to delete a branch
   that is not fully merged, which matches the inventory finding that every
   listed branch is an ancestor of `master`.

## Rules

- **Archive tags are never moved.** Once `archive/<name>` is created it is an
  immutable historical record, same policy as the `v1.2.x-local-first-proof`
  release tags. If a mistake is made, create a corrected tag under a new name
  and document the error; never re-point an existing tag.
- Deletion is framed as a separate owner act. The agent that produced this
  document executed **no** tag creation and **no** branch deletion.
- If the owner later wants the remote refs archived too, that requires
  explicit per-remote approval and is not covered by this procedure.
