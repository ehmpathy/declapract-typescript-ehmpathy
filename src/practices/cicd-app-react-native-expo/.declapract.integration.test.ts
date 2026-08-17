import fs from 'fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import yaml from 'yaml';

import { getAllPracticesForUsecase } from '../../utils/getAllPracticesForUsecase';

// executeApply is slow (whole-usecase evaluation across ten practices)
jest.setTimeout(240_000);

/**
 * .what = the GRACEFUL-MIGRATION acceptance test for the `app-react-native-expo` usecase,
 *         run against an already-built expo app repo shaped like `app-protools-native`
 *         (the wish's part-3 "definition of done").
 * .why  = every other fixture is a bare/greenfield subset. this one models a REAL repo mid-
 *         migration — npm (`overrides` + `resolutions`, `package-lock.json`, no
 *         `packageManager`), a customized `tsconfig.json` (an extra `@app-custom` path), a
 *         `.gitignore` with its own custom ignores, a husky lockfile hook on the npm name,
 *         and the deprecated `src/logic/` + `src/data/` layers with a cross-import. it proves
 *         the whole migration slice applies GRACEFULLY: rename (not delete), union (not
 *         clobber), merge-not-overwrite — a consumer's own work survives.
 * .note = the WHOLE usecase is evaluated before any file-filter, so the fixture's
 *         `declapract.use.yml` defines every variable the ten practices reference.
 */
