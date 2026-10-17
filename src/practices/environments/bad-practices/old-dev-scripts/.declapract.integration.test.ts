import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the environments/old-dev-scripts fix, run through the REAL declapract
 *   apply pipeline against a genTempDir clone of a consumer repo whose package.json still names
 *   scripts with a `:dev` segment — at the end (`deploy:dev`, `start:livedb:dev`) and in the
 *   middle (`build:dev:ios`).
 * .why  = the fix renames keys with a regex over parsed json. a unit test of the transformer is
 *   necessary but NOT sufficient (`rule.require.declapract-integration-tests`): only the pipeline
 *   proves declapract matches the declaration to the consumer's package.json, that a bad-practice
 *   `check` that RETURNS gates the `fix`, and that a second apply is a no-op on the real file.
 * .note = the scoped apply runs the WHOLE `environments` practice (the `file` filter narrows which
 *   file is written, not which declarers evaluate), so the after-state also carries the
 *   environments best-practice package.json — a CONTAINS check whose merge-fix stamps its declared
 *   dependencies. the assertions target only the script renames, which this bad-practice owns; the
 *   full-content snapshots show both, for the reviewer's eye.
 */
describe('environments/old-dev-scripts rename', () => {
  given('[case1] a repo whose scripts carry a :dev segment', () => {
    const tempDir = genTempDir({
      slug: 'declapract-environments-old-dev-scripts',
      clone:
        './src/practices/environments/bad-practices/old-dev-scripts/.test/assets/demo-repo-with-dev-scripts',
      symlink: [{ at: 'declarations', to: 'src' }],
    });

    const pkgPath = 'package.json';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'environments',
        file: pkgPath,
      });

    when('[t0] the input (before any fix)', () => {
      then('the package.json input matches snapshot', async () => {
        expect(await read(pkgPath)).toMatchSnapshot('package.json — before');
      });
    });

    when('[t1] the old-dev-scripts fix is applied', () => {
      const result = useThen('the apply succeeds', async () => {
        await applyFix();
        const contents = await read(pkgPath);
        return { contents, pkg: JSON.parse(contents) };
      });

      then('each :dev segment is renamed to :prep, with its value untouched', () => {
        expect(result.pkg.scripts['deploy:prep']).toEqual('npm run deploy:release');
        expect(result.pkg.scripts['start:livedb:prep']).toEqual('npm run start:db');
        expect(result.pkg.scripts['build:prep:ios']).toEqual('npm run build:ios');
      });

      then('no script name holds a :dev segment any more', () => {
        const devNames = Object.keys(result.pkg.scripts).filter(
          (key) => key.endsWith(':dev') || key.includes(':dev:'),
        );
        expect(devNames).toEqual([]);
      });

      then('the scripts without a :dev segment are preserved', () => {
        expect(result.pkg.scripts.build).toEqual('tsc');
        expect(result.pkg.scripts['test:unit']).toEqual('jest');
      });

      then('the package.json matches snapshot', () => {
        expect(result.contents).toMatchSnapshot('package.json — after');
      });
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // .note = we assert the `scripts` block — the part this bad-practice owns — is a fixed
      //   point, not full-file byte equality: the environments best-practice package.json (a
      //   separate CONTAINS declarer) writes a raw `@declapract{check.minVersion(...)}` marker
      //   into `dependencies` on the first pass and resolves it to a bare version on the second.
      //   that marker quirk is the same one logs/.declapract.integration.test.ts records; it is
      //   not the rename under test.
      const result = useThen('a second apply over its own output', async () => {
        const before = JSON.parse(await read(pkgPath));
        await applyFix();
        return { before, after: JSON.parse(await read(pkgPath)) };
      });

      then('the second apply renames zero scripts — same names, values, and order', () => {
        expect(Object.entries(result.after.scripts)).toEqual(
          Object.entries(result.before.scripts),
        );
      });
    });
  });
});
