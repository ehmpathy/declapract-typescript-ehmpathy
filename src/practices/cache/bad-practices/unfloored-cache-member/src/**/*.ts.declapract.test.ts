import { given, then, when } from 'test-fns';

import { check, fix } from './*.ts.declapract';

const BEFORE = `import { withSimpleCaching } from 'with-simple-caching';

export const getWaveReport = withSimpleCaching(_getWaveReport, { cache });
`;

describe('cache unfloored-cache-member src files (#625)', () => {
  given('[case1] a src file that imports the retired member', () => {
    then('the check flags it', () => {
      expect(() => check(BEFORE, {} as any)).not.toThrow();
    });

    when('[t0] the fix runs', () => {
      then('a review line above the import names with-simple-cache', async () => {
        const { contents: after } = await fix(BEFORE, {} as any);
        const lines = after!.split('\n');
        expect(lines[0]).toContain('// @declapract:review:');
        expect(lines[0]).toContain('with-simple-cache (>=0.17.3)');
        expect(after!.replace(/^.*@declapract:review.*\n/m, '')).toEqual(BEFORE);
      });

      then('a second fix pass is a no-op', async () => {
        const { contents: once } = await fix(BEFORE, {} as any);
        const { contents: twice } = await fix(once!, {} as any);
        expect(twice).toEqual(once);
      });
    });
  });

  given('[case2] a src file on with-simple-cache', () => {
    then('the check skips it', () => {
      expect(() =>
        check(`import { withSimpleCache } from 'with-simple-cache';`, {} as any),
      ).toThrow('does not match bad practice');
    });
  });
});
