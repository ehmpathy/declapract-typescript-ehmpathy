import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import yaml from 'yaml';

/**
 * .what = proves the node_modules cache key (#796): a patch under `patches/` moves the key, and a
 *         repo with no patch keeps the lockfile-only key it had
 * .why  = a patch applied at install changes node_modules with no lockfile change; a key blind to it
 *         restores the unpatched tree, so the patch reads as applied in the repo and is absent in ci
 * .how  = run the `deps-hash` step's own `run` block from .install.yml under bash, in a temp repo
 */

type Step = {
  id?: string;
  name?: string;
  if?: string;
  run?: string;
  uses?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
};
// .note = yaml.parse returns any (an external boundary); the cast names only the steps read, and an
//         absent `deps-hash` step leaves hashBlock '' so every case below reddens
const installYml = yaml.parse(
  fs.readFileSync(path.join(__dirname, 'best-practice/.github/workflows/.install.yml'), 'utf-8'),
) as { jobs: { pnpm: { steps: Step[] } } };
const hashBlock = installYml.jobs.pnpm.steps.find((step) => step.id === 'deps-hash')?.run ?? '';

/**
 * .what = write a temp repo with the given files and dirs, run the hash block there, and return what
 *         the step printed and wrote to GITHUB_OUTPUT, plus the key it chose
 */
const getOneDepsHashRun = (input: {
  files: Record<string, string>;
  dirs: string[];
}): { key: string; stdout: string; output: string } => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'install-cache-key-'));
  for (const [rel, content] of Object.entries(input.files)) {
    fs.mkdirSync(path.dirname(path.join(repoDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(repoDir, rel), content);
  }
  for (const rel of input.dirs) fs.mkdirSync(path.join(repoDir, rel), { recursive: true });
  const outputPath = path.join(repoDir, 'github-output');
  // .why = `-eo pipefail` is what github runs under `shell: bash`; the default shell is weaker, so a
  //        block that holds here holds under both
  const res = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', hashBlock], {
    cwd: repoDir,
    encoding: 'utf-8',
    env: { ...process.env, GITHUB_OUTPUT: outputPath },
  });
  expect({ code: res.status, stderr: res.stderr }).toEqual({ code: 0, stderr: '' });

  // a step that wrote no key is a drift in the step, named here rather than read as ''
  const output = fs.readFileSync(outputPath, 'utf-8');
  const key = /package-deps-hash=(\S+)/.exec(output)?.[1];
  if (!key) throw new Error(`the deps-hash step wrote no package-deps-hash to GITHUB_OUTPUT: ${output}`);
  return { key, stdout: res.stdout, output };
};

/**
 * .what = the key alone, for a repo with the given files and no extra dirs
 */
const getOneDepsHash = (input: { files: Record<string, string> }): string =>
  getOneDepsHashRun({ files: input.files, dirs: [] }).key;

const LOCK = 'lockfileVersion: 9.0\n';
const BASE = { '.nvmrc': '20\n', 'pnpm-lock.yaml': LOCK };
const PATCHED = { ...BASE, 'patches/rhachet@1.51.0.patch': '- a\n+ b\n' };

describe('node_modules cache key (#796)', () => {
  // the expected key from node's own md5, so the oracle never shares a tool with the step
  const lockMd5 = createHash('md5').update(LOCK).digest('hex');

  given('[case1] a repo with no patches/ dir', () => {
    when('[t0] the key is computed', () => {
      const run = useBeforeAll(async () => getOneDepsHashRun({ files: BASE, dirs: [] }));

      then('it is the lockfile md5 alone, so extant caches stay warm', () => {
        expect(run.key).toEqual(lockMd5);
      });

      then('the step prints the node version and the key, and hands both to later steps', () => {
        expect(run.stdout).toEqual(`NODE_VERSION=20\nPACKAGE_DEPS_HASH=${lockMd5}\n`);
        expect(run.output).toEqual(`node-version=20\npackage-deps-hash=${lockMd5}\n`);
        expect({ stdout: run.stdout, output: run.output }).toMatchSnapshot('deps-hash step output, no patches');
      });
    });
  });

  given('[case1.1] a repo with an empty patches/ dir', () => {
    when('[t0] the key is computed', () => {
      then('it is the lockfile md5 alone: a dir that holds no patch changes no install', () => {
        expect(getOneDepsHashRun({ files: BASE, dirs: ['patches'] }).key).toEqual(lockMd5);
      });
    });
  });

  given('[case2] a repo that patches a dependency', () => {
    // each key is computed once and shared, so no then block reruns the step
    const keys = useBeforeAll(async () => ({
      base: getOneDepsHash({ files: BASE }),
      patched: getOneDepsHash({ files: PATCHED }),
    }));

    when('[t0] the patch is present', () => {
      then('the key differs from the lockfile-only key', () => {
        expect(keys.patched).not.toEqual(keys.base);
      });
    });

    when('[t1] the patch bytes change', () => {
      then('the key moves', () => {
        const keyAfter = getOneDepsHash({ files: { ...BASE, 'patches/rhachet@1.51.0.patch': '- a\n+ c\n' } });
        expect(keyAfter).not.toEqual(keys.patched);
      });
    });

    when('[t2] a patch is renamed, its bytes unchanged', () => {
      then('the key moves', () => {
        const keyAfter = getOneDepsHash({ files: { ...BASE, 'patches/rhachet@1.52.0.patch': '- a\n+ b\n' } });
        expect(keyAfter).not.toEqual(keys.patched);
      });
    });
  });
});

