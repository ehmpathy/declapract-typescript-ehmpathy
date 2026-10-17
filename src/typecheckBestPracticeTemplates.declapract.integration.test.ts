import { spawn } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { executeApply, executePlan } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = clamps that every `.ts` template a usecase ships type-checks, as an adopter compiles it:
 *         apply the whole usecase into a bare repo, install the emitted deps, then `tsc --noEmit`
 *         with the emitted tsconfig.
 * .why  = this repo's own tsconfig includes only `src/**\/*.declapract.ts`, so the templates under
 *         `best-practice/` are never type-checked here. a template that fails the strictest
 *         tsconfig the practices themselves ship reaches every adopter at once (#632 `cause: error`
 *         on an `unknown` catch var, #633 a doc example that does not compile) — found by adopters,
 *         never by this repo. only an APPLIED usecase is the tree an adopter compiles: templates
 *         import peer practices' files, and each usecase pins its own dep floors (F88).
 * .teeth = restore `cause: error` (an `unknown` catch var) into
 *          `tests-node/best-practice/src/.test/useKeyrack.ts` — every node usecase reddens with
 *          the TS2322 diagnostic in its failure message and snapshot.
 * .note = `typescript-project-core` is excluded: it is a base that every consumer extends, and it
 *         emits no tsconfig of its own (typescript-node / typescript-expo own the tsconfig), so a
 *         lone core apply has no compile shape to check. every consumer below covers its files.
 * .note = the temp repo lives at /tmp (genTempDir isolates it from this repo's node_modules), so
 *         the install and the compile see only the deps the usecase emits. the pnpm store is
 *         global, so the usecases share cached tarballs (`--prefer-offline`).
 * .note = a whole-usecase apply costs minutes, so every usecase is prepared in parallel inside one
 *         `useBeforeAll`; each `given` then reads its own result.
 * .what = also clamps that a usecase converges: after a second apply, a plan flags no file for an
 *         automatic fix, and flags no file the apply itself wrote. a practice whose check rejects a
 *         peer's shipped template (a lockfile hook two practices fight over, an `s3://` uri read as
 *         the retired `s3:` key, an import that must leave src/, a null config leaf) flags every
 *         adopter forever, with no fix a human could make.
 * .teeth = restore `/\bs3\s*:/` as the s3 key pattern in `cache/bad-practices/cache-directory-options`
 *          — the config template `src/utils/config/getOneCacheDirectory.ts` is flagged in each
 *          usecase that ships it.
 * .note = the test lives at `src/` (not under `src/.test/`): jest skips dot dirs, so a test there
 *         would never run.
 */

const USECASES = [
  'typescript-project',
  'npm-package',
  'rhachet-roles-package',
  'lambda-service',
  'lambda-service-with-rds',
  'lambda-service-with-dynamodb',
  'app-react-native-expo',
] as const;
type Usecase = (typeof USECASES)[number];

// every `@declapract{variable.*}` any practice in any usecase references
const VARIABLES_YML = `
variables:
  projectName: typecheck-demo
  organizationName: test-org
  infrastructureNamespaceId: testns
  databaseName: testdb
  databaseUserName:
    cicdUser: testdb_cicd
    serviceUser: testdb_service
  databaseTunnelHost:
    prep: tunnel.prep.test.dev
    prod: tunnel.prod.test.dev
  databaseClusterHost:
    prep: cluster.prep.test.dev
    prod: cluster.prod.test.dev
  slackWebhookUrl: 'https://hooks.slack.test/webhook'
  awsAccountId:
    prep: '111111111111'
    prod: '222222222222'
  app:
    web:
      domain:
        prep: demo.prep.test.dev
        prod: demo.test.dev
      port:
        hot: 3547
        cold: 3549
`;

/**
 * .what = runs a command in the temp repo and captures its exit code + combined output
 * .why  = the install and compile are real processes; their output is the diagnosis.
 *         async, so the usecases install and compile in parallel
 */
const runInRepo = (input: {
  cwd: string;
  command: string;
  args: string[];
}): Promise<{ status: number | null; output: string }> =>
  new Promise((done, fail) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
    });
    const chunks: string[] = [];
    child.stdout.on('data', (chunk) => chunks.push(String(chunk)));
    child.stderr.on('data', (chunk) => chunks.push(String(chunk)));
    child.on('error', fail);
    child.on('close', (status) =>
      done({ status, output: chunks.join('').trim() }),
    );
  });

/**
 * .what = pins each `@declapract{check.minVersion('x')}` dep in an emitted package.json to its floor `x`
 * .why  = a dep absent from the repo is emitted with the check expression verbatim; an adopter
 *         would install the floor version, so the compile runs against the floor the practice pins
 */
