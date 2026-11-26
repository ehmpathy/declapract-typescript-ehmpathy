import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = the path to one of this repo's own skills
 */
const asSkillPath = (input: { skill: string }): string =>
  path.join(
    __dirname,
    '..',
    '.agent',
    'repo=.this',
    'role=any',
    'skills',
    `${input.skill}.sh`,
  );

/**
 * .what = the hermetic env a skill runs in: no global or system git config, plus any extras
 */
const asSkillEnv = (input: { env: Record<string, string> }): NodeJS.ProcessEnv => ({
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  ...input.env,
});

/**
 * .what = a dir whose `pnpm` runs, via corepack, the pnpm this repo's `packageManager` pins
 * .why  = the walk installs a consumer with pnpm, and a ci test job holds node but no pnpm on PATH;
 *         corepack ships with node, so every host runs one pinned pnpm, never whatever PATH holds
 */
const genPnpmViaCorepack = async (): Promise<{ dir: string; bin: string }> => {
  const pkg = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const pnpmPinned: string = pkg.packageManager ?? MalfunctionError.throw('package.json pins no packageManager');
  const dir = genTempDir({ slug: 'pnpm-via-corepack' });
  const bin = path.join(dir, 'pnpm');
  await fs.writeFile(
    bin,
    [
      '#!/usr/bin/env bash',
      // strict off: a consumer that pins its own packageManager still runs the pnpm this suite pins
      `COREPACK_ENABLE_STRICT=0 COREPACK_ENABLE_DOWNLOAD_PROMPT=0 exec corepack ${pnpmPinned} "$@"`,
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
  const probe = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  if (probe.status !== 0)
    throw new ConstraintError('corepack could not run the pinned pnpm', {
      pnpmPinned,
      stderr: probe.stderr,
      hint: 'install node >= 22, which ships corepack',
    });
  return { dir, bin };
};

/**
 * .what = runs one of this repo's own skills as a human would, and captures what they see
 * .why  = a skill is a contract of stdout, stderr, and exit code; only a real run proves each.
 *         `env` lets a case bound the git search (`GIT_CEILING_DIRECTORIES`), so a dir under
 *         this repo can stand for "no repo", or point git at an absent attr source
 */
const runSkill = (input: {
  skill: string;
  args: string[];
  cwd: string;
  stdin: string | null;
  env: Record<string, string>;
}): { stdout: string; stderr: string; status: number | null } => {
  const result = spawnSync(
    'bash',
    [asSkillPath({ skill: input.skill }), ...input.args],
    {
      cwd: input.cwd,
      input: input.stdin ?? '',
      encoding: 'utf8',
      env: asSkillEnv({ env: input.env }),
    },
  );
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
};

/**
 * .what = runs a skill under a pseudo-terminal, as a human at a shell would, with no pipe
 * .why  = a guard on `-t 0` only fires when stdin is a terminal; util-linux `script` gives the
 *         skill one. a pty merges stdout and stderr into one stream, with crlf line ends
 */
const runSkillOnTerminal = (input: {
  skill: string;
  args: string[];
  cwd: string;
}): { output: string; status: number | null } => {
  // fail fast, and legibly, where the host lacks util-linux `script` (bsd `script` has no -c)
  const probe = spawnSync('script', ['--version'], { encoding: 'utf8' });
  if (probe.error || !`${probe.stdout}`.includes('util-linux'))
    throw new ConstraintError(
      'the pty case needs util-linux `script`, which gives the skill a terminal',
      {
        found: probe.error ? `${probe.error.message}` : `${probe.stdout}`.trim(),
        hint: 'install util-linux (debian: apt install bsdutils; macos: brew install util-linux)',
      },
    );

  const command = ['bash', asSkillPath({ skill: input.skill }), ...input.args]
    .map((part) => `'${part.split("'").join("'\\''")}'`)
    .join(' ');
  const result = spawnSync('script', ['-qec', command, '/dev/null'], {
    cwd: input.cwd,
    encoding: 'utf8',
    env: asSkillEnv({ env: {} }),
  });
  if (result.error)
    throw new MalfunctionError('the pty run of the skill failed to start', {
      error: result.error.message,
    });
  return {
    output: result.stdout.split('\r\n').join('\n'),
    status: result.status,
  };
};

/**
 * .what = writes a `git` shim that fails one subcommand and passes every other to real git
 * .why  = some skill branches only run when git breaks for a reason no real input can cause
 *         portably; the shim reaches them. each use carries a `.mock` / `.why` / `.real` note
 */
const genGitShim = async (input: {
  dir: string;
  subcommand: string;
}): Promise<{ dir: string }> => {
  const gitReal = spawnSync('bash', ['-c', 'command -v git'], {
    encoding: 'utf8',
  }).stdout.trim();
  await fs.mkdir(input.dir, { recursive: true });
  await fs.writeFile(
    path.join(input.dir, 'git'),
    [
      '#!/usr/bin/env bash',
      '# the subcommand is the first arg that is not an option (`git --no-pager diff` → diff)',
      'SUB=""',
      'for ARG in "$@"; do case "$ARG" in -*) ;; *) SUB="$ARG"; break ;; esac; done',
      `if [[ "$SUB" == "${input.subcommand}" ]]; then echo "fatal: simulated failure" >&2; exit 128; fi`,
      `exec "${gitReal}" "$@"`,
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
  return { dir: input.dir };
};

/**
 * .what = masks a temp dir path, as given and as resolved, so a snapshot holds the same text on every host
 * .why  = git prints the resolved path of a linked temp dir, which also names the clock of its birth
 */
const asMasked = (input: { text: string; tempDir: string }): string =>
  input.text
    .split(realpathSync(input.tempDir))
    .join('[tempdir]')
    .split(input.tempDir)
    .join('[tempdir]');

/**
 * .what = the stdout of a skill run as a human reads it, with the bytes that vary per run cut
 * .why  = declapract colors its lines only where the env asks, and prints `> took N seconds`
 *         under a step that runs slow; neither is part of the skill's contract
 */
const asStdoutStable = (input: { stdout: string }): string =>
  stripVTControlCharacters(input.stdout).replace(/^\s*> took [\d.]+ seconds\n/gm, '');

/**
 * .what = proves the contracts of this repo's own skills, `git.attr.get` and
 *         `declapract.self.apply`, through real runs
 * .why  = a skill a human or a robot reaches for must name the fix on every bad input, keep
 *         its exit codes semantic, and (for a reader skill) keep stdout clean to pipe. the
 *         skills sit under `.agent/`, which jest ignores, so the suite sits at the `src/` root
 */
describe('repo skills', () => {
  given('[case1] git.attr.get, in a repo with a collapse line and an override', () => {
    const tempDir = genTempDir({ slug: 'skill-git-attr-get', git: true });
    useBeforeAll(async () => {
      await fs.writeFile(
        path.join(tempDir, '.gitattributes'),
        '*.test.ts linguist-generated\nkeep.test.ts -linguist-generated\n*.lock merge=theirs\n',
      );
      return {};
    });
    const run = (input: {
      args: string[];
      stdin: string | null;
      env?: Record<string, string>;
    }) =>
      runSkill({
        skill: 'git.attr.get',
        args: input.args,
        cwd: tempDir,
        stdin: input.stdin,
        env: input.env ?? {},
      });

    when('[t0] --help is asked', () => {
      then('it prints usage, options, and guarantee to stdout, exit 0', () => {
        const result = run({ args: ['--help'], stdin: null });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('--paths');
        expect(result.stdout).not.toContain('set -euo pipefail');
        expect(result.stdout).not.toMatch(/^#/m); // plain help, no comment markers
        expect(result.stdout).toMatchSnapshot('git.attr.get --help');
      });

      then('the --skill, --repo, and --role args rhx passes are skipped, so help still prints', () => {
        const result = run({
          args: ['--skill', 'git.attr.get', '--repo', '.this', '--role', 'any', '--help'],
          stdin: null,
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual(run({ args: ['--help'], stdin: null }).stdout);
      });
    });

    when('[t1] paths are passed by flag', () => {
      then('stdout holds only git lines, and the banner rides stderr, exit 0', () => {
        const result = run({
          args: [
            '--attr',
            'linguist-generated',
            '--paths',
            'a.test.ts keep.test.ts a.ts',
          ],
          stdin: null,
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual(
          [
            'a.test.ts: linguist-generated: set',
            'keep.test.ts: linguist-generated: unset',
            'a.ts: linguist-generated: unspecified',
            '',
          ].join('\n'),
        );
        expect(result.stderr).toContain('🐚 git.attr.get');
        // the split is never silent: the banner names the count and the @stdin route
        expect(result.stderr).toContain(
          'paths: 3, split on spaces; a path with a space goes via @stdin',
        );
        expect(result.stderr).toMatchSnapshot('git.attr.get banner');
        expect(result.stdout).toMatchSnapshot('git.attr.get stdout — paths by flag');
      });
    });

    when('[t2] paths are piped via @stdin, one with a space', () => {
      then('each path is reported whole, exit 0', () => {
        const result = run({
          args: ['--attr', 'linguist-generated', '--paths', '@stdin'],
          stdin: 'docs/my notes.test.ts\nkeep.test.ts\n',
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual(
          [
            'docs/my notes.test.ts: linguist-generated: set',
            'keep.test.ts: linguist-generated: unset',
            '',
          ].join('\n'),
        );
        expect(result.stderr).toContain('paths: from stdin, one per line');
        expect(result.stdout).toMatchSnapshot('git.attr.get stdout — paths via @stdin');
        expect(result.stderr).toMatchSnapshot('git.attr.get banner — paths via @stdin');
      });
    });

    when('[t10] a spaced path that does not exist is passed via --paths', () => {
      then('it splits into two paths, each reported, and the banner names the count, exit 0', () => {
        const result = run({
          args: ['--attr', 'linguist-generated', '--paths', 'no such.ts'],
          stdin: null,
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual(
          [
            'no: linguist-generated: unspecified',
            'such.ts: linguist-generated: unspecified',
            '',
          ].join('\n'),
        );
        expect(result.stderr).toContain(
          'paths: 2, split on spaces; a path with a space goes via @stdin',
        );
        expect(result.stdout).toMatchSnapshot('git.attr.get stdout — an absent spaced path, split');
        expect(result.stderr).toMatchSnapshot('git.attr.get banner — an absent spaced path, split');
      });
    });

    when('[t9] the path set names no path', () => {
      then('a blank --paths: a ConstraintError that names the fix, before git runs, exit 2', () => {
        const result = run({
          args: ['--attr', 'linguist-generated', '--paths', '   '],
          stdin: null,
        });
        expect(result.status).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain('✋ ConstraintError: --paths named no path');
        expect(result.stderr).not.toContain('MalfunctionError');
        expect(result.stderr).toMatchSnapshot('git.attr.get — a blank --paths');
      });

      then('an empty pipe to @stdin: a ConstraintError that names the fix, exit 2', () => {
        const result = run({
          args: ['--attr', 'linguist-generated', '--paths', '@stdin'],
          stdin: '',
        });
        expect(result.status).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain(
          '✋ ConstraintError: --paths @stdin got no path from the pipe',
        );
        expect(result.stderr).toMatchSnapshot('git.attr.get — an empty pipe to @stdin');
      });
    });

    when('[t8] an attribute that carries a value is asked', () => {
      then('stdout holds the value git computes, exit 0', () => {
        const result = run({
          args: ['--attr', 'merge', '--paths', 'yarn.lock a.ts'],
          stdin: null,
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual(
          ['yarn.lock: merge: theirs', 'a.ts: merge: unspecified', ''].join('\n'),
        );
        expect(result.stdout).toMatchSnapshot('git.attr.get stdout — a value attribute');
      });
    });

    when('[t3] bad input is given', () => {
      const cases = [
        { slug: 'no args', args: [] as string[] },
        { slug: '--attr with no value', args: ['--paths', 'a.ts', '--attr'] },
        { slug: '--paths with no value', args: ['--attr', 'diff', '--paths'] },
        { slug: 'a flag where a value belongs', args: ['--attr', '--paths', 'a.ts'] },
        { slug: 'an unknown option', args: ['--path', 'a.ts'] },
        { slug: 'an invalid attr name', args: ['--attr', '!bad', '--paths', 'a.ts'] },
      ];
      cases.forEach((thisCase) =>
        then(`${thisCase.slug}: a ConstraintError that names the fix, stdout empty, exit 2`, () => {
          const result = run({ args: thisCase.args, stdin: null });
          expect(result.status).toEqual(2);
          expect(result.stdout).toEqual('');
          expect(result.stderr).toContain('✋ ConstraintError:');
          expect(result.stderr).toContain('fix:');
          expect(result.stderr).toMatchSnapshot(`git.attr.get — ${thisCase.slug}`);
        }),
      );
    });

    when('[t4] --paths @stdin is run from a terminal, with no pipe', () => {
      then('a ConstraintError names the pipe to add, before git waits on the terminal, exit 2', () => {
        const result = runSkillOnTerminal({
          skill: 'git.attr.get',
          args: ['--attr', 'linguist-generated', '--paths', '@stdin'],
          cwd: tempDir,
        });
        expect(result.status).toEqual(2);
        expect(result.output).toContain(
          '✋ ConstraintError: --paths @stdin needs paths piped in',
        );
        expect(result.output).toMatchSnapshot('git.attr.get — @stdin on a terminal');
      });
    });

    when('[t5] git itself fails', () => {
      /**
       * .mock = one git subcommand, via a shim on PATH that fails it and passes every other call
       * .why  = once `rev-parse` finds the repo, the attr name is valid, and each path sits in
       *         the repo ([t6] proves the outside path), no real input makes `check-attr` fail;
       *         and a repo broken enough to fail `rev-parse` is not one a test can build
       *         portably. the shim reaches the branch where git breaks for another reason
       * .real = [t1] and [t2] run the real `git check-attr`; [case2] the real `rev-parse` failure
       */
      const shims = useBeforeAll(async () => ({
        checkAttr: (
          await genGitShim({
            dir: path.join(tempDir, '.shim-check-attr'),
            subcommand: 'check-attr',
          })
        ).dir,
        revParse: (
          await genGitShim({
            dir: path.join(tempDir, '.shim-rev-parse'),
            subcommand: 'rev-parse',
          })
        ).dir,
      }));

      then('check-attr fails: a MalfunctionError names the step, exit 1', () => {
        const result = run({
          args: ['--attr', 'linguist-generated', '--paths', 'a.ts'],
          stdin: null,
          env: { PATH: `${shims.checkAttr}:${process.env.PATH}` },
        });
        expect(result.status).toEqual(1);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain('💥 MalfunctionError: git check-attr failed');
        // the full stderr: the banner, git's own message, then the error that points to it
        expect(asMasked({ text: result.stderr, tempDir })).toMatchSnapshot(
          'git.attr.get — git check-attr failed',
        );
      });

      then('rev-parse fails for a reason other than no repo: a MalfunctionError with git\'s message, exit 1', () => {
        const result = run({
          args: ['--attr', 'linguist-generated', '--paths', 'a.ts'],
          stdin: null,
          env: { PATH: `${shims.revParse}:${process.env.PATH}` },
        });
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('fatal: simulated failure');
        expect(result.stderr).toContain('💥 MalfunctionError: git rev-parse failed');
        expect(result.stderr).not.toContain('ConstraintError');
        expect(result.stderr).toMatchSnapshot('git.attr.get — git rev-parse failed');
      });
    });

    when('[t6] a path outside the repo is given', () => {
      then("a ConstraintError, with git's message kept, exit 2", () => {
        const result = run({
          args: ['--attr', 'linguist-generated', '--paths', '/etc/hostname'],
          stdin: null,
        });
        expect(result.status).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain("'/etc/hostname' is outside repository");
        expect(result.stderr).toContain('✋ ConstraintError: a path lies outside this repo');
        // the full stderr: the banner, git's own message, then the error that names the fix
        expect(asMasked({ text: result.stderr, tempDir })).toMatchSnapshot(
          'git.attr.get — a path outside the repo',
        );
      });
    });

    when('[t7] a file with a space is passed via --paths, which splits it', () => {
      useBeforeAll(async () => {
        await fs.mkdir(path.join(tempDir, 'docs'), { recursive: true });
        await fs.writeFile(path.join(tempDir, 'docs', 'my notes.test.ts'), '');
        return {};
      });

      then('a ConstraintError names the @stdin call that keeps it whole, exit 2', () => {
        const result = run({
          args: ['--attr', 'linguist-generated', '--paths', 'docs/my notes.test.ts'],
          stdin: null,
        });
        expect(result.status).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain(
          "✋ ConstraintError: 'docs/my notes.test.ts' holds a space",
        );
        expect(result.stderr).toContain('--paths @stdin');
        expect(result.stderr).toMatchSnapshot('git.attr.get — a path with a space via --paths');
      });
    });
  });

  given('[case2] git.attr.get, outside any git repo', () => {
    const tempDir = genTempDir({ slug: 'skill-git-attr-get-norepo' });

    when('[t0] a valid call is made', () => {
      then('a ConstraintError names the fix, not a raw git fatal, exit 2', () => {
        const result = runSkill({
          skill: 'git.attr.get',
          args: ['--attr', 'diff', '--paths', 'a.ts'],
          cwd: tempDir,
          stdin: null,
          env: { GIT_CEILING_DIRECTORIES: path.dirname(tempDir) },
        });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: not inside a git repo');
        expect(result.stderr).not.toContain('fatal:');
        expect(result.stderr).toMatchSnapshot('git.attr.get — outside a repo');
      });
    });
  });

  given('[case3] declapract.self.apply, in a git repo with no declapract config', () => {
    const tempDir = genTempDir({
      slug: 'skill-declapract-self-apply',
      git: true,
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });
    const run = (input: { args: string[] }) =>
      runSkill({
        skill: 'declapract.self.apply',
        args: input.args,
        cwd: tempDir,
        stdin: null,
        env: {},
      });

    when('[t0] --help is asked', () => {
      then('it prints usage, options, and guarantee to stdout, exit 0', () => {
        const result = run({ args: ['--help'] });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('--build');
        expect(result.stdout).not.toContain('set -euo pipefail');
        expect(result.stdout).not.toMatch(/^#/m); // plain help, no comment markers
        expect(result.stdout).toMatchSnapshot('declapract.self.apply --help');
      });

      then('the --skill, --repo, and --role args rhx passes are skipped, so help still prints', () => {
        const result = run({
          args: ['--skill', 'declapract.self.apply', '--repo', '.this', '--role', 'any', '--help'],
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual(run({ args: ['--help'] }).stdout);
      });
    });

    when('[t1] bad input is given', () => {
      const cases = [
        { slug: 'no args', args: [] as string[] },
        { slug: '--practice with no value', args: ['--file', '.gitattributes', '--practice'] },
        { slug: '--file with no value', args: ['--practice', 'git', '--file'] },
        {
          slug: '--build with no value',
          args: ['--practice', 'git', '--file', '.gitattributes', '--build'],
        },
        { slug: 'a flag where a value belongs', args: ['--practice', '--file', '.gitattributes'] },
        { slug: 'an unknown option', args: ['--practise', 'git'] },
        {
          slug: 'a build mode outside run or skip',
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'later'],
        },
        { slug: 'a --file above the repo root', args: ['--practice', 'git', '--file', '../x'] },
        { slug: 'a --practice of ..', args: ['--practice', '..', '--file', '.gitattributes'] },
        { slug: 'a --practice with a slash', args: ['--practice', 'git/x', '--file', '.gitattributes'] },
        { slug: 'an absolute --file', args: ['--practice', 'git', '--file', '/tmp/x'] },
      ];
      cases.forEach((thisCase) =>
        then(`${thisCase.slug}: a ConstraintError that names the fix, exit 2`, () => {
          const result = run({ args: thisCase.args });
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain('✋ ConstraintError:');
          expect(result.stderr).toContain('fix:');
          expect(result.stderr).toMatchSnapshot(
            `declapract.self.apply — ${thisCase.slug}`,
          );
        }),
      );
    });

    when('[t2] the repo has no declapract.use.yml', () => {
      then('a ConstraintError names the absent config, before any build, exit 2', () => {
        const result = run({
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'run'],
        });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: no declapract.use.yml at the repo root',
        );
        expect(result.stdout).not.toContain('🐢 lets ride...');
        expect(
          asMasked({ text: result.stderr, tempDir }),
        ).toMatchSnapshot('declapract.self.apply — no declapract config');
      });
    });

    /**
     * .what = writes a use config whose declarations hold an empty `git` practice and no use cases
     * .why  = the config and practice checks pass, so the build and the apply each get to run,
     *         and the apply fails for a reason no real practice can cause on demand. idempotent,
     *         so each case that needs it writes it, and no case leans on another's order
     */
    const genConfigWithAbsentPractices = async () => {
      await fs.mkdir(path.join(tempDir, 'declarations', 'practices', 'git'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'declarations', 'declapract.declare.yml'),
        'declare:\n  practices: practices\n  use-cases: useCases.yml\n',
      );
      await fs.writeFile(
        path.join(tempDir, 'declapract.use.yml'),
        "declarations: 'declarations/declapract.declare.yml'\nuseCase: typescript-project\n",
      );
    };

    when('[t3] the build step fails', () => {
      useBeforeAll(async () => genConfigWithAbsentPractices());

      then('a MalfunctionError names the build, exit 1', () => {
        // the temp repo has no package.json, so `npm run build` has no build to run
        const result = run({
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'run'],
        });
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: build failed');
        // sliced at the error: npm's own output above it names a debug log file whose name holds a clock
        expect(
          result.stderr.slice(result.stderr.indexOf('💥')),
        ).toMatchSnapshot('declapract.self.apply — build failed');
      });
    });

    when('[t4] the apply step fails', () => {
      useBeforeAll(async () => genConfigWithAbsentPractices());

      then('a MalfunctionError names the apply, exit 1', () => {
        const result = run({
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'skip'],
        });
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: apply failed');
        // sliced at the error: declapract's own output above it is a stack trace, with this
        // host's install paths, color codes, and the mktemp path of the isolated root
        expect(result.stderr).toContain('UserInputError');
        expect(
          result.stderr.slice(result.stderr.indexOf('💥')),
        ).toMatchSnapshot('declapract.self.apply — apply failed');
      });
    });

    when('[t5] git rev-parse fails for a reason other than no repo', () => {
      /**
       * .mock = `git rev-parse`, via a shim on PATH that fails it and passes every other call
       * .why  = a repo broken enough to fail `rev-parse` for another reason is not one a test
       *         can build portably
       * .real = [case5] runs the real `rev-parse` failure outside a repo
       */
      const shim = useBeforeAll(async () =>
        genGitShim({
          dir: path.join(tempDir, '.shim-rev-parse'),
          subcommand: 'rev-parse',
        }),
      );

      then("a MalfunctionError, with git's message kept, exit 1", () => {
        const result = runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'git', '--file', '.gitattributes'],
          cwd: tempDir,
          stdin: null,
          env: { PATH: `${shim.dir}:${process.env.PATH}` },
        });
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('fatal: simulated failure');
        expect(result.stderr).toContain('💥 MalfunctionError: git rev-parse failed');
        expect(result.stderr).not.toContain('ConstraintError');
        expect(result.stderr).toMatchSnapshot(
          'declapract.self.apply — git rev-parse failed',
        );
      });
    });

    when('[t6] the use config names no declarations path', () => {
      useBeforeAll(async () => {
        await fs.writeFile(
          path.join(tempDir, 'declapract.use.yml'),
          'useCase: typescript-project\n',
        );
      });

      then('a ConstraintError names the absent key, exit 2', () => {
        const result = run({
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'skip'],
        });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: declapract.use.yml names no declarations path',
        );
        expect(result.stderr).toMatchSnapshot(
          'declapract.self.apply — use config names no declarations',
        );
      });
    });

    when('[t7] the use config names a declarations path that holds no declare config', () => {
      useBeforeAll(async () => {
        await fs.writeFile(
          path.join(tempDir, 'declapract.use.yml'),
          "declarations: 'declarations-absent/declapract.declare.yml'\nuseCase: typescript-project\n",
        );
      });

      then('a ConstraintError names the path it read, exit 2', () => {
        const result = run({
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'skip'],
        });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: no declare config at declarations-absent/declapract.declare.yml',
        );
        expect(result.stderr).toMatchSnapshot(
          'declapract.self.apply — declare config absent',
        );
      });
    });

    when('[t8] the declare config names a practices dir that is absent, as before a build', () => {
      useBeforeAll(async () => {
        await fs.mkdir(path.join(tempDir, 'declarations-unbuilt'), { recursive: true });
        await fs.writeFile(
          path.join(tempDir, 'declarations-unbuilt', 'declapract.declare.yml'),
          'declare:\n  practices: dist/practices\n  use-cases: dist/useCases.yml\n',
        );
        await fs.writeFile(
          path.join(tempDir, 'declapract.use.yml'),
          "declarations: 'declarations-unbuilt/declapract.declare.yml'\nuseCase: typescript-project\n",
        );
      });

      then('a ConstraintError names the practice, finds none, and names --build run, exit 2', () => {
        const result = run({
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'skip'],
        });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          "✋ ConstraintError: no practice 'git' in dist/practices, which holds none",
        );
        expect(result.stderr).toContain(
          'fix: rhx declapract.self.apply --practice git --file .gitattributes --build run',
        );
        expect(result.stderr).toMatchSnapshot('declapract.self.apply — no practices found');
      });
    });
  });

  given('[case4] declapract.self.apply, in a repo whose .gitattributes holds the legacy git blocks', () => {
    const tempDir = genTempDir({
      slug: 'skill-declapract-self-apply-legacy',
      clone: './src/practices/git/.test/assets/repo-with-legacy-gitattributes',
      git: true,
      symlink: [
        { at: 'declarations', to: './src/.test/assets/git/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    /**
     * .what = a symlink cycle under .temp/, as leftover test repos leave in a real repo
     * .why  = declapract globs from its root with symlinks followed, and its walk for
     *         .gitignore files honors no .gitignore. an apply rooted in this repo walks the
     *         cycle and never ends (in this repo's own tree it ran out of memory). the skill
     *         applies in an isolated root, so the cycle is never walked; this clamps that
     */
    useBeforeAll(async () => {
      await fs.mkdir(path.join(tempDir, '.temp'), { recursive: true });
      await fs.symlink('..', path.join(tempDir, '.temp', 'loop'));
    });

    when('[t0] the git practice is applied to .gitattributes', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: {},
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout opens with the banner, and closes with the diff stat of the one file', () => {
        const lines = result.stdout.trimEnd().split('\n');
        expect(lines[0]).toEqual('🐢 lets ride...');
        expect(lines[2]).toEqual(
          '🐚 declapract.self.apply --practice git --file .gitattributes --build skip',
        );
        const tail = lines.slice(lines.indexOf('🐢 righteous! applied'));
        expect(tail[0]).toEqual('🐢 righteous! applied');
        // the outcome of this apply, apart from the diff vs HEAD, so a converged file never
        // reads as one this apply rewrote
        expect(tail[1]).toEqual('   ├─ .gitattributes: rewritten');
        expect(tail[2]).toMatch(/^ {3}└─ vs HEAD: 1 file changed/);
      });

      then('the full stdout, banner to close, with the apply output passed through between', () => {
        // whole, as a human reads it, less the bytes that vary per run (see asStdoutStable)
        expect(result.stdout).toContain('  ✓ evaluated practice:git');
        expect(asStdoutStable({ stdout: result.stdout })).toMatchSnapshot(
          'declapract.self.apply — full stdout',
        );
      });

      then('the file now holds the tagged git sections', async () => {
        const contents = await fs.readFile(
          path.join(tempDir, '.gitattributes'),
          'utf-8',
        );
        expect(contents).toContain('# [git] exclude package locks from git diff');
      });
    });

    when('[t1] the apply runs again, and the final git diff fails', () => {
      /**
       * .mock = `git diff`, via a shim on PATH that fails it and passes every other call
       * .why  = a `git diff --stat` of one path in a sound repo does not fail on real input
       * .real = [t0] runs the real `git diff --stat`
       */
      const result = useBeforeAll(async () => {
        const shim = await genGitShim({
          dir: path.join(tempDir, '.shim-diff'),
          subcommand: 'diff',
        });
        return runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: { PATH: `${shim.dir}:${process.env.PATH}` },
        });
      });

      then('a MalfunctionError names the diff, exit 1', () => {
        expect(result.status).toEqual(1);
        // the diff runs before the close prints, so a failed diff leaves no half tree on stdout
        expect(result.stdout).not.toContain('🐢 righteous! applied');
        expect(result.stdout).toContain('  ✓ evaluated practice:git');
        expect(result.stderr).toContain('💥 MalfunctionError: diff failed');
        // the full stderr: git's own message, then the error that points to it
        expect(asMasked({ text: result.stderr, tempDir })).toMatchSnapshot(
          'declapract.self.apply — diff failed',
        );
      });
    });

    when('[t2] the converged file is committed, then the apply runs again', () => {
      const result = useBeforeAll(async () => {
        // commit the converged file, so HEAD and the file agree
        const commit = spawnSync(
          'bash',
          [
            '-c',
            'git add .gitattributes && git -c user.name="Test Human" -c user.email=human@test.com commit -q -m "converge" -- .gitattributes',
          ],
          { cwd: tempDir, encoding: 'utf8', env: asSkillEnv({ env: {} }) },
        );
        if (commit.status !== 0)
          throw new MalfunctionError('the commit of the converged file failed', {
            stderr: commit.stderr,
          });
        return runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: {},
        });
      });

      then('it says the file is unchanged, and that it matches HEAD, exit 0', () => {
        expect(result.status).toEqual(0);
        const lines = result.stdout.trimEnd().split('\n');
        const tail = lines.slice(lines.indexOf('🐢 righteous! applied'));
        expect(tail).toEqual([
          '🐢 righteous! applied',
          '   ├─ .gitattributes: unchanged, already converged',
          '   └─ vs HEAD: no diff',
        ]);
        expect(asStdoutStable({ stdout: result.stdout })).toMatchSnapshot(
          'declapract.self.apply — applied, converged, no diff',
        );
      });
    });
  });

  given('[case7] declapract.self.apply, in a repo with real declarations, asked for aught they do not hold', () => {
    const tempDir = genTempDir({
      slug: 'skill-declapract-self-apply-unheld',
      clone: './src/practices/git/.test/assets/repo-with-legacy-gitattributes',
      git: true,
      symlink: [
        { at: 'declarations', to: './src/.test/assets/git/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    when('[t0] a practice the declarations do not hold is named', () => {
      then('a ConstraintError names the practice and lists the held ones, before the apply, exit 2', () => {
        const result = runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'gitt', '--file', '.gitattributes', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: {},
        });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain("✋ ConstraintError: no practice 'gitt' in practices");
        expect(result.stderr).toContain('   ├─ held practices');
        expect(result.stderr).toContain('   │  ├─ git\n');
        expect(result.stderr).toContain(
          '   └─ fix: rhx declapract.self.apply --practice git --file .gitattributes',
        );
        expect(result.stdout).not.toContain('🐢 righteous! applied');
        expect(result.stderr).toMatchSnapshot('declapract.self.apply — unknown practice');
      });
    });

    when('[t1] a file that no fix of the practice writes is named', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'git', '--file', 'no-such-file.txt', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: {},
        }),
      );

      then('it says the file was absent before and after, never "converged", exit 0', () => {
        expect(result.status).toEqual(0);
        const lines = result.stdout.trimEnd().split('\n');
        const tail = lines.slice(lines.indexOf('🐢 righteous! applied'));
        expect(tail).toEqual([
          '🐢 righteous! applied',
          '   ├─ no-such-file.txt: absent before and after, no fix wrote it',
          '   └─ vs HEAD: no diff, absent at HEAD too',
        ]);
        expect(asStdoutStable({ stdout: result.stdout })).toMatchSnapshot('declapract.self.apply — applied, absent before and after');
      });
    });

    when('[t2] HEAD never held the file, and the apply writes it', () => {
      const result = useBeforeAll(async () => {
        // drop .gitattributes from HEAD, as a repo that never had one
        const drop = spawnSync(
          'bash',
          [
            '-c',
            'git rm -q .gitattributes && git -c user.name="Test Human" -c user.email=human@test.com commit -q -m "drop"',
          ],
          { cwd: tempDir, encoding: 'utf8', env: asSkillEnv({ env: {} }) },
        );
        if (drop.status !== 0)
          throw new MalfunctionError('the drop of .gitattributes from HEAD failed', {
            stderr: drop.stderr,
          });
        return runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: {},
        });
      });

      then('it says the file was written, and that HEAD lacks it, never "no diff", exit 0', () => {
        expect(result.status).toEqual(0);
        const lines = result.stdout.trimEnd().split('\n');
        const tail = lines.slice(lines.indexOf('🐢 righteous! applied'));
        expect(tail).toEqual([
          '🐢 righteous! applied',
          '   ├─ .gitattributes: written',
          '   └─ vs HEAD: new file, absent from HEAD',
        ]);
        expect(asStdoutStable({ stdout: result.stdout })).toMatchSnapshot('declapract.self.apply — applied, written, absent from HEAD');
      });
    });

    when('[t4] a --file in a subdirectory, which no fix touches', () => {
      const result = useBeforeAll(async () => {
        // a nested file, so the copy into the isolated root and back each make its dir
        await fs.mkdir(path.join(tempDir, 'docs', 'deep'), { recursive: true });
        await fs.writeFile(path.join(tempDir, 'docs', 'deep', 'keep.txt'), 'kept\n');
        return runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'git', '--file', 'docs/deep/keep.txt', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: {},
        });
      });

      then('the nested file comes back byte for byte, exit 0', async () => {
        expect(result.status).toEqual(0);
        const lines = result.stdout.trimEnd().split('\n');
        const tail = lines.slice(lines.indexOf('🐢 righteous! applied'));
        expect(tail).toEqual([
          '🐢 righteous! applied',
          '   ├─ docs/deep/keep.txt: unchanged, already converged',
          '   └─ vs HEAD: new file, absent from HEAD',
        ]);
        expect(await fs.readFile(path.join(tempDir, 'docs', 'deep', 'keep.txt'), 'utf-8')).toEqual(
          'kept\n',
        );
        expect(asStdoutStable({ stdout: result.stdout })).toMatchSnapshot(
          'declapract.self.apply — a nested file, untouched',
        );
      });
    });

    when('[t3] declarations: names the dir that holds the declare config, as this repo does', () => {
      const result = useBeforeAll(async () => {
        await fs.writeFile(
          path.join(tempDir, 'declapract.use.yml'),
          'declarations: ./declarations\nuseCase: typescript-project\n',
        );
        return runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'git', '--file', '.gitattributes', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: {},
        });
      });

      then('the dir form finds declapract.declare.yml within, and the apply runs, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('  ✓ evaluated practice:git');
        expect(result.stdout).toContain('   ├─ .gitattributes: unchanged, already converged');
      });
    });
  });

  given('[case6] declapract.self.apply, in a repo that lacks the file, with a build to run', () => {
    const tempDir = genTempDir({
      slug: 'skill-declapract-self-apply-fresh',
      clone: './src/practices/git/.test/assets/repo-with-legacy-gitattributes',
      git: true,
      symlink: [
        { at: 'declarations', to: './src/.test/assets/git/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    /**
     * .what = drops the .gitattributes, gives the repo a build that succeeds, and plants a
     *         deprecated rhachet.use.ts
     * .why  = a repo that lacks the file is the first apply an adopter meets (`written`); the
     *         default `--build run` must succeed end to end; and the rhachet practice's
     *         `deprecated-use-file` fix deletes its file, the one real path to `removed`
     */
    useBeforeAll(async () => {
      await fs.rm(path.join(tempDir, '.gitattributes'));
      await fs.writeFile(
        path.join(tempDir, 'package.json'),
        `${JSON.stringify(
          {
            name: 'test-project-gitattributes',
            version: '1.0.0',
            scripts: { build: 'echo build-ran' },
          },
          null,
          2,
        )}\n`,
      );
      await fs.writeFile(path.join(tempDir, 'rhachet.use.ts'), 'export {};\n');
      return {};
    });

    when('[t0] the git practice is applied with the default build', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'git', '--file', '.gitattributes'],
          cwd: tempDir,
          stdin: null,
          env: {},
        }),
      );

      then('the build runs, the file is written, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('   ├─ build: run');
        expect(result.stdout).toContain('build-ran');
        const lines = result.stdout.trimEnd().split('\n');
        const tail = lines.slice(lines.indexOf('🐢 righteous! applied'));
        expect(tail[1]).toEqual('   ├─ .gitattributes: written');
        // the close only: npm's own lines above it carry warnings that vary with the host's env
        expect(`${tail.join('\n')}\n`).toMatchSnapshot('declapract.self.apply — applied, written');
      });

      then('the file now holds the tagged git sections', async () => {
        const contents = await fs.readFile(path.join(tempDir, '.gitattributes'), 'utf-8');
        expect(contents).toContain('# [git] exclude package locks from git diff');
      });
    });

    when('[t1] the rhachet practice is applied to the deprecated rhachet.use.ts', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'rhachet', '--file', 'rhachet.use.ts', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: {},
        }),
      );

      then('it says the file was removed, exit 0', () => {
        expect(result.status).toEqual(0);
        const lines = result.stdout.trimEnd().split('\n');
        const tail = lines.slice(lines.indexOf('🐢 righteous! applied'));
        expect(tail).toEqual([
          '🐢 righteous! applied',
          '   ├─ rhachet.use.ts: removed',
          '   └─ vs HEAD: no diff, absent at HEAD too',
        ]);
        expect(asStdoutStable({ stdout: result.stdout })).toMatchSnapshot('declapract.self.apply — applied, removed');
      });

      then('the file is gone from the repo', async () => {
        await expect(fs.access(path.join(tempDir, 'rhachet.use.ts'))).rejects.toThrow();
      });
    });

    when('[t2] a committed rhachet.use.ts is removed by the fix', () => {
      const result = useBeforeAll(async () => {
        // plant and commit the file, so its removal shows in the diff vs HEAD
        await fs.writeFile(path.join(tempDir, 'rhachet.use.ts'), 'export {};\n');
        const commit = spawnSync(
          'bash',
          [
            '-c',
            'git add rhachet.use.ts && git -c user.name="Test Human" -c user.email=human@test.com commit -q -m "plant" -- rhachet.use.ts',
          ],
          { cwd: tempDir, encoding: 'utf8', env: asSkillEnv({ env: {} }) },
        );
        if (commit.status !== 0)
          throw new MalfunctionError('the commit of rhachet.use.ts failed', {
            stderr: commit.stderr,
          });
        return runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'rhachet', '--file', 'rhachet.use.ts', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: {},
        });
      });

      then('it says the file was removed, and the diff vs HEAD names the deletion, exit 0', () => {
        expect(result.status).toEqual(0);
        const lines = result.stdout.trimEnd().split('\n');
        const tail = lines.slice(lines.indexOf('🐢 righteous! applied'));
        expect(tail).toEqual([
          '🐢 righteous! applied',
          '   ├─ rhachet.use.ts: removed',
          '   └─ vs HEAD: 1 file changed, 1 deletion(-)',
        ]);
        expect(asStdoutStable({ stdout: result.stdout })).toMatchSnapshot(
          'declapract.self.apply — applied, removed, tracked',
        );
      });
    });
  });

  given('[case5] declapract.self.apply, outside any git repo', () => {
    const tempDir = genTempDir({ slug: 'skill-declapract-self-apply-norepo' });

    when('[t0] a valid call is made', () => {
      then('a ConstraintError names the fix, not a raw git fatal, exit 2', () => {
        const result = runSkill({
          skill: 'declapract.self.apply',
          args: ['--practice', 'git', '--file', '.gitattributes'],
          cwd: tempDir,
          stdin: null,
          env: { GIT_CEILING_DIRECTORIES: path.dirname(tempDir) },
        });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: not inside a git repo');
        expect(result.stderr).not.toContain('fatal:');
        expect(result.stderr).toMatchSnapshot(
          'declapract.self.apply — outside a repo',
        );
      });
    });
  });

  /**
   * .what = a walk's whole report, the tail of each named step masked to one `<tail>` branch
   * .why  = a real tool's tail holds its own last lines (install times, package versions, npm
   *         banners), which vary per run and per host; the mask keeps every line of the walk's own
   *         shape, and a shim's tail, which never varies, stays whole
   */
  const asWalkMasked = (input: { stdout: string; steps: 'all' | string[] }): string =>
    stripVTControlCharacters(input.stdout)
      .split('\n')
      .reduce<{ lines: string[]; isTail: boolean }>(
        (state, line) => {
          // a named step's header opens a tail, unless its first child is the plan's own to-author count
          const step = /^ {3}├─ (\d\.\S+) \(exit/.exec(line)?.[1];
          if (step) return { lines: [...state.lines, line], isTail: input.steps === 'all' || input.steps.includes(step) };
          const isChild = /^ {3}│ {2}/.test(line);
          if (state.isTail && isChild && /^ {3}│ {2}├─ to author:/.test(line)) return { lines: [...state.lines, line], isTail: false };
          if (state.isTail && isChild) {
            const last = state.lines[state.lines.length - 1];
            if (last === '   │  └─ <tail>') return state;
            return { lines: [...state.lines, '   │  └─ <tail>'], isTail: true };
          }
          return { lines: [...state.lines, line], isTail: false };
        },
        { lines: [], isTail: false },
      )
      // a real walk's tsc patch and cycle count vary with the registry; a shim's never do
      .lines.map((line) =>
        input.steps === 'all'
          ? line.replace(/Version 7\.\d+\.\d+/, 'Version 7.<n>.<n>').replace(/7\.cycles \(exit \d/, '7.cycles (exit <n>')
          : line,
      )
      .join('\n');

  given('[case8] declapract.walk, from this repo', () => {
    const repoRoot = path.join(__dirname, '..');

    when('[t0] it is asked for help', () => {
      then('it prints the header through its last guarantee, exit 0', () => {
        const result = runSkill({ skill: 'declapract.walk', args: ['--help'], cwd: repoRoot, stdin: null, env: {} });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('--build     run | skip');
        expect(result.stdout).toContain('exit 0 = every gated step exited 0');
        expect(result.stdout).not.toContain('set -euo pipefail');
        expect(result.stdout).toMatchSnapshot('declapract.walk — help');
      });
    });

    when('[t1] it is given bad input', () => {
      then('an absent --usecase exits 2 and lists the declared usecases', () => {
        const result = runSkill({ skill: 'declapract.walk', args: [], cwd: repoRoot, stdin: null, env: {} });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: --usecase is required');
        expect(result.stderr).toContain('└─ declared usecases');
        expect(result.stderr).toMatchSnapshot('declapract.walk — no usecase');
      });

      then('an undeclared --usecase exits 2 and lists the declared usecases', () => {
        const result = runSkill({ skill: 'declapract.walk', args: ['--usecase', 'nope'], cwd: repoRoot, stdin: null, env: {} });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain("usecase 'nope' is not declared in src/useCases.yml");
        expect(result.stderr).toContain('├─ npm-package');
        expect(result.stderr).toMatchSnapshot('declapract.walk — undeclared usecase');
      });

      then('a --compile or --build that is neither run nor skip exits 2 and shows a value', () => {
        const compile = runSkill({
          skill: 'declapract.walk',
          args: ['--usecase', 'npm-package', '--compile', 'maybe'],
          cwd: repoRoot,
          stdin: null,
          env: {},
        });
        expect(compile.status).toEqual(2);
        expect(compile.stderr).toContain("--compile must be run or skip, got 'maybe'");
        const build = runSkill({
          skill: 'declapract.walk',
          args: ['--usecase', 'npm-package', '--build', 'maybe'],
          cwd: repoRoot,
          stdin: null,
          env: {},
        });
        expect(build.status).toEqual(2);
        expect(build.stderr).toContain("--build must be run or skip, got 'maybe'");
        expect(`${compile.stderr}${build.stderr}`).toMatchSnapshot('declapract.walk — bad run|skip values');
      });

      then('an unknown arg exits 2 and points at --help', () => {
        const result = runSkill({ skill: 'declapract.walk', args: ['--usecases', 'x'], cwd: repoRoot, stdin: null, env: {} });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain("unknown arg '--usecases' (see --help)");
        expect(result.stderr).toMatchSnapshot('declapract.walk — unknown arg');
      });

      then('a value flag with no value exits 2 and names the flag, never a bare exit 1', () => {
        const result = runSkill({ skill: 'declapract.walk', args: ['--usecase'], cwd: repoRoot, stdin: null, env: {} });
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: --usecase needs a value (see --help)');
        expect(result.stderr).toMatchSnapshot('declapract.walk — a flag with no value');
      });

      then('the selectors rhx forwards (--skill, --repo, --role) are skipped, never read as unknown', () => {
        const result = runSkill({
          skill: 'declapract.walk',
          args: ['--skill', 'declapract.walk', '--repo', '.this', '--role', 'any', '--usecase', 'nope'],
          cwd: repoRoot,
          stdin: null,
          env: {},
        });
        // the walk reaches its own usecase check, so each selector was consumed with its value
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain("usecase 'nope' is not declared in src/useCases.yml");
        expect(result.stderr).not.toContain('unknown arg');
      });
    });

    when('[t2] it walks a usecase end to end, on the dist/ the acceptance run just built', () => {
      // --build skip: the acceptance suite builds dist/ first and runs tests from it, so a rebuild here would clear it mid-run
      const result = useBeforeAll(async () => {
        const pnpm = await genPnpmViaCorepack();
        return runSkill({
          skill: 'declapract.walk',
          args: ['--usecase', 'npm-package', '--build', 'skip'],
          cwd: repoRoot,
          stdin: null,
          env: { PATH: `${pnpm.dir}:${process.env.PATH}` },
        });
      });

      then('every gated step exits 0, the apply converges, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('0.build (skipped · --build skip reads the extant dist/)');
        expect(result.stdout).toContain('└─ to fix: 0 files an apply rewrites (FIX_AUTOMATIC)');
        expect(result.stdout).toContain('✨ every gated step exited 0, and the apply converged');
      });

      then('it names the tsc the compile ran, and marks the cycle check as report only', () => {
        expect(result.stdout).toMatch(/├─ tsc: Version 7\.\d+\.\d+/);
        expect(result.stdout).toMatch(/├─ 7\.cycles \(exit \d · report only, never gates\)/);
      });

      then('it keeps the consumer path for a later probe, outside this repo', async () => {
        const consumer = (
          await fs.readFile(path.join(repoRoot, '.log', 'declapract.walk', 'npm-package', 'repo.path'), 'utf8')
        ).trim();
        expect(path.relative(repoRoot, consumer).startsWith('..')).toEqual(true);
      });

      then('the step branches read as snapped', () => {
        expect(asWalkMasked({ stdout: result.stdout, steps: 'all' })).toMatchSnapshot('declapract.walk — the branches of one walk');
      });
    });

    when('[t3] --build skip runs in a repo with no built dist/', () => {
      // a repo that declares the usecase but holds no dist/, so the skip has naught to read
      const tempDir = genTempDir({ slug: 'declapract-walk-no-dist' });
      const result = useBeforeAll(async () => {
        await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
        await fs.writeFile(path.join(tempDir, 'src', 'useCases.yml'), 'use-cases:\n  npm-package:\n    practices: []\n');
        const init = spawnSync('git', ['init', '-q'], { cwd: tempDir, encoding: 'utf8', env: asSkillEnv({ env: {} }) });
        if (init.status !== 0)
          throw new MalfunctionError('git init of the no-dist repo failed', { stderr: init.stderr });
        return runSkill({
          skill: 'declapract.walk',
          args: ['--usecase', 'npm-package', '--build', 'skip'],
          cwd: tempDir,
          stdin: null,
          env: {},
        });
      });

      then('it refuses before any step, names the fix, exit 2', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain('✋ ConstraintError: --build skip needs a built dist/, and dist/useCases.yml is absent');
        expect(result.stderr).toContain('└─ fix: drop --build skip, or run npm run build first');
        expect(result.stderr).toMatchSnapshot('declapract.walk — --build skip with no dist/');
      });
    });

    when('[t4] it walks a usecase with --compile skip', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          skill: 'declapract.walk',
          args: ['--usecase', 'npm-package', '--compile', 'skip', '--build', 'skip'],
          cwd: repoRoot,
          stdin: null,
          env: {},
        }),
      );

      then('the apply converges, and no install, tsc, compile, or cycles step shows, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('🐚 declapract.walk --usecase npm-package --compile skip --build skip');
        expect(result.stdout).toContain('✨ every gated step exited 0, and the apply converged');
        expect(result.stdout).not.toMatch(/5\.install|├─ tsc:|6\.compile|7\.cycles/);
      });

      then('the step branches read as snapped', () => {
        expect(asWalkMasked({ stdout: result.stdout, steps: 'all' })).toMatchSnapshot('declapract.walk — the branches of a walk with --compile skip');
      });
    });
  });

  given('[case9] route.concerns.dispose', () => {
    const tempDir = genTempDir({ slug: 'skill-route-concerns-dispose' });

    /**
     * .what = an `rhx` shim on PATH that answers `route.stone.set` per concern: nitpick.1 records,
     *         nitpick.2 records and halts the stone, nitpick.3 is refused; each call's args are logged
     * .mock = rhx route.stone.set, the call this skill makes once per concern
     * .why  = a real call writes route state and needs a bound route with a live peer review;
     *         the skill's contract is the call it builds and how it reads each answer
     * .real = the driver ran it on this route's 5.1 stone, where every r11 concern was conceded
     */
    const shim = useBeforeAll(async () => {
      const dir = path.join(tempDir, 'bin');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, 'rhx'),
        [
          '#!/usr/bin/env bash',
          'echo "$*" >> "$0.args"',
          'args=" $* "',
          'if [[ "$args" == *" nitpick.2 "* ]]; then echo "so it is. a chance to slow down"; exit 2; fi',
          'if [[ "$args" == *" nitpick.3 "* ]]; then echo "✋ ConstraintError: no concern nitpick.3 on this lane"; exit 2; fi',
          'exit 0',
          '',
        ].join('\n'),
        { mode: 0o755 },
      );
      return { dir, env: { PATH: `${dir}:${process.env.PATH}` } };
    });

    when('[t0] it is asked for help', () => {
      then('it prints the header through its last guarantee, exit 0', () => {
        const result = runSkill({ skill: 'route.concerns.dispose', args: ['--help'], cwd: tempDir, stdin: null, env: {} });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('exit 0 = all recorded, 2 = bad input or any refusal');
        expect(result.stdout).not.toContain('set -euo pipefail');
        expect(result.stdout).toMatchSnapshot('route.concerns.dispose — help');
      });
    });

    when('[t1] it is given bad input', () => {
      const cases = [
        { args: ['--with', 'repo-rules', '--concede', 'nitpick.1', '--severity', 'better'], says: '--stone and --with are required' },
        { args: ['--stone', 's', '--with', 'r'], says: 'name at least one concern via --dispute or --concede' },
        { args: ['--stone', 's', '--with', 'r', '--dispute', 'nitpick.1'], says: '--dispute needs --why <fulcrum-path>' },
        { args: ['--stone', 's', '--with', 'r', '--concede', 'nitpick.1', '--severity', 'meh'], says: "--concede needs --severity better|urgent, got 'meh'" },
        { args: ['--stone', 's', '--with', 'r', '--concede', 'nitpick.1', '--severity', ''], says: '--severity needs a value (see --help)' },
        { args: ['--stone'], says: '--stone needs a value (see --help)' },
        { args: ['--stone', 's', '--with', 'r', '--concede', 'nitpick.1'], says: "--concede needs --severity better|urgent, got ''" },
        { args: ['--stone', 's', '--with', 'r', '--abut', 'x'], says: "unknown arg '--abut' (see --help)" },
      ];
      then('each refusal exits 2 and names what to fix', () => {
        const stderrs = cases.map((thisCase) => {
          const result = runSkill({ skill: 'route.concerns.dispose', args: thisCase.args, cwd: tempDir, stdin: null, env: shim.env });
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain(thisCase.says);
          return result.stderr;
        });
        expect(stderrs.join('')).toMatchSnapshot('route.concerns.dispose — refusals');
      });
    });

    when('[t2] it disposes three concerns, one of which is refused', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          skill: 'route.concerns.dispose',
          args: ['--stone', '5.3.verification', '--with', 'repo-rules', '--dispute', 'nitpick.1', '--why', 'f.md', '--concede', 'nitpick.2 nitpick.3', '--severity', 'better'],
          cwd: tempDir,
          stdin: null,
          env: shim.env,
        }),
      );

      then('it makes one route.stone.set call per concern, each with its disposition', async () => {
        const calls = (await fs.readFile(path.join(shim.dir, 'rhx.args'), 'utf8')).trim().split('\n');
        expect(calls).toEqual([
          'route.stone.set --stone 5.3.verification --as disputed --with repo-rules --about nitpick.1 --why f.md',
          'route.stone.set --stone 5.3.verification --as conceded --with repo-rules --about nitpick.2 --severity better',
          'route.stone.set --stone 5.3.verification --as conceded --with repo-rules --about nitpick.3 --severity better',
        ]);
      });

      then('a halt counts as recorded, a refusal is named with its output, exit 2', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('├─ disputed: nitpick.1');
        expect(result.stdout).toContain('├─ conceded (better): nitpick.2 (recorded; the stone halts until its next --as arrived)');
        expect(result.stdout).toContain('├─ ✋ refused: conceded (better): nitpick.3');
        expect(result.stdout).toContain("└─ ✋ ConstraintError: 1 refused; each refusal's output is on stderr");
        expect(result.stderr).toContain('✋ ConstraintError: route.stone.set refused conceded (better): nitpick.3');
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).not.toContain('└─ done');
        expect(result.stderr).toContain('no concern nitpick.3 on this lane');
        expect(`${result.stdout}--- stderr\n${result.stderr}`).toMatchSnapshot('route.concerns.dispose — one refused');
      });
    });

    when('[t3] it disposes concerns that each record', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          skill: 'route.concerns.dispose',
          args: ['--stone', '5.3.verification', '--with', 'repo-rules', '--concede', 'nitpick.1', '--severity', 'urgent', '--dispute', 'blocker.1', '--why', 'f.md'],
          cwd: tempDir,
          stdin: null,
          env: shim.env,
        }),
      );

      then('each concern reads as recorded, naught on stderr, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('🐢 righteous!');
        expect(result.stdout).toContain('├─ disputed: blocker.1');
        expect(result.stdout).toContain('├─ conceded (urgent): nitpick.1');
        expect(result.stdout).toContain('└─ done');
        expect(result.stderr).toEqual('');
        expect(result.stdout).toMatchSnapshot('route.concerns.dispose — all recorded');
      });
    });

    when('[t4] its last concern records and halts the stone', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          skill: 'route.concerns.dispose',
          args: ['--stone', '5.3.verification', '--with', 'repo-rules', '--concede', 'nitpick.1 nitpick.2', '--severity', 'better'],
          cwd: tempDir,
          stdin: null,
          env: shim.env,
        }),
      );

      then('the halt reads as recorded, never as refused, and the run closes done, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('├─ conceded (better): nitpick.2 (recorded; the stone halts until its next --as arrived)');
        expect(result.stdout).not.toContain('refused');
        expect(result.stdout).toContain('└─ done');
        expect(result.stdout).toContain('🐢 righteous!');
        expect(result.stderr).toEqual('');
        expect(result.stdout).toMatchSnapshot('route.concerns.dispose — the last concern halts the stone');
      });
    });

    when('[t5] it receives the selectors rhx forwards beside its own call', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          skill: 'route.concerns.dispose',
          args: ['--skill', 'route.concerns.dispose', '--repo', '.this', '--role', 'any', '--stone', '5.3.verification', '--with', 'repo-rules', '--concede', 'nitpick.1', '--severity', 'better'],
          cwd: tempDir,
          stdin: null,
          env: shim.env,
        }),
      );

      then('it skips them and records the concern, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('├─ conceded (better): nitpick.1');
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case10] declapract.walk, in a scene whose declapract and pnpm are shims', () => {
    /**
     * .what = a git repo that declares one usecase, holds a built dist/, and shims the tools the walk calls
     * .mock = declapract (plan, apply) and pnpm (install, exec tsc, run test:lint:cycles)
     * .why  = a real walk never builds wrong, never fails to converge, and installs pg-pool only for an
     *         rds usecase whose compile takes minutes; the shims reach each branch on demand
     * .real = [case8] [t2] and [t4] walk `npm-package` through the real declapract, pnpm, and tsc
     */
    const genWalkScene = async (input: {
      slug: string;
      build: string;
      isConverged: boolean;
      manualFiles: string[];
      planFailsOnCall: number | null;
      applyFailsOnCall: number | null;
      installExit: number;
      isTscPresent: boolean;
      compileExit: number;
      cyclesExit: number;
      pgPool: 'unpatched' | 'patched' | null;
    }): Promise<{ root: string; env: Record<string, string> }> => {
      const root = genTempDir({ slug: input.slug });
      const usecases = 'use-cases:\n  demo:\n    practices: []\n';
      await fs.mkdir(path.join(root, 'src'), { recursive: true });
      await fs.mkdir(path.join(root, 'dist'), { recursive: true });
      await fs.writeFile(path.join(root, 'src', 'useCases.yml'), usecases);
      await fs.writeFile(path.join(root, 'dist', 'useCases.yml'), usecases);
      await fs.writeFile(path.join(root, 'declapract.declare.yml'), '');
      await fs.writeFile(
        path.join(root, 'package.json'),
        JSON.stringify({ name: 'walk-scene', version: '1.0.0', private: true, scripts: { build: input.build } }),
      );
      const npmBin = path.join(root, 'node_modules', '.bin');
      await fs.mkdir(npmBin, { recursive: true });
      await fs.writeFile(
        path.join(npmBin, 'declapract'),
        [
          '#!/usr/bin/env bash',
          // count each verb's calls, so a case can fail the first plan or apply, or only the second
          'count="$(( $(cat "$0.$1.count" 2> /dev/null || echo 0) + 1 ))"',
          'echo "$count" > "$0.$1.count"',
          'if [[ "$1" == "plan" ]]; then',
          '  echo "planned"',
          ...input.manualFiles.map((file) => `  echo "  * [FIX_MANUAL] ${file}"`),
          input.isConverged ? '' : '  echo "  * [FIX_AUTOMATIC] package.json"',
          input.planFailsOnCall === null ? '' : `  if [[ "$count" == "${input.planFailsOnCall}" ]]; then echo "plan threw"; exit 1; fi`,
          'fi',
          'if [[ "$1" == "apply" ]]; then',
          '  echo "applied"',
          input.applyFailsOnCall === null ? '' : `  if [[ "$count" == "${input.applyFailsOnCall}" ]]; then echo "apply threw"; exit 1; fi`,
          'fi',
          'exit 0',
          '',
        ].join('\n'),
        { mode: 0o755 },
      );
      // a patched install sits under a `_patch_hash=` dir and drops the `require('pg')` fallback
      const pgPool = {
        unpatched: { dir: 'node_modules/.pnpm/pg-pool@3.7.0/node_modules/pg-pool', body: "const Client = require('pg');" },
        patched: { dir: 'node_modules/.pnpm/pg-pool@3.7.0_patch_hash=abc123/node_modules/pg-pool', body: 'const Client = null;' },
      };
      const pgPoolInstall = input.pgPool ? pgPool[input.pgPool] : null;
      const shimBin = path.join(root, 'shim-bin');
      await fs.mkdir(shimBin, { recursive: true });
      // on a host where `npm` hands off to the `pnpm` on PATH, the walk's `npm --prefix … run build` reaches
      // this shim too; so the shim answers only the walk's own pnpm calls and passes the rest to the real pnpm
      const pnpmReal = (await genPnpmViaCorepack()).bin;
      await fs.writeFile(
        path.join(shimBin, 'pnpm'),
        [
          '#!/usr/bin/env bash',
          `if [[ "$1" != "install" && "$1" != "exec" && "$1" != "run" ]]; then exec ${pnpmReal} "$@"; fi`,
          'args=" $* "',
          pgPoolInstall
            ? `if [[ "$1" == "install" ]]; then mkdir -p '${pgPoolInstall.dir}' && echo "${pgPoolInstall.body}" > '${pgPoolInstall.dir}/index.js'; fi`
            : '',
          `if [[ "$1" == "install" ]]; then echo "pnpm install ran"; exit ${input.installExit}; fi`,
          input.isTscPresent
            ? 'if [[ "$args" == *" --version "* ]]; then echo "Version 7.0.2"; exit 0; fi'
            : 'if [[ "$args" == *" --version "* ]]; then exit 1; fi',
          `if [[ "$args" == *" --noEmit "* ]]; then echo "pnpm exec tsc ran"; exit ${input.compileExit}; fi`,
          `if [[ "$args" == *" test:lint:cycles "* ]]; then echo "pnpm run test:lint:cycles ran"; exit ${input.cyclesExit}; fi`,
          'echo "pnpm $1 ran"',
          'exit 0',
          '',
        ].join('\n'),
        { mode: 0o755 },
      );
      const init = spawnSync('git', ['init', '-q'], { cwd: root, encoding: 'utf8', env: asSkillEnv({ env: {} }) });
      if (init.status !== 0) throw new MalfunctionError('git init of the walk scene failed', { stderr: init.stderr });
      return { root, env: { PATH: `${shimBin}:${process.env.PATH}` } };
    };

    // a scene where every shim succeeds; each case overrides the one branch it reaches
    const WALK_SCENE_CLEAN: Omit<Parameters<typeof genWalkScene>[0], 'slug'> = {
      build: 'echo build-ran',
      isConverged: true,
      manualFiles: [],
      planFailsOnCall: null,
      applyFailsOnCall: null,
      installExit: 0,
      isTscPresent: true,
      compileExit: 0,
      cyclesExit: 0,
      pgPool: null,
    };

    // the build tail is the host's own npm (or the pnpm it hands off to) banner, so it alone varies; every other tail is a shim's
    const WALK_SHIM_STEPS_MASKED = ['0.build'];

    when('[t0] it builds, compiles, and installs pg-pool', () => {
      const result = useBeforeAll(async () => {
        const scene = await genWalkScene({ ...WALK_SCENE_CLEAN, slug: 'walk-scene-pgpool', pgPool: 'unpatched' });
        return runSkill({ skill: 'declapract.walk', args: ['--usecase', 'demo'], cwd: scene.root, stdin: null, env: scene.env });
      });

      then('the build step runs, the pg-pool report shows, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('├─ 0.build (exit 0)');
        expect(result.stdout).toContain('├─ pg-pool (report)');
        expect(result.stdout).toContain('│  ├─ install: pg-pool@3.7.0');
        expect(result.stdout).toContain("│  └─ require('pg') left in index.js: 1");
        expect(result.stdout).toContain('✨ every gated step exited 0, and the apply converged');
      });

      then('the report reads as snapped', () => {
        expect(asWalkMasked({ stdout: result.stdout, steps: WALK_SHIM_STEPS_MASKED })).toMatchSnapshot('declapract.walk — build run, pg-pool report');
      });
    });

    when('[t1] its build fails', () => {
      const result = useBeforeAll(async () => {
        const scene = await genWalkScene({ ...WALK_SCENE_CLEAN, slug: 'walk-scene-buildfail', build: 'exit 3' });
        return runSkill({ skill: 'declapract.walk', args: ['--usecase', 'demo', '--compile', 'skip'], cwd: scene.root, stdin: null, env: scene.env });
      });

      then('it halts at the failed step, names it and its log, exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('├─ 0.build (exit 3)');
        expect(result.stdout).toContain(
          '└─ 💥 MalfunctionError: step 0.build failed; read .log/declapract.walk/demo/0.build.log',
        );
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).not.toMatch(/1\.plan|2\.apply|✨/);
      });

      then('the report reads as snapped', () => {
        expect(asWalkMasked({ stdout: result.stdout, steps: WALK_SHIM_STEPS_MASKED })).toMatchSnapshot('declapract.walk — a failed step');
      });
    });

    when('[t2] its second apply leaves an automatic fix', () => {
      const result = useBeforeAll(async () => {
        const scene = await genWalkScene({ ...WALK_SCENE_CLEAN, slug: 'walk-scene-unconverged', isConverged: false });
        return runSkill({
          skill: 'declapract.walk',
          args: ['--usecase', 'demo', '--compile', 'skip', '--build', 'skip'],
          cwd: scene.root,
          stdin: null,
          env: scene.env,
        });
      });

      then('it counts the fix left, names the final plan log, exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('└─ to fix: 1 file an apply rewrites (FIX_AUTOMATIC)');
        expect(result.stdout).toContain(
          '└─ 💥 MalfunctionError: the apply did not converge: 1 file an apply still rewrites; read .log/declapract.walk/demo/4.plan.final.log',
        );
        expect(result.stdout).toContain('│     └─ package.json');
        expect(result.stdout).not.toContain('✨');
      });

      then('the report reads as snapped', () => {
        expect(asWalkMasked({ stdout: result.stdout, steps: WALK_SHIM_STEPS_MASKED })).toMatchSnapshot('declapract.walk — the apply did not converge');
      });
    });

    when('[t3] its compile fails', () => {
      const result = useBeforeAll(async () => {
        const scene = await genWalkScene({ ...WALK_SCENE_CLEAN, slug: 'walk-scene-compilefail', compileExit: 2 });
        return runSkill({ skill: 'declapract.walk', args: ['--usecase', 'demo', '--build', 'skip'], cwd: scene.root, stdin: null, env: scene.env });
      });

      then('it halts at 6.compile, names it and its log, and runs no cycle check, exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('├─ 5.install (exit 0)');
        expect(result.stdout).toContain('├─ 6.compile (exit 2)');
        expect(result.stdout).toContain(
          '└─ 💥 MalfunctionError: step 6.compile failed; read .log/declapract.walk/demo/6.compile.log',
        );
        expect(result.stdout).not.toMatch(/7\.cycles|✨/);
      });

      then('the report reads as snapped', () => {
        expect(asWalkMasked({ stdout: result.stdout, steps: WALK_SHIM_STEPS_MASKED })).toMatchSnapshot('declapract.walk — a failed compile');
      });
    });

    when('[t4] its cycle check exits 1', () => {
      const result = useBeforeAll(async () => {
        const scene = await genWalkScene({ ...WALK_SCENE_CLEAN, slug: 'walk-scene-cycles', cyclesExit: 1 });
        return runSkill({ skill: 'declapract.walk', args: ['--usecase', 'demo', '--build', 'skip'], cwd: scene.root, stdin: null, env: scene.env });
      });

      then('it reports the cycles exit, and the walk still exits 0, since the check never gates', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('├─ 7.cycles (exit 1 · report only, never gates)');
        expect(result.stdout).toContain('│  └─ pnpm run test:lint:cycles ran');
        expect(result.stdout).toContain('✨ every gated step exited 0, and the apply converged');
      });

      then('the report reads as snapped', () => {
        expect(asWalkMasked({ stdout: result.stdout, steps: WALK_SHIM_STEPS_MASKED })).toMatchSnapshot('declapract.walk — a cycle check that exits 1');
      });
    });

    // each gated step owes its own halt: one call site per step, so each is reached on its own
    const HALT_CASES = [
      { tag: 't5', step: '1.plan', slug: 'walk-scene-planfail', overrides: { planFailsOnCall: 1 }, after: /2\.apply|to author/ },
      { tag: 't6', step: '2.apply', slug: 'walk-scene-applyfail', overrides: { applyFailsOnCall: 1 }, after: /3\.apply\.again/ },
      { tag: 't11', step: '3.apply.again', slug: 'walk-scene-reapplyfail', overrides: { applyFailsOnCall: 2 }, after: /4\.plan\.final/ },
      { tag: 't12', step: '4.plan.final', slug: 'walk-scene-finalplanfail', overrides: { planFailsOnCall: 2 }, after: /did not converge|5\.install/ },
      { tag: 't7', step: '5.install', slug: 'walk-scene-installfail', overrides: { installExit: 1 }, after: /├─ tsc:|6\.compile/ },
    ];
    HALT_CASES.map((thisCase) =>
      when(`[${thisCase.tag}] its ${thisCase.step} step fails`, () => {
        const result = useBeforeAll(async () => {
          const scene = await genWalkScene({ ...WALK_SCENE_CLEAN, slug: thisCase.slug, ...thisCase.overrides });
          return runSkill({ skill: 'declapract.walk', args: ['--usecase', 'demo', '--build', 'skip'], cwd: scene.root, stdin: null, env: scene.env });
        });

        then(`it halts at ${thisCase.step}, names it and its log, and runs no later step, exit 1`, () => {
          expect(result.status).toEqual(1);
          expect(result.stdout).toContain(`├─ ${thisCase.step} (exit 1)`);
          expect(result.stdout).toContain(
            `└─ 💥 MalfunctionError: step ${thisCase.step} failed; read .log/declapract.walk/demo/${thisCase.step}.log`,
          );
          expect(result.stdout).not.toMatch(thisCase.after);
          expect(result.stdout).not.toContain('✨');
        });

        then('the report reads as snapped', () => {
          expect(asWalkMasked({ stdout: result.stdout, steps: WALK_SHIM_STEPS_MASKED })).toMatchSnapshot(`declapract.walk — a failed ${thisCase.step}`);
        });
      }),
    );

    when('[t8] its plans flag files a human must author', () => {
      const result = useBeforeAll(async () => {
        const scene = await genWalkScene({ ...WALK_SCENE_CLEAN, slug: 'walk-scene-manual', manualFiles: ['README.md', 'docs/x.md'] });
        return runSkill({ skill: 'declapract.walk', args: ['--usecase', 'demo', '--build', 'skip', '--compile', 'skip'], cwd: scene.root, stdin: null, env: scene.env });
      });

      then('it lists each file to author under its count, and still exits 0, since a manual fix is no defect', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('├─ to author: 2 files a human writes (FIX_MANUAL)');
        expect(result.stdout).toContain('│  │  ├─ README.md');
        expect(result.stdout).toContain('│  │  └─ docs/x.md');
        expect(result.stdout).toContain('└─ ✨ every gated step exited 0, and the apply converged; 2 files left for a human to author');
      });

      then('the report reads as snapped', () => {
        expect(asWalkMasked({ stdout: result.stdout, steps: WALK_SHIM_STEPS_MASKED })).toMatchSnapshot('declapract.walk — files to author');
      });
    });

    when('[t9] its install holds no tsc', () => {
      const result = useBeforeAll(async () => {
        // with no tsc installed, the compile cannot start either, so it fails as a real one would
        const scene = await genWalkScene({ ...WALK_SCENE_CLEAN, slug: 'walk-scene-notsc', isTscPresent: false, compileExit: 1 });
        return runSkill({ skill: 'declapract.walk', args: ['--usecase', 'demo', '--build', 'skip'], cwd: scene.root, stdin: null, env: scene.env });
      });

      then('it names the tsc as absent, then halts at 6.compile, exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('├─ tsc: absent');
        expect(result.stdout).toContain('└─ 💥 MalfunctionError: step 6.compile failed');
      });

      then('the report reads as snapped', () => {
        expect(asWalkMasked({ stdout: result.stdout, steps: WALK_SHIM_STEPS_MASKED })).toMatchSnapshot('declapract.walk — no tsc installed');
      });
    });

    when('[t10] its install holds a patched pg-pool', () => {
      const result = useBeforeAll(async () => {
        const scene = await genWalkScene({ ...WALK_SCENE_CLEAN, slug: 'walk-scene-pgpool-patched', pgPool: 'patched' });
        return runSkill({ skill: 'declapract.walk', args: ['--usecase', 'demo', '--build', 'skip'], cwd: scene.root, stdin: null, env: scene.env });
      });

      then('the report names the patched install, its hash masked, and 0 requires left, exit 0', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('│  ├─ install: pg-pool@3.7.0_patch_hash=<hash>');
        expect(result.stdout).toContain("│  └─ require('pg') left in index.js: 0");
      });

      then('the report reads as snapped', () => {
        expect(asWalkMasked({ stdout: result.stdout, steps: WALK_SHIM_STEPS_MASKED })).toMatchSnapshot('declapract.walk — a patched pg-pool');
      });
    });
  });
});
