import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import type { Config } from 'jest';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getModuleExportsFromTsSource } from '../../utils/getModuleExportsFromTsSource';
import expoAcceptance from '../tests-expo/best-practice/jest.acceptance.config';
import expoIntegration from '../tests-expo/best-practice/jest.integration.config';
import expoUnit from '../tests-expo/best-practice/jest.unit.config';
import nodeAcceptance from '../tests-node/best-practice/jest.acceptance.config';
import nodeIntegration from '../tests-node/best-practice/jest.integration.config';
import nodeUnit from '../tests-node/best-practice/jest.unit.config';

/**
 * .what = clamps the `testMatch` of all six jest configs the tests practices emit:
 *         - #647: each excludes `.agent/.actors/` (rhachet host-local state that holds a scratch
 *           clone of the repo, whose suites would run twice and fail for reasons not on the branch)
 *         - #679: each kind matches BOTH suffix forms (`x.integration.test.ts` and `x._.intg.test.ts`),
 *           and unit excludes every kind suffix of both forms, so no test runs under two kinds
 *         - each ignores `.agent/` but for `.agent/repo=.this/`, and `.temp/`, via
 *           testPathIgnorePatterns + modulePathIgnorePatterns: a test in the rmsafe trash, a vendored
 *           role, or a scratch clone never runs, a trashed snapshot never reads as obsolete, and the
 *           repo's own `.agent/repo=.this/` suites still run (#811)
 *         - each anchors its ignores at its own root, regex-escaped, so a checkout under another
 *           dir's `.temp/` or `.agent/`, or at a path with `(` or `+`, still runs its own suites
 * .teeth = drop the actors negation from any config and its case reddens; drop a seam glob or a
 *          unit exclusion and its case reddens; drop the anchor or its escape and the real jest run
 *          below lists the wrong suites, since its root sits under `.temp/` at a path with `(` and `+`
 * .note = the configs are whole-file templates (EQUALS), so the next apply lands each line in an
 *         extant repo with no merge fix. INTEGRATION by `rule.forbid.unit.remote-boundaries`: the
 *         last case writes a fixture tree and runs jest itself over it.
 */

const ACTORS = '!**/.agent/.actors/**';

const NODE_KIND = { ext: 'ts', practice: 'tests-node' };
const EXPO_KIND = { ext: '{ts,tsx}', practice: 'tests-expo' };

const CASES = [
  { name: 'tests-node unit', config: nodeUnit, file: 'jest.unit.config.ts', kind: 'unit', ...NODE_KIND },
  { name: 'tests-node integration', config: nodeIntegration, file: 'jest.integration.config.ts', kind: 'intg', ...NODE_KIND },
  { name: 'tests-node acceptance', config: nodeAcceptance, file: 'jest.acceptance.config.ts', kind: 'acpt', ...NODE_KIND },
  { name: 'tests-expo unit', config: expoUnit, file: 'jest.unit.config.ts', kind: 'unit', ...EXPO_KIND },
  { name: 'tests-expo integration', config: expoIntegration, file: 'jest.integration.config.ts', kind: 'intg', ...EXPO_KIND },
  { name: 'tests-expo acceptance', config: expoAcceptance, file: 'jest.acceptance.config.ts', kind: 'acpt', ...EXPO_KIND },
];

/**
 * .what = one ignore list as the single RegExp jest compiles from it
 * .why  = jest joins each list with `|` (@jest/core build/index.js), so the clamp reads the lists
 *         through that same lens
 */
const asIgnoreMatcher = (patterns: string[]): RegExp => new RegExp(patterns.join('|'));

