import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { executeApply } from 'declapract';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { asPackageJSON } from '../../utils/asPackageJSON';

/**
 * .what = clamps that the shipped `patches/pg-pool.patch` fits each pg-pool release an adopter may
 *         hold, under the bare-name `pnpm.patchedDependencies` key the practice ships; that an
 *         adopter's own exact-version hand patch survives the apply and still wins the install;
 *         that a hunk which no longer fits only warns, by name; and what the patch changes for code
 *         that builds a pool from pg-pool directly; and that a bare rds adopter's cycle check exits 0
 *         with the patch and exits 1 on `pg -> pg-pool` without it
 * .why  = pg-pool's `this.Client = ... || require('pg').Client` fallback makes dpdm report a
 *         pg <-> pg-pool require cycle in every rds adopter. the patch drops it. the key is the bare
 *         name `pg-pool`, so it is never stale; but then it must fit every in-range release a
 *         lagged lockfile still pins, where the line sits at another line number and its neighbours
 *         differ. and a repo that already carries `pg-pool@<version>` by hand (the repo that
 *         reported the cycle did) must not see the apply drop it, nor pnpm refuse a map that holds both
 * .note = the pnpm practice ships `ignorePatchFailures`, so a hunk that does not fit only warns.
 *         the install's exit code proves naught; the patched file's content is the verdict
 * .teeth = change the shipped key to `pg-pool@3.14.0` — every other release keeps its `require('pg')`,
 *          and case4's apply overwrites the hand patch's key. widen the hunk's context to the two
 *          `this.options` lines above it — pg-pool 3.2.1 through 3.4.1 keep their `require('pg')`
 */
const practiceDir = __dirname;
const shippedPatchPath = path.join(
  practiceDir,
  'best-practice/patches/pg-pool.patch',
);

/** every stable pg-pool release in `^3.2.1`, the range the shipped pg floor (8.3.0) asks for */
const PG_POOL_RELEASES_IN_RANGE = [
  '3.2.1',
  '3.2.2',
  '3.3.0',
  '3.4.0',
  '3.4.1',
  '3.5.1',
  '3.5.2',
  '3.6.0',
  '3.6.1',
  '3.6.2',
  '3.7.0',
  '3.7.1',
  '3.8.0',
  '3.9.0',
  '3.9.1',
  '3.9.2',
  '3.9.5',
  '3.9.6',
  '3.10.0',
  '3.10.1',
  '3.11.0',
  '3.12.0',
  '3.13.0',
  '3.14.0',
];

/** a bound on each pnpm or node process, so a stalled registry fails loud instead of a silent hang */
const SPAWN_TIMEOUT_MS = 120_000;

/**
 * .what = whether a value is a `pnpm.patchedDependencies` map: an object of string to string
 * .why  = a malformed map must fail at the read, with its value, not flow into pnpm as an `any`
 */
const isPatchMap = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((entry) => typeof entry === 'string');

/**
 * .what = the patch map of a package.json's contents
 * .why  = the clamp feeds the map to pnpm; a typed read makes a malformed map fail here, with its
 *         cause, rather than flow into an install as an `any`
 */
const asPatchMapOfPackageJson = (input: {
  contents: string;
}): Record<string, string> => {
  const patchMap: unknown = asPackageJSON(input, {
    practice: 'persist-with-rds',
  }).pnpm?.patchedDependencies;
  if (!isPatchMap(patchMap))
    throw new ConstraintError('package.json lacks a string map at pnpm.patchedDependencies', {
      patchMap,
      hint: 'each pnpm.patchedDependencies entry maps a package key to a patch file path',
    });
  return patchMap;
};

/**
 * .what = the `pnpm.patchedDependencies` map the practice ships
 * .why  = every case installs with the map an adopter receives, read from the practice itself
 */
const getOneShippedPatchMap = (): Record<string, string> =>
  asPatchMapOfPackageJson({
    contents: readFileSync(
      path.join(practiceDir, 'best-practice/package.json'),
      'utf-8',
    ),
  });

