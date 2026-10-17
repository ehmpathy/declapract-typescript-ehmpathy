import type { FileCheckContext, FileFixContext } from 'declapract';
import { given, then, useThen, when } from 'test-fns';

import { check, fix } from './package.json.declapract';

/**
 * .what = clamps that the old-module-name detection fires, and that its fix converges
 * .teeth = revert the check to `JSON.stringify(contents)` before the match and [case1] reddens:
 *          a string never matches the object shape, so the bad package.json goes undetected.
 */
const checkContext = {} as FileCheckContext; // the check reads no context
const fixContext = {} as FileFixContext; // the fix reads no context

const asPackageJSON = (input: object) => JSON.stringify(input, null, 2);
const isDetected = (contents: string | null) => {
  try {
    check(contents, checkContext);
    return true;
  } catch {
    return false;
  }
};

describe('declastruct old-module-name', () => {
  given('[case1] a package.json that depends on best-practices-typescript', () => {
    const viaDevDeps = asPackageJSON({
      name: 'svc-x',
      devDependencies: { 'best-practices-typescript': '1.2.3', declapract: '0.13.26' },
    });
    const viaDeps = asPackageJSON({
      name: 'svc-x',
      dependencies: { 'best-practices-typescript': '1.2.3' },
    });

    when('[t0] the check runs', () => {
      then('it detects the dependency in devDependencies', () => {
        expect(isDetected(viaDevDeps)).toBe(true);
      });
      then('it detects the dependency in dependencies', () => {
        expect(isDetected(viaDeps)).toBe(true);
      });
    });

    when('[t1] the fix runs', () => {
      const result = useThen('the fix returns', async () => {
        const once = (await fix(viaDevDeps, fixContext)).contents ?? null;
        const twice = (await fix(once, fixContext)).contents ?? null;
        return { once, twice };
      });
      then('the retired dependency is gone and the rest is kept', () => {
        expect(result.once).not.toContain('best-practices-typescript');
        expect(result.once).toContain('"declapract": "0.13.26"');
        expect(result.once).toMatchSnapshot();
      });
      then('the check no longer detects it', () => {
        expect(isDetected(result.once)).toBe(false);
      });
      then('a second fix is a no-op', () => {
        expect(result.twice).toEqual(result.once);
      });
    });
  });

  given('[case2] a clean package.json', () => {
    when('[t0] the check runs', () => {
      then('it throws: not detected', () => {
        expect(() =>
          check(asPackageJSON({ dependencies: { declapract: '0.13.26' } }), checkContext),
        ).toThrow('does not match bad practice');
      });
      then('it throws on an absent file too', () => {
        expect(() => check(null, checkContext)).toThrow('does not match bad practice');
      });
    });
  });
});