const asPackageJsonAtFloorVersions = (input: { contents: string }): string =>
  input.contents.replace(
    /@declapract\{check\.minVersion\('([^']+)'\)\}/g,
    (_match, version: string) => version,
  );

/**
 * .what = masks the temp dir paths out of an output, so a snapshot is stable across runs
 */
const asMaskedOutput = (input: { output: string; dirs: string[] }): string =>
  input.dirs.reduce(
    (masked, dir) => masked.split(dir).join('<tempdir>'),
    input.output,
  );

/**
 * .what = applies one usecase into its temp repo, installs the emitted deps, and compiles
 * .why  = the three steps an adopter takes before their first `tsc`
 */
const genTypecheckResult = async (input: {
  usecase: Usecase;
  tempDir: string;
  declarationsDir: string;
}): Promise<{
  config: string;
  tsconfigFound: boolean;
  install: { status: number | null; output: string };
  compile: { status: number | null; output: string };
}> => {
  // declare the usecase this repo adopts, from declarations that live outside the repo
  // .note = declapract joins `declarations` onto the config's dir, so the path is relative, and both
  //         ends are physical paths (genTempDir hands back a link into /tmp)
  const repoDir = realpathSync(input.tempDir);
  const config = path.join(repoDir, 'declapract.use.yml');
  const declarationsPath = path.relative(
    repoDir,
    path.join(realpathSync(input.declarationsDir), 'declapract.declare.yml'),
  );
  await fs.writeFile(
    config,
    [
      `declarations: '${declarationsPath}'`,
      `useCase: ${input.usecase}`,
      VARIABLES_YML,
    ].join('\n'),
  );

  // apply the whole usecase; the repo holds no link into src/, so no fix can write through one
  const startedAt = Date.now();
  await executeApply({ config });
  const appliedAt = Date.now();

  // pin each emitted dep to the floor version its practice declares
  const cwd = realpathSync(input.tempDir);
  const packageJsonPath = path.join(cwd, 'package.json');
  await fs.writeFile(
    packageJsonPath,
    asPackageJsonAtFloorVersions({
      contents: await fs.readFile(packageJsonPath, 'utf-8'),
    }),
  );

  // apply again, as an adopter's next upgrade would; the plan after it must show convergence
  await executeApply({ config });

  // install the emitted deps, at the physical path (outside this repo's tree)
  const install = await runInRepo({
    cwd,
    command: 'pnpm',
    args: [
      'install',
      '--no-frozen-lockfile',
      '--ignore-scripts',
      '--prefer-offline',
    ],
  });
  const installedAt = Date.now();

  // compile with the emitted tsconfig
  const tsconfigFound = existsSync(path.join(cwd, 'tsconfig.json'));
  const compile = await runInRepo({
    cwd,
    command: 'pnpm',
    args: [
      'exec',
      'tsc',
      '--noEmit',
      '--pretty',
      'false',
      '-p',
      'tsconfig.json',
    ],
  });

  // report the per-phase cost, so a slow usecase is visible in the run log
  console.log(`typecheck-templates ${input.usecase} phase cost`, {
    applyMs: appliedAt - startedAt,
    installMs: installedAt - appliedAt,
    compileMs: Date.now() - installedAt,
  });

  const dirs = [cwd, input.tempDir];
  return {
    config,
    tsconfigFound,
    install: {
      status: install.status,
      output: asMaskedOutput({ output: install.output, dirs }),
    },
    compile: {
      status: compile.status,
      output: asMaskedOutput({ output: compile.output, dirs }),
    },
  };
};

/**
 * .what = plans one applied repo, and returns each file the plan still flags, by fix kind
 * .why  = `executePlan` prints its result and returns naught, so the printed plan is the contract.
 *         the spy passes each line through to the real console, so the run log keeps the plan
 * .note = plans run one at a time: the spy reads the one shared console
 */