/**
 * .what = the exact pnpm pin (`pnpm@x.y.z`) this repo declares in `packageManager`
 * .why  = the clamp installs with the pnpm an adopter of the pnpm practice runs
 */
const getOnePinnedPackageManager = (): string => {
  const packageManager: unknown = asPackageJSON(
    {
      contents: readFileSync(
        path.join(practiceDir, '../../../package.json'),
        'utf-8',
      ),
    },
    { practice: 'persist-with-rds' },
  ).packageManager;
  if (typeof packageManager !== 'string' || !packageManager.startsWith('pnpm@'))
    throw new ConstraintError('root package.json lacks a pnpm packageManager pin', {
      packageManager,
      hint: 'set packageManager to an exact pin, e.g. "pnpm@10.34.5", per the pnpm practice',
    });
  return packageManager;
};

/**
 * .what = the shipped patch, with its `-` line rewritten so it matches no pg-pool release
 * .why  = emulates the day pg-pool moves the line, so the hunk fails as it would then
 */
const asPatchWithMovedLine = (input: { contents: string }): string =>
  input.contents.replace(
    "-    this.Client = this.options.Client || Client || require('pg').Client",
    "-    this.Client = this.options.Client || require('pg').Client",
  );

/**
 * .what = masks each temp dir out of an output
 * .why  = each run gets a fresh temp dir, so an unmasked path would churn the snapshot every run
 */
const asMaskedOutput = (input: { output: string; dirs: string[] }): string =>
  input.dirs.reduce(
    (masked, dir) => masked.split(dir).join('<tempdir>'),
    input.output,
  );

/**
 * .what = the lines of a pnpm install output that name the shipped patch, masked
 * .why  = the lines an adopter reads to learn the patch did or did not apply. pnpm prints the
 *         physical path (genTempDir hands back a link to it), and the hash moves on any edit to the
 *         patch header while the line an adopter reads does not
 */
const asPatchWarnLines = (input: { output: string; dir: string }): string[] =>
  asMaskedOutput({ output: input.output, dirs: [realpathSync(input.dir)] })
    .replace(/patch_hash=[0-9a-f]+/g, 'patch_hash=<hash>')
    .split('\n')
    .filter((line) => line.includes('patches/pg-pool.patch'));

/**
 * .what = a cycle check output, masked to the lines an adopter reads
 * .why  = dpdm colors its output, each run gets a fresh temp dir, and the pg floor rides in every
 *         `.pnpm` path; none of the three says aught about the verdict
 */
const asCycleCheckLines = (input: { output: string; dir: string }): string[] =>
  asMaskedOutput({
    output: input.output,
    dirs: [realpathSync(input.dir), input.dir],
  })
    // biome-ignore lint/suspicious/noControlCharactersInRegex: strips the color codes dpdm emits
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/pg@\d+\.\d+\.\d+/g, 'pg@<floor>')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

/**
 * .what = the floor version a practice declares for a dep: the arg of `@declapract{check.minVersion('x')}`,
 *         or the declared value itself when it is a plain version
 */
const asFloorVersion = (input: { declared: string }): string =>
  /check\.minVersion\('([^']+)'\)/.exec(input.declared)?.[1] ?? input.declared;

/**
 * .what = the pg floor this practice ships
 * .why  = the clamp installs pg at the version an adopter's bare apply lands on, so a floor bump in the
 *         practice reaches every scene here with no literal to go stale
 */
const getOneShippedPgFloor = (): string => {
  const declared = asPackageJSON(
    {
      contents: readFileSync(
        path.join(practiceDir, 'best-practice/package.json'),
        'utf-8',
      ),
    },
    { practice: 'persist-with-rds' },
  ).dependencies?.pg;
  if (typeof declared !== 'string')
    throw new ConstraintError('persist-with-rds declares no pg dependency', {
      hint: 'the clamp reads the pg floor from persist-with-rds/best-practice/package.json; restore its pg entry',
    });
  return asFloorVersion({ declared });
};

