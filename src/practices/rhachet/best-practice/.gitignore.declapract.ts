import type { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

import { defineExpectedGitignoreContents } from '../../../utils/defineExpectedGitignoreContents';

/**
 * ignores that this practice itself owns
 *
 * .why = rhachet boots roles which write scratch state into `.agent/.cache/`. the
 *        practice that creates the dir declares the ignore for it, so a repo that
 *        takes `rhachet` is never left with cruft it did not ask for:
 *        - a worktree teardown is not snagged by untracked scratch
 *        - a hurried `git add .` cannot sweep a debug file that holds a secret
 *
 * .note = `.cache/` is generic tool scratch and belongs to the `git` practice, not
 *         here. a practice declares the ignore for the dirs IT creates, and no more.
 *
 * .note = this list is NOT sorted here, and that is deliberate. `defineExpectedGitignoreContents`
 *         sorts the union of these lines with the repo's own, so a `.sort()` at this site would
 *         be a second sort that changes no output -- while it mutates a module-cached array in
 *         place. `readonly` forbids that mutation outright rather than merely discourages it
 *         (`rule.prefer.prevent-over-correct`).
 */
const ignoresSortable: readonly string[] = ['.agent/.cache/'];

/**
 * .what = emits the `.gitignore` this practice declares, given the repo's extant one
 * .why  = the algorithm AND the ordered tail are imported, not declared here, because
 *         `src/practices/git/best-practice/.gitignore.declapract.ts` declares this same
 *         repo-root file. two declarers converge only while both emit an identical tail
 *         by an identical algorithm -- so they share one, and the drift that would break
 *         convergence cannot be written.
 * .note = this file declares only `ignoresSortable`, which is the part the two
 *         practices legitimately DIFFER on: rhachet owns `.agent/.cache/`, git owns
 *         the generic scratch. the shared part is shared; the owned part is owned.
 */
const defineExpectedContents = (contents: string | null): string =>
  defineExpectedGitignoreContents({ contents, ignoresSortable });

/**
 * .what = throws when the repo's `.gitignore` does not carry what this practice declares
 * .why  = `check` is the GATE: declapract runs `fix` for a file only when `check`
 *         rejects it. so this is what makes an upgrade actually deliver
 *         `.agent/.cache/` to a repo that lacks it.
 * .note = best-practice semantics are inverted from what a reader expects -- a THROW
 *         means the practice is violated, a return means it is followed. see
 *         `.agent/repo=.this/role=any/briefs/declapract-check-semantics.md`.
 */
export const check: FileCheckFunction = (contents) => {
  expect(contents).toEqual(defineExpectedContents(contents));
};

/**
 * .what = unions this practice's declared ignores into the repo's `.gitignore`
 * .why  = a findsert by construction -- a line already present stays present once,
 *         and a repo's own custom ignores survive, because the file's extant lines
 *         are unioned in before the sort.
 * .note = a fixed point: `fix(fix(x)) === fix(x)`, and `check` passes on its own
 *         output -- without both, `declapract fix` would rewrite this file forever.
 *         clamped by `.gitignore.declapract.test.ts` -> `idempotency`.
 */
export const fix: FileFixFunction = (contents) => {
  return { contents: defineExpectedContents(contents) };
};
