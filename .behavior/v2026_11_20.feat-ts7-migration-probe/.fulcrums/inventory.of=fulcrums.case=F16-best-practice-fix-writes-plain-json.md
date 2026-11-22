# F16 · the tsconfig best-practice fix writes plain json; no comment-safe splice rewrite in this pr

- fork: the template gains `paths` values and `types`, so the contains-check fails on every prior-template tsconfig and the best-practice fix runs once per adopter. it writes `JSON.stringify` output, so the adopter's tsconfig comments go and `include` / `exclude` reflow one entry per line. options:
  - (a) rewrite the best-practice fix as a text splice over `asJsoncView` + `asTextSpliced`: add each absent key, union each array in place, keep every comment
  - (b) keep the merge-then-stringify fix, which unions every array but `extends`; state the comment loss in the pr body and the catalog
- taken: (b).
  - the loss is not new in kind: before this pr, the default contains-fix wrote the same plain json whenever any declared key drifted; this pr makes that happen once for every adopter, then never again (a second apply is a no-op)
  - the loss is visible: it lands in the adopter's own upgrade pr diff, where a maintainer can restore a comment by hand
  - (a) is a general jsonc writer (insert keys at any depth, union arrays in place, keep layout), with its own failure modes on every adopter tsconfig shape; that is its own reviewed change, not a rider on a compiler upgrade
- rework: clean. the fix is one file with a unit suite; a splice-based fix can replace it later behind the same check, with the same integration cases as its proof.
- confidence 75%: residual is that an adopter values a tsconfig comment enough that one lost comment costs more than the round a splice writer would take.
- where: `src/practices/typescript-node/best-practice/tsconfig.json.declapract.ts`; the pr body break list; `1.vision.experience.case=_.md`.
- verdict: —
