import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof of the simple-lambda-client migration, run through the REAL declapract
 *   apply pipeline against a genTempDir clone of a consumer repo.
 * .why = the src fix rewrites the import AND each `invokeLambdaFunction(…)` call onto
 *   `sdkAwsLambdaAskAncient(…)` (#631) — a transform, so per rule.require.declapract-integration-tests
 *   it owes a pipeline test. a unit test of the exported `fix` never exercises the `src/**\/*.ts`
 *   glob -> file match, nor that the rewrite lands on disk.
 * .note = the `stage` field in the demo input is the retired simple-lambda-client contract; the
 *   fix exists to drop it, so the before-state must carry it.
 */
describe('simple-lambda-client migration', () => {
  given('[case1] a repo whose domain operation calls invokeLambdaFunction', () => {
    const tempDir = genTempDir({
      slug: 'declapract-simple-lambda-client',
      clone: './src/practices/node-service/bad-practices/simple-lambda-client/.test/assets/demo-repo-with-simple-lambda-client',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/node-service/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const targetPath = 'src/domain.operations/getWidgetPrice.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyMigrate = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'node-service',
        file: targetPath,
      });

    when('[t0] the migration input (before any fix)', () => {
      then('the src file imports + calls invokeLambdaFunction + matches snapshot', async () => {
        const before = await read(targetPath);
        expect(before).toContain("from 'simple-lambda-client'");
        expect(before).toContain('invokeLambdaFunction(');
        expect(before).not.toContain('sdkAwsLambdaAskAncient');
        expect(before).toMatchSnapshot('getWidgetPrice.ts — before');
      });
    });

    when('[t1] the simple-lambda-client fix is applied', () => {
      useThen('migrate the client import + call', async () => applyMigrate());

      then(
        'the import + call move onto sdkAwsLambdaAskAncient, and it matches snapshot',
        async () => {
          const after = await read(targetPath);

          // the import moves onto the ancient ask helper, plus the logger it needs
          expect(after).not.toContain("from 'simple-lambda-client'");
          expect(after).toContain(
            "import { sdkAwsLambdaAskAncient } from '@src/access/sdks/sdkAwsLambdaAskAncient';",
          );
          expect(after).toContain("import { log } from '@src/utils/logger';");

          // the call binds address + payload together, and the retired field has no slot
          expect(after).not.toContain('invokeLambdaFunction(');
          expect(after).toContain(
            "which: { service: 'svc-widgets', function: 'getWidgetPrice' },",
          );
          expect(after).toContain('event: { widgetUuid: input.widgetUuid },');
          expect(after).toContain('{ log },');
          expect(after).not.toContain('stage,\n');

          // full content, for the reviewer's eye
          expect(after).toMatchSnapshot('getWidgetPrice.ts — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // post-rewrite the file no longer imports simple-lambda-client, so the check no longer
      // detects the bad practice — the second apply changes zero bytes (rule.require.idempotent-fixes)
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
