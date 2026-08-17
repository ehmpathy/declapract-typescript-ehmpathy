# domain.term.choice.reason: defer

## .etymology

`defer` is the verb the code already reached for — the guard throws `deferred to peer dir-move this
pass`, and the shared predicate is `isDeferredToDeprecatedDirMove`. this round only made it
canonical. it comes from the ordinary sense "put off to a later time", which is exactly the
mechanism: the rewrite happens, just on the NEXT `declapract fix` pass rather than this one.

it earns a cluster on the FORMAL trigger, not the narrow `declarer`-style exception: this round
declared a real repo-born `src/` domain.operation — `isDeferredToDeprecatedDirMove` — whose
identifier a `grep src/**` finds. `rule.require.domain-term-itemization` asks for the constituent
terms of a declared dop, and `defer` is the one domain-specific word in that name (`is` is the
imported transformer prefix; `deprecated`/`dir`/`move` are generic english).

## .why the concept exists — the ENOENT collision it forecloses

a `declapract fix` runs many bad-practices in one apply. two of them touch a file under a deprecated
src dir (`logic/`, `data/`, `domain/`, `model/`, `services/`, `__nonpublished_modules__/`):

- a **dir-move** bad-practice (`old-*-dir`) RELOCATES the file — it returns a new `relativeFilePath`,
  so declapract unlinks the source and writes the destination.
- an **in-place rewriter** (`old-import-paths` rewrites old import paths; `relative-imports` rewrites
  `../` → `@src/`) rewrites the SAME file at its OLD path.

apply both to one file in one pass and the move unlinks the source, then the in-place rewrite throws
`ENOENT` against the path that no longer exists. so the in-place rewriters must **defer** any file
still under a deprecated dir: hold the rewrite to the next pass, when the file sits at its new
(non-deprecated) path and only the rewriter touches it. two passes settle it — pass 1 relocates,
pass 2 rewrites.

## .disputes

### dispute: skip — raised 2026-08-08 — status: RESOLVED (keep `defer`)
- raised.by  = mechanic 🐢
- claim      = declapract already says "skip" for a `check` that throws (the file is not detected),
               and the deferred file's `check` DOES throw — so `skip` is the extant word.
- counter    = they are different concepts, and the difference carries load. a `skip` is PERMANENT —
               the file does not match the bad practice and is never touched. a `defer` is
               TEMPORARY — the file DOES match, and WILL be rewritten, just on a later pass. to name
               both `skip` would read a hold-to-next-pass as a permanent no-match, and a maintainer
               who trusted that would think the import rewrite never happens. the throw is the same
               mechanism (both make declapract move on this pass); the INTENT is opposite.
- resolution = keep `defer` for the temporary hold; leave `skip` for the permanent no-match. recorded
               `skip` as a forbidden **synonym** of `defer` (it stays valid in its own permanent sense).

### dispute: postpone / delay / hold / punt — raised 2026-08-08 — status: RESOLVED
- counter    = `postpone`/`delay` read as "to an unspecified later time", but a defer is precise: to
               the NEXT pass, deterministically. `hold` is overloaded (a held lock, a held resource).
               `punt` implies abandonment, which is the opposite — a deferred rewrite is guaranteed
               to fire, not dropped.
- resolution = keep `defer`; all four recorded as forbidden synonyms.

## .evidence

**the collision is real, not hypothetical** — it is why the guard exists in `old-import-paths` from
a prior round. this round found the guard lived in only ONE of the two in-place rewriters:
`old-import-paths` had an inline `DEPRECATED_SRC_DIR_PATTERNS` check, but its peer `relative-imports`
had none — so a file under a deprecated dir with a `../` import would be BOTH relocated and rewritten
in one pass. the fix extracted the pattern set + predicate into
`src/utils/isDeferredToDeprecatedDirMove.ts` (one source, the same pattern `convergence` rests on —
`defineExpectedGitignoreContents` / `defineExpectedNpmrcContents`) and had BOTH declarers import it,
so the guard cannot drift between them.

**clamped, with teeth:** each rewriter's `.declapract.test.ts` has a `deprecated-dir deferral
(two-pass migration)` block — it asserts the rewrite defers for each of the six deprecated dirs, the
`fix` is a no-op there, and it does NOT defer once the file sits at a non-deprecated path (the
rewrite fires). the migration acceptance test proves the two-pass settle end-to-end: pass 1
relocates `src/logic/` → `src/domain.operations/`, pass 2 rewrites the moved file's import at its new
path.

## .see also

- `term=convergence._.choice._.md` — the shared-source pattern this guard reuses (one util, no drift)
- `rule.require.idempotent-fixes` — the two-pass settle must still reach a fixed point
- `src/utils/isDeferredToDeprecatedDirMove.ts` — the one predicate both declarers import
