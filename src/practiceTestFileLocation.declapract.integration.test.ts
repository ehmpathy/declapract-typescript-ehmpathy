import { join, relative } from 'node:path';

import { given, then, when } from 'test-fns';

import { getAllPathsUnderDir } from './utils/getAllPathsUnderDir';

/**
 * .what = clamps that NO test artifact which declapract's compile would SHIP sits under a
 *         `best-practice/` directory. compile strips `*.declapract.test.ts` (+ its `.snap`) before
 *         it publishes a practice — so a UNIT clamp and its snapshot may collocate inside
 *         `best-practice/`. it does NOT strip `*.declapract.integration.test.ts` (+ its `.snap`),
 *         nor any other `__snapshots__/` file — those would ship, so they must live at the practice
 *         ROOT (or another non-`best-practice/` home).
 * .why  = declapract's emission classifier (getProjectCheckDeclaration) treats every file under
 *         `best-practice/` that is not `.declapract.`-prefixed as a TEMPLATE to copy into the
 *         consumer repo, and compile only removes the two `.declapract.test.ts` shapes. a shipped
 *         `*.declapract.integration.test.ts` materializes at the consumer root as an EQUALS template
 *         — it `import`s `declapract`/`test-fns` and reads fixtures that exist ONLY in this library,
 *         so it fails jest load (ENOENT, or absent dev deps). found live on the app-protools-native
 *         upgrade (#583). the compile-strip asymmetry is `ehmpathy/declapract#109`.
 * .teeth = move a `*.declapract.integration.test.ts`, its `.snap`, or any other `__snapshots__/`
 *          file under `best-practice/` and this clamp reddens, with the offender in the diff.
 * .note = this lives at `src/` (not under any practice's `best-practice/`), so declapract never
 *         walks it for emission — the same safe home as `src/actionPins.declapract.integration.test.ts`.
 */

// anchored on `__dirname` (this file sits at `src/`) rather than cwd, so the walk holds wherever
// jest is invoked from — a nested-scope run or a CI checkout dir cannot silently scan the wrong
// tree and assert on zero files (a vacuous green). same safe home as
// `src/actionPins.declapract.integration.test.ts`.
const repoRoot = join(__dirname, '..');
const practicesDir = join(repoRoot, 'src/practices');

const isTestArtifact = (path: string): boolean =>
  path.endsWith('.declapract.test.ts') ||
  path.endsWith('.declapract.integration.test.ts') ||
  path.includes('/__snapshots__/');

// compile strips ONLY these two shapes before it publishes a practice, so they never reach a
// consumer even when they sit under `best-practice/` (a UNIT clamp + its snapshot).
const isStrippedByCompile = (path: string): boolean =>
  path.endsWith('.declapract.test.ts') ||
  path.endsWith('.declapract.test.ts.snap');

const isShippedTestArtifact = (path: string): boolean =>
  isTestArtifact(path) && !isStrippedByCompile(path);

const isUnderBestPractice = (path: string): boolean =>
  path.includes('/best-practice/');

describe('practice test files never sit under best-practice/ (#583)', () => {
  const offenders = getAllPathsUnderDir({ dir: practicesDir, skip: null })
    .filter(isUnderBestPractice)
    .filter(isShippedTestArtifact)
    .map((path) => relative(repoRoot, path))
    .sort();

  given('[case1] the src/practices tree', () => {
    when('[t0] every path under a best-practice/ dir is scanned', () => {
      then('no *.declapract.integration.test.ts ships into a template dir', () => {
        const integrationTests = offenders.filter((path) =>
          path.endsWith('.declapract.integration.test.ts'),
        );
        expect(integrationTests).toEqual([]);
      });

      then('no un-stripped __snapshots__/ file ships into a template dir', () => {
        const snapshots = offenders.filter((path) =>
          path.includes('/__snapshots__/'),
        );
        expect(snapshots).toEqual([]);
      });
    });
  });
});
