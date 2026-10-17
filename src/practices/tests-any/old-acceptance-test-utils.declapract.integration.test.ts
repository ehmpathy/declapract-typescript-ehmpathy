import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { given, then, useThen, when } from 'test-fns';

import { isOnRetiredLambdaTestLib } from '../../utils/asSourceOnRunLambdaEndpoint';
import { genTempRepoWithDeclarationsOutside } from '../../utils/genTempRepoWithDeclarationsOutside';

// one file-scoped executeApply evaluates the tests-any practice; grant a wide bound
jest.setTimeout(240_000);

/**
 * .what = end-to-end proof of the three old-acceptance-test-utils bad-practices (`-`, `-2`, `-3`):
 *         each moves a `blackbox/lambdas/*.ts` acceptance test off its old util import and, in the
 *         same apply, off the retired lambda test lib onto runLambdaEndpoint (#650).
 * .why  = the unit tests prove each fix in isolation; only the real pipeline proves the glob matches
 *         the consumer file, `getProjectVariables` reads the consumer's declapract.use.yml, and a
 *         second apply over the output converges (rule.require.declapract-integration-tests).
 * .note = the declarations mirror holds the tests-any practice alone (the tests-any-only usecase),
 *         mounted OUTSIDE the temp repo, so the apply evaluates one practice and walks no link back
 *         into this repo's source. each apply is scoped with `file` too.
 *         this file sits at the practice ROOT: a test directly under `bad-practices/` has no
 *         bad-practice name to extract, and declapract throws.
 */
const RETIRED_LIB = 'simple-lambda-testing-methods';
const CASES = [
  {
    slug: 'old-acceptance-test-utils',
    fixture: 'repo-old-acceptance-utils',
    file: 'blackbox/lambdas/consumeSESEmailEventFromSNS.acceptance.test.ts',
    oldImport: "import { invokeLambda } from '../_utils/invokeLambda';",
    whichExpected:
      "which: { service: 'svc-notifications', function: 'consumeSESEmailEventFromSNS' }",
  },
  {
    slug: 'old-acceptance-test-utils-2',
    fixture: 'repo-old-acceptance-utils-2',
    file: 'blackbox/lambdas/addDecoratedImage.acceptance.test.ts',
    oldImport: "import { locally } from '../__test_utils__/environment';",
    whichExpected:
      "which: { service: 'svc-images', function: 'addDecoratedImage' }",
  },
  {
    slug: 'old-acceptance-test-utils-3',
    fixture: 'repo-old-acceptance-utils-3',
    file: 'blackbox/lambdas/addDecoratedImage.acceptance.test.ts',
    oldImport: "import { locally } from '../_utils/environment';",
    whichExpected:
      "which: { service: 'svc-images', function: 'addDecoratedImage' }",
  },
];

describe('tests-any old-acceptance-test-utils', () => {
  CASES.forEach((thisCase, index) =>
    given(`[case${index + 1}] a repo on the ${thisCase.slug} shape`, () => {
      const tempDir = genTempRepoWithDeclarationsOutside({
        slug: `declapract-${thisCase.slug}`,
        clone: `./src/practices/tests-any/.test/assets/${thisCase.fixture}`,
        declarations: './src/.test/assets/tests-any-only/declarations',
        symlink: [{ at: 'node_modules', to: 'node_modules' }],
      });
      const read = () =>
        fs.readFile(path.join(tempDir, thisCase.file), 'utf-8');
      const applyOne = () =>
        executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'tests-any',
          file: thisCase.file,
        });

      when('[t0] the input (before any fix)', () => {
        then('the file holds the old import, and matches snapshot', async () => {
          const before = await read();
          expect(before).toContain(thisCase.oldImport);
          expect(before).toMatchSnapshot(`${thisCase.slug} — before`);
        });
      });

      when('[t1] the fix is applied', () => {
        const after = useThen('apply succeeds', async () => {
          await applyOne();
          return { contents: await read() };
        });

        then('the old import is gone, and the environment import points at ../environment', () => {
          expect(after.contents).not.toContain(thisCase.oldImport);
          expect(after.contents).toContain(
            "import { locally } from '../environment';",
          );
        });

        then('the file is off the retired lib, onto runLambdaEndpoint (#650)', () => {
          expect(after.contents).not.toContain(RETIRED_LIB);
          expect(isOnRetiredLambdaTestLib({ contents: after.contents })).toBe(
            false,
          );
          expect(after.contents).toContain('runLambdaEndpoint.onSerialized');
          expect(after.contents).toContain(thisCase.whichExpected);
          expect(after.contents).toContain("at: locally ? 'local' : 'cloud'");
        });

        then('no template token leaks, and the file matches snapshot', () => {
          expect(after.contents).not.toContain('@declapract{');
          expect(after.contents).toMatchSnapshot(`${thisCase.slug} — after`);
        });
      });

      when('[t2] the fix is applied a second time (idempotency)', () => {
        const passes = useThen('a second apply over its own output', async () => {
          const before = await read();
          await applyOne();
          return { before, after: await read() };
        });

        then('the second apply is a no-op', () => {
          expect(passes.after).toEqual(passes.before);
        });
      });
    }),
  );
});
