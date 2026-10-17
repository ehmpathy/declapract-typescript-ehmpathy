import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply evaluates the whole practice
jest.setTimeout(240_000);

/**
 * .what = proves an adopter whose package.json still calls `npx simple-artifact-builder zip`
 *         converges on the bare command when `declapract apply` runs (#672)
 * .why  = package.json is a CONTAINS check. a CONTAINS check alone would flag the old command
 *         forever; the json fix must rewrite the mismatched value in place, or the adopter holds a
 *         check that can never pass. this proves the rewrite, on the real pipeline
 * .teeth = were the json fix to leave a mismatched value alone, after1 would still hold `npx` and
 *          the rewrite assertion reddens
 */
describe('artifact package.json — an extant npx command converges (#672)', () => {
  given('[case1] an adopter whose build:artifact calls the bin through npx', () => {
    const tempDir = genTempDir({
      slug: 'declapract-artifact-npx-command',
      clone:
        './src/practices/artifact/.test/assets/demo-repo-with-npx-command',
      // evaluate artifact alone against the tiny repo
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/artifact-only/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = () => fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');

    const state = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');
      const before = await read();
      await executeApply({ config, practice: 'artifact', file: 'package.json' });
      const after1 = await read();
      await executeApply({ config, practice: 'artifact', file: 'package.json' });
      const after2 = await read();
      return { before, after1, after2 };
    }, 230_000);

    when('[t0] declapract apply runs', () => {
      then('build:artifact calls simple-artifact-builder bare', () => {
        const pkg = JSON.parse(state.after1);
        expect(pkg.scripts['build:artifact']).toEqual(
          'simple-artifact-builder zip',
        );
      });

      then('the adopter-owned build command is left alone', () => {
        const pkg = JSON.parse(state.after1);
        expect(pkg.scripts.build).toEqual(
          'tsc -p ./tsconfig.build.json && npm run build:artifact',
        );
      });

      then('before + after match snapshot', () => {
        expect(state.before).toMatchSnapshot('package.json — before');
        expect(state.after1).toMatchSnapshot('package.json — after');
      });
    });

    when('[t1] declapract apply runs again', () => {
      then('the package.json is a fixed point', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });
});
