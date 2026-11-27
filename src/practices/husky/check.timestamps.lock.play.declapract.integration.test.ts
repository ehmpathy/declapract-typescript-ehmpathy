import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { asGitBlobId } from './best-practice/.husky/check.timestamps.lock.sh.declapract';
import { asAsciiDigits } from './.test/asAsciiDigits';

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
    const runLock = () => {
      const res = spawnSync('bash', [lockRel], { cwd: tempDir, encoding: 'utf-8' });
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
          '✋ ConstraintError: .husky/check.timestamps.sh was changed. revert the hook, zero exceptions — remove all timestamps',
        );
        expect(result.stderr).toContain('a privacy leak');
        expect(result.stderr).not.toContain('permadrift');
        expect(asMaskedBlob(result.stderr)).toMatchSnapshot('lock halt output — on disk');
      });

      then('the lock halts with exit 2 when sourced by posix sh, as pre-commit does', () => {
        const result = runLockSourcedBySh();
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('revert the hook, zero exceptions');
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
        // no snapshot here: the byte-equal assert IS the full after-state proof
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
        expect(result.stderr).toContain('unreadable (in the index)');
        expect(result.stderr).not.toContain('was changed');
        expect(asMaskedBlob(result.stderr)).toMatchSnapshot('lock halt output — index unreadable');
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
      then('it holds no skip at all: no file kind, path, or glob (#845)', () => {
        // a clamp on the no-exemption rule: any `case` arm, path glob, or allowlist reddens this
        const skips = hook.match(/^\s*\*[^\n]*\)\s*continue\s*;;/gm) ?? [];
        expect(skips).toEqual([]);
        expect(hook).not.toMatch(/case "\$file" in/);
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

  // vision case=4: an upgrader applies the new hook and its restamped lock, then commits. a clean
  // file passes; an older file with a newly-caught clock halts; the mask is the way through
  given('[case4] a repo upgraded to the new hook and its restamped lock', () => {
    const tempDir = genTempDir({
      slug: 'declapract-husky-timestamps-upgrade',
      clone:
        './src/practices/husky/.test/assets/demo-repo-with-edited-timestamp-hook',
      symlink: [{ at: 'declarations', to: 'src' }],
    });
    const hookRel = '.husky/check.timestamps.sh';
    const lockRel = '.husky/check.timestamps.lock.sh';
    const applyFile = (file: string) =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'husky',
        file,
      });
    // stage one file, as a dev would before `git commit`
    const stageFile = (input: { rel: string; content: string }) => {
      fs.writeFileSync(path.join(tempDir, input.rel), input.content);
      execFileSync('git', ['add', '--', input.rel], { cwd: tempDir });
    };
    // pre-commit runs the lock, then the scan; the first to halt stops the commit
    const runPreCommit = () => {
      const lock = spawnSync('bash', [lockRel], { cwd: tempDir, encoding: 'utf-8' });
      if (lock.status !== 0) return { step: 'lock', code: lock.status, stderr: lock.stderr };
      const scan = spawnSync('bash', [hookRel], { cwd: tempDir, encoding: 'utf-8' });
      return { step: 'scan', code: scan.status, stderr: scan.stderr };
    };

    when('[t0] the upgrade lands and the next commit touches only a clean file', () => {
      const result = useThen('apply hook and lock, stage them and a clean file', async () => {
        await applyFile(lockRel);
        await applyFile(hookRel);
        execFileSync('git', ['init', '-q'], { cwd: tempDir });
        execFileSync('git', ['add', '--', hookRel, lockRel], { cwd: tempDir });
        stageFile({ rel: 'notes.md', content: 'shipped on 2026-11-25\n' });
        return runPreCommit();
      });

      then('the hook on disk is the declared template', () => {
        expect(fs.readFileSync(path.join(tempDir, hookRel), 'utf-8')).toEqual(
          fs.readFileSync(hookTemplatePath, 'utf-8'),
        );
      });
      then('the commit passes both the lock and the scan, silent', () => {
        expect(result.step).toEqual('scan');
        expect(result.code).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });

    when('[t1] the next commit edits an older file that holds a newly-caught clock', () => {
      const result = useThen('stage the older text', async () => {
        stageFile({ rel: 'runbook.md', content: asAsciiDigits('# runbook\n\npaged at １３４２Z\n') });
        return runPreCommit();
      });

      then('the lock passes and the scan halts with exit 2', () => {
        expect(result.step).toEqual('scan');
        expect(result.code).toEqual(2);
      });
      then('the halt names the old line', () => {
        expect(result.stderr).toContain('   └─ runbook.md:3:paged at');
      });
      then('the halt the upgrader sees, its clock masked, matches snapshot', () => {
        // the .snap is itself scanned by this hook, so the clock is masked first
        expect(result.stderr.replace(asAsciiDigits('１３４２Z'), '[timestamp]')).toMatchSnapshot();
      });
    });

    when('[t2] the dev masks the clock and commits again', () => {
      const result = useThen('stage the masked text', async () => {
        stageFile({ rel: 'runbook.md', content: '# runbook\n\npaged at [time]\n' });
        return runPreCommit();
      });

      then('the commit passes both the lock and the scan', () => {
        expect(result.step).toEqual('scan');
        expect(result.code).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });

    when('[t3] the next commit edits a .ts file that reads a log by its stamped name (#845)', () => {
      const result = useThen('stage the .ts file', async () => {
        stageFile({
          rel: 'read.ts',
          content: asAsciiDigits("const log = '.log/run/２０２６-１１-２６T１４-３x-０７-１２３Z.md';\n"),
        });
        return runPreCommit();
      });

      then('the lock passes and the scan halts with exit 2 on the .ts file', () => {
        expect(result.step).toEqual('scan');
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   └─ read.ts:1:');
      });
    });
  });
});
