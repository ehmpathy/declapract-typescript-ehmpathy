import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { ConstraintError } from 'helpful-errors';

import { defineExpectedNpmrcContents } from '../../../utils/defineExpectedNpmrcContents';
import { getFileTextOrNull } from '../../../utils/getFileTextOrNull';
import { getOneContentionSetFromLockfile } from '../../../utils/getOneContentionSetFromLockfile';

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
    throw new ConstraintError(
      '.npmrc does not carry the declared node/expo lines; run `declapract apply` to findsert them',
      { relativeFilePath: context.relativeFilePath },
    );
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
  // emit the declared contents
  const contentsFixed = defineExpectedContents(
    contents,
    context.projectPractices,
  );

  // if this fix flips the linker to hoisted, name the version contention it makes decisive
  if (isHoistFlip({ before: contents, after: contentsFixed }))
    emitHoistFlipNoticeOnce({ root: context.getProjectRootDirectory() });

  return { contents: contentsFixed };
};

/**
 * .what = whether a fix adds `node-linker=hoisted` to a file that lacked it
 */
const isHoistFlip = (input: { before: string | null; after: string }) =>
  !(input.before ?? '').split('\n').includes('node-linker=hoisted') &&
  input.after.split('\n').includes('node-linker=hoisted');

/**
 * .what = the roots whose hoist flip notice was already printed in this process
 * .why  = declapract may evaluate a fix more than once per apply; the notice prints once
 * .note = deliberate module-scope state: a print-once guard, never read for a decision
 */
const rootsNoticed = new Set<string>();

/**
 * .what = prints the version contention set + the pnpm.overrides remedy to stderr, once per root
 * .why  = the hoist flip makes one copy of each package win the root slot (#610). the runtime
 *         symptoms (a crashed commit-msg hook, a blank page) name no package, so the set is
 *         printed at the one moment the practice can enumerate it. no version pin is shipped:
 *         the consumer chooses the pins
 * .note = writes to stderr only, so the fix's output contents stay pure
 */
const emitHoistFlipNoticeOnce = (input: { root: string }): void => {
  // print once per root
  if (rootsNoticed.has(input.root)) return;
  rootsNoticed.add(input.root); // .note = deliberate mutation: the print-once guard records this root

  // read the lockfile, if one is present
  const lockfile = getFileTextOrNull({
    root: input.root,
    relativePath: 'pnpm-lock.yaml',
  });
  const contention = lockfile
    ? getOneContentionSetFromLockfile({ lockfile })
    : null;

  process.stderr.write(asHoistFlipNotice({ contention }));
};

/**
 * .what = the treestruct notice for a hoist flip
 */
const asHoistFlipNotice = (input: {
  contention: { name: string; versions: string[] }[] | null;
}): string => {
  const header =
    '🟡 node-linker=hoisted added — one copy of each package now wins the root slot\n';
  const remedy = [
    '   └─ remedy',
    '      ├─ any package above may now load a different copy at runtime',
    '      ├─ pin the copy you want via `pnpm.overrides` in package.json, then `pnpm install`',
    '      └─ see howto.pnpm-expo-hoisted-linker.md (declapract-typescript-ehmpathy)',
  ].join('\n');

  // no lockfile: say how to see the set
  if (input.contention === null)
    return `${header}   ├─ no pnpm-lock.yaml found; after \`pnpm install\`, run \`pnpm why <pkg>\` to see the versions\n${remedy}\n\n`;

  // no contention: say so
  if (input.contention.length === 0)
    return `${header}   ├─ no package has more than one version in your graph\n${remedy}\n\n`;

  // list the contention set
  const contention = input.contention;
  const width = Math.max(...contention.map((pkg) => pkg.name.length));
  const rows = contention.map(
    (pkg, index) =>
      `   │  ${index === contention.length - 1 ? '└─' : '├─'} ${pkg.name.padEnd(width)}  ${pkg.versions.join(', ')}`,
  );
  return `${header}   ├─ packages with more than one version in your graph\n${rows.join('\n')}\n   │\n${remedy}\n\n`;
};