describe('app-react-native-expo — graceful migration of an app-protools-shaped repo', () => {
  given('[case1] a customized npm expo repo on the deprecated src layers', () => {
    const tempDir = genTempDir({
      slug: 'expo-migration',
      clone: './src/.test/assets/expo-migration/repo-app-protools-shaped',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/expo-migration/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = (rel: string) =>
      fs.readFile(path.join(tempDir, rel), 'utf-8').catch(() => null);

    // useBeforeAll RETURNS the captured state (no in-place mutation of a shared const)
    const state = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');

      // capture the before-state of the files the migration mutates
      const before = {
        pkg: await read('package.json'),
        npmrc: await read('.npmrc'),
        tsconfig: await read('tsconfig.json'),
        gitignore: await read('.gitignore'),
        husky: await read('.husky/check.lockfile.sh'),
        packageLock: await read('package-lock.json'),
        deployExpo: await read('.github/workflows/.deploy-expo.yml'),
        domainIndex: await read('src/domain/objects/index.ts'),
        logicFile: await read('src/logic/customer/getCustomer.ts'),
        daoFile: await read('src/data/dao/daoCustomer.ts'),
        // the stale JS jest config (jsdom) the app-protools-native audit names — a
        // dual-source hazard the migration must reconcile against the shipped .ts config
        jestConfigJs: await read('jest.config.js'),
        jestConfigTs: await read('jest.config.ts'),
      };

      // apply the whole usecase twice — the migration is a two-pass settle:
      // pass 1 RELOCATES the deprecated-dir files (imports untouched); pass 2
      // rewrites those moved files' imports at their new path AND settles the
      // package.json minVersion pins. (move + import-rewrite are held to
      // separate passes so declapract never applies a relocate and an in-place
      // rewrite to one file in one apply.)
      await executeApply({ config });
      await executeApply({ config });
      const after2 = {
        pkg: await read('package.json'),
        npmrc: await read('.npmrc'),
        tsconfig: await read('tsconfig.json'),
        gitignore: await read('.gitignore'),
        husky: await read('.husky/check.lockfile.sh'),
        packageLock: await read('package-lock.json'),
        deployExpo: await read('.github/workflows/.deploy-expo.yml'),
        domainIndex: await read('src/domain/objects/index.ts'),
        // the dir-move destinations
        movedLogic: await read('src/domain.operations/customer/getCustomer.ts'),
        movedDao: await read('src/access/daos/daoCustomer.ts'),
        movedShared: await read('src/domain.operations/shared/formatCustomer.ts'),
        // the deprecated originals must be GONE
        oldLogic: await read('src/logic/customer/getCustomer.ts'),
        oldDao: await read('src/data/dao/daoCustomer.ts'),
        oldShared: await read('src/logic/shared/formatCustomer.ts'),
        // the stale JS jest config must be GONE; the shipped .ts config must be PRESENT
        jestConfigJs: await read('jest.config.js'),
        jestConfigTs: await read('jest.config.ts'),
      };

      // a third apply proves the settled state is a fixed point (no drift)
      await executeApply({ config });
      const after3 = {
        pkg: await read('package.json'),
        tsconfig: await read('tsconfig.json'),
        movedLogic: await read('src/domain.operations/customer/getCustomer.ts'),
      };

      return { before, after2, after3 };
    }, 230_000);

    when('[t0] the deprecated src layers are migrated', () => {
      then('src/logic/ moves to src/domain.operations/, the original gone', () => {
        expect(state.after2.movedLogic).toBeDefined();
        expect(state.after2.movedLogic).not.toBeNull();
        expect(state.after2.oldLogic).toBeNull();
      });

      then('src/data/dao/ moves to src/access/daos/, the original gone', () => {
        expect(state.after2.movedDao).not.toBeNull();
        expect(state.after2.oldDao).toBeNull();
      });

      then('the moved logic file has its import path rewritten', () => {
        // ../../data/dao/daoCustomer -> ../../access/daos/daoCustomer
        expect(state.after2.movedLogic).toContain('/access/daos/daoCustomer');
        expect(state.after2.movedLogic).not.toContain('/data/dao/daoCustomer');
      });

      then('every import SHAPE in the moved file is rewritten (r10 blocker 3)', () => {
        // the fixture file carries THREE deprecated-layer import shapes; the pipeline
        // must rewrite ALL of them, not just the first. prove each shape landed at
        // access/daos with no data/dao path left behind.
        const moved = state.after2.movedLogic!;
        // plain value import
        expect(moved).toContain(
          "import { daoCustomer } from '@src/access/daos/daoCustomer'",
        );
        // type-only import
        expect(moved).toContain(
          "import type { Customer } from '@src/access/daos/daoCustomer'",
        );
        // barrel re-export
        expect(moved).toContain(
          "export { daoCustomer as daoCustomerReExport } from '@src/access/daos/daoCustomer'",
        );
        // NO deprecated import PATH survives on any of the three (the quoted specifier
        // only — the file's own comment still names data/dao as prose, which is fine)
        expect(moved).not.toContain("'@src/data/dao/daoCustomer'");
      });

      then('the moved file\'s ../ relative import is aliased (relative-imports two-pass defer)', () => {
        // the fixture's getCustomer.ts carries a `../shared/formatCustomer` RELATIVE import to
        // a peer in the same deprecated layer. relative-imports must DEFER it on pass 1 (the
        // file still sits under logic/, so its isDeferredToDeprecatedDirMove guard fires) while
        // old-logic-dir relocates the file, then fire on pass 2 once the file sits at
        // domain.operations/ — the ../shared/formatCustomer path becomes the @src alias. this
        // proves the branch-new deferred-dir guard end-to-end (the r1 relative-imports blocker):
        // a relocate and an in-place rewrite of one file never collide in a single pass.
        // the peer util is itself relocated logic/shared/ -> domain.operations/shared/.
        expect(state.after2.movedShared).not.toBeNull();
        expect(state.after2.oldShared).toBeNull();
        // the importer's relative path is aliased to @src at the file's NEW home
        expect(state.after2.movedLogic).toContain(
          "import { formatCustomer } from '@src/domain.operations/shared/formatCustomer'",
        );
        expect(state.after2.movedLogic).not.toContain("'../shared/formatCustomer'");
      });
    });

    when('[t1] package.json is migrated npm -> pnpm', () => {
      then('overrides + resolutions relocate into pnpm.overrides', () => {
        const pkg = JSON.parse(state.after2.pkg!);
        expect(pkg.overrides).toBeUndefined();
        expect(pkg.resolutions).toBeUndefined();
        expect(pkg.pnpm.overrides['type-fns']).toEqual('1.9.9');
        expect(pkg.pnpm.overrides['@commitlint/format']).toEqual('19.9.9');
      });

      then('the packageManager pin converges to the blessed exact version', () => {
        // the fixture is AHEAD of the blessed pin (pnpm@10.32.1). the pnpm
        // best-practice CONTAINS declares the ONE blessed version (pnpm@10.31.7),
        // so a consumer ahead of it is pinned BACK on fix — that downgrade is the
        // wisher-settled org-convergence REQUIREMENT (one blessed pnpm across CI,
        // local, every repo), not a regression. this characterizes it.
        const pkgBefore = JSON.parse(state.before.pkg!);
        expect(pkgBefore.packageManager).toEqual('pnpm@10.32.1');

        const pkg = JSON.parse(state.after2.pkg!);
        expect(pkg.packageManager).toEqual('pnpm@10.31.7');
      });

      then('the inline jest dual-source block is dropped', () => {
        // the repo carried a jest-expo preset INLINE in package.json AND the
        // tests-expo jest.*.config.ts files — a dual source. the migration drops
        // the inline block so the config files are the one home.
        const pkgBefore = JSON.parse(state.before.pkg!);
        expect(pkgBefore.jest).toBeDefined();

        const pkg = JSON.parse(state.after2.pkg!);
        expect(pkg.jest).toBeUndefined();
      });
    });

    when('[t2] the .npmrc hoist is unioned in, not clobbered', () => {
      then('the hoisted-linker block is present', () => {
        expect(state.after2.npmrc).toContain('node-linker=hoisted');
        expect(state.after2.npmrc).toContain('public-hoist-pattern[]=*expo*');
      });

      then('the base save-exact line survives', () => {
        expect(state.after2.npmrc).toContain('save-exact=true');
      });
    });

    when('[t3] the customized tsconfig is preserved (CONTAINS, not clobbered)', () => {
      then('the extends of expo/tsconfig.base holds', () => {
        expect(state.after2.tsconfig).toContain('expo/tsconfig.base');
      });

      then("the app's own custom @app-custom path is preserved", () => {
        expect(state.after2.tsconfig).toContain('@app-custom');
      });
    });

    when('[t4] the .gitignore gains the rhachet line, keeps the repo customs', () => {
      then('the rhachet .agent/.cache/ line is added', () => {
        expect(state.after2.gitignore).toContain('.agent/.cache/');
      });

      then("the repo's own custom ignores survive", () => {
        expect(state.after2.gitignore).toContain('.idea');
        expect(state.after2.gitignore).toContain('*.pyc');
      });

      then('the node_modules negations sit below node_modules', () => {
        const lines = state.after2.gitignore!.split('\n');
        expect(lines.indexOf('node_modules')).toBeLessThan(
          lines.indexOf('!.test*/**/node_modules'),
        );
      });
    });

    when('[t5] the husky lockfile hook is swapped to pnpm', () => {
      then('it watches pnpm-lock.yaml, not package-lock.json', () => {
        expect(state.after2.husky).toContain('pnpm-lock.yaml');
        expect(state.after2.husky).not.toContain('package-lock.json');
      });
    });

    when('[t5b] the npm lockfile is removed forget-not-destroy', () => {
      then('package-lock.json is deleted — but only because pnpm-lock.yaml exists', () => {
        // the fixture seeds BOTH lockfiles (the realistic post-`pnpm install` state),
        // so the gated fix removes the redundant npm lockfile. the survive-when-unsafe
        // path (no pnpm-lock.yaml → no delete) is clamped in the bad-practice's own
        // package-lock.json.declapract.integration.test.ts [case2].
        expect(state.before.packageLock).not.toBeNull();
        expect(state.after2.packageLock).toBeNull();
      });
    });

    when('[t5c] the expo deploy workflow is migrated npm -> pnpm', () => {
      then('the npm-shaped install is clobbered to the pnpm shape', () => {
        // the fixture ships an npm-shaped .deploy-expo.yml (npm ci + actions/cache
        // on package-lock.json). the cicd-app-react-native-expo practice declares
        // this workflow via the repo's default EQUALS, so a divergent consumer
        // file is overwritten with the pnpm template. this is the wish's
        // "clobber (safe target)" — a CI workflow is a safe overwrite, unlike a
        // consumer's own tsconfig/gitignore which merge.
        //
        // the pnpm template mirrors the node deploy path (.deploy-sls.yml): a shared
        // install job builds node_modules once via ./.github/workflows/.install.yml,
        // then each deploy job restores it (fail-on-cache-miss) rather than re-install.
        // so the pnpm install itself lives in .install.yml, not this workflow.
        expect(state.before.deployExpo).toContain('npm ci');
        expect(state.after2.deployExpo).toContain(
          'uses: ./.github/workflows/.install.yml',
        );
        expect(state.after2.deployExpo).toContain('fail-on-cache-miss: true');
        expect(state.after2.deployExpo).not.toContain('npm ci');
      });

      then('the before + after .deploy-expo.yml match snapshot', () => {
        // a diff-visible clamp on the 125-line live CI/CD workflow: any silent
        // content drift in the template surfaces in the after-snapshot review.
        expect(state.before.deployExpo).toMatchSnapshot('.deploy-expo.yml — before');
        expect(state.after2.deployExpo).toMatchSnapshot('.deploy-expo.yml — after migration');
      });
    });

    when('[t5e] the jest dual-source is reconciled (stale .js dropped for the .ts config)', () => {
      // the app-protools-native audit names the jest dual-source hazard: a jsdom
      // `jest.config.js` + the shipped `jest.config.ts` both present at once. the tests-any
      // `javascript-config-files` bad-practice DELETES the stale `.js` while the tests-expo
      // best-practice supplies the canonical `.ts` in the same pass — so a repo under
      // migration ends with ONE jest config source, not two.
      then('the fixture starts with a stale JS jest config', () => {
        expect(state.before.jestConfigJs).not.toBeNull();
        expect(state.before.jestConfigJs).toContain('jsdom');
      });

      then('declapract fix removes the stale JS jest config', () => {
        expect(state.after2.jestConfigJs).toBeNull();
      });

      then('the shipped .ts jest config lands as the single source', () => {
        expect(state.after2.jestConfigTs).not.toBeNull();
      });
    });

    when('[t5d] the domain EXISTS check is unmet (no src/domain/objects/index.ts)', () => {
      // the wisher ruled `domain`'s EXISTS check a HARD BLOCKER for every expo repo, and a
      // real app-protools-shaped repo has no `src/domain/objects/index.ts` on day one. this
      // characterizes what `declapract fix` DOES on that unmet, content-less EXISTS check:
      // it flags the absence (the human must author their domain) but auto-creates no file —
      // there is no sibling template to write — and it does NOT halt the rest of the apply.
      then('the repo has no domain objects file to begin with', () => {
        expect(state.before.domainIndex).toBeNull();
      });

      then('declapract fix does NOT auto-create the file (no template to write)', () => {
        // an EXISTS best-practice with no sibling content cannot be auto-fixed — the file
        // stays absent, so the check keeps flagging until the human authors their domain.
        expect(state.after2.domainIndex).toBeNull();
      });

      then('the unmet EXISTS does NOT halt the apply — the whole migration still lands', () => {
        // proof the apply did not abort on the unmet check: the domain practice's OWN
        // package.json CONTAINS still merged its deps, AND every other practice's mutation
        // (the dir-move, the pnpm switch, the .npmrc hoist) landed — asserted across [t0]-[t5c].
        const pkg = JSON.parse(state.after2.pkg!);
        expect(pkg.dependencies['domain-objects']).toBeDefined();
        expect(pkg.dependencies['type-fns']).toBeDefined();
        expect(state.after2.movedLogic).not.toBeNull();
      });
    });

    when('[t6] the migration is re-applied', () => {
      then('package.json is a fixed point once settled', () => {
        expect(state.after3.pkg).toEqual(state.after2.pkg);
      });

      then('tsconfig.json is a fixed point', () => {
        expect(state.after3.tsconfig).toEqual(state.after2.tsconfig);
      });

      then('the moved logic file is a fixed point', () => {
        expect(state.after3.movedLogic).toEqual(state.after2.movedLogic);
      });

      then('the before + settled package.json match snapshot', () => {
        expect(state.before.pkg).toMatchSnapshot('package.json — before');
        expect(state.after2.pkg).toMatchSnapshot('package.json — after migration');
      });
    });
  });
});

