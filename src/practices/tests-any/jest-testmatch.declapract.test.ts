import { given, then } from 'test-fns';

import expoAcceptance from '../tests-expo/best-practice/jest.acceptance.config';
import expoIntegration from '../tests-expo/best-practice/jest.integration.config';
import expoUnit from '../tests-expo/best-practice/jest.unit.config';
import nodeAcceptance from '../tests-node/best-practice/jest.acceptance.config';
import nodeIntegration from '../tests-node/best-practice/jest.integration.config';
import nodeUnit from '../tests-node/best-practice/jest.unit.config';

/**
 * .what = clamps the `testMatch` of all six jest configs the tests practices emit:
 *         - #647: each excludes `.agent/.actors/` (rhachet host-local state that holds a scratch
 *           clone of the repo, whose suites would run twice and fail for reasons not on the branch)
 *         - #679: each kind matches BOTH suffix forms (`x.integration.test.ts` and `x._.intg.test.ts`),
 *           and unit excludes every kind suffix of both forms, so no test runs under two kinds
 *         - each ignores all of `.agent/` via testPathIgnorePatterns + modulePathIgnorePatterns, so
 *           a test in the rmsafe trash never runs and a trashed snapshot never reads as obsolete
 * .teeth = drop the actors negation from any config and its case reddens; drop a seam glob or a
 *          unit exclusion and its case reddens.
 * .note = the configs are whole-file templates (EQUALS), so the next apply lands each line in an
 *         extant repo with no merge fix.
 */

const ACTORS = '!**/.agent/.actors/**';

const NODE_KIND = { ext: 'ts' };
const EXPO_KIND = { ext: '{ts,tsx}' };

const CASES = [
  { name: 'tests-node unit', config: nodeUnit, kind: 'unit', ...NODE_KIND },
  { name: 'tests-node integration', config: nodeIntegration, kind: 'intg', ...NODE_KIND },
  { name: 'tests-node acceptance', config: nodeAcceptance, kind: 'acpt', ...NODE_KIND },
  { name: 'tests-expo unit', config: expoUnit, kind: 'unit', ...EXPO_KIND },
  { name: 'tests-expo integration', config: expoIntegration, kind: 'intg', ...EXPO_KIND },
  { name: 'tests-expo acceptance', config: expoAcceptance, kind: 'acpt', ...EXPO_KIND },
];

describe('the six jest testMatch arrays', () => {
  for (const testCase of CASES) {
    given(`[case] ${testCase.name}`, () => {
      const testMatch = testCase.config.testMatch ?? [];

      then('it excludes .agent/.actors (#647)', () => {
        expect(testMatch).toContain(ACTORS);
      });

      then('it ignores all of .agent/ for test paths and the haste map (rmsafe trash, roles)', () => {
        const testPathIgnore = testCase.config.testPathIgnorePatterns ?? [];
        const modulePathIgnore = testCase.config.modulePathIgnorePatterns ?? [];
        expect(testPathIgnore).toContain('/node_modules/');
        expect(modulePathIgnore).toContain('<rootDir>/.agent/');

        // jest reads these as regexes against the absolute path; a trashed test must match one
        const trashed = '/repo/.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash/src/x.test.ts';
        const kept = '/repo/src/domain/x.test.ts';
        expect(testPathIgnore.some((pattern) => new RegExp(pattern).test(trashed))).toEqual(true);
        expect(testPathIgnore.some((pattern) => new RegExp(pattern).test(kept))).toEqual(false);
      });

      if (testCase.kind === 'intg')
        then('it matches both integration suffix forms (#679)', () => {
          expect(testMatch).toContain(`**/*.integration.test.${testCase.ext}`);
          expect(testMatch).toContain(`**/*._.intg.test.${testCase.ext}`);
        });

      if (testCase.kind === 'acpt')
        then('it matches both acceptance suffix forms (#679)', () => {
          expect(testMatch).toContain(`**/*.acceptance.test.${testCase.ext}`);
          expect(testMatch).toContain(`**/*._.acpt.test.${testCase.ext}`);
        });

      if (testCase.kind === 'unit')
        then('it excludes every other kind suffix, of both forms (#679)', () => {
          for (const suffix of [
            'acceptance',
            'integration',
            'evaluation',
            '_.acpt',
            '_.intg',
            '_.eval',
          ])
            expect(testMatch).toContain(`!**/*.${suffix}.test.${testCase.ext}`);
        });
    });
  }
});
