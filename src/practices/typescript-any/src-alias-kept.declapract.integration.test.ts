import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getPlanOutputFromDeclapract } from '../../.test/getPlanOutputFromDeclapract';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = the files the src-alias-kept bad-practice reads in the fixture repo
 */
const FIXTURE_FILES = [
  'tsconfig.json',
  'src/contract/getSurfReport.ts',
  'blackbox/useSurfReport.ts',
] as const;

/**
 * .what = the per-file flag rows of a plan: `* [FIX_AUTOMATIC] tsconfig.json`, `* [FIX_MANUAL] …`
 */
const getAllPlanFlags = (input: { lines: string[] }): string[] =>
  input.lines
    .filter((line) => /^\s*\* \[(FIX_AUTOMATIC|FIX_MANUAL)\]/.test(line))
    .map((line) => line.trim());

/**
 * .what = each fixture file's contents, keyed by its path
 */
const readAll = async (input: { tempDir: string }) =>
  Object.fromEntries(
    await Promise.all(
      FIXTURE_FILES.map(async (file) => [
        file,
        await fs.readFile(path.join(input.tempDir, file), 'utf-8'),
      ]),
    ),
  ) as Record<(typeof FIXTURE_FILES)[number], string>;

/**
 * .what = end-to-end proof that a repo on the retired `@src/` alias lands on `@/` in one apply, and
 *   that a second apply is a no-op.
 * .why  = three declarations edit one repo (the tsconfig, a src file, a blackbox file); only the real
 *   pipeline proves each globs to the right files and that the fixed repo no longer trips the check.
 */
describe('typescript-any src-alias-kept', () => {
  given('[case1] a repo that imports through @src/ and declares the @src/* paths key', () => {
    const tempDir = genTempDir({
      slug: 'declapract-src-alias-kept',
      clone: './src/.test/assets/src-alias-kept/repo-on-src-alias',
      symlink: [{ at: 'declarations', to: './src/.test/assets/src-alias-kept/declarations' }],
    });

    // every then reads the applied repo, so the plan, apply, and re-plan run once, before any
    const applied = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');
      // scope each apply to one fixture file, so no apply walks the declarations link into src
      const apply = async () => {
        for (const file of FIXTURE_FILES) await executeApply({ config, file });
      };
      const planBefore = await getPlanOutputFromDeclapract({ config });
      await apply();
      const once = await readAll({ tempDir });
      await apply();
      const twice = await readAll({ tempDir });
      const planAfter = await getPlanOutputFromDeclapract({ config });
      return { planBefore, once, twice, planAfter };
    });

    when('[t0] the practice is applied twice', () => {
      then('the plan before the apply flags each file for an automatic fix', () => {
        const flags = getAllPlanFlags(applied.planBefore);
        FIXTURE_FILES.forEach((file) =>
          expect(flags).toContain(`* [FIX_AUTOMATIC] ${file}`),
        );
      });

      then('the tsconfig drops @src/* and keeps the repo own alias', () => {
        const tsconfig = applied.once['tsconfig.json'];
        expect(tsconfig).not.toContain('"@src/*"');
        expect(tsconfig).toContain('"@vendor/*"');
        expect(tsconfig).toMatchSnapshot('tsconfig.json — after');
      });

      then('each quoted @src/ specifier reads @/src/, in src and blackbox alike', () => {
        expect(applied.once['src/contract/getSurfReport.ts']).toContain(
          "from '@/src/domain.operations/getWaveHeight'",
        );
        expect(applied.once['blackbox/useSurfReport.ts']).toContain(
          "from '@/src/contract/getSurfReport'",
        );
        expect(applied.once['blackbox/useSurfReport.ts']).toContain(
          "jest.mock('@/src/domain.operations/getWaveHeight')",
        );
        expect(applied.once['src/contract/getSurfReport.ts']).toMatchSnapshot(
          'src/contract/getSurfReport.ts — after',
        );
        expect(applied.once['blackbox/useSurfReport.ts']).toMatchSnapshot(
          'blackbox/useSurfReport.ts — after',
        );
      });

      then('the retired alias inside a comment stays as written', () => {
        expect(applied.once['src/contract/getSurfReport.ts']).toContain(
          '// the retired @src/ alias in a comment',
        );
      });

      then('a second apply changes no file', () => {
        expect(applied.twice).toEqual(applied.once);
      });

      then('the plan after the apply flags no fixture file', () => {
        const flags = getAllPlanFlags(applied.planAfter);
        FIXTURE_FILES.forEach((file) =>
          expect(flags).not.toContain(`* [FIX_AUTOMATIC] ${file}`),
        );
      });
    });
  });
});
