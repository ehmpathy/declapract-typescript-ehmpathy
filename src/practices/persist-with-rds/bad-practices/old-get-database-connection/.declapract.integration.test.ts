import fs from 'fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { FileCheckContext } from 'declapract';
import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { asTemplateFingerprint } from '../../../../utils/asTemplateFingerprint';
import {
  check as checkOldTest,
  fix as fixOldTest,
  OLD_TEST_TEMPLATE_FINGERPRINTS,
} from './src/utils/database/getDatabaseConnection.integration.test.ts.declapract';
import {
  check as checkOldFactory,
  fix as fixOldFactory,
  OLD_TEMPLATE_FINGERPRINTS,
} from './src/utils/database/getDatabaseConnection.ts.declapract';

/**
 * .what = proof of the old-get-database-connection retirement (#659): every body the practice
 *         ever shipped at `src/utils/database/getDatabaseConnection.ts` is deleted, an edited copy
 *         is kept and flagged, and every importer is repointed onto `getOneDatabaseConnection` —
 *         first per declaration, then through the REAL declapract apply pipeline.
 * .why = b8d4803 renamed the factory and left the old file behind, where it still reads the
 *        `database.service` config key the practice removed — tsc goes red on every adopter that
 *        carried it, and 50+ importers still name it. a delete of a file an adopter edited would
 *        drop that edit silently, so the delete keys on a template match, never on existence.
 * .teeth = drop a fingerprint and its fixture reddens; delete on existence alone and the edited
 *          copy case reddens; rename every `getDatabaseConnection` token and the foreign-import
 *          case in `daoSurfer.ts` reddens.
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads fixture files and runs an
 *         apply into a temp dir.
 */
// each apply evaluates the whole practice, and case4 runs four per pass
jest.setTimeout(10 * 60 * 1000);

const OLD_TEMPLATES_DIR =path.join(__dirname, '.test/assets/old-templates');
const context = {} as FileCheckContext; // note: these declarations read no context

const oldFactoryFixtures = readdirSync(OLD_TEMPLATES_DIR)
  .filter((name) => /^getDatabaseConnection\.[0-9a-f]+\.ts$/.test(name))
  .map((name) => ({
    name,
    source: readFileSync(path.join(OLD_TEMPLATES_DIR, name), 'utf8'),
  }));
const oldTestFixture = readFileSync(
  path.join(OLD_TEMPLATES_DIR, 'getDatabaseConnection.integration.test.66284e3.ts'),
  'utf8',
);

