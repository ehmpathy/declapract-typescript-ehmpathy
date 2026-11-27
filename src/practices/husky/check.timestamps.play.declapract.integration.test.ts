import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, when } from 'test-fns';

import { asAsciiDigits } from './.test/asAsciiDigits';

/**
 * .what = integration test for the check.timestamps husky guard
 * .why = proves the guard halts commits of files that embed a timestamp, code files included,
 *        with exit 2, and allows clean files with exit 0
 * .how = build a temp git repo, stage fixtures, spawn the guard, assert exit code
 * .note = this source is itself scanned by the guard, so each clock fixture spells its digits
 *         in fullwidth form (０-９); asAsciiDigits restores the real clock before the guard runs
 */

// the guard under test (the distributed best-practice template)
const guardPath = path.join(
  __dirname,
  'best-practice/.husky/check.timestamps.sh',
);

// one parent dir holds every temp repo this suite makes, so one afterAll removes them all
const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'check-timestamps-'));
afterAll(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

// build a fresh temp git repo with the given files staged; text fixtures get ascii digits
const genStagedRepo = (files: Record<string, string | Buffer>): string => {
  const dir = fs.mkdtempSync(path.join(repoRoot, 'repo-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(
      full,
      typeof content === 'string' ? asAsciiDigits(content) : content,
    );
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
        'snapshot.json': '{ "createdAt": "２０２６-０６-２５T１４:３０:００Z" }\n',
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
          asAsciiDigits('   └─ snapshot.json:1:{ "createdAt": "２０２６-０６-２５T１４:３０:００Z" }'),
        );
      });
      then('the halt output, its instant masked, matches snapshot', () => {
        // user-faced halt message — a reword must redden a vibecheck, not slip past the
        // toContain asserts above (rule.require.snapshots). the fixture timestamp is a fixed
        // input (not a live clock), so the output is deterministic.
        // mask the instant to [timestamp] before the snapshot: the .snap is itself scanned by
        // this very guard, so a raw instant here would forbid its own commit. the raw
        // detail-line toContain above already locks the exact instant in the output; the
        // snapshot vibechecks the message shape, per the guard's own mask remedy (case8).
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
      const dir = genStagedRepo({ 'doc.md': 'released at １４:３０:００ today\n' });
      const result = runGuard({ dir });

      then('it halts with exit 2 (optional T prefix matches bare time)', () => {
        expect(result.code).toEqual(2);
      });
    });
  });

  // #845: code files were skipped, yet they hold stamps (fixtures, log paths, doc headers)
  given('[case3] a .ts file with a timestamp (#845)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'time.ts': "const t = '１４:３０:００';\n" });
      const result = runGuard({ dir });

      then('it halts with exit 2 and names the .ts file — no file kind is exempt', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   └─ time.ts:1:');
      });
    });

    when('[t1] the same .ts builds the clock from parts at runtime', () => {
      const dir = genStagedRepo({
        'time.ts': "const t = [hh, mm, ss].join(':');\n",
      });
      const result = runGuard({ dir });

      then('it allows the commit with exit 0 — code that computes a clock holds none', () => {
        expect(result.code).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case4] a .sh file with a timestamp (#845)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({ 'log.sh': "echo 'at １４:３０:００Z'\n" });
      const result = runGuard({ dir });

      then('it halts with exit 2 and names the .sh file', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   └─ log.sh:1:');
      });
    });
  });

  given('[case24] a .js file with a log path stamp (#845)', () => {
    when('[t0] the guard runs', () => {
      const dir = genStagedRepo({
        'read.js': "const log = '.log/run/２０２６-１１-２６T１４-３０-０７-１２３Z.md';\n",
      });
      const result = runGuard({ dir });

      then('it halts with exit 2 and names the .js file', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   └─ read.js:1:');
      });
    });
  });

  // pre-commit is `#!/bin/sh` and SOURCES the guard, so the guard must parse and run under
  // posix sh too; a bash-only quote ($'...') once broke every commit while bash runs passed
  given('[case25] the guard sourced by posix sh, as pre-commit does', () => {
    const runGuardSourcedBySh = (input: { dir: string }) => {
      const res = spawnSync('sh', ['-c', '. "$1"', 'pre-commit', guardPath], {
        cwd: input.dir,
        encoding: 'utf-8',
      });
      return { code: res.status, stderr: res.stderr };
    };

    when('[t0] a staged file holds a clock masked by an asterisk', () => {
      const result = runGuardSourcedBySh({
        dir: genStagedRepo({ 'yield.md': 'at １４:３*\n' }),
      });

      then('it halts with exit 2 and names the file, no parse fault', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('   └─ yield.md:1:');
        expect(result.stderr).not.toContain('Syntax error');
      });
    });

    when('[t1] a staged file holds a date alone', () => {
      const result = runGuardSourcedBySh({
        dir: genStagedRepo({ 'notes.md': 'shipped on 2026-11-27\n' }),
      });

      then('it allows the commit with exit 0, silent', () => {
        expect(result.code).toEqual(0);
        expect(result.stderr).toEqual('');
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
        'rec.yml': 'when: ２０２６-０６-２５T１４:３０:００+０５:００\n',
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
          '{ "window": "PT12:30:00", "createdAt": "２０２６-０６-２５T１４:３０:００Z" }\n',
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
      { form: 'a bare minute clock', content: 'ran at １４:３０ UTC\n' },
      { form: 'a bare second clock', content: 'ran at １４:３０:００\n' },
      { form: 'a minute-only iso stamp', content: 'at ２０２６-０９-２０T１４:３０Z\n' },
      { form: 'a dash-separated iso stamp', content: 'log: run.２０２６-０９-２０T１４-３０-００Z.log\n' },
      { form: 'a dash-separated minute stamp', content: 'log: run.２０２６-０９-２０T１４-３０Z.log\n' },
      { form: 'a clock with an offset', content: 'at T０９:０５+０５:３０\n' },
      // the anchored forms: a date, a zone, a meridiem, or an h mark makes each number a clock
      { form: 'a bare zoned basic clock', content: 'at １３４２Z\n' },
      { form: 'a zoned colon clock after a colon edge', content: 'at:１３:４２Z\n' },
      { form: 'a zoned colon clock after a blank', content: 'paged at １３:４２Z\n' },
      { form: 'a clock mid-sentence, then punctuation', content: 'we paged them at １３４２Z, then left.\n' },
      { form: 'a separated date then a bare clock', content: 'on ２０２６-１１-２５ １３４２\n' },
      { form: 'a basic date then a bare clock', content: 'on ２０２６１１２５ １３４２\n' },
      { form: 'a basic iso stamp', content: 'at ２０２６１１２５T１３４２００Z\n' },
      { form: 'a separated date then a basic iso clock', content: 'at ２０２６-１１-２５T１３４２Z\n' },
      { form: 'an hour-only iso stamp', content: 'at ２０２６-１１-２５T１３\n' },
      { form: 'a filename stamp, dash clock after a date', content: 'log: run.２０２６-１１-２５_１３-４２-０７.log\n' },
      { form: 'a filename stamp, basic clock after a date', content: 'log: run.２０２６-１１-２５_１３４２.log\n' },
      { form: 'a dotted clock after a date', content: 'on ２０２６-１１-２５ １３.４２\n' },
      { form: 'a basic clock with a named zone', content: 'at １３４２ UTC\n' },
      { form: 'a basic clock with a lowercase zone', content: 'at １３４２ utc\n' },
      { form: 'a basic iso clock with a negative offset', content: 'at ２０２６-１１-２５T１３４２-０５００\n' },
      { form: 'a dash clock with a zone', content: 'at １３-４２-０７Z\n' },
      { form: 'a dotted clock with a zone', content: 'at １３.４２Z\n' },
      { form: 'an h-mark clock', content: 'at １３h４２\n' },
      { form: 'an H-mark clock', content: 'at １３H４２\n' },
      { form: 'an h-mark clock with a zone', content: 'at １３h４２Z\n' },
      { form: 'a one-digit-hour clock', content: 'at ９:０５\n' },
      { form: 'a meridiem clock', content: 'at １:４２ pm\n' },
      { form: 'a meridiem with dots, P.M.', content: 'at １:４２ P.M.\n' },
      { form: 'an hour-only meridiem', content: 'at ９pm\n' },
      { form: 'a dash meridiem clock', content: 'at ９-０５ pm\n' },
      { form: 'a 12-hour basic meridiem clock', content: 'at １１４２pm\n' },
      { form: 'a dotted meridiem clock', content: 'at １.４２ pm\n' },
      { form: 'a basic clock with the GMT zone', content: 'at ０９４２ GMT\n' },
      { form: 'a zoned hour-only iso stamp', content: 'at ２０２６-１１-２５T１３Z\n' },
      { form: 'a filename stamp, dashes throughout', content: 'log: run.２０２６-１１-２５-１３-４２-０７.log\n' },
      { form: 'an h-mark clock after a date', content: 'on ２０２６-１１-２５ １３h４２\n' },
      { form: 'an iso end of day', content: 'at ２０２６-１１-２５T２４:００Z\n' },
      { form: 'an end of day after a date', content: 'on ２０２６-１１-２５ ２４:００\n' },
      { form: 'an end of day with a named zone', content: 'at ２４:００ UTC\n' },
      { form: 'a month-first date then a bare clock', content: 'on １１/２５/２０２６ １４３０\n' },
      { form: 'a day-first dotted date then a dotted clock', content: 'on ２５.１１.２０２６ １４.３０\n' },
      { form: 'a month-name date then at and a clock', content: 'on Nov ２５, ２０２６ at １４３０\n' },
      { form: 'a day, month name, year, then a clock', content: 'on ２５ Nov ２０２６ １４３０\n' },
      { form: 'a date, an at sign, then a clock', content: 'on ２０２６-１１-２５ @ １４３０\n' },
      { form: 'a date, then a clock in parens', content: 'on ２０２６-１１-２５ (１４３０)\n' },
      { form: 'a date, then a time range', content: 'on ２０２６-１１-２５ １４３０-１５００\n' },
      { form: 'a date, a spaced dash, then a clock', content: 'on ２０２６-１１-２５ - １４３０\n' },
      { form: 'a date, a tab, then a clock', content: 'on ２０２６-１１-２５\t１４３０\n' },
      { form: 'a T then a zoned basic clock', content: 'at T１４３０Z\n' },
      { form: 'a date, a lowercase t, then a clock', content: 'at ２０２６-１１-２５t１４３０\n' },
      { form: 'a date, a colon, then a clock', content: 'on ２０２６-１１-２５: １４３０\n' },
      { form: 'a date, a semicolon, then a clock', content: 'on ２０２６-１１-２５; １４３０\n' },
      { form: 'a date, an em dash, then a clock', content: 'on ２０２６-１１-２５ — １４３０\n' },
      { form: 'a date, an en dash, then a clock', content: 'on ２０２６-１１-２５ – １４３０\n' },
      { form: 'a date, a bar, then a clock', content: 'on ２０２６-１１-２５ | １４３０\n' },
      { form: 'a date, a slash, then a clock', content: 'on ２０２６-１１-２５ / １４３０\n' },
      { form: 'a date, a tilde, then a clock', content: 'on ２０２６-１１-２５ ~１４３０\n' },
      { form: 'an ordinal day, month name, year, then a clock', content: 'on ２５th November ２０２６ １４３０\n' },
      { form: 'a basic clock with a Zulu zone', content: 'at １４３０ Zulu\n' },
      { form: 'a basic clock with a title-case zone', content: 'at １４３０ Utc\n' },
      { form: 'a date, a space, then a T clock', content: 'on ２０２６-１１-２５ T１４３０\n' },
      // a date anchors the pair after it: a score or a range right after a date halts too
      { form: 'a date then a dashed pair', content: 'on ２０２６-１１-２５ １０-２０ items\n' },
      // a date anchors the number after it: a year right after a date halts too
      { form: 'a date then a year', content: 'on ２０２６-１１-２５ ２０２７ plan\n' },
      { form: 'an underscore clock after a date', content: 'log: run.２０２６-１１-２５_１４_３０_００.log\n' },
      { form: 'a doubled dash before a clock', content: 'log: run.２０２６-１１-２５--１４-３０.log\n' },
      { form: 'a basic clock with a lowercase z', content: 'at １４３０z\n' },
      { form: 'a T clock glued to a word that ends in P', content: 'the SEPT１４:３０ meet\n' },
      // a date anchors the number after it: a count right after a date halts too
      { form: 'a date then a four-digit count', content: 'on ２０２６-１１-２５ １２００ items\n' },
      // a one-digit hour halts everywhere: a ratio or verse ref with a two-digit right side halts too
      { form: 'a scale ratio with a two-digit right side', content: 'scale １:４２\n' },
      { form: 'a verse ref', content: 'see John ３:１６\n' },
      // #845: a clock digit swapped for an x still leaks the rest of the clock
      { form: 'a masked minute digit, dash clock after a date and T', content: 'log ２０２６-１１-２６T１４-３x-０７-１２３Z.log\n' },
      { form: 'a masked hour digit, dash clock after a date and T', content: 'log ２０２６-１１-２６T１x-３０-０７Z\n' },
      { form: 'a masked minute digit after a lone T', content: 'at T１４-３x\n' },
      { form: 'a masked basic clock after a date and T', content: 'at ２０２６-１１-２６T１x３０Z\n' },
      { form: 'a masked colon clock after a date and T', content: 'at ２０２６-１１-２６T１４:３x:０７Z\n' },
      { form: 'a masked hour digit, colon clock', content: 'at １x:３０\n' },
      { form: 'a masked minute digit, colon clock', content: 'at １４:３x\n' },
      { form: 'an uppercase X mask', content: 'at １４:３X\n' },
      // #845: a dash time id (hh-mm-ss-fff), bare with its zone or after a date
      { form: 'a bare dash time id with a zone', content: 'ran １４-３０-０７-１２３Z\n' },
      { form: 'a dash time id in a dotted filename', content: 'log run.１４-３０-０７-１２３Z.log\n' },
      { form: 'a dash time id after a date and a dash', content: 'log ２０２６-１１-２６-１４-３０-０７-１２３Z.log\n' },
      { form: 'a dash time id after a date and an underscore', content: 'log ２０２６-１１-２６_１４-３０-０７-１２３Z.log\n' },
      { form: 'a dash time id after a date and T', content: 'log ２０２６-１１-２６T１４-３０-０７-１２３Z.log\n' },
      { form: 'a dash time id after a date, no zone', content: 'log ２０２６-１１-２６_１４-３０-０７-１２３.log\n' },
      { form: 'a masked dash time id', content: 'ran １x-３０-０７-１２３Z\n' },
      // pr #843 review: any mask character, not only x, still leaks the clock (F17)
      { form: 'an asterisk mask, colon clock', content: 'at １４:３*\n' },
      { form: 'a hash mask, colon clock', content: 'at １４:３#\n' },
      { form: 'a question mark mask, colon clock', content: 'at １４:３?\n' },
      { form: 'an underscore mask, colon clock', content: 'at １４:３_\n' },
      { form: 'a bullet mask, colon clock', content: 'at １４:３•\n' },
      { form: 'a block mask, colon clock', content: 'at １４:３█\n' },
      { form: 'a letter mask after a real digit, colon clock', content: 'at １４:３o\n' },
      { form: 'an asterisk mask in the hour', content: 'at １*:３０\n' },
      { form: 'a lead asterisk mask in the hour and a masked minute', content: 'at *４:３*\n' },
      { form: 'a fully masked minute, colon clock', content: 'at １４:**\n' },
      { form: 'an asterisk mask, dash clock after a date and T', content: 'log ２０２６-１１-２６T１４-３*-０７-１２３Z.log\n' },
      { form: 'a hash mask, basic clock after a date and T', content: 'log ２０２６-１１-２６T１#３０Z\n' },
      { form: 'a bullet mask, colon clock after a date and T', content: 'log ２０２６-１１-２６T１４:３•:０７Z\n' },
      { form: 'a question mark mask after a lone T', content: 'at T１４-３?\n' },
      { form: 'an asterisk mask, bare dash time id', content: 'ran １４-３*-０７-１２３Z\n' },
      { form: 'masked milliseconds, bare dash time id', content: 'ran １４-３０-０７-１**Z\n' },
      { form: 'masked milliseconds, dash time id after a date', content: 'log ２０２６-１１-２６_１４-３０-０７-１##.log\n' },
      // pr #843 compact-clock gap: a zoned compact clock with no date, glued to a dot or a letter
      { form: 'a compact zoned clock after a dot and T', content: 'snapshot.T１３４２０７Z.tab0\n' },
      { form: 'a compact zoned clock after a letter and T', content: 'runT１３４２０７Z\n' },
      { form: 'a compact zoned clock after a dot, no T', content: 'snapshot.１３４２０７Z\n' },
      { form: 'a compact zoned clock after a space and T', content: 'snapshot T１３４２０７Z\n' },
      { form: 'a masked compact zoned clock after a dot and T', content: 'snapshot.T１x４２０７z\n' },
      // the known side effect of F17: a bold verse ref reads as a masked clock and halts
      { form: 'a bold verse ref, the F17 side effect', content: 'see **１２:３**\n' },
    ].map((row) => ({ ...row, content: asAsciiDigits(row.content) }));
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
      // #845 look-alikes: the masked and dash-id forms must not reach these
      { form: 'an all-x placeholder clock', content: 'format xx:xx\n' },
      { form: 'a masked T-prefixed id', content: 'ticket T13x2\n' },
      { form: 'a bare dash triple, as a dd-mm-yy date', content: 'on 14-30-07\n' },
      { form: 'a part number with a dash-id shape, no zone', content: 'part 12-34-56-789\n' },
      { form: 'a date alone, #845 negative', content: 'shipped on 2026-11-26\n' },
      // F17 look-alikes: a hex letter, a phrase end, a cell edge, or an offset is no mask
      { form: 'a verse ref then a close paren', content: 'see John 12:3)\n' },
      { form: 'a verse ref then a period', content: 'see John 12:3.\n' },
      { form: 'a verse ref then a comma', content: 'see John 12:3, then on\n' },
      { form: 'a verse ref in a table cell', content: '| 12:3 |\n' },
      { form: 'a mac address, lowercase', content: 'mac 00:1a:2b:3c\n' },
      { form: 'a mac address, uppercase', content: 'mac 00:1A:2B:3C\n' },
      { form: 'a hex pair', content: 'hash a1:bc\n' },
      { form: 'an ipv6 tail', content: 'ipv6 fe80::1:2c\n' },
      { form: 'a word with a digit, a colon, then a word', content: 'set v1:on\n' },
      { form: 'an all-asterisk placeholder clock', content: 'format **:**\n' },
      { form: 'a part number with masked digits, no zone', content: 'part 12-34-56-7**\n' },
      { form: 'a minute then an offset sign', content: 'offset 12:3+\n' },
      // compact-clock look-alikes: no zone, so a ticket id stays legal wherever it sits
      { form: 'a T-prefixed id after a dot, no zone', content: 'see build.T1342\n' },
      { form: 'a T-prefixed id glued to a word, no zone', content: 'see runT1342\n' },
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
      const result = runGuard({ dir: genStagedRepo({ 'docs/café.md': 'at １４:３０\n' }) });

      then('it halts with exit 2, with the raw path and line on stderr', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain(asAsciiDigits('   └─ docs/café.md:1:at １４:３０'));
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
      'runbook.md': [...lines, 'paged on 2026-11-25 at ０９４２ UTC', ''].join('\n'),
    });
    const dirMasked = genStagedRepo({
      'runbook.md': [...lines, 'paged on 2026-11-25 at [time]', ''].join('\n'),
    });
    const dirSecond = genStagedRepo({
      'runbook.md': [...lines, 'paged on 2026-11-25 at [time]', 'resolved at １０１５ UTC', ''].join('\n'),
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
    const dir = genStagedRepo({
      'notes.md': Buffer.from(asAsciiDigits('caf\xe9 at １４:３０\n'), 'latin1'),
    });

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
      { family: 'a bare zoned basic clock', line: 'paged at １３４２Z', clock: '１３４２Z' },
      { family: 'a zoned colon clock after a colon edge', line: 'alarm at:１３:４２Z', clock: '１３:４２Z' },
      { family: 'a date then a bare clock', line: 'paged on 2026-11-25 １３４２', clock: '１３４２' },
      { family: 'a one-digit colon (a ratio, F1)', line: 'scale １:４２', clock: '１:４２' },
      { family: 'an hour-only meridiem (F2)', line: 'quota resets at ５ pm', clock: '５ pm' },
      { family: 'a date then a number', line: 'on 2026-11-25 １２００ items', clock: '１２００' },
    ].map((row) => ({
      ...row,
      line: asAsciiDigits(row.line),
      clock: asAsciiDigits(row.clock),
    }));
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
    const dirRaw = genStagedRepo({ 'map.md': '# map\nscale １:４２\n' });
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
    const dir = genStagedRepo({ 'a.md': 'paged at １３４２Z\n', 'b.md': 'ack at １３４２Z\n' });

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
            '{"ask":"[１４:３２:０７] ~/repo $ npm run test"}\n',
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

  given('[case-scope] the hook source a reader meets (#641, #845)', () => {
    when('[t0] its header is read', () => {
      const header = fs
        .readFileSync(guardPath, 'utf-8').split('\n').slice(0, 8).join('\n');

      then('the .what says every file is in scope, code and prose alike', () => {
        expect(header).toContain('in ANY staged file — code and prose alike');
        expect(header).not.toContain('but .ts/.sh');
        expect(header).not.toContain('snapshot'); // no single file kind reads as the target
      });
    });

    when('[t1] its scan loop is read', () => {
      const source = fs.readFileSync(guardPath, 'utf-8');

      then('it holds no skip by file kind', () => {
        expect(source).not.toMatch(/\*\.ts \| \*\.sh\) continue/);
        expect(source).not.toMatch(/case "\$file" in/);
      });
    });
  });
});
