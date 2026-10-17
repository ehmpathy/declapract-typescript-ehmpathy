import fs from 'node:fs/promises';
import path from 'node:path';

import type { FileCheckContext } from 'declapract';
import { genTempDir, getError, given, then, useBeforeAll, when } from 'test-fns';

import {
  genUnmigratedParamPathsDeclaration,
  UNMIGRATED_PARAM_PATHS_MARKER,
  UNMIGRATED_PARAM_PATHS_MARKER_KEY,
} from './genUnmigratedParamPathsDeclaration';

/**
 * .what = proves the unmigrated-param-paths check flags each config of a repo whose configs hold
 *         an explicit `$.at(aws::param/…)` path, and that its fix stamps the marker once (#544)
 * .note = INTEGRATION by rule.forbid.unit.remote-boundaries: the check reads the peer configs off disk
 */

const { check, fix } = genUnmigratedParamPathsDeclaration();

const EXPLICIT = JSON.stringify(
  {
    database: {
      role: {
        crud: { password: '$.at(aws::param/test-org/test-project/prep/crud)' },
      },
    },
  },
  null,
  2,
);
const BARE = JSON.stringify(
  { database: { role: { crud: { password: '$.at(aws::param)' } } } },
  null,
  2,
);

// each `as FileCheckContext` below is a documented cast: the context carries many fields this
// declaration never reads; it reads only getProjectRootDirectory(). removal path: a declapract
// partial-context builder.
describe('genUnmigratedParamPathsDeclaration (#544)', () => {
  given('[case1] a repo whose prep.json holds an explicit param path', () => {
    const tempDir = genTempDir({ slug: 'unmigrated-param-paths-explicit' });
    const context = useBeforeAll(async () => {
      await fs.mkdir(path.join(tempDir, 'config'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'config/prep.json'), EXPLICIT);
      await fs.writeFile(path.join(tempDir, 'config/test.json'), BARE);
      return {
        value: { getProjectRootDirectory: () => tempDir } as FileCheckContext,
      };
    });

    when('[t0] the check runs on prep and on test', () => {
      then('both are flagged, so all three carry the marker together', async () => {
        await check(EXPLICIT, context.value);
        await check(BARE, context.value);
      });
    });

    when('[t1] the fix runs, then runs again', () => {
      then('the marker is stamped once, the explicit path kept, and the check passes', async () => {
        const once = await fix(EXPLICIT, context.value);
        const twice = await fix(once.contents!, context.value);
        expect(twice.contents).toEqual(once.contents);
        expect(JSON.parse(once.contents!)[UNMIGRATED_PARAM_PATHS_MARKER_KEY]).toEqual(
          UNMIGRATED_PARAM_PATHS_MARKER,
        );
        expect(once.contents).toContain(
          '$.at(aws::param/test-org/test-project/prep/crud)',
        );
        const error = await getError(() => check(once.contents!, context.value));
        expect(error.message).toContain('already marked');
        expect(once.contents).toMatchSnapshot();
      });
    });
  });

  given('[case2] a repo whose configs hold only bare placeholders', () => {
    const tempDir = genTempDir({ slug: 'unmigrated-param-paths-bare' });
    const context = useBeforeAll(async () => {
      await fs.mkdir(path.join(tempDir, 'config'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'config/prep.json'), BARE);
      return {
        value: { getProjectRootDirectory: () => tempDir } as FileCheckContext,
      };
    });

    when('[t0] the check runs', () => {
      then('the file is not flagged', async () => {
        const error = await getError(() => check(BARE, context.value));
        expect(error.message).toContain('no explicit param path');
      });
    });
  });
});
