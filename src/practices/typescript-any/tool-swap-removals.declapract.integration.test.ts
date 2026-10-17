import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof that each tool swap removes the package it replaced (#660), and that a
 *   legacy tsconfig lib override gains an es2022-capable entry (#517).
 * .why  = each removal reads the consumer repo (its tsconfigs, its jest configs, its code) to know
 *   whether the old package is still reached; only the real pipeline proves those reads.
 * .note = the declarations isolate the four bad-practices under test, so best-practice floors stay
 *   out of the diff.
 */
describe('tool swap removals', () => {
  const genRepo = (input: { fixture: string; slug: string }) =>
    genTempDir({
      slug: input.slug,
      clone: `./src/.test/assets/tool-swap-removals/${input.fixture}`,
      symlink: [
        { at: 'declarations', to: './src/.test/assets/tool-swap-removals/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

  const applyTwice = async (input: { tempDir: string; files: string[] }) => {
    const read = (file: string) =>
      fs.readFile(path.join(input.tempDir, file), 'utf-8');
    const readAll = () => Promise.all(input.files.map((file) => read(file)));
    const applyAll = async () => {
      for (const file of input.files)
        await executeApply({
          config: path.join(input.tempDir, 'declapract.use.yml'),
          file,
        });
    };
    const before = await readAll();
    await applyAll();
    const once = await readAll();
    await applyAll();
    const twice = await readAll();
    return { before, once, twice };
  };

  given('[case1] a repo past both swaps, with each old package still installed', () => {
    const tempDir = genRepo({ fixture: 'repo-after-swaps', slug: 'declapract-tool-swaps-after' });

    when('[t0] the removals are applied', () => {
      const result = useThen('apply twice', async () =>
        applyTwice({ tempDir, files: ['package.json', 'tsconfig.json'] }),
      );

      then('the replaced packages leave, and the kept ones stay (#660)', () => {
        const pkg = JSON.parse(result.once[0]!);
        expect(pkg.devDependencies['@tsconfig/node-lts-strictest']).toBeUndefined();
        expect(pkg.devDependencies['ts-node']).toBeUndefined();
        expect(pkg.devDependencies['core-js']).toBeUndefined();
        expect(pkg.devDependencies['ts-jest']).toBeUndefined();
        expect(pkg.devDependencies['esbuild-register']).toEqual('3.6.0');
        expect(pkg.devDependencies['@swc/jest']).toEqual('0.2.39');
        expect(result.before[0]).toMatchSnapshot('package.json — before');
        expect(result.once[0]).toMatchSnapshot('package.json — after');
      });

      then('the legacy lib override gains ES2023 and keeps DOM and its comment (#517)', () => {
        expect(result.once[1]).toContain(
          '"lib": ["DOM", "ES2023"], // the browser types this repo needs',
        );
        expect(result.before[1]).toMatchSnapshot('tsconfig.json — before');
        expect(result.once[1]).toMatchSnapshot('tsconfig.json — after');
      });

      then('the second apply is a no-op', () => {
        expect(result.twice).toEqual(result.once);
      });
    });
  });

  given('[case2] a repo mid-swap: its tsconfig still extends the old base, its jest config has no loader pragma', () => {
    const tempDir = genRepo({ fixture: 'repo-mid-swaps', slug: 'declapract-tool-swaps-mid' });

    when('[t0] the removals are applied', () => {
      const result = useThen('apply twice', async () =>
        applyTwice({ tempDir, files: ['package.json'] }),
      );

      then('both old packages stay, since the repo still reaches them', () => {
        expect(result.once[0]).toEqual(result.before[0]);
        expect(result.twice[0]).toEqual(result.once[0]);
      });
    });
  });
});
