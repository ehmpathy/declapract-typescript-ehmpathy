import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = the probe skill, as a human runs it
 */
const PROBE = path.join(
  __dirname,
  '..',
  '.agent',
  'repo=.this',
  'role=any',
  'skills',
  'typescript.probe.sh',
);

/**
 * .what = a shim compiler: names its version, lists two files, then passes or fails a typecheck.
 *         with `--outDir`, it emits one module that requires an `@src/` alias.
 * .why  = the probe installs each rung once into `$HOME/.cache/typescript.probe/<version>/`, and reuses
 *         any install it finds there; a seeded HOME lets each case pick the compiler's behavior, with
 *         no network and no real typescript install.
 * .note = `sleeps` sets the wall of each typecheck call in turn (the first is the discarded warm-up),
 *         so a case can pin the wall ranges a verdict reads, free of host load
 * .mock = the `tsc` binary of each rung
 * .why  = a verdict reads wall times and exit codes; a real compiler makes both host-bound, and a
 *         fresh install of each rung needs the network
 * .real = the probe runs against real compilers by hand: `rhx typescript.probe --what typecheck
 *         --rungs '5.4.5 6.0.3 7.0.2'` and `--what emit`, whose reads the execution yield records
 */
const asShimTsc = (input: {
  version: string;
  isFailed: boolean;
  sleeps?: number[];
  emits?: string;
  isEmitFailed?: boolean;
  isListFailed?: boolean;
  failsFrom?: number;
}): string => `#!/usr/bin/env bash
args=" $* "
if [[ "$args" == *" --version "* ]]; then echo "Version ${input.version}"; exit 0; fi
${input.isListFailed ? `if [[ "$args" == *" --listFilesOnly "* ]]; then echo "error TS5023: Unknown compiler option '--listFilesOnly'."; exit 1; fi` : ''}
if [[ "$args" == *" --listFilesOnly "* ]]; then echo /repo/a.ts; echo /repo/b.ts; exit 0; fi
${input.isEmitFailed ? `if [[ "$args" == *" --outDir "* ]]; then echo "src/a.ts(1,1): error TS2307: Cannot find module '@src/x'."; exit 2; fi` : ''}
if [[ "$args" == *" --outDir "* ]]; then
  out="\${args#* --outDir }"; out="\${out%% *}"
  mkdir -p "$out" && echo '${input.emits ?? 'const x = require("@src/logic/x");'}' > "$out/index.js"
  exit 0
fi
echo "$*" >> "$0.args"
sleeps=(${(input.sleeps ?? []).join(' ')})
count="$(cat "$0.count" 2> /dev/null || echo 0)"
echo $((count + 1)) > "$0.count"
[[ -n "\${sleeps[$count]:-}" ]] && sleep "\${sleeps[$count]}"
${input.failsFrom !== undefined ? `if [[ "$count" -ge ${input.failsFrom} ]]; then echo "src/a.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'."; exit 2; fi` : ''}
${input.isFailed ? `echo "src/a.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'."; exit 2` : 'exit 0'}
`;

/**
 * .what = a temp git repo with a tsconfig, a seeded HOME, and shim compilers per version
 */
const genProbeScene = async (input: {
  slug: string;
  shims: {
    version: string;
    isFailed: boolean;
    sleeps?: number[];
    emits?: string;
    isEmitFailed?: boolean;
    isListFailed?: boolean;
    failsFrom?: number;
  }[];
}): Promise<{ repo: string; home: string }> => {
  const repo = genTempDir({ slug: `${input.slug}-repo` });
  const home = genTempDir({ slug: `${input.slug}-home` });
  spawnSync('git', ['init', '-q'], { cwd: repo });
  await fs.writeFile(path.join(repo, 'tsconfig.json'), '{}');
  await fs.writeFile(path.join(repo, 'tsconfig.build.json'), '{}');
  for (const shim of input.shims) {
    const bin = path.join(home, '.cache', 'typescript.probe', shim.version, 'node_modules', '.bin');
    await fs.mkdir(bin, { recursive: true });
    await fs.writeFile(path.join(bin, 'tsc'), asShimTsc(shim), { mode: 0o755 });
  }
  return { repo, home };
};

/**
 * .what = puts a shim `tsc-alias` in the scene repo's node_modules, which rewrites no specifier
 * .mock = tsc-alias, the alias rewrite the emit probe runs after each build
 * .why  = the shim tsc emits a fixed tree; a real tsc-alias would read a real tsconfig and tree,
 *         so these cases pin the probe's grep and report against a tree they control
 * .real = [case12] [t2] runs the probe's emit with the real tsc-alias over a real 5.4.5 build
 */
