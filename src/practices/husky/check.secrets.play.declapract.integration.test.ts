import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = integration test for the check.secrets husky guard (#514)
 * .why  = proves the guard halts a commit whose staged blob holds a key shape, names the
 *         file + line + shape (never the key), and lets clean files and look-alikes through
 * .note = each fake key is assembled at runtime, so this source file never holds a key shape
 *         itself — a repo that adopts the guard can still commit its own tests
 */

// the guard under test (the distributed best-practice template)
const guardPath = path.join(__dirname, 'best-practice/.husky/check.secrets.sh');

// assemble a fake key from a prefix and a tail of repeated chars
const asFakeKey = (input: { prefix: string; tail: string; length: number }) =>
  input.prefix + input.tail.repeat(input.length);

// build a fresh temp git repo with the given files staged
const genStagedRepo = (files: Record<string, string>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-secrets-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    execFileSync('git', ['add', '--', name], { cwd: dir });
  }
  return dir;
};

/**
 * .what = spawn the guard against a repo; return its exit code + streams
 * .why  = an `env` apart from process.env lets a fault case put a stand-in tool first on PATH
 */
const runGuard = (input: {
  dir: string;
  env?: NodeJS.ProcessEnv;
}): { code: number | null; stdout: string; stderr: string } => {
  const res = spawnSync('bash', [guardPath], {
    cwd: input.dir,
    encoding: 'utf-8',
    env: input.env ?? process.env,
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
};

/**
 * .what = the lines the guard itself printed: stderr from its first `💥` or `✋` header onward
 * .why  = a failed git read streams git's own words (a usage dump, a `fatal:` line) ahead of the
 *         guard's header; those vary by git version, so a snapshot pins only the guard's lines
 */
const asGuardOwnStderr = (input: { stderr: string }): string => {
  const lines = input.stderr.split('\n');
  const headerAt = lines.findIndex((line) => line.startsWith('💥') || line.startsWith('✋'));
  return headerAt === -1 ? '' : lines.slice(headerAt).join('\n');
};

/**
 * .what = an env whose PATH leads with a `grep` that faults (exit 2)
 * .why  = a broken or absent grep must halt the guard as a malfunction, never read as a clean scan
 */
const genEnvWithFaultyGrep = (): NodeJS.ProcessEnv => {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-secrets-bin-'));
  fs.writeFileSync(path.join(binDir, 'grep'), '#!/bin/sh\necho "grep: fault" >&2\nexit 2\n', {
    mode: 0o755,
  });
  return { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
};

/**
 * .what = a repo with one committed 40-line file, then `git mv` of it and an appended line, staged
 * .why  = a moved-and-edited file stages as a rename (R); a file that long keeps git's rename
 *         similarity above 50%, so the rename is real, never a delete plus an add
 */
const genRepoWithRenameAndEdit = (input: { lineAppended: string }): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-guard-rename-'));
  const git = (args: string[]) =>
    execFileSync('git', ['-c', 'user.name=Test Human', '-c', 'user.email=human@test.com', ...args], {
      cwd: dir,
      encoding: 'utf-8',
    });
  git(['init', '-q']);
  const body = Array.from({ length: 40 }, (_, index) => `note line ${index + 1}`).join('\n');
  fs.writeFileSync(path.join(dir, 'notes.md'), `${body}\n`);
  git(['add', '--', 'notes.md']);
  git(['commit', '-q', '--no-verify', '-m', 'notes']);
  git(['mv', 'notes.md', 'moved.md']);
  fs.appendFileSync(path.join(dir, 'moved.md'), `${input.lineAppended}\n`);
  git(['add', '--', 'moved.md']);
  return dir;
};

describe('check.secrets guard', () => {
  given('[case1] a staged debug file that holds a fireworks key (the #514 incident)', () => {
    const key = asFakeKey({ prefix: 'fw_', tail: 'aB3', length: 10 });
    const result = runGuard({
      dir: genStagedRepo({ '.cache/debug.env': `# debug\nFIREWORKS_API_KEY='${key}'\n` }),
    });

    when('[t0] the guard runs', () => {
      then('it halts with exit 2', () => {
        expect(result.code).toEqual(2);
      });
      then('it names the file, the line, and the shape on stderr', () => {
        expect(result.stderr).toContain('✋ ConstraintError: a secret key shape is staged');
        expect(result.stderr).toContain('   ├─ shape: fireworks key');
        expect(result.stderr).toContain('   ├─ file: .cache/debug.env:2');
      });
      then('it never echoes the key itself', () => {
        expect(result.stderr).not.toContain(key);
        expect(result.stdout).not.toContain(key);
      });
      then('the halt output matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot('check.secrets halt output');
      });
    });
  });

  given('[case2] the halt table — each key shape the guard knows', () => {
    const haltTable = [
      { shape: 'aws access key id', line: `id = ${asFakeKey({ prefix: 'AKIA', tail: 'Q7', length: 8 })}` },
      { shape: 'private key block', line: `${'-----BEGIN'} RSA ${'PRIVATE KEY-----'}` },
      { shape: 'github token', line: `token: ${asFakeKey({ prefix: 'ghp_', tail: 'aZ9', length: 13 })}` },
      { shape: 'openai-style key', line: `key=${asFakeKey({ prefix: 'sk-', tail: 'aZ9', length: 10 })}` },
      // an anthropic key also fits the wider openai-style shape; it must be named for its vendor (#789, #802)
      { shape: 'anthropic key', line: `key=${asFakeKey({ prefix: 'sk-' + 'ant-', tail: 'aZ9', length: 10 })}` },
      { shape: 'xai key', line: `XAI_API_KEY=${asFakeKey({ prefix: 'xai-', tail: 'aZ9', length: 10 })}` },
      { shape: 'slack token', line: `hook ${asFakeKey({ prefix: 'xoxb-', tail: '12', length: 8 })}` },
      { shape: 'stripe secret key', line: `STRIPE_KEY=${asFakeKey({ prefix: 'sk_' + 'live_', tail: 'aZ9', length: 8 })}` },
    ];
    haltTable.forEach((row) => {
      when(`[t0] the guard runs on a ${row.shape}`, () => {
        const result = runGuard({ dir: genStagedRepo({ 'config.md': `${row.line}\n` }) });

        then('it halts with exit 2, and names the shape', () => {
          expect(result.code).toEqual(2);
          expect(result.stderr).toContain(`   ├─ shape: ${row.shape}`);
        });

        if (row.shape === 'anthropic key')
          then('the halt output matches snapshot', () => {
            expect(result.stderr).toMatchSnapshot('check.secrets halt output — anthropic key');
          });
      });
    });
  });

  given('[case3] the pass table — values that resemble a key but are not one', () => {
    const passTable = [
      { form: 'a placeholder env line', line: 'FIREWORKS_API_KEY=__set_me__' },
      { form: 'an env read', line: 'const key = process.env.XAI_API_KEY;' },
      { form: 'a short prefix word', line: 'a risk-assessment and a disk-usage report' },
      { form: 'a ci secret ref', line: 'API_KEY: ${{ secrets.API_KEY }}' },
      { form: 'a lockfile integrity hash', line: 'integrity: sha512-Ab3Ab3Ab3Ab3Ab3Ab3Ab3Ab3Ab3Ab3Ab3==' },
    ];
    passTable.forEach((row) => {
      when(`[t0] the guard runs on ${row.form}`, () => {
        const result = runGuard({ dir: genStagedRepo({ 'notes.md': `${row.line}\n` }) });

        then('it allows the commit with exit 0', () => {
          expect(result.code).toEqual(0);
          expect(result.stderr).toEqual('');
        });
      });
    });
  });

  given('[case4] no staged file holds a key', () => {
    when('[t0] the guard runs', () => {
      const result = runGuard({ dir: genStagedRepo({ 'readme.md': 'hello\n' }) });

      then('it allows the commit with exit 0', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case5] git cannot list the staged files (#802)', () => {
    when('[t0] the guard runs outside a git repo', () => {
      const result = runGuard({ dir: fs.mkdtempSync(path.join(os.tmpdir(), 'check-secrets-nogit-')) });

      then('it halts as a malfunction (exit 1) that names the failed step, never passes', () => {
        expect(result.code).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: check.secrets could not list the staged files');
        expect(asGuardOwnStderr({ stderr: result.stderr })).toMatchSnapshot(
          'check.secrets malfunction — staged list',
        );
      });
    });
  });

  given('[case6] the scan itself faults (#789)', () => {
    when('[t0] the guard runs with a grep that exits 2', () => {
      const result = runGuard({
        dir: genStagedRepo({ 'readme.md': 'hello\n' }),
        env: genEnvWithFaultyGrep(),
      });

      then('it halts as a malfunction (exit 1), never reads the fault as clean', () => {
        // the guard reads grep's own exit, so a fault halts rather than reads as a clean scan
        expect(result.code).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: check.secrets could not scan for the');
        expect(result.stderr).toContain('   ├─ file: readme.md');
        expect(asGuardOwnStderr({ stderr: result.stderr })).toMatchSnapshot('check.secrets malfunction — scan');
      });
    });
  });

  given('[case7] a staged file whose blob git cannot read (#802)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'notes.md': 'no key here\n' });
      const sha = execFileSync('git', ['rev-parse', ':notes.md'], { cwd: dir, encoding: 'utf-8' }).trim();
      fs.rmSync(path.join(dir, '.git/objects', sha.slice(0, 2), sha.slice(2)));
      const result = runGuard({ dir });

      then('it halts as a malfunction (exit 1) that names the file, never reads the blob as clean', () => {
        expect(result.code).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: check.secrets could not read the staged blob');
        expect(result.stderr).toContain('   ├─ file: notes.md');
        expect(asGuardOwnStderr({ stderr: result.stderr })).toMatchSnapshot(
          'check.secrets malfunction — staged blob',
        );
      });
    });
  });

  given('[case8] a moved file, edited to hold a key, staged as a rename', () => {
    const key = asFakeKey({ prefix: 'sk-' + 'ant-', tail: 'aZ9', length: 10 });
    const dir = genRepoWithRenameAndEdit({ lineAppended: `ANTHROPIC_API_KEY=${key}` });

    when('[t0] the guard runs', () => {
      const result = runGuard({ dir });

      then('git does stage it as a rename, so the case is real', () => {
        const status = execFileSync('git', ['diff', '--cached', '--name-status'], { cwd: dir, encoding: 'utf-8' });
        expect(status).toMatch(/^R\d+\tnotes\.md\tmoved\.md$/m);
      });
      then('it halts with exit 2 and names the moved file and the line, never the key', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   ├─ file: moved.md:41');
        expect(result.stderr).not.toContain(key);
        expect(result.stderr).toMatchSnapshot('check.secrets halt output — rename');
      });
    });
  });

  given('[case9] the whole pre-commit chain, under sh, in a checkout that never ran `husky install`', () => {
    /**
     * .what = a repo whose .husky/ holds this repo's own self-applied hooks (stamped lock included)
     *         and no `.husky/_/`, as in a fresh worktree; the chain runs as git runs it, under sh
     * .why  = husky 8 points git at .husky/, so a fresh checkout still runs pre-commit; the chain
     *         must gate there too, never pass because husky's runner was not yet written
     */
    const genRepoWithHuskyChain = (input: { files: Record<string, string> }): string => {
      const hooks = ['pre-commit', 'check.yalc.sh', 'check.timestamps.lock.sh', 'check.timestamps.sh', 'check.secrets.sh'];
      const huskyRoot = path.join(__dirname, '../../../.husky');
      const hookFiles = Object.fromEntries(
        hooks.map((hook) => [`.husky/${hook}`, fs.readFileSync(path.join(huskyRoot, hook), 'utf-8')]),
      );
      return genStagedRepo({ ...hookFiles, ...input.files });
    };
    const runChain = (input: { dir: string }) => {
      const res = spawnSync('sh', ['.husky/pre-commit'], { cwd: input.dir, encoding: 'utf-8' });
      return { code: res.status, stdout: res.stdout, stderr: res.stderr };
    };

    when('[t0] a staged key', () => {
      const key = asFakeKey({ prefix: 'sk-' + 'ant-', tail: 'aZ9', length: 10 });
      const dir = genRepoWithHuskyChain({ files: { 'notes.md': `ANTHROPIC_API_KEY=${key}\n` } });
      const result = runChain({ dir });

      then('the checkout truly lacks husky\'s runner, so the case is real', () => {
        expect(fs.existsSync(path.join(dir, '.husky/_/husky.sh'))).toEqual(false);
      });
      then('the chain still halts the commit with exit 2 at the secrets scan', () => {
        expect(result.code).toEqual(2);
        expect(result.stdout).not.toContain('husky not available');
        expect(result.stderr).toContain('notes.md:1');
        expect(result.stderr).not.toContain(key);
      });
    });

    when('[t1] a clean stage', () => {
      const dir = genRepoWithHuskyChain({ files: { 'notes.md': 'a calm note\n' } });
      const result = runChain({ dir });

      then('the chain passes silent, with exit 0, through every check', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });
  });
});