/**
 * .what = a drift guard between the migration fixture's curated practice subset and the
 *         real `app-react-native-expo` usecase in `src/useCases.yml`.
 * .why  = the fixture above deliberately exercises only the practices that MUTATE an extant
 *         repo's files (the migration-risk set). the rest of the real usecase merely DROPS a
 *         net-new file (a config-only practice: lint, format, husky, …) and carries no
 *         migration risk, so it is left out on purpose. that curation is a hidden link:
 *         when a practice is added to the real usecase, the fixture silently falls out of
 *         date and no test notices. this guard makes the link explicit — every real
 *         practice must be classified as EITHER exercised-by-the-fixture OR config-only-
 *         allowlisted, so a new practice fails the build until a human triages it into one bin.
 */
describe('app-react-native-expo — migration-fixture drift guard', () => {
  // a config-only practice DROPS a net-new file with no migration risk, so the migration
  // fixture need not exercise it. each entry is a deliberate human triage, not a default.
  // NO terraform-common — it was dropped from the expo usecase (an expo app owns no
  // terraform-managed infra), so it is no longer a practice to classify.
  const configOnlyAllowlist = [
    'cache',
    'cicd-common',
    'conventional-commits',
    'errors',
    'husky',
    'format',
    'nonpublished-modules',
    'package-json-order',
    'provision-github',
    'lint',
    'lint-react',
    'lint-react-native',
  ];

  const readUsecasePractices = (input: {
    path: string;
    usecase: string;
  }): string[] => {
    const parsed = yaml.parse(readFileSync(input.path, 'utf-8'));
    return parsed['use-cases'][input.usecase].practices;
  };

  const repoRoot = path.join(__dirname, '../../..');

  given('the real usecase and the fixture usecase', () => {
    // the real expo usecase now COMPOSES its platform baseline via `extends`, so its full
    // expanded set (not its raw `.practices`, which holds only the expo delta) is the true
    // practice set a consumer receives. expand it so the fixture-vs-real comparison stays honest.
    const realPractices = getAllPracticesForUsecase({
      usecasesYmlPath: path.join(repoRoot, 'src/useCases.yml'),
      usecase: 'app-react-native-expo',
    });
    // the fixture usecase lists its practices inline (no extends), so its raw list is its set.
    const fixturePractices = readUsecasePractices({
      path: path.join(
        repoRoot,
        'src/.test/assets/expo-migration/declarations/useCases.yml',
      ),
      usecase: 'app-react-native-expo',
    });

    when('the fixture subset is measured against the real usecase', () => {
      then('the fixture invents no practice absent from the real usecase', () => {
        const invented = fixturePractices.filter(
          (practice) => !realPractices.includes(practice),
        );
        expect(invented).toEqual([]);
      });

      then('a fixture practice is never also on the config-only allowlist', () => {
        const overlap = fixturePractices.filter((practice) =>
          configOnlyAllowlist.includes(practice),
        );
        expect(overlap).toEqual([]);
      });

      then('the allowlist names no practice absent from the real usecase', () => {
        const dead = configOnlyAllowlist.filter(
          (practice) => !realPractices.includes(practice),
        );
        expect(dead).toEqual([]);
      });

      then('every real usecase practice is classified — exercised or config-only', () => {
        const classified = new Set([
          ...fixturePractices,
          ...configOnlyAllowlist,
        ]);
        const unclassified = realPractices.filter(
          (practice) => !classified.has(practice),
        );
        expect(unclassified).toEqual([]);
      });
    });
  });
});