const genTscAliasShim = async (input: { repo: string }): Promise<void> => {
  const bin = path.join(input.repo, 'node_modules', '.bin');
  await fs.mkdir(bin, { recursive: true });
  await fs.writeFile(path.join(bin, 'tsc-alias'), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  await fs.mkdir(path.join(input.repo, 'node_modules', 'tsc-alias'), { recursive: true });
  await fs.writeFile(
    path.join(input.repo, 'node_modules', 'tsc-alias', 'package.json'),
    JSON.stringify({ name: 'tsc-alias', version: '1.8.10' }),
  );
};

/**
 * .what = runs the probe from the repo dir, under the seeded HOME
 */
const runProbe = (input: {
  repo: string;
  home: string;
  args: string[];
}): { stdout: string; stderr: string; status: number | null; snap: string } => {
  const result = spawnSync('bash', [PROBE, ...input.args], {
    cwd: input.repo,
    encoding: 'utf8',
    // `<home>/bin` sits first on PATH, so a case may shim the installer the probe calls
    env: { ...process.env, HOME: input.home, GIT_CONFIG_GLOBAL: '/dev/null', PATH: `${path.join(input.home, 'bin')}:${process.env.PATH}` },
  });
  const snap = asProbeOutputStable({
    text: `exit ${result.status}\n--- stdout\n${result.stdout}--- stderr\n${result.stderr}`,
    repo: input.repo,
    home: input.home,
  });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status, snap };
};

/**
 * .what = the probe output with each host-bound value masked: temp paths, clock stamps, the machine, and
 *         every measured number
 * .why  = a snapshot shows a reviewer the report a human reads; walls, cpu, and paths differ per host
 *         and per run, and a clock stamp must never land in a tracked file
 */
const asProbeOutputStable = (input: { text: string; repo: string; home: string }): string =>
  input.text
    // the probe prints the resolved repo dir, and a temp dir is a symlink, so mask both forms
    .split(realpathSync(input.repo))
    .join('<repo>')
    .split(input.repo)
    .join('<repo>')
    .split(input.home)
    .join('<home>')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.-]+Z?/g, '<time>')
    .replace(/├─ machine: .*/g, '├─ machine: <machine>')
    .replace(/rss: {2}.*/g, 'rss:  <n>MB [<n>–<n>]')
    .replace(/cpu: {2}.*/g, 'cpu:  <n>s [<n>–<n>]')
    .replace(/wall: [^·]*·/g, 'wall: <n>s [<n>–<n>] ·')
    .replace(/trees kept at: .*/g, 'trees kept at: <temp>')
    .replace(/\d+(\.\d+)?(?=\s*(s|ms|%|×|x)\b)/g, '<n>')
    .replace(/(?<![\d.])\d+\.\d+(?![\d.])/g, '<n>'); // a decimal, never a x.y.z version

/**
 * .what = fails fast where the host lacks gnu time, which the probe reads every timed run through
 */
const requireGnuTime = (): void => {
  if (!existsSync('/usr/bin/time'))
    throw new ConstraintError('the timed probe cases need gnu time at /usr/bin/time', {
      hint: 'install it, e.g. apt-get install time',
    });
};

