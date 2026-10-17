import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof of the with-connection-in-input fix on a real repo (#626).
 * .why  = the prior declaration was an EXISTS check with no fix, so an apply could not repair it and
 *   named no replacement. the src declaration now stamps the input→context review line above each
 *   import and definition of withDatabaseConnection, and never deletes the wrapper its callers need.
 * .note = the declarations isolate this one bad-practice (a persist-with-rds practice that holds only
 *   it), so the test owes none of the practice's variables.
 */
describe('persist-with-rds with-connection-in-input', () => {
  given('[case1] a repo whose op imports withDatabaseConnection', () => {
    const tempDir = genTempDir({
      slug: 'declapract-rds-connection-in-input',
      clone:
        './src/practices/persist-with-rds/bad-practices/with-connection-in-input/.test/assets/demo-repo-with-connection-in-input',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/persist-with-rds-connection-in-input/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const opPath = 'src/domain.operations/findSurferById.ts';
    const wrapperPath = 'src/utils/database/withDatabaseConnection.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyOne = (input: { file: string }) =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'persist-with-rds',
        file: input.file,
      });
    const applyFix = async () => {
      await applyOne({ file: opPath });
      await applyOne({ file: wrapperPath });
    };

    when('[t0] the input (before any fix)', () => {
      then('both src files match snapshot', async () => {
        expect(await read(opPath)).toMatchSnapshot('op — before');
        expect(await read(wrapperPath)).toMatchSnapshot('wrapper — before');
      });
    });

    when('[t1] the fix is applied', () => {
      const after = useThen('apply', async () => {
        const before = { op: await read(opPath), wrapper: await read(wrapperPath) };
        await applyFix();
        return { before, op: await read(opPath), wrapper: await read(wrapperPath) };
      });

      then('the op gains one review line above its import, which names withDatabaseContext', () => {
        const markers = after.op
          .split('\n')
          .filter((line) => line.includes('@declapract:review:'));
        expect(markers).toHaveLength(1);
        expect(markers[0]).toContain('withDatabaseContext');
        expect(markers[0]).toContain('(input, context)');
        expect(after.op.replace(/^.*@declapract:review.*\n/m, '')).toEqual(
          after.before.op,
        );
        expect(after.op).toMatchSnapshot('op — after');
      });

      then('the wrapper stays in place, marked, so the tree still builds', () => {
        expect(after.wrapper).toContain('export const withDatabaseConnection');
        expect(after.wrapper.replace(/^.*@declapract:review.*\n/m, '')).toEqual(
          after.before.wrapper,
        );
        expect(after.wrapper).toMatchSnapshot('wrapper — after');
      });
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      const passes = useThen('a second apply over its own output', async () => {
        const before = { op: await read(opPath), wrapper: await read(wrapperPath) };
        await applyFix();
        const after = { op: await read(opPath), wrapper: await read(wrapperPath) };
        return { before, after };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