/**
 * .what = a drift guard between `typescript-project`'s platform baseline and the
 *         `app-react-native-expo` usecase in `src/useCases.yml`.
 * .why  = both usecases now COMPOSE the shared `typescript-project-core` baseline via
 *         `extends`, so the 17 runtime-agnostic practices reach both consumers from ONE
 *         source and cannot drift apart by hand-copy. this guard is the second line of
 *         defense: it measures each usecase's RESOLVED practice set (extends applied) and
 *         asserts every practice in `typescript-project`'s resolved set is EITHER in expo's
 *         resolved set OR on the `expoDivergesFromBaseline` allowlist (a deliberate
 *         runtime-swap or exclusion). so if a future practice is added to `typescript-project`
 *         DIRECTLY (its runtime delta, not the shared core), it fails the build until a human
 *         triages it into expo or names it a divergence — the silent-drift regression this
 *         whole wish exists to fix, kept loud.
 * .note = the guard reads the RESOLVED set (`getAllPracticesForUsecase`), not the raw
 *         `.practices`. after the core extraction both usecases carry only their runtime
 *         delta inline, so a raw read would compare deltas, not baselines.
 */
describe('app-react-native-expo — platform-baseline drift guard', () => {
  // the practices `typescript-project`'s resolved set carries that the expo usecase
  // deliberately does NOT — each a runtime swap or a wish-scoped exclusion, not an oversight.
  // a build failure here means: triage the new baseline practice into expo, or add it here
  // with a reason.
  const expoDivergesFromBaseline = [
    // node-shaped build/test practices, replaced by the -expo cut in the triad
    'typescript-node', // → typescript-expo
    'tests-node', //      → tests-expo
    // a runtime rate-limit lib, excluded by the wish (not a platform tool)
    'bottleneck',
  ];

  const usecasesYmlPath = path.join(__dirname, '../../..', 'src/useCases.yml');

  given('the typescript-project baseline and the expo usecase', () => {
    const baselinePractices = getAllPracticesForUsecase({
      usecasesYmlPath,
      usecase: 'typescript-project',
    });
    const expoPractices = getAllPracticesForUsecase({
      usecasesYmlPath,
      usecase: 'app-react-native-expo',
    });

    when('the expo usecase is measured against the baseline', () => {
      then('every baseline practice is in expo OR deliberately diverged', () => {
        // this assertion carries the load: a practice added to typescript-project
        // that is neither carried into expo nor listed as a deliberate divergence
        // fails the build — so the silent-drift regression cannot ship.
        const classified = new Set([
          ...expoPractices,
          ...expoDivergesFromBaseline,
        ]);
        const undropped = baselinePractices.filter(
          (practice) => !classified.has(practice),
        );
        expect(undropped).toEqual([]);
      });

      then('the divergence allowlist names no practice absent from the baseline', () => {
        const dead = expoDivergesFromBaseline.filter(
          (practice) => !baselinePractices.includes(practice),
        );
        expect(dead).toEqual([]);
      });

      then('a diverged practice is never ALSO present in the expo usecase', () => {
        // a practice cannot be both "carried into expo" and "deliberately dropped"
        const contradiction = expoDivergesFromBaseline.filter((practice) =>
          expoPractices.includes(practice),
        );
        expect(contradiction).toEqual([]);
      });
    });
  });
});