/**
 * .what = the cycle check the lint practice ships: its `test:lint:cycles` command, its `.dpdmrc.yaml`,
 *         and the floor of each dep the command runs (dpdm, yaml, and typescript for `--transform`)
 * .why  = the clamp must run the very check an adopter runs, read from the practices that ship it,
 *         so a change to the check reaches this clamp with no copy to drift
 */
const getOneShippedCycleCheck = (): {
  command: string;
  dpdmrc: string;
  devDependencies: Record<string, string>;
} => {
  const lintDir = path.join(practiceDir, '../lint/best-practice');
  const lint = asPackageJSON(
    { contents: readFileSync(path.join(lintDir, 'package.json'), 'utf-8') },
    { practice: 'lint' },
  );
  const typescriptAny = asPackageJSON(
    {
      contents: readFileSync(
        path.join(practiceDir, '../typescript-any/best-practice/package.json'),
        'utf-8',
      ),
    },
    { practice: 'typescript-any' },
  );
  const command: unknown = lint.scripts?.['test:lint:cycles'];
  const dpdm: unknown = lint.devDependencies?.dpdm;
  const yaml: unknown = lint.devDependencies?.yaml;
  const typescript: unknown =
    typescriptAny.devDependencies?.typescript ??
    typescriptAny.dependencies?.typescript;
  if (
    typeof command !== 'string' ||
    typeof dpdm !== 'string' ||
    typeof yaml !== 'string' ||
    typeof typescript !== 'string'
  )
    throw new ConstraintError('a practice lacks a piece of the shipped cycle check', {
      command,
      dpdm,
      yaml,
      typescript,
      hint: 'the lint practice ships test:lint:cycles + dpdm + yaml; typescript-any ships typescript',
    });
  return {
    command,
    dpdmrc: readFileSync(path.join(lintDir, '.dpdmrc.yaml'), 'utf-8'),
    devDependencies: {
      dpdm: asFloorVersion({ declared: dpdm }),
      yaml: asFloorVersion({ declared: yaml }),
      typescript: asFloorVersion({ declared: typescript }),
    },
  };
};

/**
 * .what = the pnpm keys the pnpm practice ships, which every adopter's install runs under
 * .why  = `ignorePatchFailures` is why a misfit only warns; the clamp reads it from the practice,
 *         so a change there reaches every case here
 */
const getOneShippedPnpmKeys = (): Record<string, unknown> => {
  const pnpm: unknown = asPackageJSON(
    {
      contents: readFileSync(
        path.join(practiceDir, '../pnpm/best-practice/package.json'),
        'utf-8',
      ),
    },
    { practice: 'pnpm' },
  ).pnpm;
  if (typeof pnpm !== 'object' || pnpm === null)
    throw new ConstraintError('the pnpm practice lacks a pnpm block', {
      pnpm,
      hint: 'the pnpm practice ships allowUnusedPatches + ignorePatchFailures in its package.json',
    });
  return { ...pnpm };
};

const shippedPatchMap = getOneShippedPatchMap();
const shippedPnpmKeys = getOneShippedPnpmKeys();
const packageManager = getOnePinnedPackageManager();

/**
 * .what = a bare repo that depends on pg + one pg-pool release, with a given patch map + its files;
 *         as an adopter, it also holds the shipped cycle check and one src file that imports pg
 * .why  = the pnpm practice's two failure keys ride along, so the repo installs as an adopter's does
 */
