import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { defineExpectedNpmrcContents } from '../../../utils/defineExpectedNpmrcContents';

/**
 * .what = the `.npmrc` the node practice declares, usecase-aware for the expo runtime
 * .why  = a flat node_modules (hoisted linker) is create-expo-app's own default for pnpm
 *         and the documented fallback when isolated installs break metro/react-native
 *         native-module lookup (SDK 54+ supports isolated, but hoisted is the trodden
 *         default). so an expo repo layers the hoisted-linker block atop the base `.npmrc`
 *         every node repo gets, rather than fork a separate practice
 *         (rule.avoid.runtime-forks). the forced-vs-opt-in call is flagged for the wisher
 *         in `.agent/repo=.this/role=any/briefs/howto.pnpm-expo-hoisted-linker.md`.
 * .why  = a FINDSERT (check/fix union), NOT an EQUALS overwrite. the fix only APPENDS
 *         absent declared lines and never removes a line, so a repo's own `.npmrc`
 *         settings — and, crucially, a correctly-hoisted expo `.npmrc` under a narrow
 *         `declapract fix --practice node` (where the expo signal goes dark) — are
 *         preserved rather than clobbered. the algorithm lives in
 *         `defineExpectedNpmrcContents`, shared by `check` and `fix` so the gate and the
 *         repair can never disagree (mirrors the repo-root `.gitignore`).
 * .note = best-practice check semantics are inverted — a THROW means the practice is
 *         violated, a return means it is followed. see
 *         `.agent/repo=.this/role=any/briefs/declapract-check-semantics.md`.
 */
const defineExpectedContents = (
  contents: string | null,
  projectPractices: string[],
): string => defineExpectedNpmrcContents({ contents, projectPractices });

/**
 * .what = throws when the repo's `.npmrc` does not carry what this practice declares
 * .why  = `check` is the GATE: declapract runs `fix` for a file only when `check`
 *         rejects it. the expected value UNIONS the repo's extant lines in, so a repo
 *         that already carries the declared lines (plus any of its own) passes — the
 *         check mandates PRESENCE of the declared lines, never EQUALITY, so it can never
 *         demand a custom line be removed.
 */
export const check: FileCheckFunction = (contents, context) => {
  // a plain comparison + clear throw, NOT an `expect` assertion: declapract runs
  // `check` outside any test runner, so a test-diff-shaped throw is a friction hazard
  // (rule.forbid.friction-hazards) — the caller only needs a clean, stable signal.
  const expected = defineExpectedContents(contents, context.projectPractices);
  if (contents !== expected)
    throw new Error('.npmrc does not carry the declared node/expo lines');
};

/**
 * .what = unions this practice's declared `.npmrc` lines into the repo's extant one
 * .why  = a findsert by construction — a line already present stays present once, a
 *         repo's own settings survive, and (the fix this closes) a hoisted expo
 *         `.npmrc` is never stripped by a narrow-scope apply.
 * .note = a fixed point: `fix(fix(x)) === fix(x)`, and `check` passes on its own output.
 *         clamped by `.npmrc.declapract.test.ts` -> `idempotency` and by the pipeline
 *         test's narrow-scope `[case2]`.
 */
export const fix: FileFixFunction = (contents, context) => {
  return {
    contents: defineExpectedContents(contents, context.projectPractices),
  };
};
