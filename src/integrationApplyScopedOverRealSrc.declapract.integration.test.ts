import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { given, then, when } from 'test-fns';

import { getAllPathsUnderDir } from './utils/getAllPathsUnderDir';

/**
 * .what = the argument text of each `<callee>(...)` call in a source, up to its balanced `)`
 * .why  = the clamp asks of each call what it links or scopes; a balanced scan reads the whole
 *         argument object, nested braces included, without a parser
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
 * .what = whether a genTempDir call mounts a link into this repo's src INSIDE the dir it makes
 * .why  = a link into src — `src` itself, or a declarations mirror whose `practices/<p>` links back
 *         to a real practice tree — is a write-through path only where an apply walks it. a mount
 *         whose slug ends `-declarations` is a separate temp dir beside the applied repo (the
 *         genTempRepoWithDeclarationsOutside convention), so no apply walks it
 */
const isTempDirWithSrcLinkInside = (input: { args: string }): boolean =>
  /to:\s*'(\.\/)?src\b/.test(input.args) &&
  !/slug:\s*[`'][^`']*-declarations[`']/.test(input.args);

/**
 * .what = clamps the write-through class: no integration test mounts a link into this repo's real
 *         `src` inside a temp repo AND runs an `executeApply` that names no `file`
 * .why  = an apply walks every path of the repo it applies to, links included, and a fix that
 *         rewrites `**\/*.ts` writes through the link into this repo's own source.
 *         old-acceptance-dir-location's test did exactly that: tests-any's `__test_utils__/` →
 *         `.test.utils/` rewrite reached a fixture and a test file in src. scope each apply with
 *         `file`, or mount the declarations outside the repo (genTempRepoWithDeclarationsOutside)
 * .teeth = restore `symlink: [{ at: 'src', to: 'src' }]` in old-acceptance-dir-location's test and
 *          drop its `file` scope; case1 reddens with that file named.
 */
describe('integrationApplyScopedOverRealSrc', () => {
  const repoRoot = join(__dirname, '..');

  given('[case1] every integration test under src/', () => {
    when('[t0] each is read', () => {
      then('none mounts a src link inside its repo and runs an apply with no file scope', () => {
        const tests = getAllPathsUnderDir({
          dir: join(repoRoot, 'src'),
          skip: ['node_modules', '.test'],
        }).filter((file) => file.endsWith('.integration.test.ts'));
        expect(tests.length).toBeGreaterThan(10);
        const offenses = tests
          .filter((file) => file !== __filename) // this clamp names the pattern it hunts
          .filter((file) => {
            const source = readFileSync(file, 'utf8');
            const linksSrcInside = getAllCallArgs({
              source,
              callee: 'genTempDir',
            }).some((args) => isTempDirWithSrcLinkInside({ args }));
            if (!linksSrcInside) return false;
            // a helper that spreads its input is scoped only where that input REQUIRES `file`
            const spreadIsScoped = /\bfile:\s*string\b/.test(source);
            return getAllCallArgs({ source, callee: 'executeApply' }).some(
              (args) => {
                if (/\bfile\b/.test(args)) return false;
                if (args.includes('...') && spreadIsScoped) return false;
                return true;
              },
            );
          })
          .map((file) => relative(repoRoot, file));
        expect(offenses).toEqual([]);
      });
    });
  });
});
