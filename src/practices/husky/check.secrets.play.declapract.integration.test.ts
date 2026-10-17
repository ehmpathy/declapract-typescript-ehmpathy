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

// spawn the guard against a repo; return its exit code + streams
const runGuard = (
  dir: string,
): { code: number | null; stdout: string; stderr: string } => {
  const res = spawnSync('bash', [guardPath], { cwd: dir, encoding: 'utf-8' });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
};

describe('check.secrets guard', () => {
  given('[case1] a staged debug file that holds a fireworks key (the #514 incident)', () => {
    const key = asFakeKey({ prefix: 'fw_', tail: 'aB3', length: 10 });
    const result = runGuard(
      genStagedRepo({ '.cache/debug.env': `# debug\nFIREWORKS_API_KEY='${key}'\n` }),
    );

    when('[t0] the guard runs', () => {
      then('it halts with exit 2', () => {
        expect(result.code).toEqual(2);
      });
      then('it names the file, the line, and the shape on stderr', () => {
        expect(result.stderr).toContain('✋ ConstraintError: a secret key shape is staged');
        expect(result.stderr).toContain('   ├─ shape: fireworks key');
        expect(result.stderr).toContain('   └─ .cache/debug.env:2');
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
      { shape: 'xai key', line: `XAI_API_KEY=${asFakeKey({ prefix: 'xai-', tail: 'aZ9', length: 10 })}` },
      { shape: 'slack token', line: `hook ${asFakeKey({ prefix: 'xoxb-', tail: '12', length: 8 })}` },
    ];
    haltTable.forEach((row) => {
      when(`[t0] the guard runs on a ${row.shape}`, () => {
        const result = runGuard(genStagedRepo({ 'config.md': `${row.line}\n` }));

        then('it halts with exit 2, and names the shape', () => {
          expect(result.code).toEqual(2);
          expect(result.stderr).toContain(`   ├─ shape: ${row.shape}`);
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
        const result = runGuard(genStagedRepo({ 'notes.md': `${row.line}\n` }));

        then('it allows the commit with exit 0', () => {
          expect(result.code).toEqual(0);
          expect(result.stderr).toEqual('');
        });
      });
    });
  });

  given('[case4] no staged file holds a key', () => {
    when('[t0] the guard runs', () => {
      const result = runGuard(genStagedRepo({ 'readme.md': 'hello\n' }));

      then('it allows the commit with exit 0', () => {
        expect(result.code).toEqual(0);
      });
    });
  });
});
