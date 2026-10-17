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

// spawn the guard against a repo; return its exit code + streams
const runGuard = (input: {
  dir: string;
}): { code: number | null; stdout: string; stderr: string } => {
  const res = spawnSync('bash', [guardPath], { cwd: input.dir, encoding: 'utf-8' });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
};

describe('check.timestamps guard', () => {
  given('[case1] a non-code file with an iso timestamp', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({
        'snapshot.json': '{ "createdAt": "2026-06-25T14:30:00Z" }\n',
      });
      const result = runGuard({ dir });

      then('it halts with exit 2', () => {
        expect(result.code).toEqual(2);
      });
      then('it prints the verbatim constraint header on stderr (#681)', () => {
        expect(result.stderr).toContain(
          '✋ ConstraintError: timestamps are forbidden in tracked files, prose and docs included. remove them, zero exceptions',
        );
        expect(result.stdout).toEqual('');
      });
      then('it prints the why line beneath the header', () => {
        expect(result.stderr).toContain(
          '   ├─ why: a timestamp is a privacy leak, and churns every diff',
        );
      });
      then('it names the matched file', () => {
        expect(result.stderr).toContain('snapshot.json');
      });
      then('it renders the matched file:line:content detail line', () => {
        // locks the exact halt-output shape: tree-prefixed detail line
        expect(result.stderr).toContain(
          '   └─ snapshot.json:1:{ "createdAt": "2026-06-25T14:30:00Z" }',
        );
      });
      then('the halt output, its instant masked, matches snapshot', () => {
        // user-faced halt message — a reword must redden a vibecheck, not slip past the
        // toContain asserts above (rule.require.snapshots). the fixture timestamp is a fixed
        // input (not a live clock), so the output is deterministic.
        // mask the instant to [timestamp] before the snapshot: the .snap is itself scanned by
        // this very guard (only .ts/.sh are exempt), so a raw instant here would forbid its own
        // commit. the raw detail-line toContain above already locks the exact instant in the
        // output; the snapshot vibechecks the message shape, per the guard's own mask remedy (case8).
        const masked = result.stderr.replace(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g,
          '[timestamp]',
        );
        expect(masked).toMatchSnapshot('check.timestamps halt output');
      });
    });
  });

  given('[case2] a non-code file with a bare time (no lead T)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'doc.md': 'released at 14:30:00 today\n' });
      const result = runGuard({ dir });

      then('it halts with exit 2 (optional T prefix matches bare time)', () => {
        expect(result.code).toEqual(2);
      });
    });
  });

  given('[case3] a .ts file with a timestamp', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'time.ts': "const t = '14:30:00';\n" });
      const result = runGuard({ dir });

      then('it allows the commit with exit 0 (.ts is exempt)', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case4] a .sh file with a timestamp', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'log.sh': "echo 'at 14:30:00Z'\n" });
      const result = runGuard({ dir });

      then('it allows the commit with exit 0 (.sh is exempt)', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case5] a clean non-code file with no timestamp', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'notes.md': 'hello world, no times here\n' });
      const result = runGuard({ dir });

      then('it allows the commit with exit 0', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case6] a non-code file with only a date (no time)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'dated.md': 'shipped on 2026-06-25\n' });
      const result = runGuard({ dir });

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
      const result = runGuard({ dir });

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
      const result = runGuard({ dir });

      then('it allows the commit with exit 0 (mask remedy is committable)', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  // #566: an iso-8601 duration is a fixed span, not an instant, so it is a stable value —
  // the matcher must not halt on it (a false positive that trains folks to bypass the hook)
  given('[case9] a non-code file with a simple iso duration (PT12:30:00)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'fixture.json': '{ "window": "PT12:30:00" }\n' });
      const result = runGuard({ dir });

      then('it allows the commit with exit 0 (a duration is not a timestamp)', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case10] a non-code file with a day+time duration (P1DT02:15:30)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'fixture.json': '{ "elapsed": "P1DT02:15:30" }\n' });
      const result = runGuard({ dir });

      then('it allows the commit with exit 0 (a duration is not a timestamp)', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case11] a non-code file with a full-designator duration (P3Y6M4DT12:30:05)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({
        'fixture.json': '{ "span": "P3Y6M4DT12:30:05" }\n',
      });
      const result = runGuard({ dir });

      then('it allows the commit with exit 0 (a duration is not a timestamp)', () => {
        expect(result.code).toEqual(0);
      });
    });
  });

  given('[case12] a non-code file with BOTH a duration and a real timestamp', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({
        'fixture.json':
          '{ "window": "PT12:30:00", "createdAt": "2026-06-25T14:30:00Z" }\n',
      });
      const result = runGuard({ dir });

      then('it halts with exit 2 (the real stamp wins, despite the duration)', () => {
        expect(result.code).toEqual(2);
      });
    });
  });

  // #641: the pattern required seconds and colons, so a minute-only clock, a dash-separated
  // iso stamp in a filename, and a bare `<hh>:<mm>` all slipped through
  given('[case13] the halt table — each time-of-day form a doc can carry (#641)', () => {
    const haltTable = [
      { form: 'a bare minute clock', content: 'ran at 14:30 UTC\n' },
      { form: 'a bare second clock', content: 'ran at 14:30:00\n' },
      { form: 'a minute-only iso stamp', content: 'at 2026-09-20T14:30Z\n' },
      { form: 'a dash-separated iso stamp', content: 'log: run.2026-09-20T14-30-00Z.log\n' },
      { form: 'a dash-separated minute stamp', content: 'log: run.2026-09-20T14-30Z.log\n' },
      { form: 'a clock with an offset', content: 'at T09:05+05:30\n' },
    ];
    haltTable.forEach((row) => {
      when(`[t0] the guard runs on ${row.form}`, () => {
        const result = runGuard({ dir: genStagedRepo({ 'yield.md': row.content }) });

        then('it halts with exit 2', () => {
          expect(result.code).toEqual(2);
        });
        then('it names the file and line on stderr', () => {
          expect(result.stderr).toContain('   └─ yield.md:1:');
        });
      });
    });
  });

  // the guard earns trust by what it lets through: a halt on a line:col ref or a port map
  // would block every dev on every commit
  given('[case14] the pass table — values that look like a clock but are not one (#641)', () => {
    const passTable = [
      { form: 'an iso duration', content: 'window: PT12:30:00\n' },
      { form: 'a minute iso duration', content: 'window: PT12:30\n' },
      { form: 'a date alone', content: 'shipped on 2026-09-20\n' },
      { form: 'a file:line:col ref', content: 'see src/foo.ts:42:7\n' },
      { form: 'a two-digit line:col ref', content: 'see src/foo.ts:12:34\n' },
      { form: 'a port map', content: 'ports: 5432:5432\n' },
      { form: 'a ratio', content: 'aspect 3:1\n' },
      { form: 'a markdown table rule', content: '|:---|:---:|\n' },
      { form: 'an out-of-range hour', content: 'score 42:17\n' },
    ];
    passTable.forEach((row) => {
      when(`[t0] the guard runs on ${row.form}`, () => {
        const result = runGuard({ dir: genStagedRepo({ 'doc.md': row.content }) });

        then('it allows the commit with exit 0', () => {
          expect(result.code).toEqual(0);
        });
      });
    });
  });

  // #681: core.quotepath quoted a non-ascii path, so `git show` could not read it and the
  // guard exited 1 as a malfunction on a legal file
  given('[case15] a staged file at a non-ascii path (#681)', () => {
    when('[t0] the file holds a date only', () => {
      const result = runGuard({ dir: genStagedRepo({ 'docs/café.md': 'on 2026-09-20\n' }) });

      then('it allows the commit with exit 0 — no false malfunction', () => {
        expect(result.code).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });

    when('[t1] the file holds a clock time', () => {
      const result = runGuard({ dir: genStagedRepo({ 'docs/café.md': 'at 14:30\n' }) });

      then('it halts with exit 2, with the raw path and line on stderr', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('   └─ docs/café.md:1:at 14:30');
      });
    });
  });

  // #681: a blob git cannot read is the system's fault, not the caller's
  given('[case16] a staged file whose blob git cannot read (#681)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'notes.md': 'no time here\n' });
      const sha = execFileSync('git', ['rev-parse', ':notes.md'], {
        cwd: dir,
        encoding: 'utf-8',
      }).trim();
      fs.rmSync(path.join(dir, '.git/objects', sha.slice(0, 2), sha.slice(2)));
      const result = runGuard({ dir });

      then('it exits 1, with a MalfunctionError header on stderr', () => {
        expect(result.code).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: check.timestamps could not read the staged blob',
        );
        expect(result.stderr).toContain('   └─ notes.md');
      });
    });
  });

  // #684 asked to exempt the achiever's `.goals/` ask log; the answer is no (S16): the log must
  // not hold a clock, so a pasted shell prompt clock there halts like it does anywhere else
  given('[case17] a staged .goals/ ask log that holds a pasted shell prompt clock (#684)', () => {
    when('[t0] the guard runs', () => {
      const result = runGuard({
        dir: genStagedRepo({
          '.route/x/.goals/asks.inventory.jsonl':
            '{"ask":"[14:32:07] ~/repo $ npm run test"}\n',
        }),
      });

      then('it halts with exit 2, as for any other path — no path is exempt', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('.route/x/.goals/asks.inventory.jsonl:1:');
      });
    });

    when('[t1] the same log holds the ask with the clock masked', () => {
      const result = runGuard({
        dir: genStagedRepo({
          '.route/x/.goals/asks.inventory.jsonl':
            '{"ask":"[time] ~/repo $ npm run test"}\n',
        }),
      });

      then('it allows the commit with exit 0 — the masked form is the remedy', () => {
        expect(result.code).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case-scope] the hook source a reader meets (#641)', () => {
    when('[t0] its header is read', () => {
      const header = fs
        .readFileSync(guardPath, 'utf-8').split('\n').slice(0, 8).join('\n');

      then('the .what says prose is in scope, so no reader asks for a prose skip', () => {
        expect(header).toContain('ANY staged file but .ts/.sh');
        expect(header).toContain('prose included');
        expect(header).not.toContain('snapshot'); // no single file kind reads as the target
      });
    });
  });
});