describe('old-get-database-connection (#659)', () => {
  given('[case1] each body the practice shipped at getDatabaseConnection.ts', () => {
    then('every template revision is held as a fixture', () => {
      expect(oldFactoryFixtures.length).toEqual(10);
    });

    oldFactoryFixtures.forEach((fixture) =>
      when(`[t0] ${fixture.name} is fixed`, () => {
        then('its fingerprint is a known template', () => {
          expect(OLD_TEMPLATE_FINGERPRINTS).toContain(
            asTemplateFingerprint({ source: fixture.source }),
          );
        });
        then('the file is deleted', () => {
          expect(() => checkOldFactory(fixture.source, context)).not.toThrow();
          expect(fixOldFactory(fixture.source, context)).toEqual({ contents: null });
        });
      }),
    );

    when('[t1] the newest template, reformatted (double quotes, no semicolons)', () => {
      const newest = oldFactoryFixtures.find((fixture) =>
        fixture.name.includes('e0c53d8'),
      )!.source;
      const reformatted = newest
        .replace(/^(import .*)'([^']+)';$/gm, '$1"$2"')
        .replace(/;$/gm, '');
      then('format drift still reads as the template, so the file is deleted', () => {
        expect(reformatted).not.toEqual(newest);
        expect(fixOldFactory(reformatted, context)).toEqual({ contents: null });
      });
    });
  });

  given('[case2] a getDatabaseConnection.ts the adopter edited', () => {
    const newest = oldFactoryFixtures.find((fixture) =>
      fixture.name.includes('e0c53d8'),
    )!.source;
    const edited = newest.replace(
      'await client.connect();',
      "await client.connect();\n  await client.query('SET statement_timeout = 5000;');",
    );

    when('[t0] fix runs', () => {
      const { contents: fixed } = fixOldFactory(edited, context) as {
        contents: string;
      };
      then('the file is kept, with its edit and a review pointer', () => {
        expect(fixed).toContain("SET statement_timeout = 5000;");
        expect(fixed.split('\n')[0]).toContain(
          '@declapract:review: getDatabaseConnection.ts is retired',
        );
      });
      then('a second fix changes zero bytes', () => {
        expect(fixOldFactory(fixed, context)).toEqual({ contents: fixed });
      });
    });
  });

  given('[case3] the old integration test', () => {
    when('[t0] the shipped body is fixed', () => {
      then('its fingerprint is known, and the duplicate is deleted', () => {
        expect(OLD_TEST_TEMPLATE_FINGERPRINTS).toContain(
          asTemplateFingerprint({ source: oldTestFixture }),
        );
        expect(fixOldTest(oldTestFixture, context)).toEqual({ contents: null });
      });
    });

    when('[t1] an edited copy is fixed', () => {
      const edited = oldTestFixture.replace(
        "it('should be able",
        "it('should still be able",
      );
      const { contents: fixed } = fixOldTest(edited, context) as {
        contents: string;
      };
      then('it is kept and repointed, and check no longer detects it', () => {
        expect(fixed).toContain("from './getOneDatabaseConnection'");
        expect(fixed).toContain('await getOneDatabaseConnection()');
        expect(() => checkOldTest(fixed, context)).toThrow(
          'does not match bad practice',
        );
      });
    });
  });

  given('[case4] a repo with the old factory, its test, and two importers', () => {
    const tempDir = genTempDir({
      slug: 'declapract-persist-with-rds-old-get-database-connection',
      clone:
        './src/practices/persist-with-rds/bad-practices/old-get-database-connection/.test/assets/demo-repo-with-old-get-database-connection',
      symlink: [{ at: 'declarations', to: 'src' }],
    });
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const exists = (relativePath: string): Promise<boolean> =>
      fs
        .access(path.join(tempDir, relativePath))
        .then(() => true)
        .catch((error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return false; // absent is the probe's answer
          throw error; // any other read failure is a malfunction, never "absent"
        });
    const apply = (file: string) =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'persist-with-rds',
        file,
      });
    const importers = [
      'src/domain.operations/getSurfLesson.ts',
      'src/access/daos/daoSurfer.ts',
    ];
    const retired = [
      'src/utils/database/getDatabaseConnection.ts',
      'src/utils/database/getDatabaseConnection.integration.test.ts',
    ];

    when('[t0] the input, before any fix', () => {
      then('each importer matches snapshot', async () => {
        for (const importer of importers)
          expect(await read(importer)).toMatchSnapshot(`${importer} — before`);
      });
    });

    when('[t1] apply runs over each affected file', () => {
      useThen('apply', async () => {
        for (const file of [...retired, ...importers]) await apply(file);
      });

      then('the retired factory and its test are gone', async () => {
        for (const file of retired) expect(await exists(file)).toEqual(false);
      });

      then('the operation reads getOneDatabaseConnection, and matches snapshot', async () => {
        const after = await read('src/domain.operations/getSurfLesson.ts');
        expect(after).toContain("from '../utils/database/getOneDatabaseConnection'");
        expect(after).toContain('await getOneDatabaseConnection()');
        expect(after).not.toMatch(/\bgetDatabaseConnection\b/);
        expect(after).toMatchSnapshot('src/domain.operations/getSurfLesson.ts — after');
      });

      then('the dao is repointed, its foreign import untouched, and matches snapshot', async () => {
        const after = await read('src/access/daos/daoSurfer.ts');
        expect(after).toContain(
          "from '@src/utils/database/getOneDatabaseConnection'",
        );
        expect(after).toContain(
          "import { getDatabaseConnection as getLegacyWarehouse } from 'surf-warehouse-sdk'",
        );
        expect(after).toMatchSnapshot('src/access/daos/daoSurfer.ts — after');
      });
    });

    when('[t2] apply runs again (idempotency)', () => {
      const passes = useThen('a second apply', async () => {
        const before = await Promise.all(importers.map((file) => read(file)));
        for (const file of [...retired, ...importers]) await apply(file);
        const after = await Promise.all(importers.map((file) => read(file)));
        return { before, after };
      });

      then('the second apply changes zero bytes', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
