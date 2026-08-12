import type { FileCheckContext } from 'declapract';

import { check, fix } from './.npmrc.declapract';

/**
 * .what = builds the minimal FileCheckContext the check/fix actually reads
 * .why  = declapract's FileCheckContext carries many fields the `.npmrc` check/fix
 *         never touch — they read only `projectPractices` (the expo-branch signal). the
 *         single documented cast here is the sanctioned test-context idiom
 *         (howto.add-bad-practice.md); it is confined to this helper so no call site casts.
 *         removal path: drop the cast the day declapract exports a partial-context builder.
 */
const asContext = (projectPractices: string[]): FileCheckContext =>
  ({ projectPractices }) as unknown as FileCheckContext;

/**
 * .what = a fix returns { contents }; unwrap to the string for assertions
 */
const fixed = (contents: string | null, projectPractices: string[]): string =>
  fix(contents, asContext(projectPractices)).contents as string;

/**
 * .what = check throws when the file does not carry the declared lines
 */
const checkThrows = (contents: string | null, projectPractices: string[]): boolean => {
  try {
    check(contents, asContext(projectPractices));
    return false;
  } catch {
    return true;
  }
};

describe('.npmrc', () => {
  describe('fix — findsert the base lines', () => {
    it('creates the base .npmrc for a net-new (absent) file', () => {
      const out = fixed(null, []);
      expect(out).toContain('engine-strict=true');
      expect(out).toContain('save-exact=true');
      expect(out).toContain('message=%s 🎉');
      expect(out).not.toContain('node-linker=hoisted');
    });

    it('preserves a repo custom line (never clobbers)', () => {
      const out = fixed('always-auth=true\n', []);
      // the repo's own line survives
      expect(out).toContain('always-auth=true');
      // the declared base lines are findserted in
      expect(out).toContain('engine-strict=true');
      expect(out).toContain('save-exact=true');
    });
  });

  describe('fix — findsert the expo hoist block', () => {
    it('appends the hoist block for an expo repo', () => {
      const out = fixed(null, ['cicd-app-react-native-expo']);
      expect(out).toContain('engine-strict=true');
      expect(out).toContain('node-linker=hoisted');
      expect(out).toContain('public-hoist-pattern[]=*expo*');
      expect(out).toContain('public-hoist-pattern[]=*react-native*');
      expect(out).toContain('public-hoist-pattern[]=@react-native/*');
      expect(out).toContain('public-hoist-pattern[]=metro*');
      expect(out).toContain('public-hoist-pattern[]=*metro-*');
    });

    it('does NOT add the hoist for a non-expo (node) repo', () => {
      const out = fixed(null, []);
      expect(out).not.toContain('node-linker=hoisted');
    });
  });

  describe('a narrow --practice node apply leaves a hoisted .npmrc intact', () => {
    // the regression clamp for r010 review item 1: a narrow `declapract fix --practice node`
    // on an expo repo makes projectPractices === ['node'], so the expo branch does not fire.
    // the findsert appends only absent lines, so a narrow-scope apply leaves an already-hoisted
    // file intact (an EQUALS overwrite would instead rewrite it to base). proven at the unit
    // grain here; at the pipeline grain in `.npmrc.declapract.integration.test.ts` [case2].
    const hoisted = fixed(null, ['cicd-app-react-native-expo']);

    it('a narrow-scope fix (projectPractices === [node]) leaves the hoist intact', () => {
      const afterNarrow = fixed(hoisted, ['node']);
      expect(afterNarrow).toContain('node-linker=hoisted');
      expect(afterNarrow).toContain('public-hoist-pattern[]=*expo*');
    });

    it('a narrow-scope check PASSES a hoisted .npmrc (no rewrite triggered)', () => {
      expect(checkThrows(hoisted, ['node'])).toEqual(false);
    });
  });

  describe('the hoist findsert is PER-LINE — a newly-added hoist line reaches a partially-hoisted file', () => {
    // r011 review item 3: the hoist block was once findserted as a UNIT keyed on the
    // `node-linker=hoisted` sentinel, so a hoist line ADDED to the declared set later would
    // NEVER reach a consumer already at the sentinel (the whole block was skipped). the
    // per-line union appends each ABSENT hoist line, so a partially-hoisted file is completed.
    // this clamp reproduces that exact case: a file with the sentinel present but ONE pattern
    // absent — under the old atomic mechanism it stayed absent; per-line, it is appended.
    const fullHoist = fixed(null, ['cicd-app-react-native-expo']);
    const partialHoist = fullHoist
      .split('\n')
      .filter((line) => line !== 'public-hoist-pattern[]=*metro-*')
      .join('\n');

    it('the sentinel is present but one pattern is absent (the partial state)', () => {
      expect(partialHoist).toContain('node-linker=hoisted');
      expect(partialHoist).not.toContain('public-hoist-pattern[]=*metro-*');
    });

    it('the fix APPENDS the absent pattern (atomic sentinel would have skipped it)', () => {
      const completed = fixed(partialHoist, ['cicd-app-react-native-expo']);
      expect(completed).toContain('public-hoist-pattern[]=*metro-*');
      // and adds no duplicate of the lines already present
      expect(completed.split('node-linker=hoisted').length - 1).toEqual(1);
    });
  });

  describe('idempotency — the fix is a fixed point and check agrees', () => {
    it('fix(fix(x)) === fix(x) for an expo repo', () => {
      const once = fixed(null, ['cicd-app-react-native-expo']);
      const twice = fixed(once, ['cicd-app-react-native-expo']);
      expect(twice).toEqual(once);
    });

    it('fix(fix(x)) === fix(x) for a node repo', () => {
      const once = fixed(null, []);
      const twice = fixed(once, []);
      expect(twice).toEqual(once);
    });

    it('check passes on the fix output (so declapract fix cannot loop)', () => {
      const out = fixed(null, ['cicd-app-react-native-expo']);
      expect(checkThrows(out, ['cicd-app-react-native-expo'])).toEqual(false);
    });

    it('a single hoist block exists, never a duplicate on re-run', () => {
      const once = fixed(null, ['cicd-app-react-native-expo']);
      const twice = fixed(once, ['cicd-app-react-native-expo']);
      const occurrences = twice.split('node-linker=hoisted').length - 1;
      expect(occurrences).toEqual(1);
    });
  });

  describe('the hoist is OFFERED, not imposed — an explicit isolated linker opts out', () => {
    // r008 i033 review: the verified Expo docs (SDK 54+) make isolated pnpm's default and
    // hoisted a fallback. a consumer who explicitly chose `node-linker=isolated` must NOT be
    // forced to hoisted — the append-only findsert would otherwise leave TWO rival
    // `node-linker=` directives. this clamp proves the explicit choice is respected: the whole
    // hoist block is skipped, and no rival hoisted line is added.
    const optedOut = fixed('node-linker=isolated\n', ['cicd-app-react-native-expo']);

    it('does not append node-linker=hoisted over an explicit isolated choice', () => {
      expect(optedOut).toContain('node-linker=isolated');
      expect(optedOut).not.toContain('node-linker=hoisted');
    });

    it('leaves no rival node-linker directive (exactly one present)', () => {
      const linkerLines = optedOut
        .split('\n')
        .filter((line) => line.startsWith('node-linker='));
      expect(linkerLines).toEqual(['node-linker=isolated']);
    });

    it('skips the hoist patterns too — an isolated repo is fully opted out', () => {
      expect(optedOut).not.toContain('public-hoist-pattern[]=*expo*');
    });

    it('a check PASSES an opted-out .npmrc (the fix is a no-op, so no rewrite loop)', () => {
      expect(checkThrows(optedOut, ['cicd-app-react-native-expo'])).toEqual(false);
    });
  });

  it('matches the full expo .npmrc snapshot', () => {
    const out = fixed(null, ['cicd-app-react-native-expo']);
    expect(out).toMatchSnapshot('expo .npmrc — full');
  });
});
