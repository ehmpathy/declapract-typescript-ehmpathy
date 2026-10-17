import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply evaluates the whole tests-any practice
jest.setTimeout(240_000);

/**
 * .what = integration test for old-acceptance-dir-location bad practice
 * .why = reproduces bug where files with non-ts extensions are silently dropped
 */
describe('old-acceptance-dir-location', () => {
  given('[case1] accept.blackbox/ with various file types', () => {
    const tempDir = genTempDir({
      slug: 'declapract-old-acceptance-dir',
      clone: './src/practices/tests-any/bad-practices/old-acceptance-dir-location/.test/assets/demo-repo-with-accept-blackbox-dir',
      // evaluate tests-any alone against the tiny repo; a symlink of this repo's whole src makes
      // the practice's src/** globs walk every fixture (minutes per apply)
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/tests-any-only/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
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
      // one apply per fixture file, each scoped by `file`: an unscoped apply walks the linked
      // declarations into this repo's real tests-any tree, and its `**/*.ts` rewrites land there
      useThen('fix is applied', async () => {
        const files = [
          'accept.blackbox/somefile.ts',
          'accept.blackbox/.test/assets/.rhachet/manifest.json',
          'accept.blackbox/.test/assets/.agent/config.yml',
        ];
        for (const file of files)
          await executeApply({
            config: path.join(tempDir, 'declapract.use.yml'),
            practice: 'tests-any',
            file,
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
