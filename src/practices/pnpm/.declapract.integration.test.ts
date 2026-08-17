import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply is slow (full practice evaluation)
jest.setTimeout(180_000);

/**
 * .what = pipeline test for the pnpm npm→pnpm migration bad-practices
 * .why  = the unit tests prove each fix in isolation; only the real executeApply pipeline
 *         proves declapract WIRES them up — matches each declaration to its target file
 *         (npm-overrides on package.json, husky-lockfile-check on the husky hook), and
 *         reaches a fixed point on a re-run.
 */
describe('pnpm npm→pnpm migration — pipeline', () => {
  given('[case1] a repo mid-migration from npm to pnpm', () => {
    const tempDir = genTempDir({
      slug: 'pnpm-npm-to-pnpm',
      clone: './src/practices/pnpm/.test/assets/repo-npm-to-pnpm',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/pnpm/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const readPkg = () => fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');
    const readHusky = () =>
      fs.readFile(path.join(tempDir, '.husky/check.lockfile.sh'), 'utf-8');

    // useBeforeAll RETURNS the captured state (no in-place mutation of a shared const)
    const state = useBeforeAll(async () => {
      const pkgBefore = await readPkg();
      const huskyBefore = await readHusky();

      // apply the package.json bad-practice (npm-overrides relocates the pins)
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'pnpm',
        file: 'package.json',
      });
      const pkgAfter1 = await readPkg();
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'pnpm',
        file: 'package.json',
      });
      const pkgAfter2 = await readPkg();

      // apply the husky lockfile-hook bad-practice
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'pnpm',
        file: '.husky/check.lockfile.sh',
      });
      const huskyAfter1 = await readHusky();
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'pnpm',
        file: '.husky/check.lockfile.sh',
      });
      const huskyAfter2 = await readHusky();

      return {
        pkgBefore,
        pkgAfter1,
        pkgAfter2,
        huskyBefore,
        huskyAfter1,
        huskyAfter2,
      };
    }, 170_000);

    when('[t0] the pnpm practice is applied to package.json', () => {
      then('overrides + resolutions relocate into pnpm.overrides', () => {
        const pkg = JSON.parse(state.pkgAfter1);
        expect(pkg.pnpm.overrides['react-refresh']).toEqual('~0.14.0');
        expect(pkg.overrides).toBeUndefined();
        expect(pkg.resolutions).toBeUndefined();
      });

      then('the `npm run` invocation convention is left intact (repo-wide idiom)', () => {
        const pkg = JSON.parse(state.pkgAfter1);
        expect(pkg.scripts.prepush).toEqual('npm run test && npm run build');
      });

      then('the packageManager pin survives (best-practice no-op)', () => {
        const pkg = JSON.parse(state.pkgAfter1);
        expect(pkg.packageManager).toEqual('pnpm@10.31.7');
      });

      then('before + after match snapshot', () => {
        expect(state.pkgBefore).toMatchSnapshot('package.json — before');
        expect(state.pkgAfter1).toMatchSnapshot('package.json — after');
      });

      then('a second apply is a fixed point', () => {
        expect(state.pkgAfter2).toEqual(state.pkgAfter1);
      });
    });

    when('[t1] the pnpm practice is applied to the husky hook', () => {
      then('the lockfile name + install command become pnpm', () => {
        expect(state.huskyAfter1).toContain('pnpm-lock.yaml');
        expect(state.huskyAfter1).toContain('pnpm install');
        expect(state.huskyAfter1).not.toContain('package-lock.json');
        expect(state.huskyAfter1).not.toMatch(/(?<!p)npm install/);
      });

      then('before + after match snapshot', () => {
        expect(state.huskyBefore).toMatchSnapshot('check.lockfile.sh — before');
        expect(state.huskyAfter1).toMatchSnapshot('check.lockfile.sh — after');
      });

      then('a second apply is a fixed point', () => {
        expect(state.huskyAfter2).toEqual(state.huskyAfter1);
      });
    });
  });

  given('[case2] a repo AHEAD of the blessed pnpm pin (10.32.1)', () => {
    // the [case1] fixture seeds the pin already AT 10.31.7, so it proves only the no-op
    // path. this case seeds the pin AHEAD of the blessed version to prove the DOWNGRADE
    // rewrite (10.32.1 → 10.31.7) in pnpm's OWN suite — where an engineer looks first —
    // not only inside the expo migration fixture. the best-practice CONTAINS check rejects
    // a package.json that does not carry the exact `pnpm@10.31.7`, so `declapract fix`
    // merges the blessed pin over the ahead one. that convergence-to-one-version is the
    // org-standardization intent, not a regression.
    const tempDir = genTempDir({
      slug: 'pnpm-ahead-of-pin',
      clone: './src/practices/pnpm/.test/assets/repo-npm-to-pnpm',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/pnpm/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const pkgPath = () => path.join(tempDir, 'package.json');
    const readPkg = () => fs.readFile(pkgPath(), 'utf-8');

    const state = useBeforeAll(async () => {
      // seed the pin AHEAD of the blessed version, then apply the practice
      const seeded = { ...JSON.parse(await readPkg()), packageManager: 'pnpm@10.32.1' };
      await fs.writeFile(pkgPath(), `${JSON.stringify(seeded, null, 2)}\n`);
      const pkgBefore = await readPkg();

      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'pnpm',
        file: 'package.json',
      });
      const pkgAfter1 = await readPkg();
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'pnpm',
        file: 'package.json',
      });
      const pkgAfter2 = await readPkg();

      return { pkgBefore, pkgAfter1, pkgAfter2 };
    }, 170_000);

    when('[t0] the ahead-of-pin package.json is applied', () => {
      then('the pin is rewritten DOWN to the blessed 10.31.7', () => {
        expect(JSON.parse(state.pkgBefore).packageManager).toEqual('pnpm@10.32.1');
        expect(JSON.parse(state.pkgAfter1).packageManager).toEqual('pnpm@10.31.7');
      });

      then('a second apply is a fixed point (the downgrade converges)', () => {
        expect(state.pkgAfter2).toEqual(state.pkgAfter1);
      });
    });
  });
});
