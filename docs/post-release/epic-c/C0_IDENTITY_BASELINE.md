# Epic C / C0 — identity and baseline record

Status: **VERIFIED**. C0 contains no production-code change.

Evidence labels used in every Epic C record: **[F]** confirmed source or
repository fact, **[I]** inference, **[D]** architectural decision proposed by
C0 for owner review, **[O]** unresolved owner decision, **[X]** deferred
concern.

## Baseline identity

| Property                     | Value                                               | Evidence                                                                                                                                                                                   |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Current branch               | `master`                                            | [F] `.git/HEAD` = `ref: refs/heads/master`                                                                                                                                                 |
| HEAD                         | `fd5e2d592bb6f5d1724509119147c48ba3a5df59`          | [F] loose ref `refs/heads/master`; commit object SHA-1 recomputed from the loose object bytes                                                                                              |
| Tree                         | `bc86fd392a5284d9db8821c31a27b8c95ec82a9a`          | [F] read from the commit object; independently reproduced three ways (below)                                                                                                               |
| Commit subject               | `docs(epic-b): close B4 local candidate validation` | [F] commit object, 2026-09-25T22:31:42+02:00                                                                                                                                               |
| Worktree                     | clean                                               | [F] all 464 index entries re-hashed from the working files; 0 mismatches, 0 missing, 0 unmerged; no untracked non-ignored file                                                             |
| `origin/master` (local)      | `d4b945ba0b024ceb4fbd29d70bcecc8496b3c6c3`          | [F] loose `refs/remotes/origin/master`; `FETCH_HEAD` of 2026-09-25T23:23:44+02:00 records the same SHA for `master`                                                                        |
| `cx/epic-b-shared-contracts` | `fd5e2d592bb6f5d1724509119147c48ba3a5df59`          | [F] loose ref                                                                                                                                                                              |
| Remote publication           | not performed as of the last fetch                  | [F] local tracking ref and `FETCH_HEAD`; [I] the live remote was not queryable (private repository, no credentials in the C0 environment), so "not published" is bounded by the last fetch |

## Ancestry

[F] Each commit object below was decompressed, its SHA-1 recomputed, and its
tree/parent read directly:

```
fd5e2d5 (tree bc86fd3) docs(epic-b): close B4 local candidate validation
240a1fd (tree c5ef5be) fix(epic-b): preserve RPG DB import boundary for B3 result
c344f0e (tree 92633d3) refactor(epic-b): source B3 save result from DB contract
da097f8 (tree 30b6bdd) refactor(epic-b): move B2 long-form map contracts
6adc660 (tree b658a32) refactor(epic-b): move B1 formatting and status contracts
ecf4a25 (tree e5ace26) docs(epic-b): freeze B0 shared-contract ownership
d4b945b = origin/master
```

`master` is therefore `origin/master` plus six linear Epic B commits, and the
reflog records `merge fd5e2d5…: Fast-forward` at 23:24:10+02:00. The local
integration was a fast-forward; nothing on `master` is unique beyond Epic B.

## Tree reproduction (mechanism validated directly)

1. [F] The index `TREE` was recomputed from the parsed index entries (index
   version 2, checksum valid, 464 entries): `bc86fd3…`.
2. [F] Every working file was hashed as a Git blob after the repository's own
   `.gitattributes` normalization (`* text=auto eol=lf`). All 464 matched the
   index. `LICENSE` is CRLF on disk and normalizes to its LF blob; Git's stat
   cache also matches, so Git reports it clean.
3. [F] A fresh repository built from those files produced `git write-tree` =
   `bc86fd3…`; the original commit object was then installed and `git log`,
   `git status` (empty) and `git cat-file -p HEAD` confirmed the identity.

Untracked-file check: [F] per-directory listings of `src` (178), `docs` (137),
`tests` (76), `.github` (23), `e2e` (17), `scripts` (7) and `public` (2)
equal the index counts. `.kilo/` holds only `.gitignore` (self-ignored) and
excluded worktrees. `node_modules`, `dist`, `artifacts`, `design-artifacts`
and `test-results` are ignored.

## Method limits

- [F] This C0 session had file access to the repository but no shell on the
  owner's machine. Git state was therefore verified from the object store,
  refs, index and working files directly rather than by `git status`. This is
  stronger for identity (hashes are recomputed) and equivalent for
  cleanliness, but it cannot see a remote that was not fetched.
- [F] The supplied handoff archive contains `integration-evidence/` and the 13
  Epic B documents. All 13 are byte-identical to `docs/post-release/epic-b/`
  at HEAD. The integration identity file agrees with every value above.
- [F] `EPIC_B_COMMIT_SEQUENCE.txt` in the archive contains the literal
  characters `` `t `` where tabs were intended, and both evidence files carry a
  UTF-8 BOM. The SHAs are still correct. This is a formatting defect in the
  handoff wrapper, not a repository defect; C0 did not rely on that file.
- [F] The "New-Chat Bootstrap v7.0" and its Lessons Learned register were not
  among the supplied files. C0 applied the controls stated in the C0 task
  itself and treated the repository as the authority. Any divergence between
  this C0 and the Bootstrap's Epic C readiness specification is for owner
  review (see `C0_DECISIONS_AND_DEFERRALS.md`, R-1).
- [F] Repository hygiene observation, no action taken: `.git/objects` holds two
  very large loose objects (≈528 MB and ≈322 MB) and an abandoned
  `.tmp-*-pack` from an interrupted repack. Neither is reachable from HEAD's
  tree; they do not affect C0 identity.

## Environment used for mechanism probes

[F] Node `v24.21.0` and npm `11.10.1` (the pinned toolchain) were installed in
the C0 cloud workspace from the npm registry, and `npm ci` installed the locked
dependency set. Baseline guard suites passed there: `tests/architecture`,
`tests/domain`, `tests/seed` — 12 files, 36 tests, 0 failures. This is probe
evidence for C0 analysis, not a release certification.
