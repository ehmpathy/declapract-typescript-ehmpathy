import fs from 'fs/promises';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { executeApply, type FileCheckContext } from 'declapract';
import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { getPlanOutputFromDeclapract } from '../../.test/getPlanOutputFromDeclapract';
import { check as checkPreserved } from './bad-practices/imports-not-used-as-values-kept/tsconfig.json.declapract';

/**
 * .what = the plan text an adopter reads: blank lines cut, the temp dir masked
 */
const asPlanText = (input: { lines: string[]; tempDir: string }): string =>
  input.lines
    .filter((line) => !/^\s*$/.test(line))
    .join('\n')
    .replaceAll(input.tempDir, '<repo>');

/**
 * .what = the per-file flag rows of a plan: `* [FIX_AUTOMATIC] tsconfig.json`, `* [FIX_MANUAL] …`
 */
const getAllPlanFlags = (input: { lines: string[] }): string[] =>
  input.lines
    .filter((line) => /^\s*\* \[(FIX_AUTOMATIC|FIX_MANUAL)\]/.test(line))
    .map((line) => line.trim());

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = the files each apply lands, in the order an adopter's apply writes them
 * .why  = `tsconfig.build.json` rides along so the seam test below builds with the shipped build config
 */
const APPLIED_FILES = ['package.json', 'tsconfig.json', 'tsconfig.build.json'];

/**
 * .what = the typescript floor the template declares, read from its own `minVersion` pin
 * .why  = a patch bump of the floor moves this with it, so no test pins a version twice
 */
const TYPESCRIPT_FLOOR =
  /"typescript": "@declapract\{check\.minVersion\('([^']+)'\)\}"/.exec(
    readFileSync(path.join(__dirname, 'best-practice', 'package.json'), 'utf-8'),
  )?.[1] ?? MalfunctionError.throw('typescript-node template declares no typescript floor');

/**
 * .what = applies the practice to the temp repo twice, and reads the tsconfig and package.json after each
 */
const applyTwice = async (input: { tempDir: string }) => {
  const read = (file: string) => fs.readFile(path.join(input.tempDir, file), 'utf-8');
  const apply = async () => {
    for (const file of APPLIED_FILES)
      await executeApply({ config: path.join(input.tempDir, 'declapract.use.yml'), file });
  };
  const before = await read('tsconfig.json');
  await apply();
  const once = { tsconfig: await read('tsconfig.json'), pkg: await read('package.json') };
  await apply();
  const twice = { tsconfig: await read('tsconfig.json'), pkg: await read('package.json') };
  return { before, once, twice };
};

/**
 * .what = the template's own build, as an adopter runs it: `tsc -p tsconfig.build.json && tsc-alias -p
 *         tsconfig.build.json`, under typescript 7, plus a typecheck of the same scope.
 * .why  = the build config sets `rootDir: src`, so dist holds `contract/…`, not `src/contract/…`;
 *         tsc-alias then maps each alias target past the absent `src/` lead, the branch every adopter
 *         takes. `--types node`: the fixtures name type packages they do not install; the seam under
 *         test is module resolution, which the types list does not reach.
 */
const runShippedBuild = async (input: { tempDir: string }) => {
  const run = (bin: string, args: string[]) => {
    const ran = spawnSync(path.join(input.tempDir, 'node_modules', '.bin', bin), args, {
      cwd: input.tempDir,
      encoding: 'utf-8',
    });
    return { status: ran.status, output: `${ran.stdout}${ran.stderr}` };
  };
  const flags = ['-p', 'tsconfig.build.json', '--types', 'node'];
  const version = run('tsc', ['--version']);
  const typecheck = run('tsc', [...flags, '--noEmit']);
  const build = run('tsc', flags);
  const alias = run('tsc-alias', ['-p', 'tsconfig.build.json']);
  const emitted = await fs
    .readFile(path.join(input.tempDir, 'dist', 'contract', 'getSurfReport.js'), 'utf-8')
    .catch(() => null);
  return { version, typecheck, build, alias, emitted };
};

/**
 * .what = a typecheck under the repo's own typescript 7, of one tsconfig the caller names
 * .why  = proves the claim the notice states to every adopter: a tsconfig that still holds a removed
 *         option fails loud under typescript 7, not silent. `--types node` as in runShippedBuild
 */
