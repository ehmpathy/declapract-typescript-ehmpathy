import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply evaluates the whole usecase, so widen the jest budget
jest.setTimeout(180_000);

/**
 * .what = pipeline test for the rhachet package.json build order in a self-linked repo (#520)
 * .why  = a `link:.` repo boots its own roles, whose hooks load from `dist/`, so `prepare:rhachet`
 *         must build before `rhachet init`. the CONTAINS fix used to strip a hand-added build; now
 *         the contents fn reads the repo's own package.json and declares the build for a self-link
 * .note = declapract's CONTAINS fix writes a dep the repo lacks as its raw `@declapract{…}` marker,
 *         and only the next apply resolves it (ehmpathy/declapract; dream
 *         `v2026_10_14.reseed.declapract-contains-json-adds-raw-minversion-markers`). so the second
 *         apply resolves the marker, and the third proves the fixed point. [t0] asserts the marker,
 *         so the day declapract resolves it in one apply, [t0] reddens and this note retires
 */
describe('rhachet — prepare:rhachet builds first in a self-linked repo', () => {
  given('[case1] a rhachet roles package with a link:. self-dep and no build before init', () => {
    const tempDir = genTempDir({
      slug: 'rhachet-self-linked',
      clone: './src/practices/rhachet/.test/assets/repo-self-linked',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/rhachet/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const state = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');
      const read = () =>
        fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');
      const before = await read();
      await executeApply({ config, file: 'package.json' });
      const after1 = await read();
      await executeApply({ config, file: 'package.json' });
      const after2 = await read();
      await executeApply({ config, file: 'package.json' });
      const after3 = await read();
      return { before, after1, after2, after3 };
    }, 170_000);

    when('[t0] the rhachet practice is applied', () => {
      then('prepare:rhachet runs npm run build before rhachet init', () => {
        const commands = JSON.parse(state.after1).scripts;
        expect(commands['prepare:rhachet']).toMatch(
          /^npm run build && rhachet init --keys --hooks --roles /,
        );
      });

      then('the self-dep and the build command survive', () => {
        const parsed = JSON.parse(state.after1);
        expect(parsed.devDependencies['rhachet-roles-demo']).toEqual('link:.');
        expect(parsed.scripts.build).toEqual('tsc -p ./tsconfig.build.json');
      });

      then('a dep the repo lacked lands as its raw declapract marker (upstream defect)', () => {
        expect(JSON.parse(state.after1).devDependencies['rhachet-brains-openrouter']).toMatch(
          /^@declapract\{check\.minVersion\('[\d.]+'\)\}$/,
        );
      });

      then('the before + after contents match snapshot', () => {
        expect(state.before).toMatchSnapshot('package.json — before');
        expect(state.after1).toMatchSnapshot('package.json — after');
      });
    });

    when('[t1] the practice is applied a second time', () => {
      then('every raw marker resolves to a version, and the build step is kept', () => {
        expect(state.after2).not.toContain('@declapract{');
        expect(JSON.parse(state.after2).scripts['prepare:rhachet']).toMatch(
          /^npm run build && rhachet init /,
        );
        expect(state.after2).toMatchSnapshot('package.json — after the second apply');
      });
    });

    when('[t2] the practice is applied a third time', () => {
      then('the third apply is a no-op', () => {
        expect(state.after3).toEqual(state.after2);
      });
    });
  });
});
