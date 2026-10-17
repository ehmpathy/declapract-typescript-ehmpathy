import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTempRepoWithDeclarationsOutside } from '../../utils/genTempRepoWithDeclarationsOutside';

// executeApply is slow (full usecase evaluation)
jest.setTimeout(180_000);

/**
 * .what = pipeline test for the expo test-toolchain triad (typescript-expo + tests-expo,
 *         paired with typescript-any + tests-any).
 * .why  = the shared cicd-common `.test.yml` runs `npm run build`, `test:types`,
 *         `test:unit`, `test:integration`, `test:acceptance` unconditionally. before the
 *         triad, the expo usecase carried none of those commands/configs, so a fresh expo
 *         consumer's CI aborted at `npm run build`. this proves `declapract fix` on the
 *         expo usecase EMITS the whole stack — the expo build (`expo export`), the
 *         typecheck, and the jest-expo unit/integration/acceptance configs — so CI runs.
 */
describe('expo test-toolchain triad — pipeline', () => {
  given('[case1] a fresh expo repo on the app-react-native-expo usecase', () => {
    const tempDir = genTempRepoWithDeclarationsOutside({
      slug: 'expo-toolchain',
      clone: './src/practices/tests-expo/.test/assets/repo-expo-greenfield',
      declarations: './src/.test/assets/expo-toolchain/declarations',
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });

    const read = (rel: string) =>
      fs.readFile(path.join(tempDir, rel), 'utf-8').catch(() => null);

    // useBeforeAll RETURNS the captured state (no in-place mutation of a shared const)
    const state = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');

      // apply the whole expo usecase (all four triad practices), thrice.
      // .why = declapract adds a new minVersion dep to an already-present package.json as
      //        its raw `@declapract{check.minVersion(..)}` expression on the first pass,
      //        then resolves it to the concrete version on the next pass (a net-new file
      //        is resolved immediately). so package.json settles at apply-2, and apply-3
      //        is the true fixed point. a net-new file (tsconfig, jest configs) is a fixed
      //        point from apply-1.
      await executeApply({ config });
      const tsconfigAfter1 = await read('tsconfig.json');
      const jestUnitAfter1 = await read('jest.unit.config.ts');
      const jestIntegrationAfter1 = await read('jest.integration.config.ts');
      const jestAcceptanceAfter1 = await read('jest.acceptance.config.ts');
      const prepareIntegrationAfter1 = await read('jest.integration.prepare.ts');
      const prepareAcceptanceAfter1 = await read('jest.acceptance.prepare.ts');
      const wakeAfter1 = await read('src/.test/useWakeOfLivedb.ts');
      const autopruneTypesAfter1 = await read(
        'src/.test/assets/test-fns.autoprune.d.ts',
      );

      await executeApply({ config });
      const pkgSettled = await read('package.json'); // resolved versions
      const tsconfigAfter2 = await read('tsconfig.json');
      const jestUnitAfter2 = await read('jest.unit.config.ts');
      const prepareAcceptanceAfter2 = await read('jest.acceptance.prepare.ts');
      const wakeAfter2 = await read('src/.test/useWakeOfLivedb.ts');

      await executeApply({ config });
      const pkgAfter3 = await read('package.json'); // must equal pkgSettled

      return {
        pkgSettled,
        pkgAfter3,
        tsconfigAfter1,
        jestUnitAfter1,
        jestIntegrationAfter1,
        jestAcceptanceAfter1,
        tsconfigAfter2,
        jestUnitAfter2,
        prepareIntegrationAfter1,
        prepareAcceptanceAfter1,
        wakeAfter1,
        autopruneTypesAfter1,
        prepareAcceptanceAfter2,
        wakeAfter2,
      };
    }, 170_000);

    when('[t0] declapract fix emits the toolchain', () => {
      then('package.json carries every command cicd-common runs', () => {
        const pkg = JSON.parse(state.pkgSettled!);
        // the exact commands cicd-common/.test.yml invokes
        expect(pkg.scripts.build).toBeDefined();
        expect(pkg.scripts['test:types']).toEqual('tsc -p ./tsconfig.json --noEmit');
        expect(pkg.scripts['test:unit']).toContain('jest -c ./jest.unit.config.ts');
        expect(pkg.scripts['test:integration']).toContain(
          'jest -c ./jest.integration.config.ts',
        );
        expect(pkg.scripts['test:acceptance']).toContain(
          'jest -c ./jest.acceptance.config.ts',
        );
      });

      then('the build command is the expo web export, not tsc', () => {
        const pkg = JSON.parse(state.pkgSettled!);
        // `typescript-expo` is the SOLE declarer of `build:web` — `cicd-app-react-native-expo`
        // no longer re-declares it, so there is no second CONTAINS declarer to oscillate
        // with (the single-source shape this repo's convergence/oscillation lesson prefers).
        // the export defaults ACCESS to prep, so an absent access never builds for prod (#619)
        expect(pkg.scripts['build:web']).toEqual(
          'ACCESS=${ACCESS:-prep} expo export --platform web',
        );
        expect(pkg.scripts.build).toEqual('npm run build:web');
      });

      then('package.json carries the typescript dep at a concrete version, and the SDK-coupled expo deps gated to the repo majors', () => {
        const pkg = JSON.parse(state.pkgSettled!);
        // typescript is a plain minVersion floor (tests-any), resolved concrete on pass 2
        expect(pkg.devDependencies.typescript).toEqual('5.4.5');
        // jest-expo + react-test-renderer are GATED to the repo's own expo/react majors (#584):
        // the fixture declares expo ^54 + react ^19, so the gate pins jest-expo to the expo major
        // and react-test-renderer to the react major (caret, not a fixed pin — the major is the gate)
        expect(pkg.devDependencies['jest-expo']).toEqual('^54.0.0');
        expect(pkg.devDependencies['react-test-renderer']).toEqual('^19.0.0');
      });

      then('tsconfig.json extends the expo base, not the node base', () => {
        const tsconfig = JSON.parse(state.tsconfigAfter1!);
        expect(tsconfig.extends).toEqual('expo/tsconfig.base');
      });

      then('the jest configs use the jest-expo preset', () => {
        expect(state.jestUnitAfter1).toContain("preset: 'jest-expo'");
        expect(state.jestIntegrationAfter1).toContain("preset: 'jest-expo/web'");
        expect(state.jestAcceptanceAfter1).toContain("preset: 'jest-expo/web'");
      });

      then('the emitted package.json + tsconfig + jest.unit match snapshot', () => {
        expect(state.pkgSettled).toMatchSnapshot('package.json — after fix');
        expect(state.tsconfigAfter1).toMatchSnapshot('tsconfig.json — after fix');
        expect(state.jestUnitAfter1).toMatchSnapshot('jest.unit.config.ts — after fix');
      });

      then('the integration + acceptance configs compose the livedb wake via-gateway (#621)', () => {
        expect(state.jestIntegrationAfter1).toContain("globalSetup: './jest.integration.prepare.ts'");
        expect(state.jestAcceptanceAfter1).toContain("globalSetup: './jest.acceptance.prepare.ts'");
        expect(state.prepareIntegrationAfter1).toContain("reaches: 'via-gateway'");
        expect(state.prepareAcceptanceAfter1).toContain("reaches: 'via-gateway'");
        expect(state.wakeAfter1).toContain('export const getWakeDecision');
      });

      then('the autoprune subpath types are emitted, for expo sdk < 54 (moduleResolution node)', () => {
        expect(state.autopruneTypesAfter1).toContain(
          "declare module 'test-fns/autoprune.setup.jest'",
        );
        expect(state.prepareIntegrationAfter1).toContain(
          '/// <reference path="./src/.test/assets/test-fns.autoprune.d.ts" />',
        );
        expect(state.prepareAcceptanceAfter1).toContain(
          '/// <reference path="./src/.test/assets/test-fns.autoprune.d.ts" />',
        );
      });

      then('the jest configs exclude .agent/.actors and match the `._.` kind seam (#647, #679)', () => {
        expect(state.jestUnitAfter1).toContain("'!**/.agent/.actors/**'");
        expect(state.jestIntegrationAfter1).toContain("'**/*._.intg.test.{ts,tsx}'");
        expect(state.jestAcceptanceAfter1).toContain("'**/*._.acpt.test.{ts,tsx}'");
      });

      then('the emitted acceptance config + prepare match snapshot', () => {
        expect(state.jestAcceptanceAfter1).toMatchSnapshot('jest.acceptance.config.ts — after fix');
        expect(state.prepareAcceptanceAfter1).toMatchSnapshot('jest.acceptance.prepare.ts — after fix');
      });
    });

    when('[t1] declapract fix is re-applied', () => {
      then('package.json is a fixed point once settled', () => {
        expect(state.pkgAfter3).toEqual(state.pkgSettled);
      });

      then('tsconfig.json is a fixed point', () => {
        expect(state.tsconfigAfter2).toEqual(state.tsconfigAfter1);
      });

      then('jest.unit.config.ts is a fixed point', () => {
        expect(state.jestUnitAfter2).toEqual(state.jestUnitAfter1);
      });

      then('the acceptance prepare and the wake util are fixed points', () => {
        expect(state.prepareAcceptanceAfter2).toEqual(state.prepareAcceptanceAfter1);
        expect(state.wakeAfter2).toEqual(state.wakeAfter1);
      });
    });
  });
});