describe('the output key is a promise kept (#793)', () => {
  const steps = installYml.jobs.pnpm.steps;
  const confirms = steps.filter((step) => /^confirm-\d$/.test(step.id ?? ''));
  const asMissGate = (input: { id: string }) => `steps.${input.id}.outputs.cache-hit != 'true'`;

  given('[case1] the confirm steps after the save', () => {
    when('[t0] the shipped .install.yml is read', () => {
      then('there are four, each a lookup-only restore of the output key', () => {
        expect(confirms.map((step) => step.id)).toEqual(['confirm-1', 'confirm-2', 'confirm-3', 'confirm-4']);
        for (const step of confirms) {
          expect(step.uses).toMatch(/^actions\/cache\/restore@/);
          expect(step.with).toMatchObject({
            key: '${{ steps.cache.outputs.cache-primary-key }}',
            'lookup-only': true,
          });
        }
      });

      then('each confirm runs only on a miss of the install check and of every prior confirm', () => {
        confirms.forEach((step, index) => {
          expect(step.if).toContain(asMissGate({ id: 'cache' }));
          for (const prior of confirms.slice(0, index))
            expect(step.if).toContain(asMissGate({ id: prior.id ?? '' }));
        });
      });

      then('a wait sits before each confirm after the first, and the waits sum to 90s', () => {
        const ids = steps.map((step) => step.id ?? step.name ?? '');
        const waits = confirms.slice(1).map((step) => steps[ids.indexOf(step.id ?? '') - 1]);
        const seconds = waits.map((step) => Number(/^sleep (\d+)$/.exec(step?.run ?? '')?.[1] ?? NaN));
        expect(seconds.every((value) => value > 0)).toEqual(true);
        expect(seconds.reduce((sum, value) => sum + value, 0)).toEqual(90);
      });
    });
  });

  given('[case2] every confirm missed', () => {
    const verdict = steps.find((step) => step.name === 'node-modules cache confirm verdict');

    when('[t0] the verdict gate is read', () => {
      then('the verdict runs only then', () => {
        for (const id of ['cache', ...confirms.map((step) => step.id ?? '')])
          expect(verdict?.if).toContain(asMissGate({ id }));
      });
    });

    when('[t1] the verdict runs', () => {
      then('it fails with exit 1, and names the key, the race, and the fix', () => {
        const res = spawnSync('bash', ['-e', '-c', verdict?.run ?? ''], {
          encoding: 'utf-8',
          env: { ...process.env, CACHE_KEY: 'Linux-node-20-pnpm-abc123' },
        });
        expect(res.status).toEqual(1);
        expect(res.stdout).toContain('💥 MalfunctionError: the node_modules cache key never appeared');
        expect(res.stdout).toContain('key: Linux-node-20-pnpm-abc123');
        expect(res.stdout).toContain('a parallel install won the reserve');
        // a refused save (quota, eviction) is named too, so a rerun that halts again has its next move
        expect(res.stdout).toContain('else the cache refused it (quota, eviction)');
        expect(res.stdout).toContain('fix: rerun');
        expect(res.stdout).toContain("read the save step's own warn");
        expect(res.stdout).toMatchSnapshot('install verdict — key never appeared');
      });
    });
  });

  given('[case3] the test suite consumers of the key', () => {
    // .note = yaml.parse returns any (an external boundary); the cast names only the steps read
    const testYml = yaml.parse(
      fs.readFileSync(path.join(__dirname, 'best-practice/.github/workflows/.test.yml'), 'utf-8'),
    ) as { jobs: Record<string, { steps?: Step[] }> };
    const restores = Object.values(testYml.jobs).flatMap((job) =>
      (job.steps ?? []).filter((step) => step.with?.key === '${{ needs.install.outputs.node-modules-cache-key }}'),
    );

    when('[t0] the shipped .test.yml is read', () => {
      then('each restore fails loud on a miss, never runs with no node_modules', () => {
        expect(restores.length).toBeGreaterThan(0);
        for (const step of restores) expect(step.with?.['fail-on-cache-miss']).toEqual(true);
      });
    });
  });
});
