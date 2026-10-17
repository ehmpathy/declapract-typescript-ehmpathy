import { given, then, when } from 'test-fns';

import bestPracticePackageJson from '../../best-practice/package.json';
import {
  CACHE_FAMILY_MEMBERS_FLOORED,
  check,
  fix,
} from './package.json.declapract';

const asPackageJson = (sections: Record<string, Record<string, string>>) =>
  JSON.stringify(sections, null, 2);

describe('cache unfloored-cache-member package.json (#625)', () => {
  given('[case0] the floored set vs the best-practice floors', () => {
    then('every member this bad-practice treats as floored holds a floor, and no other', () => {
      expect(Object.keys(bestPracticePackageJson.dependencies).sort()).toEqual(
        [...CACHE_FAMILY_MEMBERS_FLOORED].sort(),
      );
    });
  });

  given('[case1] the retired with-simple-caching, no src import of it', () => {
    const before = asPackageJson({
      dependencies: { 'with-simple-caching': '0.14.4', lodash: '4.17.21' },
    });

    then('the check flags it', () => {
      expect(() => check(before, {} as any)).not.toThrow();
    });

    when('[t0] the fix runs', () => {
      then('the dep moves to with-simple-cache at its floor', async () => {
        const after = JSON.parse((await fix(before, {} as any)).contents!);
        expect(after.dependencies['with-simple-caching']).toBeUndefined();
        expect(after.dependencies['with-simple-cache']).toEqual('0.17.3');
        expect(after.dependencies.lodash).toEqual('4.17.21');
      });

      then('the check passes on the fixed output, and a second pass is a no-op', async () => {
        const once = (await fix(before, {} as any)).contents!;
        const twice = (await fix(once, {} as any)).contents!;
        expect(twice).toEqual(once);
        expect(() => check(once, {} as any)).toThrow('does not match bad practice');
      });
    });
  });

  given('[case2] a family member no floor names', () => {
    const before = asPackageJson({
      devDependencies: { 'simple-dynamo-cache': '1.0.0' },
    });

    then('the check names it, so plan never reads its absence as a pass', () => {
      expect(() => check(before, {} as any)).not.toThrow();
    });

    then('the fix leaves it in place for a human to floor', async () => {
      expect((await fix(before, {} as any)).contents).toEqual(before);
    });
  });

  given('[case3] only floored members', () => {
    then('the check skips it', () => {
      expect(() =>
        check(
          asPackageJson({
            dependencies: {
              'with-domain-driven-cache': '1.1.5',
              'with-simple-cache': '0.17.3',
            },
          }),
          {} as any,
        ),
      ).toThrow('does not match bad practice');
    });
  });
});
