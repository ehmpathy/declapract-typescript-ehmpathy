import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply is slow (full practice evaluation)
jest.setTimeout(180_000);

/**
 * .what = pipeline test for the tests-expo jest-expo/rtr SDK-major gate (#584 / defect D1).
 * .why  = the unit test proves the check/fix in isolation; only the real executeApply pipeline
 *         proves declapract WIRES the declaration to `package.json` and reaches a fixed point on
 *         a re-run. the crash this gate prevents is a react-19-era jest-expo (54) held onto an
 *         expo-51 / react-18 repo — every unit suite throws at jest-expo's preset setup — so the
 *         gate must hold jest-expo at the repo's OWN expo major (51), never bump it to 54.
 * .note = scoped `practice: 'tests-expo'` — the declaration reads only `contents`, never
 *         `context.projectPractices`, so a practice scope is safe (no usecase-aware branch goes
 *         dark) and isolates the apply to tests-expo's package.json declaration alone.
 */
describe('tests-expo package.json — pipeline gate on the repo expo/react major', () => {
  given('[case1] an expo-51 / react-18 repo seeded with a react-19-era jest-expo 54 the gate aligns down to the expo major (51)', () => {
    const tempDir = genTempDir({
      slug: 'tests-expo-major-gate',
      clone: './src/.test/assets/expo-migration/repo-app-protools-shaped',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/expo-migration/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const pkgPath = () => path.join(tempDir, 'package.json');
    const readPkg = () => fs.readFile(pkgPath(), 'utf-8');

    const state = useBeforeAll(async () => {
      // seed the crash shape: a react-19-era jest-expo/rtr on an expo-51 / react-18 repo
      const seeded = {
        ...JSON.parse(await readPkg()),
        devDependencies: {
          ...JSON.parse(await readPkg()).devDependencies,
          expo: '~51.0.0',
          react: '18.2.0',
          'jest-expo': '^54.0.0',
          'react-test-renderer': '^19.0.0',
          'babel-preset-expo': '^12.0.0',
          'isomorphic-fetch': '^3.0.0',
        },
      };
      await fs.writeFile(pkgPath(), `${JSON.stringify(seeded, null, 2)}\n`);
      const pkgBefore = await readPkg();

      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'tests-expo',
        file: 'package.json',
      });
      const pkgAfter1 = await readPkg();
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'tests-expo',
        file: 'package.json',
      });
      const pkgAfter2 = await readPkg();

      return { pkgBefore, pkgAfter1, pkgAfter2 };
    }, 170_000);

    when('[t0] the tests-expo gate is applied to the seeded package.json', () => {
      then('jest-expo is held at the repo expo major (51), not bumped to 54', () => {
        expect(JSON.parse(state.pkgBefore).devDependencies['jest-expo']).toEqual(
          '^54.0.0',
        );
        expect(JSON.parse(state.pkgAfter1).devDependencies['jest-expo']).toEqual(
          '^51.0.0',
        );
      });

      then('react-test-renderer is held at the repo react major (18), not 19', () => {
        expect(
          JSON.parse(state.pkgAfter1).devDependencies['react-test-renderer'],
        ).toEqual('^18.0.0');
      });

      then('before + after match snapshot', () => {
        expect(state.pkgBefore).toMatchSnapshot('package.json — before');
        expect(state.pkgAfter1).toMatchSnapshot('package.json — after gate');
      });

      then('a second apply is a fixed point (the gate holds)', () => {
        expect(state.pkgAfter2).toEqual(state.pkgAfter1);
      });
    });
  });
});
