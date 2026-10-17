import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the package-json-order fix, run through the REAL declapract apply
 *   pipeline against a genTempDir clone of a consumer repo whose package.json holds its root keys,
 *   its scripts, and its dependencies out of the declared order.
 * .why  = the fix re-sorts keys of parsed json, and the declaration ships NO template — so the
 *   global fix-coverage harness only feeds it `fix(null)`, which proves naught about the sort. a
 *   unit test of the transformer is necessary but NOT sufficient
 *   (`rule.require.declapract-integration-tests`): only the pipeline proves declapract matches the
 *   declaration to the consumer's package.json, that a best-practice `check` that THROWS gates the
 *   `fix`, and that a second apply is a no-op on the real file.
 */
describe('package-json-order sort', () => {
  given('[case1] a repo whose package.json keys are out of order', () => {
    const tempDir = genTempDir({
      slug: 'declapract-package-json-order',
      clone:
        './src/practices/package-json-order/.test/assets/demo-repo-with-unordered-keys',
      symlink: [{ at: 'declarations', to: 'src' }],
    });

    const pkgPath = 'package.json';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'package-json-order',
        file: pkgPath,
      });

    when('[t0] the input (before any fix)', () => {
      then('the package.json input matches snapshot', async () => {
        expect(await read(pkgPath)).toMatchSnapshot('package.json — before');
      });
    });

    when('[t1] the package-json-order fix is applied', () => {
      const result = useThen('the apply succeeds', async () => {
        await applyFix();
        const contents = await read(pkgPath);
        return { contents, pkg: JSON.parse(contents) };
      });

      then('the root keys follow the declared relative order', () => {
        expect(Object.keys(result.pkg)).toEqual([
          'name',
          'author',
          'version',
          'scripts',
          'dependencies',
          'devDependencies',
        ]);
      });

      then('the declared scripts follow the declared relative order', () => {
        const declared = Object.keys(result.pkg.scripts).filter((key) =>
          ['build', 'test:unit', 'test'].includes(key),
        );
        expect(declared).toEqual(['build', 'test:unit', 'test']);
      });

      then('the undeclared script is kept, with its value untouched', () => {
        expect(result.pkg.scripts['custom:task']).toEqual('echo custom');
      });

      then('the dependencies and devDependencies are alphabetical', () => {
        expect(Object.keys(result.pkg.dependencies)).toEqual([
          'domain-objects',
          'uuid',
        ]);
        expect(Object.keys(result.pkg.devDependencies)).toEqual([
          'jest',
          'typescript',
        ]);
      });

      then('the package.json matches snapshot', () => {
        expect(result.contents).toMatchSnapshot('package.json — after');
      });
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      const result = useThen('a second apply over its own output', async () => {
        const before = await read(pkgPath);
        await applyFix();
        return { before, after: await read(pkgPath) };
      });

      then('the second apply changes zero bytes', () => {
        expect(result.after).toEqual(result.before);
      });
    });
  });
});
