import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof of the simple-lambda-handlers migration, run through the REAL declapract
 *   apply pipeline against a genTempDir clone of a consumer repo. per
 *   rule.require.declapract-integration-tests, a fix that TRANSFORMS a file (regex rewrite + a
 *   value-rewrite @declapract:review marker) owes a pipeline test — a unit test of the exported
 *   `fix` never exercises the source-file glob -> file match, nor that the marker lands on disk.
 * .why = the fix rewrites the `simple-lambda-handlers` import to `sdk-aws-lambda` and prepends a
 *   loud @declapract:review marker, because the schema+invoke CONTRACT differs between the two
 *   frameworks and a rename-only migration answers 400 to every request yet typechecks (#594). the
 *   marker names the two manual edits rather than let a regex guess the contract.
 * .note = the target file is snapshotted in full (before AND after), so a reviewer can eyeball the
 *   exact end-state, per rule.require.declapract-integration-tests.
 * .teeth = the input imports + CALLS `createApiGatewayHandler`. the after-state proves the import is
 *   rewritten to `sdk-aws-lambda`, the call is rewritten to `genLambdaEndpoint.for.apiGateway`, and
 *   the @declapract:review marker lands on disk — the glue a mocked-context unit test cannot show.
 */
describe('simple-lambda-handlers migration', () => {
  given('[case1] a repo with a simple-lambda-handlers api-gateway handler', () => {
    const tempDir = genTempDir({
      slug: 'declapract-simple-lambda-handlers',
      clone: './src/practices/node-service/bad-practices/simple-lambda-handlers/.test/assets/demo-repo-with-simple-lambda-handlers',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/node-service/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const targetPath = 'src/contract/handlers/getWidget.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyMigrate = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'node-service',
        file: targetPath,
      });

    when('[t0] the migration input (before any fix)', () => {
      then('the src file imports + calls the simple-lambda-handlers factory + matches snapshot', async () => {
        const before = await read(targetPath);
        expect(before).toContain("from 'simple-lambda-handlers'");
        expect(before).toContain('createApiGatewayHandler(');
        expect(before).not.toContain('@declapract:review');
        expect(before).toMatchSnapshot('getWidget.ts — before');
      });
    });

    when('[t1] the simple-lambda-handlers fix is applied', () => {
      useThen('migrate the handler import + call', async () => applyMigrate());

      then(
        'the import + call are rewritten to sdk-aws-lambda, the review marker lands, and it matches snapshot',
        async () => {
          const after = await read(targetPath);

          // the import is rewritten to the sdk
          expect(after).toContain("from 'sdk-aws-lambda'");
          expect(after).not.toContain("from 'simple-lambda-handlers'");

          // the api-gateway factory call is rewritten to its sdk equivalent
          expect(after).toContain('genLambdaEndpoint.for.apiGateway(');
          expect(after).not.toContain('createApiGatewayHandler(');

          // the value-rewrite marker lands on disk — the un-rewritable schema+invoke contract
          // is loud, so a consumer cannot ship a handler that answers 400 to every request
          expect(after).toContain('@declapract:review');
          expect(after).toContain('rawEvent');

          // full content, for the reviewer's eye
          expect(after).toMatchSnapshot('getWidget.ts — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // post-rewrite the file imports from sdk-aws-lambda, so the check no longer detects the bad
      // practice and the fix does not run — the second apply changes zero bytes, and the marker is
      // never double-prepended (per rule.require.idempotent-fixes).
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
