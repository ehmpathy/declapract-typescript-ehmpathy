import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = integration test for the check.timestamps husky guard
 * .why = proves the guard halts commits of files that embed a timestamp
 *        (except .ts/.sh) with exit 2, and allows clean/exempt files with exit 0
 * .how = build a temp git repo, stage fixtures, spawn the guard, assert exit code
 */

// the guard under test (the distributed best-practice template)
const guardPath = path.join(
  __dirname,
  'best-practice/.husky/check.timestamps.sh',
);

// build a fresh temp git repo with the given files staged
const genStagedRepo = (files: Record<string, string>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-timestamps-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    execFileSync('git', ['add', '--', name], { cwd: dir });
  }
  return dir;
};

// spawn the guard against a repo; return its exit code + stdout
const runGuard = (dir: string): { code: number | null; stdout: string } => {
  const res = spawnSync('bash', [guardPath], { cwd: dir, encoding: 'utf-8' });
  return { code: res.status, stdout: res.stdout };
};

describe('check.timestamps guard', () => {
  given('[case1] a non-code file with an iso timestamp', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({
        'snapshot.json': '{ "createdAt": "2026-06-25T14:30:00Z" }\n',
      });
      const result = runGuard(dir);

      then('it halts with exit 2', () => {
        expect(result.code).toEqual(2);
      });
      then('it prints the verbatim constraint message', () => {
        expect(result.stdout).toContain(
          'timestamps are forbidden in snapshots. mask them to prevent permadrift',
        );
      });
      then('it names the matched file', () => {
        expect(result.stdout).toContain('snapshot.json');
      });
      then('it renders the matched file:line:content detail line', () => {
        // locks the exact halt-output shape: tree-prefixed detail line
        expect(result.stdout).toContain(
          '   └─ snapshot.json:1:{ "createdAt": "2026-06-25T14:30:00Z" }',
        );
      });
    });
  });

  given('[case2] a non-code file with a bare time (no lead T)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'doc.md': 'released at 14:30:00 today\n' });
      const result = runGuard(dir);

      then('it halts with exit 2 (optional T prefix matches bare time)', () => {
        expect(result.code).toEqual(2);
      });
    });
  });

  given('[case3] a .ts file with a timestamp', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'time.ts': "const t = '14:30:00';\n" });
      const result = runGuard(dir);

      then('it allows the commit with exit 0 (.ts is exempt)', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case4] a .sh file with a timestamp', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'log.sh': "echo 'at 14:30:00Z'\n" });
      const result = runGuard(dir);

      then('it allows the commit with exit 0 (.sh is exempt)', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case5] a clean non-code file with no timestamp', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'notes.md': 'hello world, no times here\n' });
      const result = runGuard(dir);

      then('it allows the commit with exit 0', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case6] a non-code file with only a date (no time)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'dated.md': 'shipped on 2026-06-25\n' });
      const result = runGuard(dir);

      then('it allows the commit with exit 0 (date alone does not match)', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case7] a non-code file with a timezone-offset timestamp', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({
        'rec.yml': 'when: 2026-06-25T14:30:00+05:00\n',
      });
      const result = runGuard(dir);

      then('it halts with exit 2 (offset tz form matches)', () => {
        expect(result.code).toEqual(2);
      });
    });
  });

  given('[case8] a snapshot with a masked timestamp placeholder', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({
        'render.test.ts.snap': '{ "createdAt": "[timestamp]" }\n',
      });
      const result = runGuard(dir);

      then('it allows the commit with exit 0 (mask remedy is committable)', () => {
        expect(result.code).toEqual(0);
      });
    });
  });
});
