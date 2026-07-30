import type { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

import { defineExpectedGitignoreContents } from '../../../utils/defineExpectedGitignoreContents';

/**
 * ignores that can be sorted alphabetically (no order dependencies)
 *
 * .note = `.agent/.cache/` is declared HERE and by
 *         `src/practices/rhachet/best-practice/.gitignore.declapract.ts`. that is not drift, and
 *         the line must not be "cleaned up" as a duplicate of rhachet's -- rhachet OWNS that dir
 *         in the causal sense (it creates it), which is a different claim from which practices
 *         declare the ignore for it.
 *
 *         two facts carry the load here:
 *         - `app-react-native-expo` (`src/useCases.yml`) takes `git` WITHOUT `rhachet`, so for
 *           every repo on that use case THIS line is the only explicit source of the ignore
 *         - `.cache/` below happens to cover `.agent/.cache/` at any depth (a gitignore pattern
 *           with no interior separator is unanchored -- measured with `git check-ignore -v`), so
 *           a reader sees the overlap and reads it as redundant. that coverage is IMPLICIT --
 *           narrow `.cache/` and it is gone
 *
 *         so removal here would un-ignore the agent cache for every git-without-rhachet repo, on
 *         the day `.cache/` is next edited, with no line left to say why. if this ever moves, it
 *         must land in a practice that still reaches every `git` consumer.
 *
 * .note = this list is NOT sorted here, and that is deliberate. `defineExpectedGitignoreContents`
 *         sorts the union of these lines with the repo's own, so a `.sort()` at this site would
 *         be a second sort that changes no output -- while it mutates a module-cached array in
 *         place. `readonly` forbids that mutation outright rather than merely discourages it
 *         (`rule.prefer.prevent-over-correct`), so the source may group lines by what they are
 *         for, with their comments beside them, and the one sort that matters stays in one place.
 */
const ignoresSortable: readonly string[] = [
  '*.log',
  '*.tsbuildinfo',
  '.agent/.cache/', // agent cache -- kept even though rhachet declares it too; see .note above
  '.artifact', // deployment artifacts from `simple-artifact-builder` are produced here
  '.cache/', // cache directories from various tools
  '.env',
  '.serverless',
  '.log/slowtest/',
  '.terraform',
  '.terraform.lock',
  '.yalc',
  '.temp',
  '.vscode',
  '*.local.json', // e.g., .claude/permission.attempts.local.json
  '*.bak.*', // backup files
  'coverage',
  'dist',
];

/**
 * .what = emits the `.gitignore` this practice declares, given the repo's extant one
 * .why  = one algorithm serves both `check` and `fix`, so the gate and the repair can
 *         never disagree about what the file should hold.
 * .why  = the algorithm AND the ordered tail are imported, not declared here, because this
 *         practice is not the only declarer of the repo-root `.gitignore`. declarers converge
 *         only while every one of them emits an identical tail by an identical algorithm --
 *         so they share one, and the drift that would break convergence cannot be written.
 *         which practices those are is a `grep`; a count here would go stale the first time
 *         one is added, as it already has once.
 */
const defineExpectedContents = (contents: string | null): string =>
  defineExpectedGitignoreContents({ contents, ignoresSortable });

/**
 * .what = throws when the repo's `.gitignore` does not carry what this practice declares
 * .why  = `check` is the GATE: declapract runs `fix` for a file only when `check`
 *         rejects it. so a line added to `ignoresSortable` above reaches a consumer
 *         repo only because this throws on the file that lacks it.
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
