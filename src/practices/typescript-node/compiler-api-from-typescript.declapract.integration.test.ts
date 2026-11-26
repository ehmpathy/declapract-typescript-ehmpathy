import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { getPlanOutputFromDeclapract } from '../../.test/getPlanOutputFromDeclapract';

// executePlan and executeApply are slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof that a repo which reads the compiler api from `typescript` sees a manual
 *   flag in its plan, on that file alone, and that apply leaves the file as written.
 * .why  = the bad-practice declares no fix, since the swap also needs `@typescript/typescript6` in the
 *   repo's own deps; only the real plan shows what the maintainer reads, and that no apply guesses.
 */
describe('typescript-node compiler api read from typescript', () => {
  given('[case1] a repo with one compiler api import and one file that only names it', () => {
    const tempDir = genTempDir({
      slug: 'declapract-ts7-compiler-api-from-typescript',
      clone: './src/.test/assets/compiler-api-from-typescript/repo',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/compiler-api-from-typescript/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });
    const config = () => path.join(tempDir, 'declapract.use.yml');
    const target = 'src/logic/getAllEnumNames.ts';

    when('[t0] the plan runs', () => {
      const result = useThen('plan', async () => getPlanOutputFromDeclapract({ config: config() }));

      then('the import file is flagged for a manual fix, and the other file is not', () => {
        const flags = result.lines.filter((line) => /^\s*\* \[FIX_(AUTOMATIC|MANUAL)\]/.test(line));
        expect(flags.map((line) => line.trim())).toEqual([`* [FIX_MANUAL] ${target}`]);
      });

      then('the plan names the practice and the file, and matches snapshot', () => {
        const planText = result.lines
          .filter((line) => !/^\s*$/.test(line))
          .join('\n')
          .replaceAll(tempDir, '<repo>');
        expect(planText).toContain('practice:typescript-node.bad-practice.compiler-api-from-typescript');
        expect(planText).toContain(`* [FIX_MANUAL] ${target}`);
        expect(planText).toMatchSnapshot('plan');
      });

      then('stderr names the two-step swap beside the plan, once', () => {
        expect(result.stderr.split('compiler api read from `typescript`').length - 1).toEqual(1);
        expect(result.stderr).toContain('pnpm add @typescript/typescript6@6.0.2');
        expect(result.stderr).toMatchSnapshot('manual-fix notice');
      });
    });

    when('[t1] the apply runs', () => {
      const result = useThen('apply', async () => {
        const before = await fs.readFile(path.join(tempDir, target), 'utf-8');
        await executeApply({ config: config(), file: target });
        const after = await fs.readFile(path.join(tempDir, target), 'utf-8');
        return { before, after };
      });

      then('the file stays as written, since no fix is declared', () => {
        expect(result.after).toEqual(result.before);
        expect(result.after).toContain(`from 'typescript'`);
      });
    });
  });
});
