import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the legacy-change-id rename (#530), run through the REAL declapract
 *         apply pipeline against a genTempDir clone of a consumer repo.
 * .why = a unit test of `fix` never proves the `provision/schema/**\/*.yml` glob reaches a nested
 *        definitions file, nor that one apply leaves the best-practice `init.yml` (CONTAINS, now on
 *        `exid:`) satisfied. the repo's own change entry must move too, and keep its comment.
 * .note = the init.yml is snapshotted in full, before AND after, per
 *         rule.require.declapract-integration-tests.
 */
// each apply evaluates the whole practice, which runs long under a full suite
jest.setTimeout(10 * 60 * 1000);

describe('legacy-change-id (#530)', () => {
  given('[case1] a repo whose schema definitions use the legacy `id:` key', () => {
    const tempDir = genTempDir({
      slug: 'declapract-persist-with-rds-legacy-change-id',
      clone:
        './src/practices/persist-with-rds/bad-practices/legacy-change-id/.test/assets/demo-repo-with-legacy-change-id',
      symlink: [{ at: 'declarations', to: 'src' }],
    });

    const initPath = 'provision/schema/sql/init.yml';
    const read = () => fs.readFile(path.join(tempDir, initPath), 'utf-8');
    const apply = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'persist-with-rds',
        file: initPath,
      });

    when('[t0] the input, before any fix', () => {
      then('init.yml holds `id:` on each change, and matches snapshot', async () => {
        const before = await read();
        expect(before).toContain('  id: init_service_user');
        expect(before).toMatchSnapshot('init.yml — before');
      });
    });

    when('[t1] apply runs', () => {
      useThen('apply the fix', async () => apply());

      then('each change entry declares `exid:`, the repo extra kept, and matches snapshot', async () => {
        const after = await read();
        expect(after).toContain('  exid: init_default_txn_isolation');
        expect(after).toContain('  exid: init_service_user');
        expect(after).toContain('  exid: init_analyst_user');
        expect(after).toContain('# a change the repo added on its own');
        expect(after).not.toMatch(/^\s*id:/m);
        expect(after).toMatchSnapshot('init.yml — after');
      });
    });

    when('[t2] apply runs again (idempotency)', () => {
      const passes = useThen('a second apply', async () => {
        const before = await read();
        await apply();
        return { before, after: await read() };
      });

      then('the second apply changes zero bytes', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
