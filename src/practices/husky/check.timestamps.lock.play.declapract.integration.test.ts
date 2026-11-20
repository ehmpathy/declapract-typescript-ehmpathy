import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { asGitBlobId } from './best-practice/.husky/check.timestamps.lock.sh.declapract';

/**
 * .what = end-to-end proof of the timestamp lock: a second husky hook that halts every commit
 *         while .husky/check.timestamps.sh differs from the practice's declared copy
 * .why  = the timestamp hook takes zero exemptions, by design — a timestamp in a tracked file a
 *         privacy leak. a hand edit that softens the hook (here, a
 *         `.goals/*` exemption) must halt loud and say revert, never slip through
 * .how  = clone a demo repo whose hook was hand-softened; apply the husky practice through the real
 *         declapract pipeline; run the lock against the repo before and after the hook is restored
 */

// the declared timestamp hook template
const hookTemplatePath = path.join(
  __dirname,
  'best-practice/.husky/check.timestamps.sh',
);

// mask the blob id so the snapshot vibechecks the shape, not the hook's current bytes
const asMaskedBlob = (text: string): string =>
  text.replace(/[0-9a-f]{40}/g, '[blob]');

describe('check.timestamps.lock', () => {
  given('[case1] the blob id transformer', () => {
    when('[t0] it hashes the declared hook template', () => {
      then('it equals the id `git hash-object` reports for the same file', () => {
        const viaGit = execFileSync('git', ['hash-object', '--', hookTemplatePath], {
          encoding: 'utf-8',
        }).trim();
        const viaFn = asGitBlobId({
          contents: fs.readFileSync(hookTemplatePath, 'utf-8'),
        });
        expect(viaFn).toEqual(viaGit);
      });
    });
  });

  given('[case2] a repo whose timestamp hook was hand-softened with an exemption', () => {
    const tempDir = genTempDir({
      slug: 'declapract-husky-timestamps-lock',
      clone:
        './src/practices/husky/.test/assets/demo-repo-with-edited-timestamp-hook',
      symlink: [{ at: 'declarations', to: 'src' }],
    });
    const hookRel = '.husky/check.timestamps.sh';
    const lockRel = '.husky/check.timestamps.lock.sh';
    const read = (rel: string) => fs.readFileSync(path.join(tempDir, rel), 'utf-8');
    const applyFile = (file: string) =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'husky',
        file,
      });
    const runLock = (input: { env: NodeJS.ProcessEnv } = { env: process.env }) => {
      const res = spawnSync('bash', [lockRel], { cwd: tempDir, encoding: 'utf-8', env: input.env });
      return { code: res.status, stderr: res.stderr };
    };
    // pre-commit is `#!/bin/sh` and SOURCES the lock, so the lock must also hold under posix sh
    const runLockSourcedBySh = () => {
      const res = spawnSync('sh', ['-c', `. ./${lockRel}`, './.husky/pre-commit'], {
        cwd: tempDir,
        encoding: 'utf-8',
      });
      return { code: res.status, stderr: res.stderr };
    };

    when('[t0] the input (before any apply)', () => {
      then('the softened hook carries the exemption, and matches snapshot', () => {
        const before = read(hookRel);
        expect(before).toContain('.goals/*) continue');
        expect(before).toMatchSnapshot('check.timestamps.sh — before');
      });
      then('no lock exists yet', () => {
        expect(fs.existsSync(path.join(tempDir, lockRel))).toEqual(false);
      });
    });

    when('[t1] the lock is applied, the softened hook left in place', () => {
      useThen('apply the lock', async () => {
        await applyFile(lockRel);
        execFileSync('git', ['init', '-q'], { cwd: tempDir });
      });

      then('the lock is stamped with the declared hook blob id, and matches snapshot', () => {
        const lock = read(lockRel);
        expect(lock).not.toContain('__EXPECTED_BLOB__');
        expect(lock).toContain(
          `TIMESTAMPS_LOCK_EXPECTED='${asGitBlobId({ contents: fs.readFileSync(hookTemplatePath, 'utf-8') })}'`,
        );
        expect(asMaskedBlob(lock)).toMatchSnapshot('check.timestamps.lock.sh — after');
      });

      then('the lock halts with exit 2 and says revert, zero exceptions', () => {
        const result = runLock();
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: .husky/check.timestamps.sh was changed. revert the hook\n',
        );
        expect(result.stderr).toContain('a privacy leak');
        expect(result.stderr).not.toContain('permadrift');
        expect(asMaskedBlob(result.stderr)).toMatchSnapshot('lock halt output — on disk');
      });

      then('the lock halts with exit 2 when sourced by posix sh, as pre-commit does', () => {
        const result = runLockSourcedBySh();
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('was changed. revert the hook');
      });
    });

    when('[t2] the hook edit is staged, then reverted on disk only', () => {
      useThen('stage the softened hook, then restore the declared hook on disk', async () => {
        execFileSync('git', ['add', '--', hookRel], { cwd: tempDir });
        fs.copyFileSync(hookTemplatePath, path.join(tempDir, hookRel));
      });

      then('the lock still halts — the index would commit the exemption', () => {
        const result = runLock();
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('in the index');
        expect(asMaskedBlob(result.stderr)).toMatchSnapshot('lock halt output — in the index');
      });
    });

    when('[t3] the practice restores the hook', () => {
      useThen('apply the hook, then stage it', async () => {
        await applyFile(hookRel);
        execFileSync('git', ['add', '--', hookRel], { cwd: tempDir });
      });

      then('the hook equals the declared template, byte for byte', () => {
        // no snapshot here: the template's comments hold example stamps, and a .snap is a tracked
        // file the timestamp hook scans. the byte-equal assert IS the full after-state proof
        const after = read(hookRel);
        expect(after).toEqual(fs.readFileSync(hookTemplatePath, 'utf-8'));
        expect(after).not.toContain('.goals/');
      });

      then('the lock passes with exit 0', () => {
        expect(runLock().code).toEqual(0);
      });

      then('the lock passes with exit 0 when sourced by posix sh, as pre-commit does', () => {
        expect(runLockSourcedBySh().code).toEqual(0);
      });
    });

    when('[t4] the index cannot be read', () => {
      const indexPath = path.join(tempDir, '.git/index');
      const result = useThen('corrupt the index, run the lock, then restore the index', async () => {
        const indexBytes = fs.readFileSync(indexPath);
        fs.writeFileSync(indexPath, 'not an index');
        const outcome = runLock();
        fs.writeFileSync(indexPath, indexBytes);
        return outcome;
      });

      then('the lock halts as a malfunction (exit 1) and names the unreadable index, never reads it as unstaged', () => {
        // the hook may be intact, so the halt blames the index, never asks to revert the hook
        expect(result.code).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError:');
        // the found line names the place as every lock halt does: `on disk` or `in the index`
        expect(result.stderr).toContain('found: unreadable (in the index)');
        expect(result.stderr).not.toContain('was changed');
        // snap the lock's own lines, from its header on; git's `fatal:` line precedes them and varies by git version
        const lockOwnStderr = result.stderr.slice(result.stderr.indexOf('💥'));
        expect(asMaskedBlob(lockOwnStderr)).toMatchSnapshot('lock halt output — index unreadable');
      });
    });

    when('[t4.1] the hook is dropped from the index but kept on disk (#810, #789)', () => {
      const result = useThen('git rm --cached the hook, run the lock, then stage it again', async () => {
        execFileSync('git', ['rm', '-q', '--cached', '--', hookRel], { cwd: tempDir });
        const outcome = runLock();
        execFileSync('git', ['add', '--', hookRel], { cwd: tempDir });
        return outcome;
      });

      then('the lock halts with exit 2, names the absence in the index, and the fix is a git add', () => {
        // a hook absent from the index would drop from the commit, so an empty index read halts
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('found: absent (in the index)');
        expect(result.stderr).toContain('fix: git add .husky/check.timestamps.sh');
        expect(asMaskedBlob(result.stderr)).toMatchSnapshot('lock halt output — absent from the index');
      });
    });

    when('[t4.2] git cannot read the hook on disk (#810, #789, #802)', () => {
      // a git whose `hash-object` read faults, and every other verb is the real git
      // .why = a chmod 000 hook still reads as root (a root ci runner), so the fault is injected
      //        at the read itself, the same under any uid
      const result = useThen('run the lock with a git whose hash-object read faults', async () => {
        const gitReal = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf-8' }).trim();
        const binDir = genTempDir({ slug: 'declapract-husky-lock-faulty-git' });
        fs.writeFileSync(
          path.join(binDir, 'git'),
          [
            '#!/bin/sh',
            'if [ "$1" = "hash-object" ]; then echo "fatal: could not open the hook" >&2; exit 128; fi',
            `exec "${gitReal}" "$@"`,
          ].join('\n'),
          { mode: 0o755 },
        );
        return runLock({ env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` } });
      });

      then('the lock halts as a malfunction (exit 1), never as a hook edit', () => {
        // a failed read yields no id; read as an edit, it would tell the human to revert an intact hook
        expect(result.code).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError:');
        expect(result.stderr).toContain('found: unreadable (on disk)');
        expect(result.stderr).not.toContain('was changed');

        // snap the lock's own lines, from its header on; git's `fatal:` line precedes them
        const lockOwnStderr = result.stderr.slice(result.stderr.indexOf('💥'));
        expect(asMaskedBlob(lockOwnStderr)).toMatchSnapshot('lock halt output — hook on disk unreadable');
      });
    });

    when('[t5] the practice is applied again', () => {
      const before = useThen('read the lock', async () => ({ lock: read(lockRel) }));
      useThen('apply both files a second time', async () => {
        await applyFile(lockRel);
        await applyFile(hookRel);
      });

      then('the second apply is a no-op', () => {
        expect(read(lockRel)).toEqual(before.lock);
        expect(read(hookRel)).toEqual(fs.readFileSync(hookTemplatePath, 'utf-8'));
      });
    });

    when('[t6] the hook is deleted', () => {
      useThen('delete the hook', async () => {
        fs.rmSync(path.join(tempDir, hookRel));
      });

      then('the lock halts with exit 2', () => {
        const result = runLock();
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('absent');
        expect(asMaskedBlob(result.stderr)).toMatchSnapshot('lock halt output — hook absent');
      });
    });
  });

  given('[case3] the declared timestamp hook, read as text', () => {
    const hook = fs.readFileSync(hookTemplatePath, 'utf-8');

    when('[t0] its skip list is inspected', () => {
      then('the only skip is code that computes time: *.ts and *.sh, never a new path', () => {
        // a clamp on the no-exemption rule: any new `case` arm, path glob, or allowlist reddens this
        const skips = hook.match(/^\s*\*[^\n]*\)\s*continue\s*;;/gm) ?? [];
        expect(skips).toEqual(['    *.ts | *.sh) continue ;;']);
      });
      then('it never names permadrift, and it names the privacy reason', () => {
        expect(hook).not.toContain('permadrift');
        expect(hook).toContain('a privacy leak');
      });
      then('it declares, loud, that it takes no exemption', () => {
        expect(hook).toContain('NEVER ADD AN EXEMPTION TO THIS HOOK');
      });
    });
  });
});
