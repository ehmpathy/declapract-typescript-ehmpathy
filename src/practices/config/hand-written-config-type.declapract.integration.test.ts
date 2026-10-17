import fs from 'node:fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = end-to-end proof that the `hand-written-config-type` bad-practice deletes an adopter's
 *         `src/utils/config/Config.ts` and repoints each import of it to `config.schema` (#661).
 * .why  = #588 dropped the hand-written Config.ts from the practice tree, but a repo stamped before
 *         #588 keeps its own copy; it has no reader and drifts (`access: 'test' | 'dev' | 'prod'`).
 *         a unit test of the fix never proves the glob matches the importers or that EXISTS + a
 *         null fix deletes the file.
 * .teeth = drop the bad-practice dir and the Config.ts survives, its importers still name it.
 */

const CONFIG_PATH = 'src/utils/config/Config.ts';
const IMPORTERS = [
  'src/utils/config/getAccessLabel.ts',
  'src/logic/getSurfReport.ts',
];

const exists = (filePath: string): Promise<boolean> =>
  fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);

// whole-usecase evaluation per file runs tens of seconds
jest.setTimeout(600_000);

describe('config — hand-written-config-type retires Config.ts (#661)', () => {
  given('[case1] a repo with a hand-written Config.ts and two importers', () => {
    const tempDir = genTempDir({
      slug: 'declapract-config-hand-written-config-type',
      clone:
        './src/practices/config/.test/assets/demo-repo-with-hand-written-config-type',
      symlink: [
        { at: 'declarations/practices', to: 'src/practices' },
        { at: 'declarations/useCases.yml', to: 'src/useCases.yml' },
      ],
    });

    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyAll = async () => {
      for (const file of [CONFIG_PATH, ...IMPORTERS])
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'config',
          file,
        });
    };

    when('[t0] the fix is applied, then applied again', () => {
      const scene = useBeforeAll(async () => {
        const before = {
          config: await read(CONFIG_PATH),
          importers: await Promise.all(IMPORTERS.map(read)),
        };
        await applyAll();
        const once = {
          configFound: await exists(path.join(tempDir, CONFIG_PATH)),
          importers: await Promise.all(IMPORTERS.map(read)),
        };
        await applyAll();
        const twice = {
          configFound: await exists(path.join(tempDir, CONFIG_PATH)),
          importers: await Promise.all(IMPORTERS.map(read)),
        };
        return { before, once, twice };
      });

      then('the hand-written Config.ts is deleted', () => {
        expect(scene.before.config).toContain("'dev'");
        expect(scene.once.configFound).toBe(false);
      });

      then('each importer now names config.schema', () => {
        expect(scene.once.importers[0]).toContain("from './config.schema'");
        expect(scene.once.importers[1]).toContain(
          "from '../utils/config/config.schema'",
        );
        scene.once.importers.forEach((contents) =>
          expect(contents).not.toMatch(/config\/Config'|'\.\/Config'/),
        );
      });

      then('a second apply changes no byte', () => {
        expect(scene.twice).toEqual(scene.once);
      });

      then('before and after match snapshot', () => {
        IMPORTERS.forEach((file, index) => {
          expect(scene.before.importers[index]).toMatchSnapshot(`${file} — before`);
          expect(scene.once.importers[index]).toMatchSnapshot(`${file} — after`);
        });
      });
    });
  });
});
