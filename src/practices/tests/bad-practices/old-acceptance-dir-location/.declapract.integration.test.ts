import fs from 'fs/promises';
import path from 'path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration test for old-acceptance-dir-location bad practice
 * .why = reproduces bug where files with non-ts extensions are silently dropped
 */
describe('old-acceptance-dir-location', () => {
  given('[case1] accept.blackbox/ with various file types', () => {
    const tempDir = genTempDir({
      slug: 'declapract-old-acceptance-dir',
      clone: './src/practices/tests/bad-practices/old-acceptance-dir-location/.test/assets/demo-repo-with-accept-blackbox-dir',
      symlink: [{ at: 'src', to: 'src' }],
    });

    when('[t0] before fix', () => {
      then('accept.blackbox/ contains files', async () => {
        const rhachetFile = path.join(
          tempDir,
          'accept.blackbox/.test/assets/.rhachet/manifest.json',
        );
        const stats = await fs.stat(rhachetFile);
        expect(stats.isFile()).toBe(true);
      });
    });

    when('[t1] declapract fix is applied', () => {
      useThen('fix is applied', async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'tests',
        });
      });

      then('somefile.ts is moved to blackbox/', async () => {
        const newPath = path.join(tempDir, 'blackbox/somefile.ts');
        const stats = await fs.stat(newPath).catch(() => null);
        expect(stats?.isFile()).toBe(true);
      });

      then('.rhachet/manifest.json is moved to blackbox/', async () => {
        const newPath = path.join(
          tempDir,
          'blackbox/.test/assets/.rhachet/manifest.json',
        );
        const stats = await fs.stat(newPath).catch(() => null);
        expect(stats?.isFile()).toBe(true);
      });

      then('.agent/config.yml is moved to blackbox/', async () => {
        const newPath = path.join(
          tempDir,
          'blackbox/.test/assets/.agent/config.yml',
        );
        const stats = await fs.stat(newPath).catch(() => null);
        expect(stats?.isFile()).toBe(true);
      });
    });
  });
});
