import { relative } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { getAllPathsUnderDir } from '../../utils/getAllPathsUnderDir';

/**
 * .what = holds the `own-implementation` bad-practice to a catch-all `src` glob (matches at any
 *         depth), so it catches a consumer's own `UnexpectedCodePathError.ts` no matter which
 *         directory segment holds it (D48 / #571).
 * .why  = a declapract declaration's FILENAME is its target glob. the declaration was pinned to the
 *         literal `src/utils/errors/UnexpectedCodePathError.ts`, so a consumer that keeps its own
 *         implementation one segment away — `src/domain/errors/…`, `src/errors/…` — was NEVER
 *         matched, and the bad practice silently never fired. its two kin (`error-fns`,
 *         `local-error-imports`) already glob every `.ts` at any depth; this holds
 *         `own-implementation` to the same catch-all so the miss-by-one-segment case cannot recur.
 * .note = this is an INTEGRATION test by the same rule the kin `domain` walk cites — it reads the
 *         filesystem (`readdirSync` over the bad-practice tree), and
 *         `rule.forbid.unit.remote-boundaries` puts any test that reads the filesystem in the
 *         integration suite. it needs no credential and no network; the boundary alone classifies it.
 */

const BAD_PRACTICES_DIR = `${__dirname}/bad-practices`;
const CATCH_ALL_PREFIX = 'src/**/';

/**
 * .what = every declaration path (`*.declapract.ts`, minus tests) under a bad-practice dir, walked
 *         with node's own readdir
 */
const getAllDeclarationPathsUnderDir = (input: { dir: string }): string[] =>
  getAllPathsUnderDir({ dir: input.dir, skip: null }).filter(
    (path) =>
      /\.declapract\.ts$/.test(path) && !/\.declapract\.test\.ts$/.test(path),
  );

/**
 * .what = the CONSUMER target glob a declaration governs, relative to its bad-practice dir.
 *         a `*.declapract.ts` declaration governs its filename minus that suffix — which, since the
 *         filename may hold glob segments, IS the target glob declapract matches on.
 */
const asConsumerTargetGlob = (input: {
  absPath: string;
  badPracticeDir: string;
}): string =>
  relative(input.badPracticeDir, input.absPath).replace(/\.declapract\.ts$/, '');

/**
 * .what = the first path segment of a relative path (the head dir, before the first `/`).
 * .why  = a pure transformer leaf, named so the composer below reads intent rather than an
 *         inline positional `.split('/')[0]` a reader must simulate to know which segment lands.
 */
const asFirstPathSegment = (input: { relPath: string }): string =>
  input.relPath.split('/')[0]!;

/**
 * .what = the bad-practice dir that governs a declaration = its first path segment under
 *         BAD_PRACTICES_DIR. a declaration's consumer glob is computed relative to this, so the
 *         `own-implementation/` (etc) segment is stripped before the `src/` check.
 */
const asBadPracticeDir = (input: { absPath: string }): string =>
  `${BAD_PRACTICES_DIR}/${asFirstPathSegment({
    relPath: relative(BAD_PRACTICES_DIR, input.absPath),
  })}`;

describe('errors practice — catch-all glob paths (D48 clamp)', () => {
  given('[case1] the `own-implementation` bad-practice', () => {
    const badPracticeDir = `${BAD_PRACTICES_DIR}/own-implementation`;
    const scene = useBeforeAll(() => ({
      targetGlobs: getAllDeclarationPathsUnderDir({ dir: badPracticeDir }).map(
        (absPath) => asConsumerTargetGlob({ absPath, badPracticeDir }),
      ),
    }));

    when('[t0] its declared consumer target globs are gathered', () => {
      then('it governs UnexpectedCodePathError.ts under a catch-all src glob at any depth', () => {
        // teeth: the pre-fix declaration at `src/utils/errors/UnexpectedCodePathError.ts.declapract.ts`
        // governs the literal `src/utils/errors/UnexpectedCodePathError.ts` — no catch-all segment —
        // so a revert to the pinned path reddens this assertion.
        expect(scene.targetGlobs).toContain(
          `${CATCH_ALL_PREFIX}UnexpectedCodePathError.ts`,
        );
      });

      then('no declaration pins the file to a fixed intermediate segment', () => {
        // every declaration under this bad-practice that governs a src-tree file must glob at any
        // depth; a fixed intermediate dir (e.g. `src/utils/errors/…`) is the miss-by-one-segment
        // defect D48 names.
        const pinnedToFixedSegment = scene.targetGlobs.filter(
          (glob) => glob.startsWith('src/') && !glob.startsWith(CATCH_ALL_PREFIX),
        );
        expect(pinnedToFixedSegment).toEqual([]);
      });
    });
  });

  given('[case2] every error bad-practice that governs a src-tree file', () => {
    const scene = useBeforeAll(() => ({
      // gather the src-tree target globs across ALL error bad-practices, so the catch-all
      // convention is held for the whole practice, not just `own-implementation`. each
      // declaration's bad-practice dir is its first path segment under BAD_PRACTICES_DIR, so the
      // consumer glob is computed relative to the practice that governs it.
      srcTargetGlobs: getAllDeclarationPathsUnderDir({ dir: BAD_PRACTICES_DIR })
        .map((absPath) =>
          asConsumerTargetGlob({
            absPath,
            badPracticeDir: asBadPracticeDir({ absPath }),
          }),
        )
        .filter((glob) => glob.startsWith('src/')),
    }));

    when('[t0] their consumer target globs are gathered', () => {
      then('every src-tree declaration globs at any depth', () => {
        const notCatchAll = scene.srcTargetGlobs.filter(
          (glob) => !glob.startsWith(CATCH_ALL_PREFIX),
        );
        expect(notCatchAll).toEqual([]);
      });
    });
  });
});
