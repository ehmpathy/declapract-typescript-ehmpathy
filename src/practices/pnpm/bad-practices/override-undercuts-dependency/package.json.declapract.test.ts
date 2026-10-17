import type { FileCheckContext } from 'declapract';
import { given, then, when } from 'test-fns';

import { check, fix } from './package.json.declapract';

// .note = a documented cast (rule.forbid.as-cast): these declarations read no context field, so an
//         empty record stands in. removal path: a declapract partial-context builder.
const context = {} as FileCheckContext;

describe('pnpm override-undercuts-dependency bad-practice', () => {
  given('[case1] dependencies.zod 4.0.0 under a pnpm.overrides.zod of 3.23.8 (#624)', () => {
    const before = JSON.stringify(
      {
        dependencies: { zod: '4.0.0', other: '1.0.0' },
        pnpm: { overrides: { zod: '3.23.8', 'react-refresh': '~0.14.0' } },
      },
      null,
      2,
    );

    when('[t0] the check reads it', () => {
      then('it detects the undercut override', () => {
        expect(() => check(before, context)).not.toThrow();
      });
    });

    when('[t1] the fix runs', () => {
      then('the override rises to 4.0.0 and the other override is kept', async () => {
        const { contents: once } = await fix(before, context);
        const pkg = JSON.parse(once!);
        expect(pkg.pnpm.overrides.zod).toEqual('4.0.0');
        expect(pkg.pnpm.overrides['react-refresh']).toEqual('~0.14.0');
        expect(pkg.dependencies).toEqual({ zod: '4.0.0', other: '1.0.0' });
        expect(once).toMatchSnapshot('package.json — after');
      });

      then('the check skips the fixed output, and a rerun is a no-op', async () => {
        const { contents: once } = await fix(before, context);
        expect(() => check(once!, context)).toThrow(/does not match bad practice/);
        const { contents: twice } = await fix(once!, context);
        expect(twice).toEqual(once);
      });
    });
  });

  given('[case2] an override at or above its declared dependency', () => {
    then('the check skips it', () => {
      const contents = JSON.stringify({
        devDependencies: { zod: '^4.0.0' },
        pnpm: { overrides: { zod: '4.4.3' } },
      });
      expect(() => check(contents, context)).toThrow(/does not match bad practice/);
    });
  });

  given('[case3] overrides that cannot be judged', () => {
    then('a selector key, a reference value, and an undeclared package are all skipped', () => {
      const contents = JSON.stringify({
        dependencies: { zod: '4.0.0', foo: '2.0.0' },
        pnpm: {
          overrides: { 'zod@<4>bar': '3.0.0', foo: '$foo', baz: '0.0.1' },
        },
      });
      expect(() => check(contents, context)).toThrow(/does not match bad practice/);
    });
  });
});
