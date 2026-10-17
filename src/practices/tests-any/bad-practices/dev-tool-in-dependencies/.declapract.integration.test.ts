import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply evaluates the whole practice
jest.setTimeout(240_000);

/**
 * .what = proves `declapract fix` on tests-any removes a stale test-fns from dependencies, so the
 *         floored devDependencies entry is the one that installs (#657)
 * .why  = the floor raised devDependencies alone; a `dependencies: 1.4.x` duplicate won the install
 */
describe('tests-any dev-tool-in-dependencies — pipeline', () => {
  given('[case1] a repo with test-fns 1.4.0 in dependencies and 1.15.0 in devDependencies', () => {
    const tempDir = genTempDir({
      slug: 'declapract-dev-tool-in-deps',
      clone:
        './src/practices/tests-any/bad-practices/dev-tool-in-dependencies/.test/assets/demo-repo-with-stale-test-fns-dep',
      // evaluate tests-any alone against the tiny repo; a symlink of this repo's whole src makes
      // the practice's src/** globs walk every fixture here (minutes per apply)
      symlink: [
        { at: 'declarations', to: './src/.test/assets/tests-any-only/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = () => fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');

    const state = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');
      const before = await read();
      await executeApply({ config, practice: 'tests-any', file: 'package.json' });
      const after1 = await read();
      await executeApply({ config, practice: 'tests-any', file: 'package.json' });
      const after2 = await read();
      await executeApply({ config, practice: 'tests-any', file: 'package.json' });
      const after3 = await read();
      return { before, after1, after2, after3 };
    }, 230_000);

    when('[t0] declapract fix is applied', () => {
      then('test-fns is gone from dependencies, and the runtime dep stays', () => {
        const pkg = JSON.parse(state.after2);
        expect(pkg.dependencies['test-fns']).toBeUndefined();
        expect(pkg.dependencies['domain-objects']).toEqual('0.31.0');
      });

      then('devDependencies holds test-fns at or above the floor', () => {
        const pkg = JSON.parse(state.after2);
        expect(pkg.devDependencies['test-fns']).not.toEqual('1.4.0');
        expect(pkg.devDependencies['test-fns']).not.toEqual('1.15.0');
        expect(pkg.devDependencies['test-fns']).not.toContain('@declapract{');
      });

      then('before + after match snapshot', () => {
        expect(state.before).toMatchSnapshot('package.json — before');
        expect(state.after2).toMatchSnapshot('package.json — after');
      });
    });

    when('[t1] declapract fix is re-applied', () => {
      then('the package.json is a fixed point once settled', () => {
        expect(state.after3).toEqual(state.after2);
      });
    });
  });
});
