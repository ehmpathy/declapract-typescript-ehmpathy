import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { FileCheckContext } from 'declapract';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { asTestKindPresenceCheck } from './asTestKindPresenceCheck';

/**
 * .what = clamps #679's forwards compat on the name-keyed declarations: a repo with only `._.`
 *         seam test files passes the kind-presence check, as one with old-suffix files does.
 * .teeth = revert the declaration to a bare `FileCheckType.EXISTS` (no seam walk) and [case2] reddens.
 * .note = INTEGRATION: the check walks a real temp repo on disk.
 */

// the single documented cast: declapract's FileCheckContext carries many fields this check never
// reads; it reads only getProjectRootDirectory(). removal path: a declapract partial-context builder.
const genContextForRoot = (root: string): FileCheckContext =>
  ({ getProjectRootDirectory: () => root }) as unknown as FileCheckContext;

const genRepo = (input: { slug: string; files: string[] }): string => {
  const root = genTempDir({ slug: input.slug });
  for (const file of input.files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), '// test');
  }
  return root;
};

const check = asTestKindPresenceCheck({
  dir: 'src',
  suffixOld: '.integration.test.ts',
  suffixSeam: '._.intg.test.ts',
});

describe('asTestKindPresenceCheck', () => {
  given('[case1] the declared glob found an old-suffix file', () => {
    then('it passes', async () => {
      const root = genRepo({ slug: 'kind-old', files: ['src/a.integration.test.ts'] });
      await check('// test', genContextForRoot(root));
    });
  });

  given('[case2] no old-suffix file, but a `._.intg` seam file', () => {
    then('it passes', async () => {
      const root = genRepo({ slug: 'kind-seam', files: ['src/deep/a._.intg.test.ts'] });
      await check(null, genContextForRoot(root));
    });
  });

  given('[case3] no test file of the kind in either form', () => {
    when('[t0] the check runs', () => {
      then('it fails, and names both suffix forms', async () => {
        const root = genRepo({ slug: 'kind-none', files: ['src/a.test.ts'] });
        const error = await getError(async () => check(null, genContextForRoot(root)));
        expect(error.message).toContain('*.integration.test.ts or *._.intg.test.ts');
      });
    });
  });

  given('[case4] a seam file only inside .agent/ (a scratch clone)', () => {
    then('it still fails, since that file is not the repo own', async () => {
      const root = genRepo({
        slug: 'kind-actors',
        files: ['src/.agent/.actors/x/a._.intg.test.ts'],
      });
      const error = await getError(async () => check(null, genContextForRoot(root)));
      expect(error).toBeInstanceOf(Error);
    });
  });
});
