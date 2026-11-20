import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = integration test for the check.yalc husky guard (#808)
 * .why  = proves references halt (exit 2), a broken yalc halts as a malfunction (exit 1), and an
 *         absent yalc stays silent and falls through, so the checks sourced after it still run
 * .how  = a temp dir with a stand-in `node_modules/.bin/yalc` that mimics the real contract:
 *         `yalc check` prints `Yalc dependencies found:` to stdout and exits 1 on references
 *         (node_modules/yalc/src/check.js), and exits 1 with no such line when it crashes.
 *         case8 runs this repo's own real yalc, so a drift in that contract reddens here
 */

// the guard under test (the distributed best-practice template)
const guardPath = path.join(__dirname, 'best-practice/.husky/check.yalc.sh');

/**
 * .what = a repo dir whose yalc stand-in runs the given body, or that holds no yalc at all
 * .why  = the hook gates on `node_modules/.bin/yalc`, so the stand-in sits there; its body sets
 *         which yalc outcome a case meets (references found, a crash, a clean check)
 */
const genRepoWithYalc = (input: { yalc: string | null }): string => {
  // a git repo, as pre-commit always runs in one; the guard reads its index first
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-yalc-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  if (input.yalc === null) return dir;
  const binDir = path.join(dir, 'node_modules/.bin');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(path.join(binDir, 'yalc'), `#!/bin/sh\n${input.yalc}\n`, { mode: 0o755 });
  return dir;
};

/**
 * .what = a git repo with no yalc installed, whose STAGED package.json holds a yalc link while the
 *         file on disk was cleaned after the stage (the fix run, never re-staged)
 * .why  = the commit carries the index, so only a read of the index can see the link; no node, no yalc
 */
const genRepoWithStagedYalcLink = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-yalc-staged-'));
  const git = (args: string[]) =>
    spawnSync('git', ['-c', 'user.name=Test Human', '-c', 'user.email=human@test.com', ...args], {
      cwd: dir,
      encoding: 'utf-8',
    });
  git(['init', '-q']);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ dependencies: { 'my-pkg': 'file:.yalc/my-pkg' } }, null, 2),
  );
  git(['add', 'package.json']);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { 'my-pkg': '1.2.3' } }, null, 2));
  return dir;
};

/**
 * .what = source the guard from posix sh, as pre-commit does, then echo a marker if control falls through
 * .why  = an `exit` in a sourced file ends pre-commit, so the marker proves a pass lets the next check run
 */
