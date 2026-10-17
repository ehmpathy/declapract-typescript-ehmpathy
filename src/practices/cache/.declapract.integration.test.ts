import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTempRepoWithDeclarationsOutside } from '../../utils/genTempRepoWithDeclarationsOutside';

// executeApply is slow (90+ seconds per invocation due to full practice evaluation)
jest.setTimeout(180_000); // 3 minutes

/**
 * .what = acceptance test for cache practice with .ifInstalled() modifier
 * .why = verifies that minVersion().ifInstalled() correctly:
 *        - skips check when package is not installed
 *        - flags outdated versions when package IS installed
 *        - passes when package is at or above minimum version
 */
describe('cache practice with ifInstalled', () => {
  given('[case1] repo WITHOUT cache package installed', () => {
    const tempDir = genTempRepoWithDeclarationsOutside({
      slug: 'cache-not-installed',
      clone: './src/practices/cache/.test/assets/repo-without-cache-package',
      declarations: './src/.test/assets/cache/declarations',
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });

    // run executeApply before assertions
    useBeforeAll(async () => {
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'cache',
      });
    }, 120_000); // 2 min timeout

    when('[t0] after declapract apply', () => {
      then('package.json is unchanged (ifInstalled skips absent packages)', async () => {
        const packageJson = JSON.parse(
          await fs.readFile(path.join(tempDir, 'package.json'), 'utf-8'),
        );
        // should NOT have added cache packages since they were absent
        expect(packageJson.dependencies['simple-in-memory-cache']).toBeUndefined();
        expect(packageJson.dependencies['simple-on-disk-cache']).toBeUndefined();
        expect(packageJson.dependencies['with-simple-cache']).toBeUndefined();
        // original dependency should still be there
        expect(packageJson.dependencies.lodash).toBe('4.17.21');
      });
    });
  });

  given('[case2] repo WITH outdated cache package', () => {
    const tempDir = genTempRepoWithDeclarationsOutside({
      slug: 'cache-outdated',
      clone: './src/practices/cache/.test/assets/repo-with-old-cache-package',
      declarations: './src/.test/assets/cache/declarations',
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });

    // run executeApply before assertions
    useBeforeAll(async () => {
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'cache',
      });
    }, 120_000); // 2 min timeout

    when('[t0] after declapract apply', () => {
      then('package.json has version upgraded to minimum', async () => {
        const packageJson = JSON.parse(
          await fs.readFile(path.join(tempDir, 'package.json'), 'utf-8'),
        );
        // should have upgraded from 0.3.0 to the 0.5.1 floor
        expect(packageJson.dependencies['simple-in-memory-cache']).toBe('0.5.1');
      });
    });
  });

  given('[case3] repo WITH valid cache package version', () => {
    const tempDir = genTempRepoWithDeclarationsOutside({
      slug: 'cache-valid',
      clone: './src/practices/cache/.test/assets/repo-with-valid-cache-package',
      declarations: './src/.test/assets/cache/declarations',
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });

    // run executeApply before assertions
    useBeforeAll(async () => {
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'cache',
      });
    }, 120_000); // 2 min timeout

    when('[t0] after declapract apply', () => {
      then('package.json version is unchanged (already at minimum)', async () => {
        const packageJson = JSON.parse(
          await fs.readFile(path.join(tempDir, 'package.json'), 'utf-8'),
        );
        // should still be 0.5.1 (unchanged, already at the floor)
        expect(packageJson.dependencies['simple-in-memory-cache']).toBe('0.5.1');
      });
    });
  });

  given('[case4] repo WITH a retired member, a member below its new floor, and retired directory options (#625, #644)', () => {
    const tempDir = genTempRepoWithDeclarationsOutside({
      slug: 'cache-retired-member',
      clone: './src/practices/cache/.test/assets/repo-with-retired-cache-member',
      declarations: './src/.test/assets/cache/declarations',
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });
    const srcPath = 'src/utils/cache/getCacheDirectory.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyAll = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'cache',
      });

    when('[t0] the cache practice is applied, then applied again', () => {
      const result = useBeforeAll(async () => {
        const before = { pkg: await read('package.json'), src: await read(srcPath) };
        await applyAll();
        const once = { pkg: await read('package.json'), src: await read(srcPath) };
        await applyAll();
        const twice = { pkg: await read('package.json'), src: await read(srcPath) };
        return { before, once, twice };
      }, 300_000);

      then('the retired member moves to with-simple-cache, and the family floor reaches with-domain-driven-cache', () => {
        const pkg = JSON.parse(result.once.pkg);
        expect(pkg.dependencies['with-simple-caching']).toBeUndefined();
        expect(pkg.dependencies['with-simple-cache']).toBe('0.17.3');
        expect(pkg.dependencies['with-domain-driven-cache']).toBe('1.1.5');
        expect(result.before.pkg).toMatchSnapshot('package.json — before');
        expect(result.once.pkg).toMatchSnapshot('package.json — after');
      });

      then('each retired directory option carries a review line that names `directory`', () => {
        const lines = result.once.src.split('\n');
        const persistIndex = lines.findIndex((line) =>
          line.includes('directoryToPersistTo: {'),
        );
        const s3Index = lines.findIndex((line) => line.includes('s3: {'));
        expect(lines[persistIndex - 1]).toContain('// @declapract:review:');
        expect(lines[s3Index - 1]).toContain('// @declapract:review:');
        expect(result.once.src).toContain('`directory`');
        expect(result.before.src).toMatchSnapshot('getCacheDirectory.ts — before');
        expect(result.once.src).toMatchSnapshot('getCacheDirectory.ts — after');
      });

      then('the second apply is a no-op', () => {
        expect(result.twice).toEqual(result.once);
      });
    });
  });

  given('[case5] repo WITH the retired member still imported by src (#625)', () => {
    const tempDir = genTempRepoWithDeclarationsOutside({
      slug: 'cache-retired-member-imported',
      clone: './src/practices/cache/.test/assets/repo-with-retired-cache-member-imported',
      declarations: './src/.test/assets/cache/declarations',
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });
    const srcPath = 'src/logic/getWaveReport.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyAll = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'cache',
      });

    when('[t0] the cache practice is applied, then applied again', () => {
      const result = useBeforeAll(async () => {
        const before = { pkg: await read('package.json'), src: await read(srcPath) };
        await applyAll();
        const once = { pkg: await read('package.json'), src: await read(srcPath) };
        await applyAll();
        const twice = { pkg: await read('package.json'), src: await read(srcPath) };
        return { before, once, twice };
      }, 300_000);

      then('the dep stays, so the import still builds', () => {
        const pkg = JSON.parse(result.once.pkg);
        expect(pkg.dependencies['with-simple-caching']).toBe('0.14.4');
        expect(pkg.dependencies['with-simple-cache']).toBeUndefined();
      });

      then('the import carries a review line that names with-simple-cache', () => {
        expect(result.once.src.split('\n')[0]).toContain(
          '// @declapract:review: with-simple-caching is retired',
        );
        expect(result.before.src).toMatchSnapshot('getWaveReport.ts — before');
        expect(result.once.src).toMatchSnapshot('getWaveReport.ts — after');
      });

      then('the second apply is a no-op', () => {
        expect(result.twice).toEqual(result.once);
      });
    });
  });
});
