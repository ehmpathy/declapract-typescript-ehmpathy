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

// one parent dir holds every temp repo this suite makes, so one afterAll removes them all
const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'check-timestamps-'));
afterAll(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

// build a fresh temp git repo with the given files staged
const genStagedRepo = (files: Record<string, string | Buffer>): string => {
  const dir = fs.mkdtempSync(path.join(repoRoot, 'repo-'));
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
  guard?: string;
}): { code: number | null; stdout: string; stderr: string } => {
  const res = spawnSync('bash', [input.guard ?? guardPath], {
    cwd: input.dir,
    encoding: 'utf-8',
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
};

// keep the hook's own treestruct lines, each newline-ended as the hook prints it; grep and sed
// word their faults per platform
const asHookLines = (input: { stderr: string }): string =>
  input.stderr
    .split('\n')
    .filter((line) => line.startsWith('💥') || line.startsWith('   '))
    .map((line) => `${line}\n`)
    .join('');

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
      // the anchored forms: a date, a zone, a meridiem, or an h mark makes each number a clock
      { form: 'a bare zoned basic clock', content: 'at 1342Z\n' },
      { form: 'a zoned colon clock after a colon edge', content: 'at:13:42Z\n' },
      { form: 'a zoned colon clock after a blank', content: 'paged at 13:42Z\n' },
      { form: 'a clock mid-sentence, then punctuation', content: 'we paged them at 1342Z, then left.\n' },
      { form: 'a separated date then a bare clock', content: 'on 2026-11-25 1342\n' },
      { form: 'a basic date then a bare clock', content: 'on 20261125 1342\n' },
      { form: 'a basic iso stamp', content: 'at 20261125T134200Z\n' },
      { form: 'a separated date then a basic iso clock', content: 'at 2026-11-25T1342Z\n' },
      { form: 'an hour-only iso stamp', content: 'at 2026-11-25T13\n' },
      { form: 'a filename stamp, dash clock after a date', content: 'log: run.2026-11-25_13-42-07.log\n' },
      { form: 'a filename stamp, basic clock after a date', content: 'log: run.2026-11-25_1342.log\n' },
      { form: 'a dotted clock after a date', content: 'on 2026-11-25 13.42\n' },
      { form: 'a basic clock with a named zone', content: 'at 1342 UTC\n' },
      { form: 'a basic clock with a lowercase zone', content: 'at 1342 utc\n' },
      { form: 'a basic iso clock with a negative offset', content: 'at 2026-11-25T1342-0500\n' },
      { form: 'a dash clock with a zone', content: 'at 13-42-07Z\n' },
      { form: 'a dotted clock with a zone', content: 'at 13.42Z\n' },
      { form: 'an h-mark clock', content: 'at 13h42\n' },
      { form: 'an H-mark clock', content: 'at 13H42\n' },
      { form: 'an h-mark clock with a zone', content: 'at 13h42Z\n' },
      { form: 'a one-digit-hour clock', content: 'at 9:05\n' },
      { form: 'a meridiem clock', content: 'at 1:42 pm\n' },
      { form: 'a meridiem with dots, P.M.', content: 'at 1:42 P.M.\n' },
      { form: 'an hour-only meridiem', content: 'at 9pm\n' },
      { form: 'a dash meridiem clock', content: 'at 9-05 pm\n' },
      { form: 'a 12-hour basic meridiem clock', content: 'at 1142pm\n' },
      { form: 'a dotted meridiem clock', content: 'at 1.42 pm\n' },
      { form: 'a basic clock with the GMT zone', content: 'at 0942 GMT\n' },
      { form: 'a zoned hour-only iso stamp', content: 'at 2026-11-25T13Z\n' },
      { form: 'a filename stamp, dashes throughout', content: 'log: run.2026-11-25-13-42-07.log\n' },
      { form: 'an h-mark clock after a date', content: 'on 2026-11-25 13h42\n' },
      { form: 'an iso end of day', content: 'at 2026-11-25T24:00Z\n' },
      { form: 'an end of day after a date', content: 'on 2026-11-25 24:00\n' },
      { form: 'an end of day with a named zone', content: 'at 24:00 UTC\n' },
      { form: 'a month-first date then a bare clock', content: 'on 11/25/2026 1430\n' },
      { form: 'a day-first dotted date then a dotted clock', content: 'on 25.11.2026 14.30\n' },
      { form: 'a month-name date then at and a clock', content: 'on Nov 25, 2026 at 1430\n' },
      { form: 'a day, month name, year, then a clock', content: 'on 25 Nov 2026 1430\n' },
      { form: 'a date, an at sign, then a clock', content: 'on 2026-11-25 @ 1430\n' },
      { form: 'a date, then a clock in parens', content: 'on 2026-11-25 (1430)\n' },
      { form: 'a date, then a time range', content: 'on 2026-11-25 1430-1500\n' },
      { form: 'a date, a spaced dash, then a clock', content: 'on 2026-11-25 - 1430\n' },
      { form: 'a date, a tab, then a clock', content: 'on 2026-11-25\t1430\n' },
      { form: 'a T then a zoned basic clock', content: 'at T1430Z\n' },
      { form: 'a date, a lowercase t, then a clock', content: 'at 2026-11-25t1430\n' },
      { form: 'a date, a colon, then a clock', content: 'on 2026-11-25: 1430\n' },
      { form: 'a date, a semicolon, then a clock', content: 'on 2026-11-25; 1430\n' },
      { form: 'a date, an em dash, then a clock', content: 'on 2026-11-25 — 1430\n' },
      { form: 'a date, an en dash, then a clock', content: 'on 2026-11-25 – 1430\n' },
      { form: 'a date, a bar, then a clock', content: 'on 2026-11-25 | 1430\n' },
      { form: 'a date, a slash, then a clock', content: 'on 2026-11-25 / 1430\n' },
      { form: 'a date, a tilde, then a clock', content: 'on 2026-11-25 ~1430\n' },
      { form: 'an ordinal day, month name, year, then a clock', content: 'on 25th November 2026 1430\n' },
      { form: 'a basic clock with a Zulu zone', content: 'at 1430 Zulu\n' },
      { form: 'a basic clock with a title-case zone', content: 'at 1430 Utc\n' },
      { form: 'a date, a space, then a T clock', content: 'on 2026-11-25 T1430\n' },
      // a date anchors the pair after it: a score or a range right after a date halts too
      { form: 'a date then a dashed pair', content: 'on 2026-11-25 10-20 items\n' },
      // a date anchors the number after it: a year right after a date halts too
      { form: 'a date then a year', content: 'on 2026-11-25 2027 plan\n' },
      { form: 'an underscore clock after a date', content: 'log: run.2026-11-25_14_30_00.log\n' },
      { form: 'a doubled dash before a clock', content: 'log: run.2026-11-25--14-30.log\n' },
      { form: 'a basic clock with a lowercase z', content: 'at 1430z\n' },
      { form: 'a T clock glued to a word that ends in P', content: 'the SEPT14:30 meet\n' },
      // a date anchors the number after it: a count right after a date halts too
      { form: 'a date then a four-digit count', content: 'on 2026-11-25 1200 items\n' },
      // a one-digit hour halts everywhere: a ratio or verse ref with a two-digit right side halts too
      { form: 'a scale ratio with a two-digit right side', content: 'scale 1:42\n' },
      { form: 'a verse ref', content: 'see John 3:16\n' },
    ];
    haltTable.forEach((row, index) => {
      when(`[t${index}] the guard runs on ${row.form}`, () => {
        const result = runGuard({ dir: genStagedRepo({ 'yield.md': row.content }) });

        then('it halts with exit 2', () => {
          expect(result.code).toEqual(2);
        });
        then('it names the file, the line, and the line text on stderr', () => {
          expect(result.stderr).toContain(`   └─ yield.md:1:${row.content.replace(/\n$/, '')}\n`);
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
      // the look-alikes next to the anchored forms: no anchor vouches for them, so each passes
      { form: 'a basic date alone', content: 'shipped 20261125\n' },
      { form: 'a route slug date', content: 'see v2026_11_25.fix-hook\n' },
      { form: 'a dotted release date', content: 'release 2026.11.25\n' },
      { form: 'a date range', content: 'from 2026-11-25-2026-11-30\n' },
      { form: 'a date then a word', content: 'on 2026-11-25 in the lab\n' },
      { form: 'a basic date then a long id', content: 'ids 20261125 99999\n' },
      { form: 'a page range', content: 'pages 1200-1300\n' },
      { form: 'a count of hours', content: 'spent 1200 hours\n' },
      { form: 'a duration in h and m', content: 'took 10h30m\n' },
      { form: 'a year', content: 'in 2026\n' },
      { form: 'a port', content: 'port 1342\n' },
      { form: 'a decimal', content: 'took 13.42 seconds\n' },
      { form: 'a version', content: 'v1.2.3\n' },
      { form: 'a T-prefixed id', content: 'ticket T1342\n' },
      { form: 'a hash with a zoned shape inside', content: 'sha a1b2c1342Zf9\n' },
      { form: 'base64 with a zoned shape inside', content: 'blob Ab1342Z+q\n' },
      { form: 'a plural of PM', content: '3 PMs joined\n' },
      { form: 'an aspect ratio', content: 'aspect 16:9\n' },
      { form: 'a one-digit line:col ref', content: 'see foo.ts:9:15\n' },
      { form: 'a bare 24:00, as a score', content: 'score 24:00\n' },
      { form: 'a month-first date alone', content: 'shipped 11/25/2026\n' },
      { form: 'a month-name date alone', content: 'shipped on Nov 25, 2026\n' },
      { form: 'an ordinal day-first month-name date alone', content: 'shipped on 25th November 2026\n' },
      { form: 'a month-name date, at, then a word', content: 'on Nov 25, 2026 at noon\n' },
      { form: 'a day-first date then a word', content: 'on 25.11.2026 in the lab\n' },
      { form: 'a day-first release date', content: 'release 1.2.2026\n' },
      { form: 'a date, then words in parens', content: 'on 2026-11-25 (see notes)\n' },
      { form: 'a scale ratio reworded, the remedy for F1', content: 'scale 1-to-42\n' },
      { form: 'a date range with spaced dashes', content: 'from 2026-11-25 - 2026-11-30\n' },
      { form: 'a slice with a one-digit start', content: 'see items[1:10]\n' },
      { form: 'a version after a date', content: 'released 2026-11-25 20.11.0 of node\n' },
      { form: 'a date then a number with a unit', content: 'on 2026-11-25 1430ms\n' },
      { form: 'a date then a short hash', content: '2026-11-25 1234abc fix(hook)\n' },
      { form: 'a date, a colon, then words', content: 'on 2026-11-25: deployed\n' },
    ];
    passTable.forEach((row, index) => {
      when(`[t${index}] the guard runs on ${row.form}`, () => {
        const result = runGuard({ dir: genStagedRepo({ 'doc.md': row.content }) });

        then('it allows the commit with exit 0, silent', () => {
          expect(result.code).toEqual(0);
          expect(result.stderr).toEqual('');
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
      then('the fault output, the hook lines alone, matches snapshot', () => {
        expect(asHookLines({ stderr: result.stderr })).toMatchSnapshot();
      });
    });
  });

  // a pattern grep cannot compile must halt the commit, never read as no match: else an edit
  // that breaks the pattern disables the guard in silence
  given('[case18] a guard whose pattern grep cannot compile', () => {
    // one clean repo per fault, each with its own broken guard copy
    const dirScan = genStagedRepo({ 'notes.md': 'no time here\n' });
    const guardScanBroken = path.join(dirScan, '.git', 'check.timestamps.broken.sh');
    fs.writeFileSync(
      guardScanBroken,
      fs
        .readFileSync(guardPath, 'utf-8')
        .replace('TIMESTAMP_PATTERN="', 'TIMESTAMP_PATTERN="('),
    );
    const dirStrip = genStagedRepo({ 'notes.md': 'no time here\n' });
    const guardStripBroken = path.join(dirStrip, '.git', 'check.timestamps.broken.sh');
    fs.writeFileSync(
      guardStripBroken,
      fs
        .readFileSync(guardPath, 'utf-8')
        .replace("DURATION_PATTERN='", "DURATION_PATTERN='("),
    );

    when('[t0] the guard runs on a clean file', () => {
      const result = runGuard({ dir: dirScan, guard: guardScanBroken });

      then('it exits 1, with a MalfunctionError header on stderr', () => {
        expect(result.code).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: check.timestamps could not run its pattern; the guard is broken',
        );
      });
      then('the fault output, the hook lines alone, matches snapshot', () => {
        expect(asHookLines({ stderr: result.stderr })).toMatchSnapshot();
      });
    });

    when('[t1] the guard runs with a duration pattern sed cannot compile', () => {
      const result = runGuard({ dir: dirStrip, guard: guardStripBroken });

      then('it exits 1, with a MalfunctionError header on stderr', () => {
        expect(result.code).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: check.timestamps could not strip durations; the pattern is broken',
        );
      });
      then('the fault output, the hook lines alone, matches snapshot', () => {
        expect(asHookLines({ stderr: result.stderr })).toMatchSnapshot();
      });
    });
  });

  // a clock deep in an older file halts the commit that touches it; the mask is the way through
  given('[case19] a multi-line file with a clock on line 5', () => {
    const lines = ['# runbook', '', 'step one', 'step two'];
    const dirRaw = genStagedRepo({
      'runbook.md': [...lines, 'paged on 2026-11-25 at 0942 UTC', ''].join('\n'),
    });
    const dirMasked = genStagedRepo({
      'runbook.md': [...lines, 'paged on 2026-11-25 at [time]', ''].join('\n'),
    });
    const dirSecond = genStagedRepo({
      'runbook.md': [...lines, 'paged on 2026-11-25 at [time]', 'resolved at 1015 UTC', ''].join('\n'),
    });

    when('[t0] the guard runs with the raw clock', () => {
      const result = runGuard({ dir: dirRaw });

      then('it halts with exit 2 and names line 5', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   └─ runbook.md:5:paged on 2026-11-25');
      });
    });

    when('[t1] the guard runs with the clock masked', () => {
      const result = runGuard({ dir: dirMasked });

      then('it allows the commit with exit 0', () => {
        expect(result.code).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });

    when('[t2] the first clock is masked and a second clock sits below it', () => {
      const result = runGuard({ dir: dirSecond });

      then('it halts with exit 2 and names line 6, the next clock', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   └─ runbook.md:6:resolved at');
      });
    });
  });

  // in a utf-8 locale, one byte that is not utf-8 makes grep read a file as binary; the scan
  // runs byte by byte, so the clock still halts
  given('[case20] a file with a byte that is not utf-8 and a clock', () => {
    const dir = genStagedRepo({ 'notes.md': Buffer.from('caf\xe9 at 14:30\n', 'latin1') });

    when('[t0] the guard runs', () => {
      const result = runGuard({ dir });

      then('it halts with exit 2', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   └─ notes.md:1:');
      });
    });
  });

  // a reviewer vibechecks the halt for a newly-caught form; the clock is masked before the
  // snapshot, since the .snap is itself scanned by this guard
  given('[case21] a file with a newly-caught form, per form family', () => {
    const snapTable = [
      { family: 'a bare zoned basic clock', line: 'paged at 1342Z', clock: '1342Z' },
      { family: 'a zoned colon clock after a colon edge', line: 'alarm at:13:42Z', clock: '13:42Z' },
      { family: 'a date then a bare clock', line: 'paged on 2026-11-25 1342', clock: '1342' },
      { family: 'a one-digit colon (a ratio, F1)', line: 'scale 1:42', clock: '1:42' },
      { family: 'an hour-only meridiem (F2)', line: 'quota resets at 5 pm', clock: '5 pm' },
      { family: 'a date then a number', line: 'on 2026-11-25 1200 items', clock: '1200' },
    ];
    const dirs = snapTable.map((row) => genStagedRepo({ 'yield.md': `${row.line}\n` }));
    snapTable.forEach((row, index) => {
      when(`[t${index}] the guard runs on ${row.family}`, () => {
        const result = runGuard({ dir: dirs[index]! });

        then('it halts with exit 2', () => {
          expect(result.code).toEqual(2);
        });
        then('the halt names the line that holds the clock', () => {
          expect(result.stderr).toContain(`   └─ yield.md:1:${row.line}`);
        });
        then('the halt output, its clock masked, matches snapshot', () => {
          expect(result.stderr.replace(row.clock, '[timestamp]')).toMatchSnapshot();
        });
      });
    });
  });

  // vision case=3: a ratio halts, the dev rewords it, the same file then passes
  given('[case22] a doc with a scale ratio that reads as a one-digit clock', () => {
    const dirRaw = genStagedRepo({ 'map.md': '# map\nscale 1:42\n' });
    const dirReworded = genStagedRepo({ 'map.md': '# map\nscale 1-to-42\n' });

    when('[t0] the guard runs on the raw ratio', () => {
      const result = runGuard({ dir: dirRaw });

      then('it halts with exit 2 and names line 2', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   └─ map.md:2:scale');
      });
    });

    when('[t1] the guard runs on the reworded ratio', () => {
      const result = runGuard({ dir: dirReworded });

      then('it allows the commit with exit 0', () => {
        expect(result.code).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });
  });

  // the halt names one hit per commit: the first staged file, in name order (inventory 22l)
  given('[case23] two staged files, each with a clock', () => {
    const dir = genStagedRepo({ 'a.md': 'paged at 1342Z\n', 'b.md': 'ack at 1342Z\n' });

    when('[t0] the guard runs', () => {
      const result = runGuard({ dir });

      then('it halts with exit 2 and names the first file in name order', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   └─ a.md:1:paged at');
      });
      then('it names no second hit', () => {
        expect(result.stderr).not.toContain('b.md');
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
