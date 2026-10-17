import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the pg-client-without-ssl fix (#652), run through the REAL declapract
 *         apply pipeline against a genTempDir clone of a consumer repo
 * .why = a unit test of `fix` never proves the `src/**\/*.ts` glob reaches a client the repo built
 *        on its own, nor that one apply leaves it converged. a client that reads the app config is
 *        given verified tls; a client that does not is flagged for a human, and never guessed at
 * .note = each touched file is snapshotted in full, before AND after, per
 *         rule.require.declapract-integration-tests
 */
// each apply evaluates the whole practice, which runs long under a full suite
jest.setTimeout(10 * 60 * 1000);

describe('pg-client-without-ssl (#652)', () => {
  given('[case1] a repo with two plaintext pg clients of its own', () => {
    const tempDir = genTempDir({
      slug: 'declapract-persist-with-rds-pg-client-without-ssl',
      clone:
        './src/practices/persist-with-rds/bad-practices/pg-client-without-ssl/.test/assets/demo-repo-with-plaintext-pg-client',
      symlink: [{ at: 'declarations', to: 'src' }],
    });
    const files = [
      'src/utils/database/getSurfReportConnection.ts',
      'src/access/sdks/sdkWaveArchive.ts',
    ];
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyAll = async () => {
      for (const file of files)
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'persist-with-rds',
          file,
        });
    };

    when('[t0] the input, before any fix', () => {
      then('each client file matches snapshot', async () => {
        for (const file of files)
          expect(await read(file)).toMatchSnapshot(`${file} — before`);
      });
    });

    when('[t1] apply runs', () => {
      useThen('apply the fix', async () => applyAll());

      then('the config-backed client declares verified tls, and matches snapshot', async () => {
        const after = await read(files[0]!);
        expect(after).toContain(
          'ssl: asDatabaseClientSsl({ clusterEndpoint: config.database.tunnel.lambda?.host ?? null }),',
        );
        expect(after).toContain(
          "import { asDatabaseClientSsl } from '@src/utils/database/asDatabaseClientSsl';",
        );
        expect(after).toMatchSnapshot(`${files[0]} — after`);
      });

      then('the client outside the config is flagged, not guessed at, and matches snapshot', async () => {
        const after = await read(files[1]!);
        expect(after.split('\n')[0]).toContain('@declapract:review: a pg Client here');
        expect(after).toContain(
          'new pg.Client({ host: process.env.WAVE_ARCHIVE_HOST });',
        );
        expect(after).toMatchSnapshot(`${files[1]} — after`);
      });
    });

    when('[t2] apply runs again (idempotency)', () => {
      const passes = useThen('a second apply', async () => {
        const before = await Promise.all(files.map((file) => read(file)));
        await applyAll();
        const after = await Promise.all(files.map((file) => read(file)));
        return { before, after };
      });

      then('the second apply changes zero bytes', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