/**
 * .what = a characterization test that PINS every usecase's fully-resolved practice set
 *         (extends applied) to an explicit expected list.
 * .why  = the `typescript-project-core` extraction moved 17 shared practices out of the
 *         hand-copied usecase bodies into one composed baseline. the extraction is only safe
 *         if it changes ZERO practice for any consumer. this test is that proof: it locks each
 *         usecase's resolved set, so any future edit to the extends graph or the core that
 *         would add/drop a practice for a repo fails the build with an exact diff. it also
 *         documents declapract's NON-TRANSITIVE extends (declapract#17) — each consumer must
 *         extend `typescript-project-core` DIRECTLY, since it does not arrive through
 *         `typescript-project`.
 */
describe('useCases.yml — resolved-practice characterization', () => {
  const usecasesYmlPath = path.join(__dirname, '../../..', 'src/useCases.yml');

  const sorted = (input: string[]): string[] => [...input].sort();

  // the shared runtime-agnostic baseline every real dev repo composes
  const core = [
    'cache',
    'cicd-common',
    'conventional-commits',
    'husky',
    'directory-structure-src',
    'domain',
    'errors',
    'format',
    'git',
    'lint',
    'node',
    'nonpublished-modules',
    'package-json-order',
    'rhachet',
    'tests-any',
    'typescript-any',
    'pnpm',
  ];

  // the node runtime delta atop the core
  const nodeDelta = ['tests-node', 'typescript-node', 'bottleneck'];

  const lambdaServiceDelta = [
    'artifact',
    'cicd-service',
    'config',
    'commands',
    'dates-and-times',
    'environments',
    'environments-aws',
    'logs',
    'node-service',
    'runtime-schemas',
    'serverless',
    'provision-github',
    'terraform-common',
    'terraform-aws',
    'tests-service',
    'uuid',
  ];

  const expected: Record<string, string[]> = {
    'typescript-project-core': core,
    'typescript-project': [...core, ...nodeDelta],
    'npm-package': [
      ...core,
      ...nodeDelta,
      'cicd-package',
      'node-package',
      'provision-github',
    ],
    'lambda-service': [...core, ...nodeDelta, ...lambdaServiceDelta],
    'lambda-service-with-rds': [
      ...core,
      ...nodeDelta,
      ...lambdaServiceDelta,
      'persist-with-rds',
    ],
    'lambda-service-with-dynamodb': [
      ...core,
      ...nodeDelta,
      ...lambdaServiceDelta,
      'persist-with-dynamodb',
    ],
    // the expo runtime delta atop the core — NO terraform-common (an expo app owns no
    // terraform-managed infra; declastruct is the go-forward), NO node-shaped build/test.
    'app-react-native-expo': [
      ...core,
      'cicd-app-react-native-expo',
      'provision-github',
      'lint-react',
      'lint-react-native',
      'tests-expo',
      'typescript-expo',
    ],
  };

  given('the useCases.yml extends graph', () => {
    for (const usecase of Object.keys(expected)) {
      when(`the resolved set of '${usecase}'`, () => {
        then('matches the pinned characterization', () => {
          const actual = getAllPracticesForUsecase({ usecasesYmlPath, usecase });
          expect(sorted(actual)).toEqual(sorted(expected[usecase]!));
        });
      });
    }
  });

  when('expo is compared to the core baseline', () => {
    then('expo carries every core practice (the extraction reached it)', () => {
      const expo = getAllPracticesForUsecase({
        usecasesYmlPath,
        usecase: 'app-react-native-expo',
      });
      const absent = core.filter((practice) => !expo.includes(practice));
      expect(absent).toEqual([]);
    });

    then('expo carries no terraform-common (dropped in this wish)', () => {
      const expo = getAllPracticesForUsecase({
        usecasesYmlPath,
        usecase: 'app-react-native-expo',
      });
      expect(expo).not.toContain('terraform-common');
    });
  });
});

