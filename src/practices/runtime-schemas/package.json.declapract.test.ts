import { given, then, when } from 'test-fns';

import {
  check as undercutCheck,
  fix as undercutFix,
} from '../pnpm/bad-practices/override-undercuts-dependency/package.json.declapract';
import { check, fix } from './best-practice/package.json.declapract';

const asContents = (packageJSON: Record<string, unknown>) =>
  JSON.stringify(packageJSON, null, 2);

// each `{} as any` context below is a documented cast (rule.forbid.as-cast): these declarations read
// no context field. removal path: a declapract partial-context builder.
describe('runtime-schemas best-practice package.json', () => {
  given('[case1] a repo whose override undercuts the floor the dependency meets (#624)', () => {
    const before = asContents({
      dependencies: { zod: '4.0.0' },
      pnpm: { overrides: { zod: '3.23.8' } },
    });

    when('[t0] the check reads it', () => {
      then('it flags the override, since pnpm installs the override', () => {
        expect(() => check(before, {} as any)).toThrow(/pnpm\.overrides\.zod/);
      });
    });

    when('[t1] the fix runs', () => {
      then('the override rises to the direct zod; the check passes; a rerun is a no-op', async () => {
        const { contents: once } = await fix(before, {} as any);
        const pkg = JSON.parse(once!);
        expect(pkg.pnpm.overrides.zod).toEqual('4.0.0');
        expect(pkg.dependencies.zod).toEqual('4.0.0');
        expect(() => check(once!, {} as any)).not.toThrow();
        const { contents: twice } = await fix(once!, {} as any);
        expect(twice).toEqual(once);
      });
    });
  });

  given('[case2] a lambda-service on zod 4.3.6 with sdk-aws-lambda 0.7.1 (#545)', () => {
    const before = asContents({
      dependencies: { 'sdk-aws-lambda': '0.7.1', zod: '4.3.6' },
    });

    when('[t0] the check reads it', () => {
      then('it flags the absent single-identity override', () => {
        expect(() => check(before, {} as any)).toThrow(/4\.4\.3/);
      });
    });

    when('[t1] the fix runs', () => {
      then('pnpm.overrides.zod and the direct zod are both 4.4.3; a rerun is a no-op', async () => {
        const { contents: once } = await fix(before, {} as any);
        const pkg = JSON.parse(once!);
        expect(pkg.pnpm.overrides.zod).toEqual('4.4.3');
        expect(pkg.dependencies.zod).toEqual('4.4.3');
        expect(pkg.dependencies['sdk-aws-lambda']).toEqual('0.7.1');
        expect(() => check(once!, {} as any)).not.toThrow();
        const { contents: twice } = await fix(once!, {} as any);
        expect(twice).toEqual(once);
        expect(once).toMatchSnapshot('package.json — after (#545)');
      });
    });
  });

  given('[case3] a repo on the v3 floor the practice used to declare', () => {
    const before = asContents({
      dependencies: { zod: '^3.24.0' },
      pnpm: { overrides: { 'other-pkg': '1.0.0' } },
    });

    then('the check flags it against the 4.0.0 floor', () => {
      expect(() => check(before, {} as any)).toThrow(/4\.0\.0/);
    });

    then('the fix raises zod to the pin and keeps the other overrides', async () => {
      const { contents: once } = await fix(before, {} as any);
      const pkg = JSON.parse(once!);
      expect(pkg.dependencies.zod).toEqual('4.4.3');
      expect(pkg.pnpm.overrides).toEqual({ 'other-pkg': '1.0.0' });
      expect(() => check(once!, {} as any)).not.toThrow();
    });
  });

  given('[case5] a lambda-service whose direct zod sits ABOVE the sdk pin (#545 × #624)', () => {
    const before = asContents({
      dependencies: { 'sdk-aws-lambda': '0.7.1', zod: '4.5.0' },
    });

    /**
     * .what = run this fix, then pnpm's override-undercuts fix, for the given number of rounds
     * .why  = one apply runs both declarations on one package.json; a fight never settles
     */
    const applyBothFor = async (input: {
      contents: string;
      rounds: number;
    }): Promise<string> => {
      if (input.rounds === 0) return input.contents;
      const { contents: schemasFixed } = await fix(input.contents, {} as any);
      const { contents: pnpmFixed } = await undercutFix(schemasFixed!, {} as any);
      return applyBothFor({ contents: pnpmFixed!, rounds: input.rounds - 1 });
    };

    when('[t0] this fix and pnpm override-undercuts-dependency run in turn, as one apply does', () => {
      then('the pair reaches a fixed point: neither flags the other output', async () => {
        const settled = await applyBothFor({ contents: before, rounds: 4 });
        const pkg = JSON.parse(settled);
        expect(pkg.pnpm.overrides.zod).toEqual('4.4.3');
        expect(pkg.dependencies.zod).toEqual('4.4.3');
        expect(() => check(settled, {} as any)).not.toThrow();
        expect(() => undercutCheck(settled, {} as any)).toThrow(); // bad practice not detected
      });

      then('a single pass of this fix already lands the fixed point', async () => {
        const { contents: once } = await fix(before, {} as any);
        expect(() => undercutCheck(once!, {} as any)).toThrow();
        const { contents: twice } = await fix(once!, {} as any);
        expect(twice).toEqual(once);
      });
    });
  });

  given('[case4] a repo at or above every floor, with no sdk-aws-lambda', () => {
    then('the check passes, and the fix adds no pnpm key', async () => {
      const before = asContents({ dependencies: { zod: '4.4.3' } });
      expect(() => check(before, {} as any)).not.toThrow();
      const { contents: once } = await fix(before, {} as any);
      expect(JSON.parse(once!).pnpm).toBeUndefined();
    });
  });
});
