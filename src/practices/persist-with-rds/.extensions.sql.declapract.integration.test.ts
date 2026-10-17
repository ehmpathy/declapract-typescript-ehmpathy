import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { readFile } from '../../utils/readFile';
import { fix } from './best-practice/provision/schema/sql/init/.extensions.sql.declapract';

// executeApply evaluates the whole persist-with-rds practice before the `file` filter narrows it
jest.setTimeout(10 * 60 * 1000);

const EXTENSIONS_SQL = 'provision/schema/sql/init/.extensions.sql';

describe('.extensions.sql fix', () => {
  it('should be able to fix a file with custom extensions correctly', async () => {
    const declaredFileContents = await readFile({
      filePath: `${__dirname}/best-practice/provision/schema/sql/init/.extensions.sql`,
    }); // grab the declared contents
    const exampleFoundContents = `
/**
 NOTE: because db owner is not allowed to create extensions, these changes are applied manually

  NOTE: for the integration test db, these are applied automatically upon spinning up the docker instance
*/
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";
    `;
    const { contents: fixedContents } = await fix(exampleFoundContents, {
      declaredFileContents,
    } as any);
    expect(fixedContents).toContain('CREATE EXTENSION IF NOT EXISTS "cube";');
    expect(fixedContents).toContain(
      'CREATE EXTENSION IF NOT EXISTS "earthdistance";',
    );
    expect(fixedContents).toMatchSnapshot();
  });
  it('should be able to create a new file to fix case where file does not exist yet', async () => {
    const declaredFileContents = await readFile({
      filePath: `${__dirname}/best-practice/provision/schema/sql/init/.extensions.sql`,
    }); // grab the declared contents
    const { contents: fixedContents } = await fix(null, {
      declaredFileContents,
    } as any);
    expect(fixedContents).toMatchSnapshot();
  });

  /**
   * .what = the twice-applied clamp (rule.require.idempotent-fixes)
   * .why  = the fix rebuilds the file from the template plus the custom lines it finds. a second
   *         pass must find the same custom lines once, keep them once, and emit the same bytes —
   *         else each `declapract fix` grows or reorders the custom block. the output must also
   *         CONTAIN the template, so the CONTAINS check passes and the plan stops to flag it.
   */
  it('should be a fixed point — fix(fix(x)) equals fix(x), and the output contains the template', async () => {
    const declaredFileContents = await readFile({
      filePath: `${__dirname}/best-practice/provision/schema/sql/init/.extensions.sql`,
    });
    const context = { declaredFileContents } as any;
    const input = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";
-- CREATE EXTENSION IF NOT EXISTS ...
`;

    const { contents: once } = await fix(input, context);
    const { contents: twice } = await fix(once, context);

    expect(twice).toEqual(once);
    expect(once).toContain(declaredFileContents.trim());
    expect(once?.match(/"cube"/g)).toHaveLength(1);
    expect(once?.match(/"uuid-ossp"/g)).toHaveLength(1);
  });

  /**
   * .what = the fix through the real declapract pipeline, on a repo with custom extensions
   * .why  = the unit cases above prove the fix in isolation; only executeApply proves the
   *         declared path reaches the target file, the CONTAINS check gates the fix, the
   *         `declaredFileContents` the fix reads is the template, and a rerun settles
   *         (rule.require.declapract-integration-tests)
   */
  given('[case1] a repo whose .extensions.sql predates the template and holds custom lines', () => {
    const tempDir = genTempDir({
      slug: 'declapract-persist-with-rds-extensions-sql',
      clone:
        './src/practices/persist-with-rds/.test/assets/demo-repo-with-custom-extensions',
      symlink: [{ at: 'declarations', to: 'src' }],
    });
    const read = () =>
      fs.readFile(path.join(tempDir, EXTENSIONS_SQL), 'utf-8');
    const apply = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'persist-with-rds',
        file: EXTENSIONS_SQL,
      });

    when('[t0] before any apply', () => {
      then('the input file matches snapshot', async () => {
        expect(await read()).toMatchSnapshot('.extensions.sql — before');
      });
    });

    when('[t1] apply runs', () => {
      const scene = useThen('apply settles', async () => {
        await apply();
        const declared = await readFile({
          filePath: `${__dirname}/best-practice/${EXTENSIONS_SQL}`,
        });
        return { after: await read(), declared };
      });

      then('the file now contains the whole template', () => {
        expect(scene.after).toContain(scene.declared.trim());
      });

      then('each custom extension survives, once', () => {
        expect(scene.after).toContain('CREATE EXTENSION IF NOT EXISTS "cube";');
        expect(scene.after).toContain(
          'CREATE EXTENSION IF NOT EXISTS "earthdistance";',
        );
        expect(scene.after.match(/"cube"/g)).toHaveLength(1);
        expect(scene.after.match(/"earthdistance"/g)).toHaveLength(1);
      });

      then('each required extension appears once, never duplicated', () => {
        expect(scene.after.match(/"uuid-ossp"/g)).toHaveLength(1);
        expect(scene.after.match(/"pgcrypto"/g)).toHaveLength(1);
      });

      then('the legacy note block is gone', () => {
        expect(scene.after).not.toContain('NOTE: because db owner');
      });

      then('no declapract template syntax leaked', () => {
        expect(scene.after).not.toContain('@declapract{');
      });

      then('the output matches snapshot', () => {
        expect(scene.after).toMatchSnapshot('.extensions.sql — after');
      });
    });

    when('[t2] apply runs a second time', () => {
      const before = useBeforeAll(async () => ({ contents: await read() }));
      const scene = useThen('apply again', async () => {
        await apply();
        return { after: await read() };
      });

      then('the file is byte-identical — the apply is a fixed point', () => {
        expect(scene.after).toEqual(before.contents);
      });
    });
  });
});
