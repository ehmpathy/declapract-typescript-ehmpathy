/**
 * .what = the base `.npmrc` lines every node repo carries, order-inert
 * .why  = one source for both `check` and `fix`, so the gate and the repair can
 *         never disagree about what the file should hold. inlined here rather than
 *         read from a sibling template so there is a single source (mirrors
 *         `defineExpectedGitignoreContents`, whose declaration carries no template
 *         file either).
 */
export const npmrcBaseLines: readonly string[] = [
  'engine-strict=true',
  'save-exact=true',
  'message=%s 🎉',
];

/**
 * .what = the hoisted-linker lines an expo repo layers atop the base `.npmrc`
 * .why  = `node-linker=hoisted` flattens node_modules — create-expo-app's OWN
 *         default for pnpm, and the documented fallback when isolated installs
 *         break metro/react-native native-module lookup. SDK 54+ supports pnpm's
 *         isolated default for most packages, so the forced-vs-opt-in POLICY is a
 *         wisher-deferred fulcrum (see `howto.pnpm-expo-hoisted-linker.md`); the
 *         findsert delivers create-expo-app's default shape append-only until the
 *         wisher rules. these are findserted PER-LINE (append each absent line),
 *         like `npmrcBaseLines` and `defineExpectedGitignoreContents` — so a line
 *         ADDED here later (e.g. a new `public-hoist-pattern[]`) still reaches an
 *         already-hoisted consumer on the next `declapract fix`, rather than a skip
 *         because a block-level sentinel was already present. no line's ORDER
 *         carries load (unlike `.gitignore`'s negations), so a per-line union is
 *         safe and removes the asymmetry with the base-line findsert below.
 */
export const npmrcExpoHoistLines: readonly string[] = [
  '# hoisted linker flattens node_modules — create-expo-app default for pnpm,',
  '# the documented fallback when isolated installs break metro native lookup',
  'node-linker=hoisted',
  'public-hoist-pattern[]=*expo*',
  'public-hoist-pattern[]=*react-native*',
  'public-hoist-pattern[]=@react-native/*',
  'public-hoist-pattern[]=metro*',
  'public-hoist-pattern[]=*metro-*',
];

/**
 * .what = emits the `.npmrc` the node practice declares, given the repo's extant one
 * .why  = a FINDSERT by construction — the file's own lines are preserved and only
 *         MISSING declared lines are appended, so no line is ever dropped. this is
 *         what forecloses the narrow-scope strip: under `declapract fix --practice
 *         node` the expo signal goes dark (`projectPractices === ['node']`), so the
 *         declared set is just the base lines — but because the fix only APPENDS
 *         what is absent (never overwrites), a correctly-hoisted `.npmrc` is left
 *         intact rather than reverted to base. the whole hazard class is gone, not
 *         merely characterized.
 * .why  = mirrors `defineExpectedGitignoreContents` (union-not-clobber). a repo's
 *         own custom `.npmrc` lines survive for the same reason a repo's custom
 *         `.gitignore` ignores do.
 * .note = a fixed point: `fix(fix(x)) === fix(x)`, and `check` passes on its own
 *         output — without both, `declapract fix` would rewrite this file forever.
 */
export const defineExpectedNpmrcContents = (input: {
  contents: string | null;
  projectPractices: string[];
}): string => {
  const isExpo = input.projectPractices.includes('cicd-app-react-native-expo');

  // the repo's extant lines, trailing blank(s) dropped (one trailing newline re-added below)
  const extant = (input.contents ?? '').replace(/\n+$/, '');
  const lines = extant === '' ? [] : extant.split('\n');

  // findsert each base line (append if absent — never remove, never reorder)
  const withBase = npmrcBaseLines.reduce<string[]>(
    (acc, line) => (acc.includes(line) ? acc : [...acc, line]),
    lines,
  );

  // a consumer who explicitly set a NON-hoisted linker (e.g. `node-linker=isolated`,
  // pnpm's SDK-54 default) has OPTED OUT — respect it. do NOT append `node-linker=hoisted`
  // (which would leave two rival `node-linker=` directives), and skip the whole hoist block:
  // the hoist is create-expo-app's default, OFFERED not imposed over an explicit choice.
  const hasOptedOutLinker = withBase.some(
    (line) => line.startsWith('node-linker=') && line !== 'node-linker=hoisted',
  );
  const wantsHoist = isExpo && !hasOptedOutLinker;

  // findsert each expo hoist line PER-LINE when wanted (append if absent). a blank
  // separator precedes the block ONLY on a fresh insert — i.e. when NONE of the
  // hoist lines are present yet — so an already-hoisted file gains a newly-added
  // hoist line at the tail without a second separator, and a bare file gets the
  // block set off from the base lines exactly once.
  const anyHoistPresent = npmrcExpoHoistLines.some((line) =>
    withBase.includes(line),
  );
  const withSeparator =
    wantsHoist && !anyHoistPresent && withBase.length > 0
      ? [...withBase, '']
      : withBase;
  const withHoist = wantsHoist
    ? npmrcExpoHoistLines.reduce<string[]>(
        (acc, line) => (acc.includes(line) ? acc : [...acc, line]),
        withSeparator,
      )
    : withSeparator;

  return `${withHoist.join('\n')}\n`;
};
