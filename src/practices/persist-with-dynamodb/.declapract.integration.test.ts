import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof that the `jest.integration.env.ts` declaration REPAIRS a divergent
 *         consumer file back to the canonical template, run through the REAL declapract apply
 *         pipeline against a genTempDir clone of a consumer repo (D39 clamp).
 * .why  = the declaration was a bare `CONTAINS` with no `fix`, so a whole-env-file divergence was
 *         invisible to the check AND unclosable by any mechanism — a consumer's drift stood
 *         forever. the fix REMOVED the `.declapract.ts` companion, so the file defaults to
 *         `EQUALS`: a byte-exact check whose implicit fix OVERWRITES the consumer's file with the
 *         template. this test is the clamp that a divergence is now both DETECTED and CLOSED.
 * .note = the env file is snapshotted in full (before AND after) so a reviewer can eyeball the
 *         exact end-state, per rule.require.declapract-integration-tests.
 * .teeth = the divergent input carries port `9999` and drops the template's doc comment. a revert
 *          to the deleted `CONTAINS` companion re-opens the divergence — the check would pass on
 *          the drifted file (it still `CONTAINS` the assignment line) and no fix would fire, so
 *          the after-state would keep `9999` and this assertion reddens.
 */
const BEST_PRACTICE_ENV = `${__dirname}/best-practice/jest.integration.env.ts`;

describe('persist-with-dynamodb — jest.integration.env divergence repair (D39 clamp)', () => {
  given('[case1] a repo with a divergent jest.integration.env.ts', () => {
    const tempDir = genTempDir({
      slug: 'declapract-dynamodb-jest-env',
      clone: './src/practices/persist-with-dynamodb/.test/assets/demo-repo-with-divergent-jest-env',
      symlink: [{ at: 'src', to: 'src' }],
    });

    const envPath = 'jest.integration.env.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyRepair = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'persist-with-dynamodb',
        file: envPath,
      });

    when('[t0] the divergent input (before any fix)', () => {
      then('the env input carries the drifted port and matches snapshot', async () => {
        const before = await read(envPath);
        expect(before).toContain('9999');
        expect(before).toMatchSnapshot('jest.integration.env.ts — before');
      });
    });

    when('[t1] the EQUALS repair is applied', () => {
      useThen('repair the divergent env file', async () => applyRepair());

      then(
        'the consumer file now byte-equals the canonical template and matches snapshot',
        async () => {
          const after = await read(envPath);
          const canonical = await fs.readFile(BEST_PRACTICE_ENV, 'utf-8');
          // teeth: the drifted port is gone, the canonical endpoint + doc comment are restored
          expect(after).not.toContain('9999');
          expect(after).toContain('http://localhost:7337');
          expect(after).toContain(
            'specify that dynamodb should use the local dynamodb database',
          );
          // byte-for-byte: EQUALS repairs the WHOLE file, not just the assignment line
          expect(after).toEqual(canonical);
          // full content, for the reviewer's eye
          expect(after).toMatchSnapshot('jest.integration.env.ts — after');
        },
      );
    });

    when('[t2] the repair is applied a second time (idempotency)', () => {
      // capture the post-first-repair state, apply again, capture again — assert zero
      // change. a byte-equal file must satisfy the EQUALS check, so a second apply fires
      // no fix (per rule.require.idempotent-fixes).
      const passes = useThen(
        'a second repair over its own output',
        async () => {
          const before = await read(envPath); // post-first-repair (canonical)
          await applyRepair(); // second apply
          const after = await read(envPath);
          return { before, after };
        },
      );

      then('the second repair is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
