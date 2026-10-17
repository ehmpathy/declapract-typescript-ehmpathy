import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply evaluates the whole usecase, so grant a generous limit
jest.setTimeout(300_000);

/**
 * .what = end-to-end proof that the retired lambda test lib is moved off, through the REAL
 *         declapract apply pipeline against a genTempDir clone of a consumer on the lib (#650)
 * .why  = the fix rewrites each blackbox call onto runLambdaEndpoint.onSerialized, then drops the
 *         dep once no import remains. only a real apply proves the `blackbox/**` glob, the
 *         neighbor scan the package.json gate reads, and the end-state on disk.
 * .note = scoped by `file` only, so every usecase practice stays in projectPractices
 */
describe('simple-lambda-testing-methods retirement', () => {
  given('[case1] a service repo whose blackbox test is on the retired lib', () => {
    const tempDir = genTempDir({
      slug: 'declapract-tests-service-retired-lambda-test-lib',
      clone:
        './src/practices/tests-service/bad-practices/simple-lambda-testing-methods/.test/assets/demo-repo-on-retired-lib',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/tests-service/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const testPath = 'blackbox/lambdas/getWidget.acceptance.test.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyAll = async () => {
      for (const file of [testPath, 'package.json'])
        await executeApply({ config: path.join(tempDir, 'declapract.use.yml'), file });
    };

    when('[t0] the input, before any fix', () => {
      then('the test and package.json are on the retired lib', async () => {
        const test = await read(testPath);
        const packageJson = await read('package.json');
        expect(test).toContain('invokeLambdaForTesting({');
        expect(packageJson).toContain('simple-lambda-testing-methods');
        expect(test).toMatchSnapshot('getWidget.acceptance.test.ts — before');
        expect(packageJson).toMatchSnapshot('package.json — before');
      });
    });

    when('[t1] the usecase is applied', () => {
      useThen('apply the test, then package.json', async () => applyAll());

      then('the test runs the lambda via runLambdaEndpoint.onSerialized', async () => {
        const test = await read(testPath);
        expect(test).toContain("import { runLambdaEndpoint } from 'sdk-aws-lambda';");
        expect(test).toContain('runLambdaEndpoint.onSerialized<unknown, Record<string, any>>(');
        expect(test).toContain("at: locally ? 'local' : 'cloud'");
        expect(test).not.toContain('simple-lambda-testing-methods');
        expect(test).toMatchSnapshot('getWidget.acceptance.test.ts — after');
      });

      then('the retired dep is gone, and sdk-aws-lambda is in at the floor', async () => {
        const packageJson = await read('package.json');
        const parsed = JSON.parse(packageJson);
        expect(parsed.devDependencies?.['simple-lambda-testing-methods']).toBeUndefined();
        expect(parsed.devDependencies?.['sdk-aws-lambda']).toEqual('0.7.2');
        expect(packageJson).toMatchSnapshot('package.json — after');
      });
    });

    when('[t2] the usecase is applied a second time (idempotency)', () => {
      const passes = useThen('a second apply over its own output', async () => {
        const before = { test: await read(testPath), pkg: await read('package.json') };
        await applyAll();
        const after = { test: await read(testPath), pkg: await read('package.json') };
        return { before, after };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