const genRepoOfPgPool = (input: {
  slug: string;
  version: string;
  patchedDependencies: Record<string, string>;
  patchFiles: { at: string; from: string }[];
  adopter: ReturnType<typeof getOneShippedCycleCheck> | null;
}): string => {
  const dir = genTempDir({ slug: input.slug });
  mkdirSync(path.join(dir, 'patches'), { recursive: true });
  input.patchFiles.forEach((file) =>
    copyFileSync(file.from, path.join(dir, file.at)),
  );
  if (input.adopter) {
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    writeFileSync(
      path.join(dir, 'src/index.ts'),
      "import { Client } from 'pg';\n\nexport const client = new Client();\n",
    );
    writeFileSync(path.join(dir, '.dpdmrc.yaml'), input.adopter.dpdmrc);
  }
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'pg-pool-patch-demo',
        private: true,
        packageManager,
        dependencies: { pg: getOneShippedPgFloor(), 'pg-pool': input.version },
        ...(input.adopter && {
          devDependencies: input.adopter.devDependencies,
          scripts: { 'test:lint:cycles': input.adopter.command },
        }),
        pnpm: {
          ...shippedPnpmKeys,
          patchedDependencies: input.patchedDependencies,
        },
      },
      null,
      2,
    ),
  );
  return dir;
};

/**
 * .what = runs the pinned pnpm's install in a repo
 * .why  = the install is the step that applies the patch; its output is the diagnosis
 */
const genPnpmInstall = (input: {
  dir: string;
}): { status: number | null; output: string } => {
  const install = spawnSync(
    'npx',
    ['--yes', packageManager, 'install', '--ignore-scripts', '--prefer-offline'],
    {
      cwd: input.dir,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      timeout: SPAWN_TIMEOUT_MS,
    },
  );
  return {
    status: install.status,
    output: `${String(install.stdout)}${String(install.stderr)}`,
  };
};

/**
 * .what = the installed `node_modules/pg-pool/index.js` of a repo
 * .why  = the patched file's content is the verdict, since `ignorePatchFailures` voids the exit code
 */
const getOneInstalledPgPoolIndexJs = (input: {
  dir: string;
  install: { status: number | null; output: string };
}): string => {
  const indexJsPath = path.join(input.dir, 'node_modules/pg-pool/index.js');
  if (!existsSync(indexJsPath))
    throw new MalfunctionError('pg-pool absent after pnpm install', {
      status: input.install.status,
      output: input.install.output,
      hint: 'read the install output above; a registry or cache fault is the usual cause',
    });
  return readFileSync(indexJsPath, 'utf-8');
};

/**
 * .what = installs one pg-pool release into a bare repo, with a given patch map + its patch files
 * .why  = each case claims what pnpm does to pg-pool's `index.js`; only a real install shows it
 */
const genInstalledPgPool = (input: {
  slug: string;
  version: string;
  patchedDependencies: Record<string, string>;
  patchFiles: { at: string; from: string }[];
  adopter: ReturnType<typeof getOneShippedCycleCheck> | null;
}): { dir: string; status: number | null; output: string; indexJs: string } => {
  const dir = genRepoOfPgPool(input);
  const install = genPnpmInstall({ dir });
  const indexJs = getOneInstalledPgPoolIndexJs({ dir, install });
  return { dir, ...install, indexJs };
};

/**
 * .what = asserts a pnpm install exited 0, and fails loud with its output when it did not
 * .why  = a bare `expect` on the status hides the install output, which is the only diagnosis
 */
const expectInstallPassed = (input: {
  status: number | null;
  output: string;
}): void => {
  if (input.status !== 0)
    throw new MalfunctionError('pnpm install failed', {
      status: input.status,
      output: input.output,
      hint: 'read the install output above; a registry or cache fault is the usual cause',
    });
  expect(input.status).toEqual(0);
};

/**
 * .what = runs a repo's `test:lint:cycles` with the pinned pnpm, as `npm run test:lint` does
 * .why  = the exit code and the cycles dpdm prints are the verdict an adopter's lint gate reads
 */
const genCycleCheckRun = (input: {
  dir: string;
}): { status: number | null; output: string } => {
  const run = spawnSync(
    'npx',
    ['--yes', '--loglevel=error', packageManager, 'run', 'test:lint:cycles'],
    {
      cwd: input.dir,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      timeout: SPAWN_TIMEOUT_MS,
    },
  );
  return {
    status: run.status,
    output: `${String(run.stdout)}${String(run.stderr)}`,
  };
};