const runTypecheckOn = (input: { tempDir: string; tsconfig: string }) => {
  const ran = spawnSync(
    path.join(input.tempDir, 'node_modules', '.bin', 'tsc'),
    ['-p', input.tsconfig, '--noEmit', '--types', 'node'],
    { cwd: input.tempDir, encoding: 'utf-8' },
  );
  return { status: ran.status, output: `${ran.stdout}${ran.stderr}` };
};

/**
 * .what = every `require("…")` specifier in an emitted module
 */
const getAllRequireSpecifiers = (input: { emitted: string | null }): string[] =>
  [...(input.emitted ?? '').matchAll(/require\("([^"]+)"\)/g)].map((found) => found[1] ?? '');

/**
 * .what = end-to-end proof that a tsconfig on the prior typescript-node template lands on the
 *   typescript 7 shape in one apply, that a second apply is a no-op, and that the shipped build then
 *   compiles under typescript 7 with every alias rewritten.
 * .why  = two declarations edit the same tsconfig: the bad-practice that removes `baseUrl` +
 *   `importsNotUsedAsValues` (it fixes first, since bad-practices sort before best-practice), then
 *   the best-practice contains-check (which adds `types` and the template's `paths`, unions the
 *   adopter's arrays, and never deletes a key). only the real pipeline proves they converge.
 */
describe('typescript-node tsconfig options removed in typescript 7', () => {
  given('[case1] a repo on the prior template, with an alias of its own beside the template paths', () => {
    const tempDir = genTempDir({
      slug: 'declapract-ts7-tsconfig-removals',
      clone: './src/.test/assets/tsconfig-options-removed-in-ts7/repo-prior-template',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/tsconfig-options-removed-in-ts7/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    // every when reads the applied repo, so the plan, apply, and re-plan run once, before any
    const applied = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');
      const planBefore = await getPlanOutputFromDeclapract({ config });
      const applies = await applyTwice({ tempDir });
      const planAfter = await getPlanOutputFromDeclapract({ config });
      return { ...applies, planBefore, planAfter };
    });

    when('[t0] the practice is applied twice', () => {
      const result = applied;

      then('the plan before the apply flags the tsconfig for an automatic fix, and matches snapshot', () => {
        expect(getAllPlanFlags(applied.planBefore)).toContain('* [FIX_AUTOMATIC] tsconfig.json');
        const planText = asPlanText({ lines: applied.planBefore.lines, tempDir });
        expect(planText).toContain('practice:typescript-node.bad-practice.tsconfig-options-removed-in-ts7');
        expect(planText).toMatchSnapshot('plan — before apply');
      });

      then('the plan after the apply no longer flags the tsconfig', () => {
        expect(
          getAllPlanFlags(applied.planAfter).filter((flag) => flag.endsWith(' tsconfig.json')),
        ).toEqual([]);
      });

      then('the removed options leave, every paths value gains a ./ lead, and types lands', () => {
        const tsconfig = JSON.parse(result.once.tsconfig);
        expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
        expect(tsconfig.compilerOptions.importsNotUsedAsValues).toBeUndefined();
        expect(tsconfig.compilerOptions.paths).toEqual({
          '@/*': ['./*'],
          '@src/*': ['./src/*'],
          '@vendor/*': ['./vendor/*'],
        });
        expect(tsconfig.compilerOptions.types).toEqual(['node', 'jest']);
        expect(result.before).toMatchSnapshot('tsconfig.json — before');
        expect(result.once.tsconfig).toMatchSnapshot('tsconfig.json — after');
      });

      then('the repo exclude entries stay, after the template entries', () => {
        expect(JSON.parse(result.once.tsconfig).exclude).toEqual([
          '.agent/.cache',
          'dist',
          'coverage',
          'node_modules',
        ]);
      });

      then('the typescript floor lands as the template declares it, a typescript 7', () => {
        expect(TYPESCRIPT_FLOOR).toMatch(/^7\./);
        expect(JSON.parse(result.once.pkg).devDependencies.typescript).toEqual(TYPESCRIPT_FLOOR);
      });

      then('the second apply is a no-op', () => {
        expect(result.twice).toEqual(result.once);
      });
    });

    when('[t1] the shipped build runs under typescript 7', () => {
      // the build reads the repo the given-level apply wrote; the guard fails loud if it never ran
      const result = useThen('build', async () => {
        if (!applied.once.tsconfig.includes('"types"'))
          throw new MalfunctionError('the given-level apply did not land the template tsconfig', {
            tempDir,
          });
        return runShippedBuild({ tempDir });
      });

      then('typescript 7 typechecks the repo clean through the template aliases', () => {
        expect(result.version.output).toMatch(/Version 7\./);
        expect(result.typecheck).toEqual({ status: 0, output: '' });
      });

      then('tsc-alias rewrites @src/ to a relative path in dist, past the rootDir src lead', () => {
        expect(result.build.status).toEqual(0);
        expect(result.alias.status).toEqual(0);
        expect(getAllRequireSpecifiers(result)).toEqual(['../logic/getWaveHeight']);
      });
    });

    when('[t2] typescript 7 reads the prior tsconfig, before any apply', () => {
      // the prior tsconfig lands beside the applied one, so the apply's own result stays untouched
      const result = useThen('typecheck', async () => {
        await fs.writeFile(path.join(tempDir, 'tsconfig.prior.json'), applied.before);
        return runTypecheckOn({ tempDir, tsconfig: 'tsconfig.prior.json' });
      });

      then('it fails loud and names each removed option, so a drifted repo never typechecks silent', () => {
        expect(result.status).not.toEqual(0);
        expect(result.output).toMatch(/error TS5102: .*baseUrl/);
        expect(result.output).toMatch(/error TS5023: .*importsNotUsedAsValues/);
      });
    });
  });

  given('[case2] a repo whose baseUrl roots bare imports in ./src, beside moduleResolution node', () => {
    const tempDir = genTempDir({
      slug: 'declapract-ts7-tsconfig-baseurl-nested',
      clone: './src/.test/assets/tsconfig-options-removed-in-ts7/repo-baseurl-nested',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/tsconfig-options-removed-in-ts7/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    // both whens read the applied repo, so the apply runs once, before either
    const applied = useBeforeAll(async () => applyTwice({ tempDir }));

    when('[t0] the practice is applied twice', () => {
      const result = applied;

      then('its own alias is rebased onto ./src, and the template paths stay on the tsconfig dir', () => {
        // bad-practices fix before best-practice, so the fold sees only this repo's paths;
        // the template's paths land after it and are never rebased onto ./src
        const tsconfig = JSON.parse(result.once.tsconfig);
        expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
        expect(tsconfig.compilerOptions.importsNotUsedAsValues).toBeUndefined();
        expect(tsconfig.compilerOptions.paths).toEqual({
          // bare imports like 'logic/x' keep the lookup baseUrl gave them, one key per dir of ./src
          'contract/*': ['./src/contract/*'],
          'logic/*': ['./src/logic/*'],
          '~/*': ['./src/*'],
          '@/*': ['./*'],
          '@src/*': ['./src/*'],
        });
        expect(result.once.tsconfig).toMatchSnapshot('tsconfig.json — after');
      });

      then('moduleResolution node lands on node16, set by the best-practice', () => {
        expect(result.before).toContain('"moduleResolution": "node"');
        expect(result.before).toMatchSnapshot('tsconfig.json — before');
        const tsconfig = JSON.parse(result.once.tsconfig);
        expect(tsconfig.compilerOptions.moduleResolution).toEqual('node16');
        expect(tsconfig.compilerOptions.module).toEqual('node16');
      });

      then('its own types entry stays, after the node, jest lead', () => {
        expect(result.before).toContain('"types": ["vitest/globals"]');
        const tsconfig = JSON.parse(result.once.tsconfig);
        expect(tsconfig.compilerOptions.types).toEqual(['node', 'jest', 'vitest/globals']);
      });

      then('the second apply is a no-op', () => {
        expect(result.twice).toEqual(result.once);
      });
    });

    when('[t1] the shipped build runs under typescript 7', () => {
      // the build reads the repo the given-level apply wrote; the guard fails loud if it never ran
      const result = useThen('build', async () => {
        if (!applied.once.tsconfig.includes('"types"'))
          throw new MalfunctionError('the given-level apply did not land the template tsconfig', {
            tempDir,
          });
        return runShippedBuild({ tempDir });
      });

      then('typescript 7 finds the bare import through its lookup key, and each alias', () => {
        expect(result.version.output).toMatch(/Version 7\./);
        expect(result.typecheck).toEqual({ status: 0, output: '' });
      });

      then('tsc-alias rewrites the bare import and each alias to a relative path in dist', () => {
        expect(result.build.status).toEqual(0);
        expect(result.alias.status).toEqual(0);
        expect(getAllRequireSpecifiers(result)).toEqual([
          '../logic/getWaveHeight',
          '../logic/getWaveHeight',
          '../logic/getWaveHeight',
        ]);
      });
    });
  });

  given('[case3] a repo on the prior template whose importsNotUsedAsValues reads "preserve"', () => {
    const tempDir = genTempDir({
      slug: 'declapract-ts7-tsconfig-imports-preserved',
      clone: './src/.test/assets/tsconfig-options-removed-in-ts7/repo-prior-template',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/tsconfig-options-removed-in-ts7/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    // the one change from [case1]: a value whose drop would change emit
    const applied = useBeforeAll(async () => {
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      const prior = await fs.readFile(tsconfigPath, 'utf-8');
      await fs.writeFile(
        tsconfigPath,
        prior.replace('"importsNotUsedAsValues": "remove"', '"importsNotUsedAsValues": "preserve"'),
      );
      // the notice prints once per repo per process, so the first read (the plan before apply) holds it
      const config = path.join(tempDir, 'declapract.use.yml');
      const planBefore = await getPlanOutputFromDeclapract({ config });
      const applies = await applyTwice({ tempDir });
      const planAfter = await getPlanOutputFromDeclapract({ config });
      return { ...applies, planBefore, planAfter };
    });

    when('[t0] the practice is applied twice', () => {
      // declapract applies a practice's fixable checks even when a check beside them has no fix
      then('the automatic edits land, and "preserve" is kept for a human', () => {
        expect(applied.before).toContain('"importsNotUsedAsValues": "preserve"');
        const tsconfig = JSON.parse(applied.once.tsconfig);
        expect(tsconfig.compilerOptions.importsNotUsedAsValues).toEqual('preserve');
        expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
        expect(tsconfig.compilerOptions.types).toEqual(['node', 'jest']);
      });

      then('the plan after the apply flags the tsconfig manual, by the kept-option practice alone', () => {
        expect(
          getAllPlanFlags(applied.planAfter).filter((flag) => flag.endsWith(' tsconfig.json')),
        ).toEqual(['* [FIX_MANUAL] tsconfig.json']);
        const planText = asPlanText({ lines: applied.planAfter.lines, tempDir });
        expect(planText).toContain('practice:typescript-node.bad-practice.imports-not-used-as-values-kept');
        expect(planText).not.toContain('practice:typescript-node.bad-practice.tsconfig-options-removed-in-ts7');
        expect(planText).toMatchSnapshot('plan — after apply');
      });

      then('stderr names the move beside the first plan: TS5023, the fixes, and the readme', () => {
        expect(applied.planBefore.stderr).toContain('importsNotUsedAsValues "preserve" kept in tsconfig.json');
        expect(applied.planBefore.stderr).toContain('TS5023');
        expect(applied.planBefore.stderr).toContain('verbatimModuleSyntax');
        expect(applied.planBefore.stderr).toContain('imports-not-used-as-values-kept/.declapract.readme.md');
        expect(applied.planBefore.stderr).toMatchSnapshot('manual-fix notice');
      });

      then('the manual check agrees on the applied tsconfig', () => {
        const context = { getProjectRootDirectory: () => tempDir } as FileCheckContext;
        expect(() => checkPreserved(applied.once.tsconfig, context)).not.toThrow();
      });

      then('the second apply is a no-op', () => {
        expect(applied.twice).toEqual(applied.once);
      });
    });

    when('[t1] typescript 7 reads the applied tsconfig, "preserve" kept', () => {
      const result = useThen('typecheck', async () => runTypecheckOn({ tempDir, tsconfig: 'tsconfig.json' }));

      then('it fails loud on the kept option, the error the notice names', () => {
        expect(result.status).not.toEqual(0);
        expect(result.output).toMatch(/error TS5023: .*importsNotUsedAsValues/);
        expect(result.output).not.toContain('baseUrl');
      });
    });
  });
});
