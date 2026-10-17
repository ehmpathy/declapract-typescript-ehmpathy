import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

const FIXTURES = './src/practices/bottleneck/bad-practices/bottleneck/.test/assets';

/**
 * .what = end-to-end proof of the bottleneck → with-bottleneck move, through the REAL apply.
 * .why  = the fix reads the consumer's src via getProjectRootDirectory() to decide whether
 *   bottleneck may leave (#663, F42); only the pipeline proves that read lands on the real repo.
 */
describe('bottleneck bad-practice', () => {
  const genRepo = (input: { fixture: string; slug: string }) =>
    genTempDir({
      slug: input.slug,
      clone: `${FIXTURES}/${input.fixture}`,
      symlink: [
        { at: 'declarations', to: './src/.test/assets/bottleneck/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

  const applyFix = (input: { tempDir: string }) =>
    executeApply({
      config: path.join(input.tempDir, 'declapract.use.yml'),
      practice: 'bottleneck',
      file: 'package.json',
    });

  given('[case1] bottleneck@2.x and no src import of it', () => {
    const tempDir = genRepo({
      fixture: 'demo-repo-without-bottleneck-import',
      slug: 'declapract-bottleneck-unused',
    });
    const read = () => fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');

    when('[t0] the fix is applied', () => {
      const result = useThen('apply twice', async () => {
        const before = await read();
        await applyFix({ tempDir });
        const once = await read();
        await applyFix({ tempDir });
        const twice = await read();
        return { before, once, twice };
      });

      then('with-bottleneck is pinned at 0.1.2 and bottleneck leaves', () => {
        const pkg = JSON.parse(result.once);
        expect(pkg.dependencies['with-bottleneck']).toEqual('0.1.2');
        expect(pkg.dependencies.bottleneck).toBeUndefined();
        expect(result.before).toMatchSnapshot('package.json — before');
        expect(result.once).toMatchSnapshot('package.json — after');
      });

      then('the second apply is a no-op', () => {
        expect(result.twice).toEqual(result.once);
      });
    });
  });

  given('[case2] bottleneck@2.x and a src file that imports it', () => {
    const tempDir = genRepo({
      fixture: 'demo-repo-with-bottleneck-import',
      slug: 'declapract-bottleneck-imported',
    });
    const read = () => fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');

    when('[t0] the fix is applied', () => {
      const result = useThen('apply twice', async () => {
        const before = await read();
        await applyFix({ tempDir });
        const once = await read();
        await applyFix({ tempDir });
        const twice = await read();
        return { before, once, twice };
      });

      then('with-bottleneck is added at 0.1.2 and bottleneck stays, so the import still builds', () => {
        const pkg = JSON.parse(result.once);
        expect(pkg.dependencies['with-bottleneck']).toEqual('0.1.2');
        expect(pkg.dependencies.bottleneck).toEqual('2.19.5');
        expect(result.before).toMatchSnapshot('package.json — before');
        expect(result.once).toMatchSnapshot('package.json — after');
      });

      then('the second apply is a no-op', () => {
        expect(result.twice).toEqual(result.once);
      });
    });
  });
});
