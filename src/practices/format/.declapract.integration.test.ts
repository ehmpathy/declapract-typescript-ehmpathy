import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply is slow (full usecase evaluation), so widen the jest budget
jest.setTimeout(180_000); // 3 minutes

/**
 * .what = pipeline test for the format practice's package.json: biome is the one formatter (#645).
 * .why  = `terraform fmt` needs a host binary that no practice declares, so `npm run test:format`
 *         failed on any box without terraform. two declarations must cooperate on one file:
 *         - the best-practice CONTAINS json fix rewrites the `fix:format` / `test:format` chains
 *         - the `terraform-formatter` bad-practice deletes the two terraform sub-command keys
 *         only the real executeApply proves declapract runs both on one package.json and that the
 *         result converges (a second apply changes zero bytes).
 * .note = INTEGRATION by rule.forbid.unit.remote-boundaries: it reads the filesystem + runs
 *         executeApply against a temp clone. the fixtures live under a `.test` dot-dir; a lean
 *         declarations mirror symlinks only format + terraform-common so the whole-usecase compile
 *         does not blow the hook timeout.
 * .note = filter by file only, never by practice, so every usecase practice stays in
 *         projectPractices — terraform-common sits in the case1 usecase, and the chain must still
 *         come out biome only.
 * .teeth = restore the terraform branch in format's contents, or drop the bad-practice, and case1
 *          goes red: a terraform sub-command or key survives the apply.
 */
describe('format practice — package.json is biome only (#645)', () => {
  const readPackageJSON = async (tempDir: string): Promise<string> =>
    fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');

  given('[case1] an adopter one release behind, on a terraform usecase', () => {
    const tempDir = genTempDir({
      slug: 'format-pkgjson-with-terraform',
      clone: './src/.test/assets/format/repo-with-terraform',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/format/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const result = useBeforeAll(async () => {
      const before = await readPackageJSON(tempDir);
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: 'package.json',
      });
      const afterFirst = await readPackageJSON(tempDir);
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: 'package.json',
      });
      const afterSecond = await readPackageJSON(tempDir);
      return { before, afterFirst, afterSecond };
    }, 170_000);

    when('[t0] declapract apply', () => {
      then('fix:format and test:format chain biome only', () => {
        const { scripts } = JSON.parse(result.afterFirst);
        expect(scripts['fix:format']).toEqual('npm run fix:format:biome');
        expect(scripts['test:format']).toEqual('npm run test:format:biome');
      });

      then('the two terraform formatter keys are gone', () => {
        const { scripts } = JSON.parse(result.afterFirst);
        expect(scripts['fix:format:terraform']).toBeUndefined();
        expect(scripts['test:format:terraform']).toBeUndefined();
        expect(result.afterFirst).not.toContain('terraform');
      });

      then('the biome sub-commands the adopter owns survive', () => {
        const { scripts } = JSON.parse(result.afterFirst);
        expect(scripts['fix:format:biome']).toEqual('biome check --write');
        expect(scripts['test:format:biome']).toEqual('biome format');
      });

      then('before + after of package.json match snapshot', () => {
        expect(result.before).toMatchSnapshot('package.json — before');
        expect(result.afterFirst).toMatchSnapshot('package.json — after');
      });
    });

    when('[t1] declapract apply a second time', () => {
      then('zero bytes change', () => {
        expect(result.afterSecond).toEqual(result.afterFirst);
      });
    });
  });

  given('[case2] a fresh consumer on a non-terraform usecase', () => {
    const tempDir = genTempDir({
      slug: 'format-pkgjson-without-terraform',
      clone: './src/.test/assets/format/repo-without-terraform',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/format/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    // useBeforeAll returns a proxy, so the string rides inside an object
    const result = useBeforeAll(async () => {
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: 'package.json',
      });
      return { after: await readPackageJSON(tempDir) };
    }, 170_000);

    when('[t0] declapract apply', () => {
      then('fix:format and test:format chain biome only', () => {
        const { scripts } = JSON.parse(result.after);
        expect(scripts['fix:format']).toEqual('npm run fix:format:biome');
        expect(scripts['test:format']).toEqual('npm run test:format:biome');
      });

      then('package.json matches snapshot', () => {
        expect(result.after).toMatchSnapshot('package.json — after');
      });
    });
  });
});