describe('typescript.probe skill', () => {
  given('[case1] the --help flag', () => {
    when('[t0] the probe is asked for help', () => {
      const result = useBeforeAll(async () =>
        runProbe({ ...(await genProbeScene({ slug: 'probe-help', shims: [] })), args: ['--help'] }),
      );

      then('it prints the whole header, through its last guarantee, and exits 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('exit 0 = every rung ran clean');
        expect(result.stdout).not.toContain('set -euo pipefail');
      });

      then('the help reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case2] bad input', () => {
    const scene = useBeforeAll(async () => genProbeScene({ slug: 'probe-input', shims: [] }));

    then('a --rungs value that is not a bare version exits 2 and names it', () => {
      const result = runProbe({ ...scene, args: ['--what', 'typecheck', '--rungs', '../../x'] });
      expect(result.status).toEqual(2);
      expect(result.stderr).toContain("--rungs value '../../x' is not <version> or <version>:single");
      expect(result.snap).toMatchSnapshot();
    });

    then('a --label that climbs out of the log dir exits 2 and names it', () => {
      const result = runProbe({ ...scene, args: ['--what', 'typecheck', '--label', 'x/../..'] });
      expect(result.status).toEqual(2);
      expect(result.stderr).toContain("--label must be a bare slug in [0-9A-Za-z._-], got 'x/../..'");
      expect(result.stderr).not.toContain('--walk');
      expect(result.snap).toMatchSnapshot();
    });

    then('a value flag with no value exits 2 and names the flag, never a bare exit 1', () => {
      const result = runProbe({ ...scene, args: ['--what'] });
      expect(result.status).toEqual(2);
      expect(result.stderr).toContain('✋ ConstraintError: --what needs a value (see --help)');
      expect(result.snap).toMatchSnapshot();
    });

    then('an unknown arg exits 2 and points at --help', () => {
      const result = runProbe({ ...scene, args: ['--what', 'typecheck', '--rung', '9.0.0'] });
      expect(result.status).toEqual(2);
      expect(result.stderr).toContain("ConstraintError: unknown arg '--rung' (see --help)");
      expect(result.snap).toMatchSnapshot();
    });

    then('a --what that is neither typecheck nor emit exits 2 and shows a call', () => {
      const result = runProbe({ ...scene, args: ['--what', 'speed'] });
      expect(result.status).toEqual(2);
      expect(result.stderr).toContain("--what must be typecheck or emit, got 'speed'");
      expect(result.stderr).toContain('e.g. rhx typescript.probe --what typecheck');
      expect(result.snap).toMatchSnapshot();
    });

    then('a --dir that is not a dir exits 2 and names it', () => {
      const result = runProbe({ ...scene, args: ['--what', 'typecheck', '--dir', './absent'] });
      expect(result.status).toEqual(2);
      expect(result.stderr).toContain("--dir './absent' is not a dir");
      expect(result.snap).toMatchSnapshot();
    });

    then('a --runs that is not a positive integer exits 2 and shows a value', () => {
      const result = runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '0'] });
      expect(result.status).toEqual(2);
      expect(result.stderr).toContain("--runs must be a positive integer, got '0'");
      expect(result.stderr).toContain('e.g. --runs 5');
      expect(result.snap).toMatchSnapshot();
    });

    then('a --tsconfig the repo lacks exits 2 and names the fix', () => {
      const result = runProbe({ ...scene, args: ['--what', 'typecheck', '--tsconfig', 'tsconfig.absent.json'] });
      expect(result.status).toEqual(2);
      expect(result.stderr).toContain('no tsconfig.absent.json in');
      expect(result.stderr).toContain('fix: name the file via --tsconfig, or point --dir at the repo that holds it');
      expect(result.snap).toMatchSnapshot();
    });

    then('a --walk with no walked consumer exits 2 and names the walk to run', () => {
      const result = runProbe({ ...scene, args: ['--what', 'typecheck', '--walk', 'npm-package'] });
      expect(result.status).toEqual(2);
      expect(result.stderr).toContain('fix: rhx declapract.walk --usecase npm-package');
      expect(result.snap).toMatchSnapshot();
    });
  });

  given('[case3] two rungs that each typecheck clean', () => {
    when('[t0] the probe measures them', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({
          slug: 'probe-clean',
          // the baseline walls span [0.1–0.6], so the second rung's 0.3 sits inside it on any host
          shims: [
            { version: '9.0.0', isFailed: false, sleeps: [0.1, 0.1, 0.6] },
            { version: '9.1.0', isFailed: false, sleeps: [0.3, 0.3, 0.3] },
          ],
        });
        return runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '2', '--rungs', '9.0.0 9.1.0'] });
      });

      then('it exits 0, the first rung is the baseline, and overlapped walls read within noise', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('typescript@9.0.0 (exit 0) · 2 files read · Version 9.0.0');
        expect(result.stdout).toContain('· baseline');
        expect(result.stdout).toContain('· within noise');
        expect(result.stdout).toContain('every rung ran clean');
      });

      then('the report reads as snapped, each measured number masked', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case4] a rung whose typecheck fails', () => {
    when('[t0] the probe measures it', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({
          slug: 'probe-failed',
          // the failed rung fails on every run, the warm-up first, so the report names the warm-up
          shims: [
            { version: '9.0.0', isFailed: false },
            { version: '9.2.0', isFailed: true },
          ],
        });
        return runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '1', '--rungs', '9.0.0 9.2.0'] });
      });

      then('it exits 1, marks the rung, and shows the errors of the first run that failed', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('typescript@9.2.0 (exit 2)');
        expect(result.stdout).toContain('errors (first 8 lines of the warm-up run, the first that failed)');
        expect(result.stdout).toContain('error TS2322');
        expect(result.stdout).toContain('MalfunctionError: typescript@9.2.0 exited 2');
      });

      then('the failed rung claims no speed, since a stopped check times naught', () => {
        expect(result.stdout).toContain('· not compared, since the rung failed');
        expect(result.stdout).not.toMatch(/x (slower|faster) than baseline/);
      });

      then('the report reads as snapped, each measured number masked', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t1] the rung fails only on a later cold run', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        // the shim counts its timed runs: 0 is the warm-up, so 2 is the second cold run
        const scene = await genProbeScene({ slug: 'probe-failed-late', shims: [{ version: '9.0.0', isFailed: false, failsFrom: 2 }] });
        return runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '2', '--rungs', '9.0.0'] });
      });

      then('it names the cold run that failed, as a human counts it, exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('errors (first 8 lines of cold run 2, the first that failed)');
      });

      then('the report reads as snapped, each measured number masked', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t2] the first rung, the would-be baseline, fails', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({
          slug: 'probe-failed-baseline',
          shims: [
            { version: '9.2.0', isFailed: true },
            { version: '9.0.0', isFailed: false },
          ],
        });
        return runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '1', '--rungs', '9.2.0 9.0.0'] });
      });

      then('the failed rung anchors no ratio: the first clean rung is the baseline, exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toMatch(/typescript@9\.2\.0 \(exit 2\)[^]*· not compared, since the rung failed/);
        expect(result.stdout).toMatch(/typescript@9\.0\.0 \(exit 0\)[^]*· baseline/);
        expect(result.stdout).not.toMatch(/x (slower|faster) than baseline/);
      });

      then('the report reads as snapped, each measured number masked', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case5] another probe holds the lock', () => {
    when('[t0] a second probe starts', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({ slug: 'probe-lock', shims: [{ version: '9.0.0', isFailed: false }] });
        await fs.mkdir(path.join(scene.home, '.cache', 'typescript.probe', '.lock'), { recursive: true });
        return runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '1', '--rungs', '9.0.0'] });
      });

      then('it exits 2 and names the lock to clear', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('another typescript.probe holds the lock');
      });

      then('the refusal reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case6] an emit whose alias rewrite leaves an @src/ specifier', () => {
    when('[t0] the probe builds and greps the tree', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({ slug: 'probe-emit', shims: [{ version: '9.0.0', isFailed: false }] });
        // the shim rewrites no specifier, so the shim tsc's `@src/` require stays: the failure this case asserts on
        await genTscAliasShim({ repo: scene.repo });
        return runProbe({ ...scene, args: ['--what', 'emit', '--rungs', '9.0.0'] });
      });

      then('it exits 1 and names the unrewritten specifier, both tool versions, and the fix', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('alias seam: 1 unrewritten specifier in dist/');
        expect(result.stdout).toContain('(tsc-alias 1.8.10, typescript@9.0.0)');
        expect(result.stdout).toContain('require("@src/logic/x")');
        expect(result.stdout).toContain('└─ fix: an alias whose target sits outside the build rootDir');
        expect(result.stdout).toContain('keep typescript below 7 in this repo until it does');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case8] a rung with the :single suffix', () => {
    when('[t0] the probe measures it beside the plain rung', () => {
      const scene = useBeforeAll(async () => {
        requireGnuTime();
        // both rungs share one shim, so its calls run in turn: the plain rung's walls span [0.1–0.6] and
        // the :single rung's 0.3 sits inside it, so the verdict reads within noise on any host
        return genProbeScene({
          slug: 'probe-single',
          shims: [{ version: '9.0.0', isFailed: false, sleeps: [0.1, 0.1, 0.6, 0.3, 0.3, 0.3] }],
        });
      });
      const result = useBeforeAll(async () =>
        runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '2', '--rungs', '9.0.0 9.0.0:single'] }),
      );

      then('it exits 0, and only the :single rung passes --singleThreaded to tsc', async () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('typescript@9.0.0:single (exit 0)');
        const calls = (
          await fs.readFile(
            path.join(scene.home, '.cache', 'typescript.probe', '9.0.0', 'node_modules', '.bin', 'tsc.args'),
            'utf8',
          )
        )
          .trim()
          .split('\n');
        expect(calls.filter((call) => call.includes('--singleThreaded'))).toHaveLength(3); // warm-up + 2 runs
        expect(calls.filter((call) => !call.includes('--singleThreaded'))).toHaveLength(3);
        expect(result.stdout).toContain('· within noise');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case9] a --walk whose consumer was walked', () => {
    when('[t0] the probe measures the walked consumer', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({ slug: 'probe-walk', shims: [{ version: '9.0.0', isFailed: false }] });
        const consumer = genTempDir({ slug: 'probe-walk-consumer' });
        await fs.writeFile(path.join(consumer, 'tsconfig.json'), '{}');
        const walkDir = path.join(scene.repo, '.log', 'declapract.walk', 'npm-package');
        await fs.mkdir(walkDir, { recursive: true });
        await fs.writeFile(path.join(walkDir, 'repo.path'), consumer);
        const run = runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '1', '--rungs', '9.0.0', '--walk', 'npm-package'] });
        // the walked dir is a host temp path, so its repo line is masked whole
        return { ...run, consumer, snap: run.snap.replace(/├─ repo: \/.*\n/, '├─ repo: <consumer>\n') };
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });

      then('it exits 0 and probes the walked dir, not the repo', () => {
        expect(result.status).toEqual(0);
        // the probe prints the resolved dir, and genTempDir hands back a symlinked one, so match its own name
        expect(result.stdout).toMatch(new RegExp(`├─ repo: /.*/${path.basename(result.consumer)}\\n`));
        expect(result.stdout).toContain('every rung ran clean');
      });
    });

    when('[t1] the walked consumer dir is gone', () => {
      const result = useBeforeAll(async () => {
        const scene = await genProbeScene({ slug: 'probe-walk-gone', shims: [{ version: '9.0.0', isFailed: false }] });
        const walkDir = path.join(scene.repo, '.log', 'declapract.walk', 'npm-package');
        await fs.mkdir(walkDir, { recursive: true });
        // the recorded dir sits under the scene repo, so the snapshot masks it as <repo>/…
        await fs.writeFile(path.join(walkDir, 'repo.path'), path.join(scene.repo, 'consumer-gone'));
        return runProbe({ ...scene, args: ['--what', 'typecheck', '--rungs', '9.0.0', '--walk', 'npm-package'] });
      });

      then('it exits 2 and names the rewalk as the fix', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('consumer-gone');
        expect(result.stderr).toContain('--walk npm-package names a consumer dir that is gone');
        expect(result.stderr).toContain('└─ fix: rerun rhx declapract.walk --usecase npm-package');
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t2] the probe builds the walked consumer', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({
          slug: 'probe-walk-emit',
          shims: [{ version: '9.0.0', isFailed: false, emits: 'const x = require("./logic/x");' }],
        });
        // the walked consumer holds its own build tsconfig and tsc-alias, as a walk with --compile run leaves it
        const consumer = genTempDir({ slug: 'probe-walk-emit-consumer' });
        await fs.writeFile(path.join(consumer, 'tsconfig.build.json'), '{}');
        await genTscAliasShim({ repo: consumer });
        const walkDir = path.join(scene.repo, '.log', 'declapract.walk', 'lambda-service');
        await fs.mkdir(walkDir, { recursive: true });
        await fs.writeFile(path.join(walkDir, 'repo.path'), consumer);
        const run = runProbe({ ...scene, args: ['--what', 'emit', '--rungs', '9.0.0', '--walk', 'lambda-service'] });
        return { ...run, consumer, snap: run.snap.replace(/├─ repo: \/.*\n/, '├─ repo: <consumer>\n') };
      });

      then('it builds the walked dir with its own tsc-alias, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toMatch(new RegExp(`├─ repo: /.*/${path.basename(result.consumer)}\\n`));
        expect(result.stdout).toContain('├─ tsconfig: tsconfig.build.json');
        expect(result.stdout).toContain('alias seam: 0 unrewritten');
        expect(result.stdout).toContain('└─ ✨ every rung built clean, and no alias specifier was left');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case15] the selectors rhx forwards beside its own call', () => {
    when('[t0] the probe receives --skill, --repo, and --role', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({ slug: 'probe-selectors', shims: [{ version: '9.0.0', isFailed: false }] });
        return runProbe({
          ...scene,
          args: ['--skill', 'typescript.probe', '--repo', '.this', '--role', 'any', '--what', 'typecheck', '--runs', '1', '--rungs', '9.0.0'],
        });
      });

      then('it skips them, so `--repo` never moves the probed dir, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('├─ repo: .\n');
        expect(result.stdout).not.toContain('.this');
        expect(result.stdout).toContain('every rung ran clean');
      });
    });
  });

  given('[case10] a rung whose install fails', () => {
    /**
     * .what = a scene whose `pnpm` fails each install with the given output
     * .mock = the installer the probe calls for an uncached rung
     * .why  = a real failed install needs the network and a real registry answer
     * .real = `rhx typescript.probe --what typecheck --rungs '5.4.5 0.0.404'`, run by hand in 5.3
     */
    const genFailedInstallScene = async (input: { slug: string; output: string }) => {
      const scene = await genProbeScene({ slug: input.slug, shims: [{ version: '9.0.0', isFailed: false }] });
      const bin = path.join(scene.home, 'bin');
      await fs.mkdir(bin, { recursive: true });
      await fs.writeFile(path.join(bin, 'pnpm'), `#!/usr/bin/env bash\necho '${input.output}'\nexit 1\n`, {
        mode: 0o755,
      });
      return scene;
    };

    when('[t0] the registry holds no such version', () => {
      const result = useBeforeAll(async () => {
        const scene = await genFailedInstallScene({
          slug: 'probe-install-absent',
          output: 'ERR_PNPM_NO_MATCHING_VERSION  No matching version found for typescript@0.0.404',
        });
        const run = runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '1', '--rungs', '9.0.0 0.0.404'] });
        const timedCalls = existsSync(path.join(scene.home, '.cache', 'typescript.probe', '9.0.0', 'node_modules', '.bin', 'tsc.args'));
        return { ...run, timedCalls };
      });

      then('it exits 2, names the version, and names how to list the published ones', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('ConstraintError: --rungs names typescript@0.0.404, which the registry does not hold');
        expect(result.stderr).toContain('fix: pick a published version; list them via `npm view typescript versions`');
      });

      then('it times no rung first, since every rung installs before the first timed run', () => {
        expect(result.timedCalls).toEqual(false);
        expect(result.stdout).not.toContain('typescript@9.0.0 (exit');
      });

      then('the refusal reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t1] the install fails for another cause', () => {
      const result = useBeforeAll(async () =>
        runProbe({
          ...(await genFailedInstallScene({ slug: 'probe-install-broken', output: 'ERR_PNPM_META_FETCH_FAIL  network down' })),
          args: ['--what', 'typecheck', '--runs', '1', '--rungs', '9.0.0 9.9.9'],
        }),
      );

      then('it exits 1 as a malfunction and shows the last lines of the install log', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain("MalfunctionError: 'pnpm add typescript@9.9.9' failed");
        expect(result.stderr).toContain('ERR_PNPM_META_FETCH_FAIL  network down');
      });

      then('the failure reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case11] the emit probe, off its clean path', () => {
    when('[t0] the repo has no tsc-alias installed', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({ slug: 'probe-emit-noalias', shims: [{ version: '9.0.0', isFailed: false }] });
        return runProbe({ ...scene, args: ['--what', 'emit', '--rungs', '9.0.0'] });
      });

      then('it exits 2 and names the deps to install', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain("/node_modules/.bin; install the repo's deps first");
      });

      then('the refusal reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t1] the build itself fails', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({
          slug: 'probe-emit-failed',
          shims: [{ version: '9.0.0', isFailed: false, isEmitFailed: true }],
        });
        await genTscAliasShim({ repo: scene.repo });
        return runProbe({ ...scene, args: ['--what', 'emit', '--rungs', '9.0.0'] });
      });

      then('it exits 1, marks the rung, and shows the build errors', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('typescript@9.0.0 (exit 2) · 0 files emitted');
        expect(result.stdout).toContain('error TS2307');
        expect(result.stdout).toContain('MalfunctionError: build under typescript@9.0.0 exited 2');
      });

      then('it skips the diff and alias seam, which would check an empty tree', () => {
        expect(result.stdout).toContain('├─ diff and alias seam: skipped, since a build failed');
        expect(result.stdout).not.toContain('files differ');
        expect(result.stdout).not.toContain('unrewritten');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t2] two rungs emit different trees', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({
          slug: 'probe-emit-diff',
          shims: [
            { version: '9.0.0', isFailed: false, emits: 'const x = require("./logic/x");' },
            { version: '9.1.0', isFailed: false, emits: 'const x = require("./logic/y");' },
          ],
        });
        await genTscAliasShim({ repo: scene.repo });
        return runProbe({ ...scene, args: ['--what', 'emit', '--rungs', '9.0.0 9.1.0'] });
      });

      then('it exits 0, counts the one file that differs, and names it', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('diff 9.0.0 vs 9.1.0: 1 file differs');
        expect(result.stdout).toContain('├─ differs: 9.0.0/index.js vs 9.1.0/index.js');
        expect(result.stdout).toContain('alias seam: 0 unrewritten');
        // a diff is a read, not a fault: the close names what passed, never that naught differs
        expect(result.stdout).toContain('└─ ✨ every rung built clean, and no alias specifier was left');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case12] the real registry, compiler, and tsc-alias', () => {
    /**
     * .what = a small repo whose one import goes through an `@src/` alias, its node_modules linked
     *         to this repo's, run under the real HOME
     * .why  = the shims above pin each report shape; this case proves the probe against what it
     *         really calls: a pnpm install from the registry, a real tsc, and the real tsc-alias.
     *         the real HOME holds the real compiler cache and the pnpm a corepack shim resolves
     *         from it; a seeded HOME would break that pnpm, not the probe
     */
    const scene = useBeforeAll(async () => {
      requireGnuTime();
      const probeScene = { ...(await genProbeScene({ slug: 'probe-real', shims: [] })), home: os.homedir() };
      const tsconfigBuild = {
        compilerOptions: {
          rootDir: 'src',
          outDir: 'dist',
          module: 'commonjs',
          target: 'es2020',
          strict: true,
          types: [],
          paths: { '@src/*': ['./src/*'] },
        },
        include: ['src'],
      };
      await fs.writeFile(path.join(probeScene.repo, 'tsconfig.build.json'), JSON.stringify(tsconfigBuild, null, 2));
      await fs.writeFile(
        path.join(probeScene.repo, 'tsconfig.json'),
        JSON.stringify({ extends: './tsconfig.build.json', compilerOptions: { noEmit: true } }, null, 2),
      );
      await fs.mkdir(path.join(probeScene.repo, 'src', 'logic'), { recursive: true });
      await fs.writeFile(path.join(probeScene.repo, 'src', 'logic', 'x.ts'), 'export const x: number = 1;\n');
      await fs.writeFile(
        path.join(probeScene.repo, 'src', 'index.ts'),
        "import { x } from '@src/logic/x';\n\nexport const y: number = x + 1;\n",
      );
      await fs.symlink(path.join(__dirname, '..', 'node_modules'), path.join(probeScene.repo, 'node_modules'));
      return probeScene;
    });

    when('[t0] the probe typechecks it on a real 5.4.5', () => {
      const result = useBeforeAll(async () =>
        runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '1', '--rungs', '5.4.5'] }),
      );

      then('it installs the rung, exits 0, and names the version it ran', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toMatch(/typescript@5\.4\.5 \(exit 0\) · \d+ files read · Version 5\.4\.5/);
        expect(result.stdout).toContain('every rung ran clean');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t1] the probe is asked for a version the registry does not hold', () => {
      const result = useBeforeAll(async () =>
        runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '1', '--rungs', '0.0.404'] }),
      );

      then('the real registry answer reads as a ConstraintError, exit 2', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('ConstraintError: --rungs names typescript@0.0.404, which the registry does not hold');
      });

      then('the refusal reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t2] the probe builds it with the real tsc-alias', () => {
      const result = useBeforeAll(async () =>
        runProbe({ ...scene, args: ['--what', 'emit', '--rungs', '5.4.5'] }),
      );

      then('tsc-alias rewrites the alias, so the seam reads 0 unrewritten, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('typescript@5.4.5 (exit 0) · 2 files emitted');
        expect(result.stdout).toContain('alias seam: 0 unrewritten');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t3] the probe typechecks it on a real 7.0.2, then single-threaded', () => {
      const result = useBeforeAll(async () =>
        runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '1', '--rungs', '7.0.2 7.0.2:single'] }),
      );

      then('both native rungs exit 0, read the same file count, and name 7.0.2 as the version they ran', () => {
        expect(result.status).toEqual(0);
        const counts = [...result.stdout.matchAll(/typescript@7\.0\.2(?::single)? \(exit 0\) · (\d+) files read · Version 7\.0\.2/g)];
        expect(counts).toHaveLength(2);
        expect(counts[0]![1]).toEqual(counts[1]![1]);
        expect(result.stdout).toContain('every rung ran clean');
      });

      then('the report reads as snapped', () => {
        // one cold run per rung gives a noise band of zero width, so the verdict is host jitter; [case3], [case4], and [case8] pin it
        expect(result.snap.replace(/· (within noise|<n>x (slower|faster) than baseline)/g, '· <verdict>')).toMatchSnapshot();
      });
    });
  });

  given('[case7] an emit whose every specifier is relative', () => {
    when('[t0] the probe builds and greps the tree', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({
          slug: 'probe-emit-clean',
          shims: [{ version: '9.0.0', isFailed: false, emits: 'const x = require("./logic/x");' }],
        });
        // the emit holds no alias to rewrite, so the shim's no-op is the honest rewrite
        await genTscAliasShim({ repo: scene.repo });
        return runProbe({ ...scene, args: ['--what', 'emit', '--rungs', '9.0.0'] });
      });

      then('it exits 0 and reads 0 unrewritten specifiers', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('alias seam: 0 unrewritten');
        expect(result.stdout).not.toContain('MalfunctionError');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case13] the options a prober sets, and the rungs it leaves to default', () => {
    when('[t0] the probe reads another dir, a named tsconfig, under a label', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({ slug: 'probe-options', shims: [{ version: '9.0.0', isFailed: false }] });
        const other = genTempDir({ slug: 'probe-options-other' });
        await fs.writeFile(path.join(other, 'tsconfig.custom.json'), '{}');
        const run = runProbe({
          ...scene,
          args: ['--what', 'typecheck', '--runs', '1', '--rungs', '9.0.0', '--dir', other, '--tsconfig', 'tsconfig.custom.json', '--label', 'mine'],
        });
        // the other dir is a host temp path, so its repo line is masked whole
        return { ...run, scene, other, snap: run.snap.replace(/├─ repo: \/.*\n/, '├─ repo: <other>\n') };
      });

      then('it exits 0, and names the dir, the tsconfig, and the labelled log dir it used', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toMatch(new RegExp(`├─ repo: /.*/${path.basename(result.other)}\\n`));
        expect(result.stdout).toContain('├─ tsconfig: tsconfig.custom.json');
        expect(result.stdout).toContain('├─ logs: .log/typescript.probe/typecheck.mine/');
        expect(existsSync(path.join(result.scene.repo, '.log', 'typescript.probe', 'typecheck.mine'))).toEqual(true);
      });

      then('tsc reads the named tsconfig', async () => {
        const calls = await fs.readFile(
          path.join(result.scene.home, '.cache', 'typescript.probe', '9.0.0', 'node_modules', '.bin', 'tsc.args'),
          'utf8',
        );
        expect(calls).toContain('-p tsconfig.custom.json');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t1] the probe typechecks with no --rungs', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({
          slug: 'probe-default-typecheck',
          shims: ['5.4.5', '6.0.3', '7.0.2'].map((version) => ({ version, isFailed: false })),
        });
        const run = runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '1'] });
        // one cold run gives a noise band of zero width, so host jitter alone picks each rung's verdict;
        // this case pins the default rungs, and [case3], [case4], and [case8] pin the verdicts, so it is masked here
        return { ...run, snap: run.snap.replace(/· (within noise|<n>x (slower|faster) than baseline)/g, '· <verdict>') };
      });

      then('it walks the four declared rungs, in order, exit 0', () => {
        expect(result.status).toEqual(0);
        const rungs = result.stdout.match(/typescript@[\d.]+(:single)? \(exit/g);
        expect(rungs).toEqual([
          'typescript@5.4.5 (exit',
          'typescript@6.0.3 (exit',
          'typescript@7.0.2 (exit',
          'typescript@7.0.2:single (exit',
        ]);
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });

    when('[t2] the probe builds with no --rungs', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({
          slug: 'probe-default-emit',
          shims: ['5.4.5', '7.0.2'].map((version) => ({ version, isFailed: false, emits: 'const x = require("./logic/x");' })),
        });
        await genTscAliasShim({ repo: scene.repo });
        return runProbe({ ...scene, args: ['--what', 'emit'] });
      });

      then('it builds the two declared rungs and diffs the first against the last, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('typescript@5.4.5 (exit 0) · 1 file emitted');
        expect(result.stdout).toContain('typescript@7.0.2 (exit 0) · 1 file emitted');
        expect(result.stdout).toContain('diff 5.4.5 vs 7.0.2: 0 files differ');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });

  given('[case14] a rung whose file count cannot be read', () => {
    when('[t0] tsc refuses --listFilesOnly', () => {
      const result = useBeforeAll(async () => {
        requireGnuTime();
        const scene = await genProbeScene({
          slug: 'probe-list-failed',
          shims: [{ version: '9.0.0', isFailed: false, isListFailed: true }],
        });
        return runProbe({ ...scene, args: ['--what', 'typecheck', '--runs', '1', '--rungs', '9.0.0'] });
      });

      then('the typecheck still exits 0, and the rung reads n/a files with its reason, never a false count', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain(
          'typescript@9.0.0 (exit 0) · n/a files read (--listFilesOnly failed; read .log/typescript.probe/typecheck/9.0.0.files) · Version 9.0.0',
        );
      });

      then('the close names the unproven scope, so a clean close never hides it', () => {
        expect(result.stdout).toContain('└─ ✨ every rung ran clean; 1 rung read no file count, so its scope is unproven');
      });

      then('the report reads as snapped', () => {
        expect(result.snap).toMatchSnapshot();
      });
    });
  });
});
