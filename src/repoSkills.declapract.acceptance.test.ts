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
});
