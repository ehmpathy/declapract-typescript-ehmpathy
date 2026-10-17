import fs from 'fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { executeApply } from 'declapract';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTempRepoWithDeclarationsOutside } from '../../utils/genTempRepoWithDeclarationsOutside';

// executeApply evaluates the whole practice, so widen the jest budget
jest.setTimeout(180_000);

/**
 * .what = pipeline test for the pnpm patch settings + the stale-patched-dependency bad practice (#680)
 * .why  = only executeApply proves declapract merges `allowUnusedPatches` + `ignorePatchFailures`
 *         into a repo's extant `pnpm` field (its other keys kept), reads the repo's lockfile to
 *         judge a patch stale, drops the stale key, and deletes the stale patch file — and that a
 *         second apply is a no-op
 */
describe('pnpm — a stale patch never blocks an install', () => {
  given('[case1] a repo with one patch the lockfile moved past and one it still resolves', () => {
    const tempDir = genTempRepoWithDeclarationsOutside({
      slug: 'pnpm-stale-patch',
      clone: './src/practices/pnpm/.test/assets/repo-stale-patch',
      declarations: './src/.test/assets/pnpm/declarations',
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });
    const stalePatch = 'patches/rhachet-roles-ehmpathy@1.39.1.patch';
    const keptPatch = 'patches/type-fns@1.21.3.patch';

    const state = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');
      const read = () =>
        fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');
      const before = await read();
      await executeApply({ config });
      const after1 = await read();
      const exists1 = {
        stale: existsSync(path.join(tempDir, stalePatch)),
        kept: existsSync(path.join(tempDir, keptPatch)),
      };
      await executeApply({ config });
      const after2 = await read();
      return { before, after1, after2, exists1 };
    }, 170_000);

    when('[t0] the pnpm practice is applied', () => {
      then('pnpm declares allowUnusedPatches + ignorePatchFailures', () => {
        const pnpm = JSON.parse(state.after1).pnpm;
        expect(pnpm.allowUnusedPatches).toEqual(true);
        expect(pnpm.ignorePatchFailures).toEqual(true);
      });

      then("the repo's other pnpm keys are kept", () => {
        const pnpm = JSON.parse(state.after1).pnpm;
        expect(pnpm.overrides).toEqual({ 'react-refresh': '0.14.2' });
      });

      then('the stale patch key is retired, the resolved one kept', () => {
        const patched = JSON.parse(state.after1).pnpm.patchedDependencies;
        expect(patched).toEqual({
          'type-fns@1.21.3': 'patches/type-fns@1.21.3.patch',
        });
      });

      then('the stale patch file is deleted, the resolved one kept', () => {
        expect(state.exists1).toEqual({ stale: false, kept: true });
      });

      then('the before + after contents match snapshot', () => {
        expect(state.before).toMatchSnapshot('package.json — before');
        expect(state.after1).toMatchSnapshot('package.json — after');
      });
    });

    when('[t1] the practice is applied a second time', () => {
      then('the second apply is a no-op', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });
});