const runGuardSourced = (input: {
  dir: string;
  env?: NodeJS.ProcessEnv;
}): { code: number | null; stdout: string; stderr: string } => {
  const res = spawnSync('sh', ['-c', `. "${guardPath}"; echo 'fell through'`], {
    cwd: input.dir,
    encoding: 'utf-8',
    env: input.env ?? process.env,
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
};

/**
 * .what = an env whose PATH leads with a git that faults on `show`, and is the real git for every other verb
 * .why  = a staged package.json whose blob git cannot read must halt as a malfunction, never read as clean
 */
const genEnvWithGitShowFault = (): NodeJS.ProcessEnv => {
  const gitReal = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf-8' }).stdout.trim();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-yalc-faulty-git-'));
  fs.writeFileSync(
    path.join(binDir, 'git'),
    ['#!/bin/sh', 'if [ "$1" = "show" ]; then echo "fatal: could not read the blob" >&2; exit 128; fi', `exec "${gitReal}" "$@"`].join('\n'),
    { mode: 0o755 },
  );
  return { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
};

/**
 * .what = the lines the guard itself printed: stderr from its first `💥` or `✋` header onward
 * .why  = git's own `fatal:` line precedes the header and varies by git version
 */
const asGuardOwnStderr = (input: { stderr: string }): string => input.stderr.slice(Math.max(0, input.stderr.search(/💥|✋/u)));

describe('check.yalc guard', () => {
  given('[case1] package.json holds yalc references', () => {
    when('[t0] the guard runs', () => {
      const result = runGuardSourced({
        dir: genRepoWithYalc({
          yalc: `echo "Yalc dependencies found: [ 'my-pkg' ]"\nexit 1`,
        }),
      });

      then('it halts with exit 2 and a qualified constraint header, before later checks', () => {
        // a yalc link points at a folder only this machine holds, so a notice alone would let it commit
        expect(result.code).toEqual(2);
        expect(result.stdout).not.toContain('fell through');
        expect(result.stderr).toContain('✋ ConstraintError: package.json has yalc references');
        expect(result.stderr).toContain('fix: npx yalc remove --all');
        expect(result.stderr).toContain("yalc said: Yalc dependencies found: [ 'my-pkg' ]");
        expect(result.stderr).toMatchSnapshot('check.yalc halt output — references');
      });
    });
  });

  given('[case2] yalc itself is broken', () => {
    when('[t0] the guard runs', () => {
      const result = runGuardSourced({
        dir: genRepoWithYalc({ yalc: `echo "Error: cannot read package.json" >&2\nexit 1` }),
      });

      then('it halts as a malfunction (exit 1), never reads the failure as no references', () => {
        // a yalc crash prints no references, so the hook reads the exit and the output, never the output alone
        expect(result.code).toEqual(1);
        expect(result.stdout).not.toContain('fell through');
        expect(result.stderr).toContain('💥 MalfunctionError: yalc check failed');
        expect(result.stderr).toContain('cannot read package.json');
        expect(result.stderr).toMatchSnapshot('check.yalc halt output — broken yalc');
      });
    });
  });

  given('[case3] yalc finds no references', () => {
    when('[t0] the guard runs', () => {
      const result = runGuardSourced({ dir: genRepoWithYalc({ yalc: 'exit 0' }) });

      then('it passes silent and falls through to the next check', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual('fell through\n');
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case4] yalc is not installed', () => {
    when('[t0] the guard runs', () => {
      const result = runGuardSourced({ dir: genRepoWithYalc({ yalc: null }) });

      then('it passes silent, with no notice, and falls through to the next check', () => {
        // no package.json is staged, so there is no index blob to read; with no yalc there is no link to check
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual('fell through\n');
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case5] the staged package.json holds a yalc link, the file on disk does not, and yalc is not installed', () => {
    when('[t0] the guard runs', () => {
      const result = runGuardSourced({ dir: genRepoWithStagedYalcLink() });

      then('it halts with exit 2, names the staged spec, and names the re-stage in its fix', () => {
        // the commit carries the index: a link cleaned on disk but still staged would commit
        expect(result.code).toEqual(2);
        expect(result.stdout).not.toContain('fell through');
        expect(result.stderr).toContain('✋ ConstraintError: the staged package.json has yalc references');
        expect(result.stderr).toContain('found: "my-pkg": "file:.yalc/my-pkg"');
        expect(result.stderr).toContain('fix: npx yalc remove --all && git add package.json');
        expect(result.stderr).toMatchSnapshot('check.yalc halt output — staged link');
      });
    });
  });

  given('[case6] git cannot read its index (the guard runs outside a git repo)', () => {
    when('[t0] the guard runs', () => {
      const result = runGuardSourced({ dir: fs.mkdtempSync(path.join(os.tmpdir(), 'check-yalc-nogit-')) });

      then('it halts as a malfunction (exit 1) that names the index, never reads it as no package.json', () => {
        // a failed index read cannot tell "none staged" from "git is broken", so it halts
        expect(result.code).toEqual(1);
        expect(result.stdout).not.toContain('fell through');
        expect(result.stderr).toContain('💥 MalfunctionError: check.yalc could not read the index');
        expect(asGuardOwnStderr({ stderr: result.stderr })).toMatchSnapshot('check.yalc malfunction — index');
      });
    });
  });

  given('[case7] a package.json is staged, and git cannot read its blob', () => {
    when('[t0] the guard runs', () => {
      const result = runGuardSourced({ dir: genRepoWithStagedYalcLink(), env: genEnvWithGitShowFault() });

      then('it halts as a malfunction (exit 1) that names the staged package.json, never reads it as clean', () => {
        // an empty read reaches grep as no specs, so the read status, not the grep, decides
        expect(result.code).toEqual(1);
        expect(result.stdout).not.toContain('fell through');
        expect(result.stderr).toContain('💥 MalfunctionError: check.yalc could not read the staged package.json');
        expect(result.stderr).toContain('fix: repair git (git show :package.json names the fault)');
        expect(asGuardOwnStderr({ stderr: result.stderr })).toMatchSnapshot('check.yalc malfunction — staged blob');
      });
    });
  });

  given('[case7.1] a package.json is staged, and grep faults as it scans the blob', () => {
    /**
     * .what = an env whose PATH leads with a grep that always exits 2, the status grep gives on a fault
     * .why  = exit 1 means "no match"; any status above it is a fault, which must halt, never read as clean
     */
    const genEnvWithGrepFault = (): NodeJS.ProcessEnv => {
      const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-yalc-faulty-grep-'));
      fs.writeFileSync(path.join(binDir, 'grep'), '#!/bin/sh\necho "grep: read error" >&2\nexit 2\n', { mode: 0o755 });
      return { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
    };

    when('[t0] the guard runs', () => {
      const result = runGuardSourced({ dir: genRepoWithStagedYalcLink(), env: genEnvWithGrepFault() });

      then('it halts as a malfunction (exit 1) that names grep as the tool to repair', () => {
        expect(result.code).toEqual(1);
        expect(result.stdout).not.toContain('fell through');
        expect(result.stderr).toContain('💥 MalfunctionError: check.yalc could not read the staged package.json');
        expect(result.stderr).toContain('fix: repair grep (git show :package.json | grep -E file:.yalc names the fault)');
        expect(asGuardOwnStderr({ stderr: result.stderr })).toMatchSnapshot('check.yalc malfunction — grep');
      });
    });
  });

  given('[case8] the real yalc cli, installed, over an unstaged package.json', () => {
    /**
     * .what = a git repo whose package.json (never staged) holds the given deps, with this repo's
     *         own yalc linked in as `node_modules/.bin/yalc`
     * .why  = the guard's contract is with the real `yalc check`: its exit and its printed line
     */
    const genRepoWithYalcReal = (input: { dependencies: Record<string, string> }): string => {
      const dir = genRepoWithYalc({ yalc: null });
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'surf', dependencies: input.dependencies }, null, 2));
      // pnpm's bin shim finds its package relative to its own path, so the real bin is exec'd, never symlinked
      fs.mkdirSync(path.join(dir, 'node_modules/.bin'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'node_modules/.bin/yalc'),
        `#!/bin/sh\nexec "${path.join(__dirname, '../../../node_modules/.bin/yalc')}" "$@"\n`,
        { mode: 0o755 },
      );
      return dir;
    };

    when('[t0] package.json links a dep through .yalc/', () => {
      const result = runGuardSourced({ dir: genRepoWithYalcReal({ dependencies: { 'my-pkg': 'file:.yalc/my-pkg' } }) });

      then('it halts with exit 2, and the found line carries the real yalc output', () => {
        expect(result.code).toEqual(2);
        expect(result.stdout).not.toContain('fell through');
        expect(result.stderr).toContain('✋ ConstraintError: package.json has yalc references');
        // the real yalc colors its line; the codes wrap the phrase and never split it, so the guard's match holds
        const stderrPlain = result.stderr.replace(/\u001b\[[0-9;]*m/g, '');
        expect(stderrPlain).toContain("yalc said: Yalc dependencies found: [ 'my-pkg' ]");
      });
    });

    when('[t1] package.json links no dep through .yalc/', () => {
      const result = runGuardSourced({ dir: genRepoWithYalcReal({ dependencies: { 'my-pkg': '1.2.3' } }) });

      then('it passes silent and falls through to the next check', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual('fell through\n');
        expect(result.stderr).toEqual('');
      });
    });
  });
});
