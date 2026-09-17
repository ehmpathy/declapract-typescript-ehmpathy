import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the rhachet/prod-deps fix (D26 / #571), run through the REAL declapract
 *   apply pipeline against a genTempDir clone of a consumer repo whose package.json lists `rhachet`
 *   AND a `rhachet-brains-*` package in `dependencies` (prod).
 * .why  = the old family regex was `/^rhachet(-roles-.*)?$/`, so a `rhachet-brains-*` prod dep slipped
 *   the net and stayed a prod dep — and if it were also a devDep at a different version, the manifest
 *   carried a duplicate whose two versions conflict. the fix is a widened `/^rhachet(-[a-z]+-.*)?$/`
 *   plus a `withRhachetDepsMovedToDevDeps` partition transformer that relocates every rhachet family
 *   package into devDependencies. a unit test of the transformer is necessary but not sufficient
 *   (`rule.require.declapract-integration-tests`): only the pipeline proves the declaration's target
 *   glob matches package.json and the relocation lands on a real consumer file.
 * .note = the package.json holds `rhachet` (single-segment) AND `rhachet-brains-anthropic` (the
 *   `-brains-` family the old regex missed), plus a non-rhachet prod dep (`uuid`) that must be
 *   retained. the after-state proves the widened match AND the retention of every other prod dep.
 */
describe('rhachet/prod-deps relocation', () => {
  given('[case1] a repo with rhachet + a rhachet-brains-* package in prod deps', () => {
    const tempDir = genTempDir({
      slug: 'declapract-rhachet-prod-deps',
      clone: './src/practices/rhachet/bad-practices/prod-deps/.test/assets/demo-repo-with-rhachet-prod-deps',
      symlink: [{ at: 'src', to: 'src' }],
    });

    const pkgPath = 'package.json';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'rhachet',
        file: pkgPath,
      });

    when('[t0] the input (before any fix)', () => {
      then('the package.json input matches snapshot', async () => {
        expect(await read(pkgPath)).toMatchSnapshot('package.json — before');
      });
    });

    when('[t1] the prod-deps fix is applied', () => {
      useThen('relocate every rhachet family package into devDeps', async () =>
        applyFix(),
      );

      then(
        'both rhachet packages leave dependencies and land in devDependencies, the non-rhachet prod dep is retained, and it matches snapshot',
        async () => {
          const pkg = JSON.parse(await read(pkgPath));
          // both rhachet family packages are gone from prod deps
          expect(pkg.dependencies?.['rhachet']).toBeUndefined();
          expect(pkg.dependencies?.['rhachet-brains-anthropic']).toBeUndefined();
          // and now sit in dev deps (the -brains- match is the D26 proof)
          expect(pkg.devDependencies['rhachet']).toEqual('1.47.5');
          expect(pkg.devDependencies['rhachet-brains-anthropic']).toEqual(
            '0.4.3',
          );
          // the non-rhachet prod dep is retained in dependencies
          expect(pkg.dependencies.uuid).toEqual('9.0.0');
          // the prior devDep survives untouched
          expect(pkg.devDependencies.jest).toEqual('29.3.1');
          // full content, for the reviewer's eye
          expect(await read(pkgPath)).toMatchSnapshot('package.json — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // .note = the D26 invariant under re-apply is that the relocation is a FIXED POINT: once
      //   moved, a second pass neither re-introduces a rhachet package into prod deps nor drops a
      //   retained dep. we do NOT assert full-file byte equality, because the rhachet best-practice
      //   package.json declaration (a separate declarer, out of scope for D26) writes a raw
      //   `@declapract{check.minVersion(...)}` marker on the first pass and resolves it on the
      //   second — a marker-resolution quirk of that declaration, not of the relocation under test.
      const pkg = useThen('a second apply over its own output', async () => {
        await applyFix(); // second apply, over the post-first-fix output
        return JSON.parse(await read(pkgPath));
      });

      then('the rhachet packages stay out of prod deps', () => {
        expect(pkg.dependencies?.['rhachet']).toBeUndefined();
        expect(pkg.dependencies?.['rhachet-brains-anthropic']).toBeUndefined();
      });

      then('the relocated + retained deps survive the re-apply', () => {
        expect(pkg.devDependencies['rhachet']).toEqual('1.47.5');
        expect(pkg.devDependencies['rhachet-brains-anthropic']).toEqual('0.4.3');
        expect(pkg.dependencies.uuid).toEqual('9.0.0');
        expect(pkg.devDependencies.jest).toEqual('29.3.1');
      });
    });
  });
});
