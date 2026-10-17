import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { given, then, when } from 'test-fns';

import { getAllPathsUnderDir } from './utils/getAllPathsUnderDir';

/**
 * .what = the argument text of each `<callee>(...)` call in a source, up to its balanced `)`
 * .why  = the clamp asks of each call what it mounts; a balanced scan reads the whole argument
 *         object, nested braces included, without a parser
 */
const getAllCallArgs = (input: { source: string; callee: string }): string[] =>
  input.source
    .split(`${input.callee}(`)
    .slice(1)
    .map((rest) => {
      // scan for the `)` that closes this call: depth counts nested `(`, `at` locks the first match
      const end = [...rest].reduce<{ depth: number; at: number | null }>(
        (acc, char, index) => {
          if (acc.at !== null) return acc;
          if (char === '(') return { ...acc, depth: acc.depth + 1 };
          if (char !== ')') return acc;
          if (acc.depth === 0) return { ...acc, at: index };
          return { ...acc, depth: acc.depth - 1 };
        },
        { depth: 0, at: null },
      ).at;
      return rest.slice(0, end ?? rest.length);
    });

/**
 * .what = whether a genTempDir call mounts this repo's `src` at the demo repo's own `src`
 * .why  = that mount is the one shape that makes the demo repo's `src` BE this whole library
 */
const isTempDirWithSrcMountedAtSrc = (input: { args: string }): boolean =>
  /at:\s*'src'\s*,\s*to:\s*'(\.\/)?src'/.test(input.args);

/**
 * .what = clamps the mount class: no integration test mounts this repo's `src` at the demo repo's
 *         own `src`; the declarations mount at `declarations` instead
 * .why  = a demo repo whose `src` IS this repo's src makes every `src/**` wildcard declaration scan
 *         the whole library, so each apply runs minutes and times out under suite load
 *         (legacy-change-id: 899s → 66s once re-mounted at `declarations`)
 * .teeth = restore `symlink: [{ at: 'src', to: 'src' }]` in any one converted suite (e.g. logs) and
 *          case1 reddens with that file named.
 */
describe('integrationMountsDeclarationsOutsideSrc', () => {
  const repoRoot = join(__dirname, '..');

  given('[case1] every integration test under src/', () => {
    when('[t0] each is read', () => {
      then('none mounts this repo src at the demo repo src', () => {
        const tests = getAllPathsUnderDir({
          dir: join(repoRoot, 'src'),
          skip: ['node_modules', '.test'],
        }).filter((file) => file.endsWith('.integration.test.ts'));
        expect(tests.length).toBeGreaterThan(10);
        const offenses = tests
          .filter((file) => file !== __filename) // this clamp names the pattern it hunts
          .filter((file) =>
            getAllCallArgs({
              source: readFileSync(file, 'utf8'),
              callee: 'genTempDir',
            }).some((args) => isTempDirWithSrcMountedAtSrc({ args })),
          )
          .map((file) => relative(repoRoot, file));
        expect(offenses).toEqual([]);
      });
    });
  });
});
