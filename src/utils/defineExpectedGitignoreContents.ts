import { dedupe } from 'domain-objects';

/**
 * .what = the ignores whose POSITION carries load, in the sequence git requires
 * .why  = a `.gitignore` negation re-includes a path only when it appears AFTER the
 *         pattern it negates. hoist a `!` line above its target and git silently drops
 *         the negation -- the file still reads as correct while every test-fixture
 *         `node_modules` it protects is re-ignored.
 * .why  = it lives HERE, shared, rather than in each declaration, because every
 *         practice that declares the repo-root `.gitignore` must emit an IDENTICAL
 *         tail or the two converge no longer, and `declapract fix` rewrites the file on
 *         every run. one constant makes that drift unrepresentable.
 * .note = `.test*` dirs hold cloned repos (test fixtures via `genTempDir`), whose
 *         `node_modules` must stay tracked.
 * .note = `readonly` carries load here, it is not decoration. this array is
 *         module-cached and shared by every declarer, so ONE in-place mutation anywhere
 *         (`.push`, an in-place `.sort`, `.reverse`) would break convergence for ALL of
 *         them at once -- at runtime, with no compiler signal. `readonly` makes that
 *         unrepresentable rather than merely discouraged
 *         (`rule.prefer.prevent-over-correct`).
 * .note = typed `readonly string[]` rather than `as const`: `as const` narrows the
 *         elements to literal types, which would make `orderedPatterns.has(line)` below
 *         reject a plain `string`. this form keeps the element type while it forbids the
 *         mutation.
 */
export const ignoresOrderedForGitignore: readonly string[] = [
  'node_modules',
  '!.test*/**/node_modules',
  '!.test*/**/node_modules/**',
];

/**
 * .what = emits the `.gitignore` a practice declares, given the repo's extant one
 * .why  = a findsert by construction -- the file's own lines are unioned in before the
 *         sort, so a repo's custom ignores survive and a line already present stays
 *         present once. and it is a fixed point: `fix(fix(x)) === fix(x)`.
 * .why  = SHARED across every practice that declares this file. convergence between
 *         two declarers rests on the whole ALGORITHM, not merely the tail -- union,
 *         then sort, then append. two copies could drift step-for-step; one cannot.
 * .note = `sortable` vs `ordered` is the domain's split for a declared line: inert
 *         position vs load-carrying position. see
 *         `.agent/repo=.this/role=any/briefs/domain.terms/term=ordered._.choice._.md`.
 *
 * ⚠️ .note = **THIS FUNCTION IS THE CONTRACT, NOT A CONVENIENCE.** every practice that declares
 *         the repo-root `.gitignore` converges only because all of them route through here. a
 *         declaration that hand-rolls its own union/sort/tail instead of this import is OUTSIDE
 *         that guarantee -- it may satisfy its own check and still oscillate against the rest,
 *         forever, on every `declapract fix`.
 *
 *         that failure mode is measured, not hypothetical. every declaration of this file once
 *         carried its own copy of the algorithm, and one of them fell behind: it sorted every
 *         line and emitted no ordered tail, which hoists the `!` negations above their target and
 *         turns them inert. re-derive any declaration by hand today and the clamps reproduce it
 *         exactly -- that declaration's own idempotency assertions stay green while every
 *         cross-declarer assertion goes red.
 *
 *         no build step stops the next author from a repeat. so: **if you declare the repo-root
 *         `.gitignore` from a new practice, import this -- do not re-derive it.** a lint rule or a
 *         single-owner registry would be the durable guard; today the cross-declarer clamps are.
 */
export const defineExpectedGitignoreContents = (input: {
  contents: string | null;
  ignoresSortable: readonly string[];
}): string => {
  // parse ignores from the repo's extant file
  const ignoresFromFile = input.contents ? input.contents.split('\n') : [];

  // separate the file's own lines into sortable vs ordered
  const orderedPatterns = new Set(ignoresOrderedForGitignore);
  const ignoresFromFileSortable = ignoresFromFile.filter(
    (line) => !!line && !orderedPatterns.has(line),
  );

  // union the file's sortable lines with this practice's, then sort
  const sortedIgnores = dedupe([
    ...ignoresFromFileSortable,
    ...input.ignoresSortable,
  ])
    .sort()
    .filter((line) => !!line);

  // append the ordered tail last, sequence preserved
  return [...sortedIgnores, ...ignoresOrderedForGitignore, ''].join('\n');
};
