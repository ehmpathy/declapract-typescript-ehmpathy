import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof of the ahbode-standard-lambda-handler test-file migration, run through
 *   the REAL declapract apply pipeline against a genTempDir clone of a consumer repo.
 * .why = the fix moves a handler test off the nonpublished `promiseLambdaInvocation` and onto
 *   `runLambdaEndpoint.onReferenced(...).then(asLambdaEndpointOutput)` in one apply (#650) — a
 *   transform, so per rule.require.declapract-integration-tests it owes a pipeline test. a unit
 *   test of the exported `fix` never exercises the `src/contract/handlers/*.integration.test.ts`
 *   glob -> file match, nor the CONTAINS check that gates the fix.
 */
describe('ahbode-standard-lambda-handler test-file migration', () => {
  given('[case1] a repo whose handler test calls promiseLambdaInvocation', () => {
    const tempDir = genTempDir({
      slug: 'declapract-ahbode-standard-lambda-handler',
      clone: './src/practices/nonpublished-modules/bad-practices/ahbode-standard-lambda-handler/.test/assets/demo-repo-with-ahbode-handler-test',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/nonpublished-modules/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const targetPath = 'src/contract/handlers/getWidget.integration.test.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyMigrate = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'nonpublished-modules',
        file: targetPath,
      });

    when('[t0] the migration input (before any fix)', () => {
      then('the handler test imports + calls promiseLambdaInvocation + matches snapshot', async () => {
        const before = await read(targetPath);
        expect(before).toContain('__nonpublished_modules__/ahbode-standard-lambda-handler');
        expect(before).toContain('promiseLambdaInvocation(');
        expect(before).not.toContain('runLambdaEndpoint');
        expect(before).toMatchSnapshot('getWidget.integration.test.ts — before');
      });
    });

    when('[t1] the ahbode-standard-lambda-handler fix is applied', () => {
      useThen('migrate the handler test', async () => applyMigrate());

      then(
        'the test lands on runLambdaEndpoint.onReferenced in one apply, and it matches snapshot',
        async () => {
          const after = await read(targetPath);

          // the nonpublished module and the retired successor are both gone
          expect(after).not.toContain('__nonpublished_modules__');
          expect(after).not.toContain('promiseLambdaInvocation');
          expect(after).not.toContain('simple-lambda-testing-methods');

          // the sdk import + the onReferenced call land, output unwrapped by asLambdaEndpointOutput
          expect(after).toContain(
            "import { asLambdaEndpointOutput, runLambdaEndpoint } from 'sdk-aws-lambda';",
          );
          expect(after).toContain('runLambdaEndpoint.onReferenced(');
          expect(after).toContain('.then(asLambdaEndpointOutput)');

          // full content, for the reviewer's eye
          expect(after).toMatchSnapshot('getWidget.integration.test.ts — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // post-rewrite the file no longer CONTAINS the nonpublished import line, so the check no
      // longer detects the bad practice — the second apply changes zero bytes
      // (rule.require.idempotent-fixes)
      const passes = useThen('a second apply over its own output', async () => {
        const before = await read(targetPath); // post-first-migrate
        await applyMigrate(); // second apply
        const after = await read(targetPath);
        return { before, after };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