/**
 * .what = the node source of a probe that builds a pool from pg-pool, with and without a `Client`,
 *         and prints what each pool holds as json
 * .why  = the probe must run inside the installed repo, so it is a string node evaluates there
 */
const asDirectPoolProbe = (): string =>
  [
    "const Pool = require('pg-pool');",
    "const pg = require('pg');",
    'const bare = new Pool();',
    "const bareSays = typeof bare.Client === 'function' ? 'has a Client' : 'has no Client';",
    'const fixed = new Pool({ Client: pg.Client });',
    "const fixedSays = fixed.Client === pg.Client ? 'has pg Client' : 'has another Client';",
    // the first connect is where a direct caller meets the change; it fails before any socket opens
    '(async () => {',
    "  const connectSays = await (async () => bare.connect())().then(() => 'connected', (error) => error.message);",
    '  process.stdout.write(',
    '    JSON.stringify({ withoutClient: bareSays, withClient: fixedSays, withoutClientConnect: connectSays }),',
    '  );',
    '  process.exit(0);',
    '})();',
  ].join('\n');

/**
 * .what = whether a value is the probe's result: `{ withoutClient, withClient }`, both strings
 * .why  = the probe's stdout is untrusted text; a malformed one must fail here, with its value
 */
const isDirectPoolResult = (
  value: unknown,
): value is {
  withoutClient: string;
  withClient: string;
  withoutClientConnect: string;
} =>
  typeof value === 'object' &&
  value !== null &&
  'withoutClient' in value &&
  typeof value.withoutClient === 'string' &&
  'withClient' in value &&
  typeof value.withClient === 'string' &&
  'withoutClientConnect' in value &&
  typeof value.withoutClientConnect === 'string';

/**
 * .what = what a direct `new Pool()` from pg-pool holds, with and without a `Client`
 * .why  = the patch removes pg-pool's own fallback to pg's Client; a caller that passed none now
 *         gets a pool with no Client, and the remedy the patch header names must give one back
 */
const getOneDirectPoolResult = (input: {
  dir: string;
}): { withoutClient: string; withClient: string; withoutClientConnect: string } => {
  const run = spawnSync('node', ['-e', asDirectPoolProbe()], {
    cwd: input.dir,
    timeout: SPAWN_TIMEOUT_MS,
  });
  const output = `${String(run.stdout)}${String(run.stderr)}`;
  if (run.status !== 0)
    throw new MalfunctionError('direct pg-pool probe failed', {
      status: run.status,
      output,
      hint: 'read the probe output above; an absent pg or pg-pool install is the usual cause',
    });
  const result: unknown = JSON.parse(String(run.stdout));
  if (!isDirectPoolResult(result))
    throw new MalfunctionError('direct pg-pool probe printed an unexpected shape', {
      output,
      hint: 'the probe prints { withoutClient, withClient }; read its output above',
    });
  return result;
};

/**
 * .what = the lean declarations a test repo applies: the shipped package.json declaration and its
 *         patch, each copied from the real practice, plus a one-practice declare + use-case file
 * .why  = the whole practice owes variables this test has no use for. the files are copies, not
 *         symlinks: declapract checks a declared file with `lstat`, so a symlinked file never counts
 */
const asDeclarationsOfPackageJsonOnly = (): {
  copies: { at: string; from: string }[];
  writes: { at: string; contents: string }[];
} => ({
  copies: [
    'package.json',
    'package.json.declapract.ts',
    'patches/pg-pool.patch',
  ].map((file) => ({
    at: path.join('practices/persist-with-rds/best-practice', file),
    from: path.join(practiceDir, 'best-practice', file),
  })),
  writes: [
    {
      at: 'declapract.declare.yml',
      contents: 'declare:\n  practices: practices\n  use-cases: useCases.yml\n',
    },
    {
      at: 'useCases.yml',
      contents:
        'use-cases:\n  lambda-service:\n    practices:\n      - persist-with-rds\n',
    },
  ],
});

/**
 * .what = writes a declarations set into a dir
 * .why  = the build stays a pure transformer; this is the one place the set touches disk
 */
