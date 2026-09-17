import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the logs/leveled-term fix, run through the REAL declapract apply
 *   pipeline against a genTempDir clone of a consumer repo whose package.json lists the deprecated
 *   `simple-leveled-log-methods` in BOTH `dependencies` and `devDependencies` (D50 / #571).
 * .why  = the old declaration was a `CONTAINS` template pinned to `devDependencies`, so it was blind
 *   to a `dependencies` placement — the bad practice silently never fired for a repo that had the
 *   dep at runtime. the fix is now a `FileCheckFunction` + `withoutDeprecatedDep` transformer that
 *   removes it from BOTH sections. a unit test of the transformer is necessary but not sufficient
 *   (`rule.require.declapract-integration-tests`): only the pipeline proves the declaration's target
 *   glob matches package.json and the fix lands on a real consumer file.
 * .note = the package.json is snapshotted in full (before AND after) so a reviewer can eyeball the
 *   exact end-state. the target file holds the dep in both sections, so the after-state proves the
 *   both-section removal AND the section-presence preservation.
 */
describe('logs/leveled-term removal', () => {
  given('[case1] a repo with simple-leveled-log-methods in both dep sections', () => {
    const tempDir = genTempDir({
      slug: 'declapract-logs-leveled-term',
      clone: './src/practices/logs/bad-practices/leveled-term/.test/assets/demo-repo-with-leveled-term',
      symlink: [{ at: 'src', to: 'src' }],
    });

    const pkgPath = 'package.json';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'logs',
        file: pkgPath,
      });

    when('[t0] the input (before any fix)', () => {
      then('the package.json input matches snapshot', async () => {
        expect(await read(pkgPath)).toMatchSnapshot('package.json — before');
      });
    });

    when('[t1] the leveled-term fix is applied', () => {
      useThen('remove the deprecated dep from both sections', async () =>
        applyFix(),
      );

      then(
        'the dep is gone from dependencies AND devDependencies, both sections preserved, and matches snapshot',
        async () => {
          const pkg = JSON.parse(await read(pkgPath));
          // the deprecated dep is gone from both sections
          expect(pkg.dependencies?.['simple-leveled-log-methods']).toBeUndefined();
          expect(
            pkg.devDependencies?.['simple-leveled-log-methods'],
          ).toBeUndefined();
          // each section's PRESENCE is preserved (the repo declared both, so both stay)
          expect(pkg.dependencies).toBeDefined();
          expect(pkg.devDependencies).toBeDefined();
          // the peer deps in each section survive untouched
          expect(pkg.dependencies.uuid).toEqual('9.0.0');
          expect(pkg.devDependencies.jest).toEqual('29.3.1');
          // full content, for the reviewer's eye
          expect(await read(pkgPath)).toMatchSnapshot('package.json — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // .note = the D50 invariant under re-apply is that the leveled-term fix is a
      //   FIXED POINT for the deprecated dep: once removed, a second pass neither
      //   re-introduces it nor drops a peer section. we do NOT assert full-file byte
      //   equality here, because the logs best-practice package.json declaration (a
      //   separate declarer, out of scope for D50) writes a raw
      //   `@declapract{check.minVersion(...)}` marker on the first pass and resolves it
      //   to a bare version on the second — a marker-resolution quirk of that declaration,
      //   not of the leveled-term transformer under test.
      const pkg = useThen('a second apply over its own output', async () => {
        await applyFix(); // second apply, over the post-first-fix output
        return JSON.parse(await read(pkgPath));
      });

      then('the deprecated dep stays gone from both sections', () => {
        expect(pkg.dependencies?.['simple-leveled-log-methods']).toBeUndefined();
        expect(
          pkg.devDependencies?.['simple-leveled-log-methods'],
        ).toBeUndefined();
      });

      then('both sections and their peer deps survive the re-apply', () => {
        expect(pkg.dependencies).toBeDefined();
        expect(pkg.devDependencies).toBeDefined();
        expect(pkg.dependencies.uuid).toEqual('9.0.0');
        expect(pkg.devDependencies.jest).toEqual('29.3.1');
      });
    });
  });
});
