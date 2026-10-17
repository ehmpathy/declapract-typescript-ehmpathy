import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { given, then, when } from 'test-fns';

import { getAllPathsUnderDir } from './utils/getAllPathsUnderDir';

/**
 * .what = clamps the host-path class: no committed jest snapshot holds this checkout's absolute root
 * .why  = a snapshot that pins `/home/<who>/<worktree>/…` passes only on the checkout that wrote it,
 *         and goes red in ci and on every other clone. a subprocess that echoes `$0` is the usual
 *         source; its test must mask the path before it snapshots the output.
 * .teeth = drop the `<check-engine-skew.sh>` mask in persist-with-rds's engine-upgrade test and
 *          resnap; case1 reddens with that .snap named.
 */
describe('snapshotsHostPathFree', () => {
  const repoRoot = join(__dirname, '..');

  given('[case1] every committed jest snapshot under src/', () => {
    when('[t0] each is read', () => {
      then('none holds the absolute root of this checkout', () => {
        const snapshots = getAllPathsUnderDir({
          dir: join(repoRoot, 'src'),
          skip: ['node_modules', '.test'],
        }).filter((file) => file.endsWith('.snap'));
        expect(snapshots.length).toBeGreaterThan(10);
        const offenses = snapshots
          .filter((file) => readFileSync(file, 'utf8').includes(repoRoot))
          .map((file) => relative(repoRoot, file));
        expect(offenses).toEqual([]);
      });
    });
  });
});