describe('the six jest testMatch arrays', () => {
  CASES.forEach((testCase, index) => {
    given(`[case${index + 1}] ${testCase.name}`, () => {
      const testMatch = testCase.config.testMatch ?? [];

      // the config's own dir is its root: each anchor is built from its `__dirname`
      const root = join(__dirname, '..', testCase.practice, 'best-practice');

      when('[t0] the shipped config is read', () => {
        then('its match and ignore lists match snapshot, so a reviewer reads each as shipped', () => {
          // the lists are globs and regexes built from the config's own dir; mask that dir, in plain
          // and in regex-escaped form, so the snap holds no host path
          const rootEscaped = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const asMasked = (patterns: string[]): string[] =>
            patterns.map((pattern) => pattern.split(rootEscaped).join('<root>').split(root).join('<root>'));
          expect({
            testMatch: asMasked(testMatch),
            testPathIgnorePatterns: asMasked(testCase.config.testPathIgnorePatterns ?? []),
            modulePathIgnorePatterns: asMasked(testCase.config.modulePathIgnorePatterns ?? []),
          }).toMatchSnapshot();
        });

        then('it excludes .agent/.actors (#647)', () => {
          expect(testMatch).toContain(ACTORS);
        });

        const testPathMatcher = asIgnoreMatcher(testCase.config.testPathIgnorePatterns ?? []);
        const modulePathMatcher = asIgnoreMatcher(testCase.config.modulePathIgnorePatterns ?? []);

        const IGNORE_CASES = [
          { sub: 'src/domain/x.test.ts', ignored: false, why: 'own suite in src' },
          { sub: '.agent/repo=.this/role=any/skills/x.test.ts', ignored: false, why: 'own suite in .agent/repo=.this (#811)' },
          { sub: '.agent/repo=ehmpathy/role=mechanic/skills/x.integration.test.ts', ignored: true, why: 'vendored role suite (#783)' },
          { sub: '.agent/repo=.thisother/role=any/x.test.ts', ignored: true, why: 'a look-alike of repo=.this is a vendored dir: the keep is bound at the dir edge' },
          { sub: '.agent/.actors/actor.via.repo=ambient/brain/plugin.test.ts', ignored: true, why: 'actor plugin suite (#799)' },
          { sub: '.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash/src/x.test.ts', ignored: true, why: 'rmsafe trash suite (#809)' },
          { sub: '.agent/.cache/rmsafe/trash/__snapshots__/x.test.ts.snap', ignored: true, why: 'trashed snapshot, else read as obsolete (#809)' },
          { sub: '.temp/clone/src/x.test.ts', ignored: true, why: 'scratch clone in .temp (#788)' },
          { sub: 'src/.templates/x.test.ts', ignored: false, why: 'a .templates dir is no .temp: the pattern is bound by a slash on each side' },
          { sub: 'src/x.temp.test.ts', ignored: false, why: 'a .temp in a file name is no .temp dir' },
          { sub: 'src/.agentic/x.test.ts', ignored: false, why: 'an .agentic dir is no .agent dir' },
          { sub: 'node_modules/pkg/x.test.ts', ignored: true, why: 'dependency suite' },
        ];
        for (const ignoreCase of IGNORE_CASES)
          then(`testPathIgnorePatterns ${ignoreCase.ignored ? 'skip' : 'keep'} <root>/${ignoreCase.sub}: ${ignoreCase.why}`, () => {
            expect(testPathMatcher.test(join(root, ignoreCase.sub))).toEqual(ignoreCase.ignored);
          });

        then('modulePathIgnorePatterns keep .agent/repo=.this/ and src/ in the haste map', () => {
          expect(modulePathMatcher.test(join(root, '.agent/repo=.this/role=any/skills/x.ts'))).toEqual(false);
          expect(modulePathMatcher.test(join(root, 'src/x.ts'))).toEqual(false);
          // the haste crawler tests each dir with no slash at its end; a match here prunes the whole dir
          expect(modulePathMatcher.test(join(root, '.agent/repo=.this'))).toEqual(false);
        });

        then('modulePathIgnorePatterns drop the rest of .agent/ and .temp/ from the haste map', () => {
          expect(modulePathMatcher.test(join(root, '.agent/.actors/a/package.json'))).toEqual(true);
          expect(modulePathMatcher.test(join(root, '.agent/repo=ehmpathy/x.ts'))).toEqual(true);
          expect(modulePathMatcher.test(join(root, '.temp/clone/package.json'))).toEqual(true);
        });

        if (testCase.kind === 'intg')
          then('it matches both integration suffix forms (#679)', () => {
            expect(testMatch).toContain(`**/*.integration.test.${testCase.ext}`);
            expect(testMatch).toContain(`**/*._.intg.test.${testCase.ext}`);
          });

        if (testCase.kind === 'acpt')
          then('it matches both acceptance suffix forms (#679)', () => {
            expect(testMatch).toContain(`**/*.acceptance.test.${testCase.ext}`);
            expect(testMatch).toContain(`**/*._.acpt.test.${testCase.ext}`);
          });

        if (testCase.kind === 'unit')
          then('it excludes every other kind suffix, of both forms (#679)', () => {
            for (const suffix of [
              'acceptance',
              'integration',
              'evaluation',
              '_.acpt',
              '_.intg',
              '_.eval',
            ])
              expect(testMatch).toContain(`!**/*.${suffix}.test.${testCase.ext}`);
          });
      });
    });
  });

  given('[case-jest] jest itself, over a fixture checkout under .temp/, at a path with ( ) and +', () => {
    /**
     * .what = evaluate one shipped config as if it sat at the fixture root, then list the suites
     *         jest would run there under its match and ignore lists
     * .why  = the matrix above reads the lists through a copy of jest's compile; this run asks jest.
     *         genTempDir roots the fixture under this repo's own `.temp/`, the very ancestor a
     *         scratch clone has, and the root's own name holds `(`, `)` and `+`, which an unescaped
     *         anchor would read as regex
     * .note = the config's `__dirname` and `process` are stood in, so the anchor is built from the
     *         fixture root and the config's env writes stay off this worker
     */
    const genFixtureCheckout = (input: { slug: string; kindSuffix: string }): string => {
      const rootDir = join(realpathSync(genTempDir({ slug: input.slug })), 'clone (work+1)');
      for (const file of FIXTURE_SUITES)
        mkdirSync(dirname(join(rootDir, file(input.kindSuffix))), { recursive: true });
      for (const file of FIXTURE_SUITES)
        writeFileSync(join(rootDir, file(input.kindSuffix)), "test('x', () => undefined);\n");
      return rootDir;
    };
    const getOneConfigAtRoot = (input: { rootDir: string; practice: string; file: string }): Config | undefined => {
      const source = readFileSync(join(__dirname, '..', input.practice, 'best-practice', input.file), 'utf-8');
      const { default: config } = getModuleExportsFromTsSource<{ default: Config }>({
        source: `const __dirname = ${JSON.stringify(input.rootDir)};\nconst process = { env: {} };\n${source}`,
        requireStub: (id) => {
          throw new Error(`no stub for require('${id}')`);
        },
      });
      return config;
    };
    const listSuites = (input: { slug: string; practice: string; file: string; kindSuffix: string }) => {
      const rootDir = genFixtureCheckout({ slug: input.slug, kindSuffix: input.kindSuffix });
      const config = getOneConfigAtRoot({ rootDir, practice: input.practice, file: input.file });
      const configJson = JSON.stringify({
        rootDir,
        testMatch: config?.testMatch,
        testPathIgnorePatterns: config?.testPathIgnorePatterns,
        modulePathIgnorePatterns: config?.modulePathIgnorePatterns,
      });
      const result = spawnSync(
        join(__dirname, '../../../node_modules/.bin/jest'),
        ['--listTests', '--no-watchman', '--config', configJson],
        { cwd: rootDir, encoding: 'utf-8' },
      );
      const listed = result.stdout
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => relative(rootDir, line))
        .sort();
      return { rootDir, stderr: result.stderr, listed };
    };

    const FIXTURE_SUITES = [
      (kind: string) => `src/a.${kind}test.ts`,
      (kind: string) => `src/.templates/b.${kind}test.ts`,
      (kind: string) => `.agent/repo=.this/role=any/skills/c.${kind}test.ts`,
      (kind: string) => `.agent/repo=ehmpathy/role=mechanic/skills/d.${kind}test.ts`,
      (kind: string) => `.temp/clone/src/e.${kind}test.ts`,
    ];
    const asSuitesOwn = (kind: string) =>
      [
        `.agent/repo=.this/role=any/skills/c.${kind}test.ts`,
        `src/.templates/b.${kind}test.ts`,
        `src/a.${kind}test.ts`,
      ].sort();

    const KIND_SUFFIX = { unit: '', intg: 'integration.', acpt: 'acceptance.' } as const;

    /**
     * .what = run the node unit suites for real (`jest --ci`) over a fixture whose rmsafe trash
     *         holds a snapshot file with no test beside it, with the shipped ignores or with none
     * .why  = a trashed snapshot the haste map sees reads as obsolete, and `--ci` reports it; the
     *         run with no ignores proves the fixture would trip, so the run with them proves the fix
     */
    const runSuitesCi = (input: { slug: string; ignores: 'shipped' | 'none' }) => {
      // the fixture and its config, with no `--listTests` spawn: this run asks jest --ci alone
      const rootDir = genFixtureCheckout({ slug: input.slug, kindSuffix: '' });
      const snapPath = join(rootDir, '.agent/.cache/rmsafe/trash/__snapshots__/gone.test.ts.snap');
      mkdirSync(dirname(snapPath), { recursive: true });
      writeFileSync(snapPath, '// Jest Snapshot v1, https://goo.gl/fbAQLP\n\nexports[`gone 1`] = `"y"`;\n');
      const config = getOneConfigAtRoot({ rootDir, practice: 'tests-node', file: 'jest.unit.config.ts' });
      const configJson = JSON.stringify({
        rootDir,
        testMatch: config?.testMatch,
        ...(input.ignores === 'shipped'
          ? {
              testPathIgnorePatterns: config?.testPathIgnorePatterns,
              modulePathIgnorePatterns: config?.modulePathIgnorePatterns,
            }
          : {}),
      });
      const result = spawnSync(
        join(__dirname, '../../../node_modules/.bin/jest'),
        ['--ci', '--no-watchman', '--no-color', '--config', configJson],
        { cwd: rootDir, encoding: 'utf-8', env: { ...process.env, FORCE_COLOR: '0' } },
      );
      return { output: `${result.stdout}\n${result.stderr}`, status: result.status };
    };

    when('[t-ci] jest --ci runs the node unit suites over a trashed snapshot file', () => {
      const shipped = useBeforeAll(async () => runSuitesCi({ slug: 'jest-testmatch-ci-shipped', ignores: 'shipped' }));
      const none = useBeforeAll(async () => runSuitesCi({ slug: 'jest-testmatch-ci-none', ignores: 'none' }));

      then('with no ignores, the trashed snapshot reads as obsolete, so the fixture truly trips', () => {
        expect(none.output).toMatch(/obsolete/i);
      });

      then('with the shipped ignores, no snapshot reads as obsolete, and the own suites pass', () => {
        expect(shipped.output).not.toMatch(/obsolete/i);
        expect(shipped.output).toContain('Tests:       3 passed, 3 total');
        expect(shipped.status).toEqual(0);
      });
    });

    for (const testCase of CASES)
      when(`[t] jest lists the suites under the ${testCase.name} config`, () => {
        const kindSuffix = KIND_SUFFIX[testCase.kind as keyof typeof KIND_SUFFIX];
        const scene = useBeforeAll(async () =>
          listSuites({
            slug: `jest-testmatch-${testCase.practice}-${testCase.kind}`,
            practice: testCase.practice,
            file: testCase.file,
            kindSuffix,
          }),
        );

        then('the fixture root sits under a .temp dir, at a path with ( ) and +, so both hazards are real', () => {
          expect(scene.rootDir).toMatch(/\/\.temp\/.*\/clone \(work\+1\)$/);
        });

        then('it lists exactly the checkout\'s own suites: none under its own .agent/ or .temp/, all else kept', () => {
          expect(scene.stderr).toEqual('');
          expect(scene.listed).toEqual(asSuitesOwn(kindSuffix));
        });
      });
  });
});
