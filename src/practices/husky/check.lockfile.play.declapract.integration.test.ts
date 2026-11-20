import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = integration test for the check.lockfile husky reminder (#802)
 * .why  = proves the install reminder shows when a lockfile changed, stays silent when none did,
 *         and still shows (with its reason named) where the reflog holds no prior HEAD
 */

// the reminder under test (the distributed best-practice template)
const hookPath = path.join(__dirname, 'best-practice/.husky/check.lockfile.sh');

/**
 * .what = commit the given files into a repo dir, with a fixed fake identity
 * .why  = each commit moves HEAD, so the reminder's `HEAD@{1}` diff has a prior head to read
 */
const setCommit = (input: { dir: string; files: Record<string, string> }) => {
  for (const [name, content] of Object.entries(input.files)) {
    fs.writeFileSync(path.join(input.dir, name), content);
    execFileSync('git', ['add', '--', name], { cwd: input.dir });
  }
  execFileSync(
    'git',
    ['-c', 'user.name=Test Human', '-c', 'user.email=human@example.com', 'commit', '-q', '-m', 'x'],
    { cwd: input.dir },
  );
};

/**
 * .what = a fresh repo with one commit that holds a lockfile
 * .why  = its reflog holds no HEAD@{1}, the state of a fresh clone, where the diff cannot run
 */
const genRepoWithOneCommit = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-lockfile-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  setCommit({ dir, files: { 'pnpm-lock.yaml': 'lockfileVersion: 9\n', 'readme.md': 'hi\n' } });
  return dir;
};

/**
 * .what = source the reminder from posix sh, as the post-* hooks do
 * .why  = a sourced file runs in its caller's shell, so the proof must run the shell husky runs
 */
const runHook = (input: { dir: string }): { code: number | null; stdout: string } => {
  const res = spawnSync('sh', ['-c', `. "${hookPath}"`], { cwd: input.dir, encoding: 'utf-8' });
  return { code: res.status, stdout: res.stdout };
};

describe('check.lockfile reminder', () => {
  given('[case1] a fresh clone whose reflog holds no prior HEAD', () => {
    when('[t0] the reminder runs', () => {
      const result = runHook({ dir: genRepoWithOneCommit() });

      then('the reminder still shows for the present lockfile, with the reason named', () => {
        // with no prior head to diff, every present lockfile may be new, so the reminder still shows
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain(
          '📦 pnpm-lock.yaml may have changed (no prior HEAD in the reflog to compare)',
        );
        expect(result.stdout).not.toContain('package-lock.json');
        expect(result.stdout).toMatchSnapshot('check.lockfile reminder — no prior head');
      });
    });
  });

  given('[case2] a commit that changed the lockfile', () => {
    when('[t0] the reminder runs', () => {
      const dir = genRepoWithOneCommit();
      setCommit({ dir, files: { 'pnpm-lock.yaml': 'lockfileVersion: 9\npackages: {}\n' } });
      const result = runHook({ dir });

      then('the reminder shows that the lockfile changed', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual(
          "📦 pnpm-lock.yaml changed. Run 'pnpm install' to update your locally installed dependencies.\n",
        );
        expect(result.stdout).toMatchSnapshot('check.lockfile reminder — changed');
      });
    });
  });

  given('[case3] a commit that left the lockfile alone', () => {
    when('[t0] the reminder runs', () => {
      const dir = genRepoWithOneCommit();
      setCommit({ dir, files: { 'readme.md': 'hello\n' } });
      const result = runHook({ dir });

      then('the reminder stays silent', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual('');
      });
    });
  });

  given('[case4] an npm repo, whose lockfile is package-lock.json', () => {
    when('[t0] a commit changes package-lock.json', () => {
      const dir = genRepoWithOneCommit();
      setCommit({ dir, files: { 'package-lock.json': '{ "lockfileVersion": 3 }\n' } });
      setCommit({ dir, files: { 'package-lock.json': '{ "lockfileVersion": 3, "packages": {} }\n' } });
      const result = runHook({ dir });

      then('the reminder names package-lock.json and npm install, and never pnpm', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual(
          "📦 package-lock.json changed. Run 'npm install' to update your locally installed dependencies.\n",
        );
        expect(result.stdout).toMatchSnapshot('check.lockfile reminder — package-lock changed');
      });
    });

    when('[t1] a fresh clone of it, whose reflog holds no prior HEAD', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-lockfile-'));
      execFileSync('git', ['init', '-q'], { cwd: dir });
      setCommit({ dir, files: { 'package-lock.json': '{ "lockfileVersion": 3 }\n' } });
      const result = runHook({ dir });

      then('the reminder names package-lock.json and npm install, with the reason named', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual(
          "📦 package-lock.json may have changed (no prior HEAD in the reflog to compare). Run 'npm install' to update your locally installed dependencies.\n",
        );
        expect(result.stdout).toMatchSnapshot('check.lockfile reminder — package-lock, no prior head');
      });
    });
  });
});
