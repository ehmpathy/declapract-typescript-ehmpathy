import { relative } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { getAllPathsUnderDir } from '../../utils/getAllPathsUnderDir';

/**
 * .what = holds the `domain` best-practice to the go-forward `src/domain.objects/` layout, so it
 *         can never again require a file that its kin `directory-structure-src`'s `domain-dir`
 *         bad-practice forbids (D51 / #574).
 * .why  = both practices sit in `typescript-project-core`, so every service repo carries both.
 *         `domain-dir` forbids EVERY file under `src/**​/domain/**` and its fix RELOCATES them to
 *         `src/domain.objects/`. while `domain` required `src/domain/objects/index.ts`, a repo that
 *         satisfied `domain` VIOLATED `domain-dir`, and `domain-dir`'s fix moved the required file
 *         AWAY — a terminal, unrepairable state. keyed on `domain.objects`, the two agree:
 *         `domain-dir`'s fix produces exactly what `domain` requires.
 * .note = this is an INTEGRATION test by the same rule the sibling `actionPins` walk cites — it
 *         reads the filesystem (`readdirSync` over the `domain` best-practice tree), and
 *         `rule.forbid.unit.remote-boundaries` puts any filesystem-crossing test in the integration
 *         suite. it needs no credential and no network; the boundary alone classifies it.
 * .note = this is the FOCUSED clamp for the one collision D51 named. the wish's broader durable
 *         guard — "no best-practice path is matched by a bad-practice glob in the SAME usecase,
 *         across every practice" — is owed as a follow-on; it must land with a full collision audit,
 *         since a repo-wide lint may surface other overlaps already present that each need a verdict.
 */

const BEST_PRACTICE_DIR = `${__dirname}/best-practice`;

// the `schematic-joi-model` bad-practice DETECTS joi models by content and rewrites them to
// domain-objects. its subject glob scopes WHERE it looks; keyed at the deprecated `src/domain/`
// path it is inert on any migrated repo (D51 / #574, ask 2) — the go-forward path is
// `src/domain.objects/`, exactly where `directory-structure-src`'s `domain-dir` relocates files.
const JOI_DETECTOR_DIR = `${__dirname}/bad-practices/schematic-joi-model`;

/**
 * .what = the CONSUMER target path a declaration governs, relative to a practice-half base dir.
 *         a `*.declapract.ts` declaration governs its filename minus that suffix; any other file is
 *         a template that governs itself.
 */
const asConsumerTargetPath = (input: { absPath: string; baseDir: string }): string => {
  const rel = relative(input.baseDir, input.absPath);
  return rel.replace(/\.declapract\.ts$/, '');
};

/**
 * .what = does a consumer target path sit under a bare `domain/` path segment?
 * .why = that is precisely the set `domain-dir`'s `src/**​/domain/**` glob forbids. a
 *        `domain.objects` segment is NOT a `domain` segment (the `.objects` makes it a distinct
 *        directory name), so the go-forward layout reads false here.
 */
const isUnderBareDomainSegment = (input: { targetPath: string }): boolean =>
  input.targetPath.split('/').includes('domain');

/**
 * .what = every declared CONSUMER target path under a practice-half dir — the walk minus the files
 *         that are not governed consumer paths (readmes, todos, `.test.ts`, `__snapshots__`).
 * .why  = both scenes below gather the same set from different base dirs; one named transformer
 *         holds the exclusion list in one place rather than an inline `.filter` chain a reader
 *         must simulate twice (rule.require.named-transformers).
 */
const getConsumerTargetPaths = (input: { dir: string }): string[] =>
  getAllPathsUnderDir({ dir: input.dir, skip: null })
    .filter((path) => !/\.declapract\.readme\.md$/.test(path))
    .filter((path) => !/\.declapract\.todo\.md$/.test(path))
    // a test file is not a governed consumer path — exclude it so the walk holds
    // only real declarations to the layout, not `.test.ts` / `__snapshots__`
    .filter((path) => !/\.test\.ts$/.test(path))
    .filter((path) => !/\/__snapshots__\//.test(path))
    .map((absPath) => asConsumerTargetPath({ absPath, baseDir: input.dir }));

describe('domain practice — go-forward layout (D51 clamp)', () => {
  given('[case1] the `domain` best-practice tree', () => {
    const scene = useBeforeAll(() => ({
      targetPaths: getConsumerTargetPaths({ dir: BEST_PRACTICE_DIR }),
    }));

    when('[t0] its declared consumer target paths are gathered', () => {
      then('none sits under a bare `domain/` segment that `domain-dir` forbids', () => {
        // teeth: the pre-fix declaration at `src/domain/objects/index.ts.declapract.ts` targets
        // `src/domain/objects/index.ts`, whose `domain` segment is exactly what `domain-dir`
        // relocates — so a revert of the move to the deprecated path reddens this assertion.
        const offenders = scene.targetPaths.filter((targetPath) =>
          isUnderBareDomainSegment({ targetPath }),
        );
        expect(offenders).toEqual([]);
      });

      then('the objects index is declared at the `src/domain.objects/` path', () => {
        expect(scene.targetPaths).toContain('src/domain.objects/index.ts');
      });
    });
  });

  given('[case2] the `schematic-joi-model` bad-practice tree', () => {
    const scene = useBeforeAll(() => ({
      targetPaths: getConsumerTargetPaths({ dir: JOI_DETECTOR_DIR }),
    }));

    when('[t0] its declared subject glob paths are gathered', () => {
      then('none sits under a bare `domain/` segment (else the detector is inert post-migration)', () => {
        // teeth: revert the glob to `src/domain/**/*.ts.declapract.ts` and its subject path
        // `src/domain/**/*.ts` carries a bare `domain` segment — the deprecated location a
        // migrated repo no longer holds — so this assertion reddens.
        const offenders = scene.targetPaths.filter((targetPath) =>
          isUnderBareDomainSegment({ targetPath }),
        );
        expect(offenders).toEqual([]);
      });

      then('the joi detector targets the go-forward `src/domain.objects/` path', () => {
        expect(scene.targetPaths).toContain('src/domain.objects/**/*.ts');
      });
    });
  });
});
