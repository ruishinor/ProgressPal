# Epic C / C0 — proposed Lessons Learned additions

Status: **PROPOSED for the owner's Lessons Learned register**. The register
itself is not in the repository, so these entries are recorded here for the
owner to merge. Each lesson is proven by a C0 probe, not inferred.

## LL-C0-1 — A guard protects only what it scans

A guard's scope (file types, directories, import patterns) is part of its
contract. Moving content into a different file type or a new directory can
silently take it outside every guard, and the guard still reports green.

Proof: the local-only URL guard scans `.ts`/`.tsx` only; the same external URL
fails in `.ts` and passes in `.json` (P6). ESLint layer rules name
`@/app`, `@/components` and `@/features`; a new `src/programmes/` directory
lets `src/lib` reach features transitively with ESLint exit 0 (P7).

Control: before moving code or data across a file type or into a new
directory, run a negative probe that proves each relevant guard still fires at
the destination. Extend the guard in the same commit that creates the
destination. This generalizes the existing lesson "map both source-layer and
destination-layer guards before moving a dependency" (Epic B, B3).

## LL-C0-2 — Evidence produced by a wrapper needs its own check

The Epic B handoff archive's commit-sequence file contains literal `` `t ``
where tabs were intended (a PowerShell escape inside a single-quoted string).
The SHAs were right, but a consumer that parsed the separators would have
failed or mis-split the rows.

Control: treat wrapper-generated evidence as convenience output. Identity
claims are re-derived from the repository itself (objects, refs, index), which
is what C0 did. Consistent with the existing lesson "after repeated
support-tool failures, remove the wrapper from the trust path."