/**
 * .what = the FULL-usecase evaluation smoke — a real `executeApply` of the COMPLETE
 *         `app-react-native-expo` usecase (all 23 practices, the same set a consumer
 *         receives), run against the app-protools-shaped repo.
 * .why  = the graceful-migration acceptance test above deliberately curates the 11
 *         migration-RISK practices, so the 12 config-only practices (cicd-common, husky,
 *         conventional-commits, format, lint, …) — the bulk of the real usecase — are
 *         never exercised end-to-end. this smoke closes that gap: it proves the WHOLE
 *         usecase expands and applies without a variable-gap, a cross-practice collision,
 *         or an ELOOP — the wish's headline criterion (a consumer runs `declapract fix`
 *         on the real usecase and it lands clean). the fixture symlinks all 23 practices
 *         individually (never the real `src/practices` dir), so the deep-walk is loop-free
 *         by construction.
 * .note = a practice-set parity guard below pins this fixture's usecase === the real
 *         `src/useCases.yml` usecase, so the smoke can never silently test a stale set.
 */
describe('app-react-native-expo — full-usecase evaluation smoke', () => {
  const repoRoot = path.join(__dirname, '../../..');
  const sorted = (input: string[]): string[] => [...input].sort();

  given('the full-usecase fixture mirrors the real usecase', () => {
    const realPractices = getAllPracticesForUsecase({
      usecasesYmlPath: path.join(repoRoot, 'src/useCases.yml'),
      usecase: 'app-react-native-expo',
    });
    const fixturePractices = getAllPracticesForUsecase({
      usecasesYmlPath: path.join(
        repoRoot,
        'src/.test/assets/expo-fullusecase/declarations/useCases.yml',
      ),
      usecase: 'app-react-native-expo',
    });

    when('the fixture practice set is measured against the real one', () => {
      then('the two practice sets are identical (no silent drift)', () => {
        expect(sorted(fixturePractices)).toEqual(sorted(realPractices));
      });

      then('every fixture practice has a symlink in the declarations dir', () => {
        const symlinked = fixturePractices.filter((practice) =>
          existsSync(
            path.join(
              repoRoot,
              'src/.test/assets/expo-fullusecase/declarations/practices',
              practice,
            ),
          ),
        );
        expect(sorted(symlinked)).toEqual(sorted(fixturePractices));
      });
    });
  });

  given('[case1] the app-protools-shaped repo on the full usecase', () => {
    const tempDir = genTempDir({
      slug: 'expo-fullusecase',
      clone: './src/.test/assets/expo-migration/repo-app-protools-shaped',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/expo-fullusecase/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = (rel: string) =>
      fs.readFile(path.join(tempDir, rel), 'utf-8').catch(() => null);

    // useBeforeAll runs the REAL executeApply over the WHOLE 23-practice usecase; if the
    // usecase fails to expand (a variable gap), or a practice fix throws (a collision or
    // ELOOP), this setup throws and every `then` below goes red. so "applies clean" is
    // proven by the setup that completes AND by the config-only artifacts below.
    const state = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');

      // two passes: the dir-migration is a two-pass settle (relocate, then rewrite), and
      // the whole usecase must survive both — the second pass also proves no config-only
      // practice re-flags its own just-applied output (a fix that would loop).
      await executeApply({ config });
      await executeApply({ config });

      return {
        // a config-only practice ABSENT from the migration subset — proves the 12 extra
        // practices actually ran (the fixture repo has no commitlint config before apply)
        commitlint: await read('commitlint.config.js'),
        // cicd-common (config-only) drops this net-new workflow
        declastructWorkflow: await read('.github/workflows/.declastruct.yml'),
        // the migration-risk practices still land in the full set (a superset apply)
        movedLogic: await read('src/domain.operations/customer/getCustomer.ts'),
        npmrc: await read('.npmrc'),
      };
    }, 230_000);

    when('[t0] the whole usecase is applied', () => {
      then('the config-only practices ran (commitlint config created)', () => {
        expect(state.commitlint).not.toBeNull();
      });

      then('cicd-common ran (the declastruct workflow was dropped in)', () => {
        expect(state.declastructWorkflow).not.toBeNull();
      });

      then('the migration-risk practices still landed (superset apply)', () => {
        expect(state.movedLogic).not.toBeNull();
        expect(state.npmrc).toContain('node-linker=hoisted');
      });
    });
  });

  given('[case2] a bare create-expo-app scaffold with no src/ at all', () => {
    const tempDir = genTempDir({
      slug: 'expo-fullusecase-greenfield',
      clone: './src/.test/assets/expo-fullusecase/repo-greenfield',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/expo-fullusecase/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = (rel: string) =>
      fs.readFile(path.join(tempDir, rel), 'utf-8').catch(() => null);

    // the greenfield repo holds only package.json + app.json — NO src/ at all. the domain
    // and directory-structure-src EXISTS checks are therefore unmet, so the apply must FLAG
    // them (leave the file absent) WITHOUT a halt or a crash. this useBeforeAll proves the
    // whole 23-practice usecase survives a repo with no src/ tree — the r10 blocker-2 case.
    const state = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');
      await executeApply({ config });
      await executeApply({ config });

      return {
        // config-only practices still drop their net-new files on a bare tree
        commitlint: await read('commitlint.config.js'),
        declastructWorkflow: await read('.github/workflows/.declastruct.yml'),
        // the expo .npmrc hoist still lands on a bare tree (findsert onto an absent file)
        npmrc: await read('.npmrc'),
        // the unmet domain EXISTS check stays absent — flagged, never auto-authored
        domainIndex: await read('src/domain/objects/index.ts'),
      };
    }, 230_000);

    when('[t0] the whole usecase is applied to a bare no-src repo', () => {
      then('the apply does NOT crash — config-only files still created', () => {
        expect(state.commitlint).not.toBeNull();
        expect(state.declastructWorkflow).not.toBeNull();
      });

      then('the expo .npmrc hoist still lands on a bare tree', () => {
        expect(state.npmrc).toContain('node-linker=hoisted');
      });

      then('the unmet domain EXISTS check stays absent (flagged, not auto-authored)', () => {
        expect(state.domainIndex).toBeNull();
      });
    });
  });
});