const getPlanFlags = async (input: {
  config: string;
}): Promise<{ automatic: string[]; manual: string[] }> => {
  const lines: string[] = [];
  const logOriginal = console.log;
  const spy = jest.spyOn(console, 'log').mockImplementation((...args) => {
    lines.push(args.map(String).join(' '));
    logOriginal(...args);
  });
  try {
    await executePlan({ config: input.config });
  } finally {
    spy.mockRestore();
  }
  const flags = lines
    .join('\n')
    .replace(/\x1b\[[0-9;]*m/g, '') // eslint-disable-line no-control-regex
    .split('\n')
    .map((line) => line.match(/^\s*\* \[(FIX_AUTOMATIC|FIX_MANUAL)\] (.+?)\s*$/))
    .filter((match): match is RegExpMatchArray => match !== null);
  return {
    automatic: flags.filter((m) => m[1] === 'FIX_AUTOMATIC').map((m) => m[2]!),
    manual: flags.filter((m) => m[1] === 'FIX_MANUAL').map((m) => m[2]!),
  };
};

// apply + install + compile per usecase runs minutes, not seconds; useBeforeAll takes no timeout
jest.setTimeout(3_600_000);

describe('typecheck best-practice templates', () => {
  // one temp repo per usecase, plus one declarations dir per usecase that mounts the real practices
  // + usecases. the declarations dir is a SEPARATE temp dir: the repo holds no link into src/, so
  // the whole-usecase apply cannot write through one into this repo's own source
  const tempDirs = Object.fromEntries(
    USECASES.map((usecase) => [
      usecase,
      {
        repo: genTempDir({
          slug: `typecheck-templates-${usecase}`,
          clone: './src/.test/assets/typecheck-templates/repo-bare',
        }),
        declarations: genTempDir({
          slug: `typecheck-templates-${usecase}-declarations`,
          clone: './src/.test/assets/typecheck-templates/declarations',
          symlink: [
            { at: 'practices', to: 'src/practices' },
            { at: 'useCases.yml', to: 'src/useCases.yml' },
          ],
        }),
      },
    ]),
  ) as Record<Usecase, { repo: string; declarations: string }>;

  // prepare every usecase in parallel; settle each alone, so one usecase's failure stays its own
  const settled = useBeforeAll(async () => {
    const results = await Promise.allSettled(
      USECASES.map((usecase) =>
        genTypecheckResult({
          usecase,
          tempDir: tempDirs[usecase].repo,
          declarationsDir: tempDirs[usecase].declarations,
        }),
      ),
    );
    return Object.fromEntries(
      USECASES.map((usecase, index) => [usecase, results[index]!]),
    ) as Record<
      Usecase,
      PromiseSettledResult<Awaited<ReturnType<typeof genTypecheckResult>>>
    >;
  });

  // read one usecase's result; a usecase whose preparation threw fails each of its thens loud
  const getScene = (usecase: Usecase) => {
    const result = settled[usecase];
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  };

  // plan each prepared usecase, one at a time (see getPlanFlags); a plan that throws stays its own
  const plans = useBeforeAll(async () => {
    const results: Partial<
      Record<
        Usecase,
        PromiseSettledResult<Awaited<ReturnType<typeof getPlanFlags>>>
      >
    > = {};
    for (const usecase of USECASES) {
      const prepared = settled[usecase];
      if (prepared.status === 'rejected') {
        results[usecase] = prepared;
        continue;
      }
      const [planned] = await Promise.allSettled([
        getPlanFlags({ config: prepared.value.config }),
      ]);
      results[usecase] = planned!;
    }
    return results as Record<
      Usecase,
      PromiseSettledResult<Awaited<ReturnType<typeof getPlanFlags>>>
    >;
  });

  // read one usecase's plan flags; a plan that threw fails each of its thens loud
  const getPlan = (usecase: Usecase) => {
    const result = plans[usecase];
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  };

  USECASES.forEach((usecase) => {
    given(`[usecase] ${usecase} applied to a bare repo`, () => {
      when('[t0] the emitted deps are installed', () => {
        then('the install exits 0', () => {
          const scene = getScene(usecase);
          if (scene.install.status !== 0)
            throw new Error(
              `pnpm install failed for ${usecase} (exit ${scene.install.status}):\n${scene.install.output}`,
            );
          expect(scene.install.status).toEqual(0);
        });
      });

      when('[t1] the emitted tree is compiled with the emitted tsconfig', () => {
        then('the usecase emits a tsconfig.json', () => {
          expect(getScene(usecase).tsconfigFound).toEqual(true);
        });

        then('the tsc diagnostics match snapshot', () => {
          expect(getScene(usecase).compile.output).toMatchSnapshot(
            `${usecase} — tsc --noEmit diagnostics`,
          );
        });

        then('tsc --noEmit exits 0', () => {
          const scene = getScene(usecase);
          if (scene.compile.status !== 0)
            throw new Error(
              `tsc --noEmit failed for ${usecase} (exit ${scene.compile.status}):\n${scene.compile.output}`,
            );
          expect(scene.compile.status).toEqual(0);
        });
      });

      when('[t2] the twice-applied repo is planned again', () => {
        then('no file is flagged for an automatic fix (the apply converges)', () => {
          expect(getPlan(usecase).automatic).toEqual([]);
        });

        then('no file the apply wrote is flagged by its own usecase', () => {
          const cwd = realpathSync(tempDirs[usecase].repo);
          const flaggedWritten = getPlan(usecase).manual.filter((file) =>
            existsSync(path.join(cwd, file)),
          );
          expect(flaggedWritten).toEqual([]);
        });

        then('the files left for a human to author match snapshot', () => {
          expect(getPlan(usecase).manual).toMatchSnapshot(
            `${usecase} — files flagged for a human`,
          );
        });
      });
    });
  });
});
