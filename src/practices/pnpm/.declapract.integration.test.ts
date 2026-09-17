import fs from 'fs/promises';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply is slow (full practice evaluation)
jest.setTimeout(180_000);

/** extract the pinned version out of a `packageManager` field (`pnpm@10.34.5` → `10.34.5`). */
const asPinnedVersionFromPackageManager = (packageManager: string): string =>
  packageManager.split('@')[1] ?? '';

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

/**
 * .what = query the npm registry for a package's published version, with bounded retry-with-backoff.
 * .why  = a bare one-shot `npm view` makes a TRANSIENT registry blip (DNS hiccup, rate limit, brief
 *         outage) redden the whole suite even when the pin is fine — the intermittent-failure class
 *         rule.forbid.behavior-hazards targets. a phantom pin (never published) fails EVERY attempt
 *         and still reddens after the budget, so the phantom-guard intent holds; a transient blip
 *         recovers on a later attempt. fails loud with the last error once the budget is spent
 *         (rule.forbid.failhide) — never a silent skip.
 * .note = a committed/metadata source cannot substitute here: only the registry can confirm a pin
 *         was actually PUBLISHED (a phantom pin parses fine locally). so the registry read stays,
 *         hardened by retry rather than replaced.
 */
const getPublishedVersionFromRegistry = async (input: {
  packageName: string;
  version: string;
  attemptsLeft: number;
  backoffMs: number;
}): Promise<string> => {
  try {
    return execFileSync(
      'npm',
      ['view', `${input.packageName}@${input.version}`, 'version'],
      { timeout: 15_000 },
    )
      .toString('utf-8')
      .trim();
  } catch (error) {
    // budget spent → fail loud with the last error (never swallow)
    if (input.attemptsLeft <= 1) throw error;
    // otherwise back off and retry — a transient blip recovers, a phantom pin fails again
    await sleep(input.backoffMs);
    return getPublishedVersionFromRegistry({
      ...input,
      attemptsLeft: input.attemptsLeft - 1,
      backoffMs: input.backoffMs * 2,
    });
  }
};

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
        expect(pkg.packageManager).toEqual('pnpm@10.34.5');
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

  given('[case2] a repo OFF the blessed pnpm pin (10.32.1)', () => {
    // the [case1] fixture seeds the pin already AT 10.34.5, so it proves only the no-op
    // path. this case seeds the pin OFF the blessed version to prove the convergence
    // rewrite (10.32.1 → 10.34.5) in pnpm's OWN suite — where an engineer looks first —
    // not only inside the expo migration fixture. the best-practice CONTAINS check rejects
    // a package.json that does not carry the exact `pnpm@10.34.5`, so `declapract fix`
    // merges the blessed pin over the off one, in either direction. that
    // convergence-to-one-version is the org-standardization intent, not a regression.
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
      // seed the pin OFF the blessed version, then apply the practice
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

    when('[t0] the off-pin package.json is applied', () => {
      then('the pin is rewritten to the blessed 10.34.5', () => {
        expect(JSON.parse(state.pkgBefore).packageManager).toEqual('pnpm@10.32.1');
        expect(JSON.parse(state.pkgAfter1).packageManager).toEqual('pnpm@10.34.5');
      });

      then('a second apply is a fixed point (the convergence holds)', () => {
        expect(state.pkgAfter2).toEqual(state.pkgAfter1);
      });
    });
  });

  given('[case3] the blessed packageManager pin is a real published version', () => {
    // a phantom pin (e.g. pnpm@10.31.7, which was never published) 404s corepack on EVERY
    // pm command in a consumer the moment `declapract fix` applies it — a repo-wide outage,
    // not a lint nit (#576). so the blessed pin MUST exist on the npm registry. this guard
    // reads the pin the best-practice ships and puts the question to the registry itself, so
    // a future bump to an unpublished version reddens HERE rather than in a bricked consumer.
    // anchor on __dirname, not process.cwd(): a nested `jest src/practices/...` run has a different
    // cwd. from this file (src/practices/pnpm/) the best-practice package.json is one segment down.
    const bestPracticePkgPath = path.join(
      __dirname,
      'best-practice/package.json',
    );

    when('[t0] the best-practice package.json pin is read', () => {
      const readPinnedVersion = (): string => {
        const pkg = JSON.parse(readFileSync(bestPracticePkgPath, 'utf-8'));
        return asPinnedVersionFromPackageManager(String(pkg.packageManager));
      };

      then('the pinned pnpm version has a valid semver shape (hermetic, every run)', () => {
        expect(readPinnedVersion()).toMatch(/^\d+\.\d+\.\d+$/);
      });

      then('the pinned pnpm version is published on the npm registry (every build)', async () => {
        // the phantom-pin guard (#576) needs the LIVE registry — only it confirms a pin was
        // PUBLISHED (a phantom pin parses fine locally, then 404s corepack in every consumer). the
        // read runs on EVERY build, CI included, per rule.require.external-contract-integration-tests:
        // an external contract owes a real call, never a silent skip ("either run the real call, or
        // fail the gate"). the transient-blip hazard rule.forbid.behavior-hazards names is absorbed by
        // getPublishedVersionFromRegistry's bounded retry-with-backoff (3 attempts) — a brief blip
        // recovers, a phantom pin fails all 3 and reddens the gate. the read needs no credential (a
        // public `npm view`), and this repo's CI already reaches the registry to install deps, so a
        // sustained outage would fail the install too. the shape check above stays hermetic.
        const pinnedVersion = readPinnedVersion();
        const published = await getPublishedVersionFromRegistry({
          packageName: 'pnpm',
          version: pinnedVersion,
          attemptsLeft: 3,
          backoffMs: 500,
        });
        expect(published).toContain(pinnedVersion);
      });
    });
  });

  given('[case4] a repo carrying an inert v11 allowBuilds block under the v10 pin', () => {
    // the fixture's pnpm-workspace.yaml holds ONLY an `allowBuilds:` block — pnpm v11 syntax
    // under a v10 pin, so it does ZERO work yet reads like a live allowlist (#575). the
    // inert-build-allowlist bad-practice must DELETE the file (its whole content is the block),
    // and a re-apply must be a no-op (the file is already gone → no key to detect).
    const tempDir = genTempDir({
      slug: 'pnpm-inert-allowbuilds',
      clone: './src/practices/pnpm/.test/assets/repo-npm-to-pnpm',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/pnpm/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const wsPath = () => path.join(tempDir, 'pnpm-workspace.yaml');
    const exists = async () =>
      fs
        .access(wsPath())
        .then(() => true)
        .catch(() => false);

    const state = useBeforeAll(async () => {
      const before = await fs.readFile(wsPath(), 'utf-8');

      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'pnpm',
        file: 'pnpm-workspace.yaml',
      });
      const existsAfter1 = await exists();

      // a re-apply on the now-absent file must be a clean no-op
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'pnpm',
        file: 'pnpm-workspace.yaml',
      });
      const existsAfter2 = await exists();

      return { before, existsAfter1, existsAfter2 };
    }, 170_000);

    when('[t0] the pnpm practice is applied to pnpm-workspace.yaml', () => {
      then('the inert allowBuilds-only file is deleted', () => {
        expect(state.existsAfter1).toEqual(false);
      });

      then('before matches snapshot (the inert block that was removed)', () => {
        expect(state.before).toMatchSnapshot('pnpm-workspace.yaml — before');
      });

      then('a second apply is a fixed point (absent stays absent)', () => {
        expect(state.existsAfter2).toEqual(false);
      });
    });
  });
});
