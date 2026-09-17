import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps the WIRING half of the testdb preflight: `jest.integration.env.ts` imports
 *         `useWakeOfTestdb` by RELATIVE path and calls it, so an own-db suite preflights its local
 *         testdb before the first query.
 * .why  = the collocated `useWakeOfTestdb.ts.declapract.integration.test.ts` proves the helper's
 *         LOGIC in isolation; it cannot see whether the env still CALLS it. drop the call from the
 *         env and every logic test stays green while the preflight silently vanishes — the exact
 *         silent-regression this pins shut. this is the testdb-env counterpart to
 *         `livedb-wake-prepare.declapract.integration.test.ts`, which pins the livedb wake into
 *         the prepare composite.
 * .teeth = drop the `useWakeOfTestdb` import or its call from `jest.integration.env.ts` and the
 *          matched case reddens. swap the relative import for the `@src` alias (which fails at
 *          startup, before jest's moduleNameMapper exists) and the relative-path case reddens.
 * .note = subject is the shipped TEMPLATE text, read as a string. this file sits at the PRACTICE
 *         root (not under `best-practice/`), so declapract's loader — which walks only
 *         `best-practice/` for templates — never reads it as a declaration and never copies it to a
 *         consumer (`define.declapract-test-files`).
 */

// anchor on __dirname, not process.cwd(): a nested `jest src/practices/...` run has a different
// cwd, and a repo-root-relative path under process.cwd() would then miss the tree (vacuous green).
const P = join(__dirname, 'best-practice');
const read = (rel: string): string => readFileSync(join(P, rel), 'utf8');

describe('testdb preflight is wired into the integration env', () => {
  given('[case] jest.integration.env.ts', () => {
    const envContents = read('jest.integration.env.ts');

    when('[t0] the env is read', () => {
      then('it imports useWakeOfTestdb by RELATIVE path (not the @src alias)', () => {
        // a jest env loads before some resolvers settle; the shipped code uses the relative path
        expect(envContents).toContain("from './src/.test/useWakeOfTestdb'");
      });

      then('it calls useWakeOfTestdb (preflight the local testdb)', () => {
        expect(envContents).toContain('useWakeOfTestdb(');
      });
    });
  });

  given('[case] useWakeOfTestdb.ts self-gates', () => {
    const helperContents = read('src/.test/useWakeOfTestdb.ts');

    when('[t0] the preflight util is read', () => {
      then('it gates on a declared databaseUserName (the own-db signal)', () => {
        expect(helperContents).toContain('databaseUserName');
      });

      then('an own-db service with no config/test.json fails loud (never a silent skip)', () => {
        // teeth: silent-skip the absent config (drop the throw) and both substrings vanish → reddens.
        expect(helperContents).toContain('ConstraintError');
        expect(helperContents).toContain('config/test.json');
      });

      then('it preflights via the probeTestDb boundary', () => {
        expect(helperContents).toContain('probeTestDb(');
      });
    });
  });
});
