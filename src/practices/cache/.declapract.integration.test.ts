import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

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
    const tempDir = genTempDir({
      slug: 'cache-not-installed',
      clone: './src/practices/cache/.test/assets/repo-without-cache-package',
      symlink: [
        { at: 'declarations', to: './src/practices/cache/.test/assets/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
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
    const tempDir = genTempDir({
      slug: 'cache-outdated',
      clone: './src/practices/cache/.test/assets/repo-with-old-cache-package',
      symlink: [
        { at: 'declarations', to: './src/practices/cache/.test/assets/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
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
        // should have upgraded from 0.3.0 to 0.4.3
        expect(packageJson.dependencies['simple-in-memory-cache']).toBe('0.4.3');
      });
    });
  });

  given('[case3] repo WITH valid cache package version', () => {
    const tempDir = genTempDir({
      slug: 'cache-valid',
      clone: './src/practices/cache/.test/assets/repo-with-valid-cache-package',
      symlink: [
        { at: 'declarations', to: './src/practices/cache/.test/assets/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
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
        // should still be 0.4.3 (unchanged, already valid)
        expect(packageJson.dependencies['simple-in-memory-cache']).toBe('0.4.3');
      });
    });
  });
});