const setDeclarations = (input: {
  dir: string;
  declarations: ReturnType<typeof asDeclarationsOfPackageJsonOnly>;
}): void => {
  input.declarations.copies.forEach((copy) => {
    mkdirSync(path.dirname(path.join(input.dir, copy.at)), { recursive: true });
    copyFileSync(copy.from, path.join(input.dir, copy.at));
  });
  input.declarations.writes.forEach((write) =>
    writeFileSync(path.join(input.dir, write.at), write.contents),
  );
};

jest.setTimeout(300_000);

describe('persist-with-rds pg-pool patch', () => {
  given('[case1] the shipped patch map', () => {
    when('[t0] the practice package.json is read', () => {
      then('it keys the patch by the bare name, so it is never stale', () => {
        expect(shippedPatchMap).toEqual({
          'pg-pool': 'patches/pg-pool.patch',
        });
      });
    });

    // the header is the one text an adopter reads when the patch fails or a direct pool breaks
    when('[t1] the shipped patch header is read', () => {
      const header = readFileSync(shippedPatchPath, 'utf-8').split('diff --git')[0] ?? '';

      then('it names the fix for a failed apply', () => {
        expect(header).toContain('upgrade declapract-typescript-ehmpathy');
      });

      then('it names the remedy for a direct pool', () => {
        expect(header).toContain("{ Client: require('pg').Client }");
      });

      then('it names the way out when no fix has shipped yet', () => {
        expect(header).toContain('pin your own `pg-pool@<version>` patch');
      });

      then('it names the lockfile step after an apply', () => {
        expect(header).toContain('run `pnpm install` and commit the');
      });

      then('it names how a maintainer recuts the hunk', () => {
        expect(header).toContain('keep one context line on each side');
      });

      then('it warns that any edit re-locks every adopter', () => {
        expect(header).toContain("its hash sits in every adopter's lockfile");
      });
    });
  });

  // every pg-pool release a `pg@^8.3.0` lockfile can hold: `pg@8.3.0` asks for `pg-pool@^3.2.1`, so a
  // lagged lockfile may pin any of them. each stable release is held
  PG_POOL_RELEASES_IN_RANGE.forEach((version) => {
    given(`[case2] pg-pool ${version}, installed with the shipped patch`, () => {
      const scene = useBeforeAll(async () =>
        genInstalledPgPool({
          slug: `pg-pool-patch-case2-${version}`,
          version,
          patchedDependencies: shippedPatchMap,
          patchFiles: [{ at: 'patches/pg-pool.patch', from: shippedPatchPath }],
          adopter: null,
        }),
      );

      when('[t0] pnpm install runs', () => {
        then('the install exits 0', () => {
          expectInstallPassed(scene);
        });

        then("the installed index.js holds no require('pg')", () => {
          expect(scene.indexJs).not.toContain("require('pg')");
          expect(scene.indexJs).toContain(
            'this.Client = this.options.Client || Client\n',
          );
        });

        // the contrast for case5: a patch that fits prints no path, so only a failure names the file
        then('the install output names no patch file', () => {
          expect(scene.output).not.toContain('patches/pg-pool.patch');
        });

        then('the patch lines an adopter reads match snapshot', () => {
          expect(
            asPatchWarnLines({ output: scene.output, dir: scene.dir }),
          ).toMatchSnapshot(`pnpm install — patch lines, pg-pool ${version}`);
        });
      });

      when('[t1] code builds a pool from pg-pool directly', () => {
        const direct = useBeforeAll(async () =>
          getOneDirectPoolResult({ dir: scene.dir }),
        );

        then('a pool built with no Client has none, since the fallback is gone', () => {
          expect(direct.withoutClient).toEqual('has no Client');
        });

        then("the remedy the patch header names gives it pg's Client", () => {
          expect(direct.withClient).toEqual('has pg Client');
        });

        then('its first connect fails loud, with the error the caller reads', () => {
          expect(direct.withoutClientConnect).toEqual(
            'this.Client is not a constructor',
          );
        });
      });
    });
  });

  given('[case4] an rds repo that already holds its own "pg-pool@3.14.0" hand patch', () => {
    const tempDir = genTempDir({
      slug: 'pg-pool-patch-case4',
      clone: './src/practices/persist-with-rds/.test/assets/repo-with-hand-patch',
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });
    const handPatch = 'patches/pg-pool@3.14.0.patch';
    const otherPatch = 'patches/left-pad@1.3.0.patch';

    const applied = useBeforeAll(async () => {
      setDeclarations({
        dir: path.join(tempDir, 'declarations'),
        declarations: asDeclarationsOfPackageJsonOnly(),
      });
      const config = path.join(tempDir, 'declapract.use.yml');
      const read = () =>
        readFileSync(path.join(tempDir, 'package.json'), 'utf-8');
      const before = read();
      await executeApply({ config });
      const after1 = read();
      await executeApply({ config });
      const after2 = read();
      return {
        before,
        after1,
        after2,
        exists: {
          hand: existsSync(path.join(tempDir, handPatch)),
          shipped: existsSync(path.join(tempDir, 'patches/pg-pool.patch')),
        },
      };
    }, 170_000);

    when('[t0] the persist-with-rds practice is applied', () => {
      then('the shipped bare-name key lands beside the hand keys, and every other key survives', () => {
        expect(asPatchMapOfPackageJson({ contents: applied.after1 })).toEqual({
          'pg-pool@3.14.0': handPatch,
          'left-pad@1.3.0': otherPatch,
          'pg-pool': 'patches/pg-pool.patch',
        });
      });

      then("the repo's other pnpm keys are kept", () => {
        expect(
          asPackageJSON(
            { contents: applied.after1 },
            { practice: 'persist-with-rds' },
          ).pnpm.overrides,
        ).toEqual({ 'react-refresh': '0.14.2' });
      });

      then('both patch files are present', () => {
        expect(applied.exists).toEqual({ hand: true, shipped: true });
      });

      // the whole file is held, so a clobbered or dropped key shows in review; only the dep floors the
      // practice writes are masked, since a floor bump says naught of this fix
      then('the before + after contents match snapshot', () => {
        const asFloorsMasked = (contents: string) =>
          contents.replace(/check\.minVersion\('[^']+'\)/g, "check.minVersion('<floor>')");
        expect(asFloorsMasked(applied.before)).toMatchSnapshot(
          'package.json — before',
        );
        expect(asFloorsMasked(applied.after1)).toMatchSnapshot(
          'package.json — after',
        );
      });

      // .note = the first apply writes `@declapract{check.minVersion(...)}` for each dep it adds, and
      //         the second resolves those to versions; that is declapract's own dep flow, so only the
      //         patch map is held to a no-op here
      then('a second apply leaves the patch map as is', () => {
        expect(asPatchMapOfPackageJson({ contents: applied.after2 })).toEqual(
          asPatchMapOfPackageJson({ contents: applied.after1 }),
        );
      });
    });

    when('[t1] pnpm installs pg-pool 3.14.0 with both keys', () => {
      const scene = useBeforeAll(async () =>
        genInstalledPgPool({
          slug: 'pg-pool-patch-case4-install',
          version: '3.14.0',
          patchedDependencies: asPatchMapOfPackageJson({
            contents: applied.after1,
          }),
          patchFiles: [
            { at: handPatch, from: path.join(tempDir, handPatch) },
            { at: otherPatch, from: path.join(tempDir, otherPatch) },
            {
              at: 'patches/pg-pool.patch',
              from: path.join(tempDir, 'patches/pg-pool.patch'),
            },
          ],
          adopter: null,
        }),
      );

      then('the install exits 0', () => {
        expectInstallPassed(scene);
      });

      then('pnpm applies the exact key first, so the hand patch wins', () => {
        expect(scene.indexJs).toContain(
          'this.Client = this.options.Client || Client // hand patch\n',
        );
        expect(scene.indexJs).not.toContain("require('pg')");
      });
    });
  });

  given('[case5] a pg-pool release where the patched line moved, so the hunk fails', () => {
    const scene = useBeforeAll(async () => {
      const misfitPath = path.join(
        genTempDir({ slug: 'pg-pool-patch-case5-misfit' }),
        'pg-pool.patch',
      );
      writeFileSync(
        misfitPath,
        asPatchWithMovedLine({
          contents: readFileSync(shippedPatchPath, 'utf-8'),
        }),
      );
      return genInstalledPgPool({
        slug: 'pg-pool-patch-case5',
        version: '3.14.0',
        patchedDependencies: shippedPatchMap,
        patchFiles: [{ at: 'patches/pg-pool.patch', from: misfitPath }],
        adopter: null,
      });
    });

    when('[t0] pnpm install runs', () => {
      then('the install still exits 0, since the pnpm practice ships ignorePatchFailures', () => {
        expectInstallPassed(scene);
      });

      // the cases above prove a patch that fits prints no path, so this path is the failure warn
      then('the warn names the shipped patch file, so the reader finds its header', () => {
        expect(scene.output).toContain('patches/pg-pool.patch');
      });

      then('the warn an adopter reads matches snapshot', () => {
        expect(
          asPatchWarnLines({ output: scene.output, dir: scene.dir }),
        ).toMatchSnapshot('pnpm install — patch failure warn');
      });

      then('pg-pool lands unpatched, so the cycle check is the alarm', () => {
        expect(scene.indexJs).toContain("require('pg').Client");
      });
    });
  });

  given('[case6] a bare rds adopter: pg, pg-pool, the shipped cycle check, and one src file that imports pg', () => {
    const cycleCheck = getOneShippedCycleCheck();

    when('[t0] its cycle check runs, with the shipped patch', () => {
      const scene = useBeforeAll(async () => {
        const installed = genInstalledPgPool({
          slug: 'pg-pool-patch-case6-patched',
          version: '3.14.0',
          patchedDependencies: shippedPatchMap,
          patchFiles: [{ at: 'patches/pg-pool.patch', from: shippedPatchPath }],
          adopter: cycleCheck,
        });
        return { installed, check: genCycleCheckRun({ dir: installed.dir }) };
      });

      then('the install exits 0', () => {
        expectInstallPassed(scene.installed);
      });

      then('the cycle check exits 0, so the lint gate passes', () => {
        expect(scene.check.output).toContain(
          'no circular dependency was found',
        );
        expect(scene.check.status).toEqual(0);
      });

      then('the verdict an adopter reads matches snapshot', () => {
        expect(
          asCycleCheckLines({
            output: scene.check.output,
            dir: scene.installed.dir,
          }),
        ).toMatchSnapshot('test:lint:cycles — with the shipped patch');
      });
    });

    // the red run: the same tree with no patch is what every rds adopter met before this practice
    when('[t1] its cycle check runs, with no patch', () => {
      const scene = useBeforeAll(async () => {
        const installed = genInstalledPgPool({
          slug: 'pg-pool-patch-case6-bare',
          version: '3.14.0',
          patchedDependencies: {},
          patchFiles: [],
          adopter: cycleCheck,
        });
        return { installed, check: genCycleCheckRun({ dir: installed.dir }) };
      });

      then('the install exits 0', () => {
        expectInstallPassed(scene.installed);
      });

      then('the cycle check exits 1, on the pg <-> pg-pool cycle', () => {
        expect(scene.check.output).toMatch(/pg@[^\s]+\/lib\/index\.js -> .*pg-pool@[^\s]+\/index\.js/);
        expect(scene.check.status).toEqual(1);
      });

      then('the verdict an adopter reads matches snapshot', () => {
        expect(
          asCycleCheckLines({
            output: scene.check.output,
            dir: scene.installed.dir,
          }),
        ).toMatchSnapshot('test:lint:cycles — with no patch');
      });
    });
  });
});
