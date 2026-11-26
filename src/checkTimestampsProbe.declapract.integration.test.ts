import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = integration test for the repo-local check.timestamps.probe skill
 * .why = the probe is the read a maintainer runs before any edit to the hook's pattern ships
 *        (rule.forbid.timestamp-hook-exemptions); a drift in its verdicts, its halt parse, or its
 *        exits would mislead that read in silence
 * .how = spawn the probe from the repo root over temp case files; mask temp paths and clocks
 *        before each snapshot, since a .snap is scanned by the very hook the probe runs
 */

// the repo root, where the probe expects to run
const repoDir = path.join(__dirname, '..');
const probePath = path.join(
  repoDir,
  '.agent/repo=.this/role=any/skills/check.timestamps.probe.sh',
);
const hookPath = path.join(
  repoDir,
  'src/practices/husky/best-practice/.husky/check.timestamps.sh',
);

// one parent dir holds every temp file this suite makes, so one afterAll removes them all
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'check-timestamps-probe-'));
afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

// write a cases file, one candidate per line, at a fixed name so a masked snapshot is stable
const genCasesFile = (input: { name: string; lines: string[] }): string => {
  const file = path.join(tempRoot, `${input.name}.txt`);
  fs.writeFileSync(file, `${input.lines.join('\n')}\n`);
  return file;
};

// spawn the probe from a repo (this one by default); return its exit code + streams
const runProbe = (input: {
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}): { code: number | null; stdout: string; stderr: string } => {
  const res = spawnSync('bash', [probePath, ...input.args], {
    cwd: input.cwd ?? repoDir,
    env: { ...process.env, ...input.env },
    encoding: 'utf-8',
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
};

// mask what varies per host or would trip the hook: the temp root, the repo root, the probe's
// own scratch dir, and the one clock the cases use
const asMasked = (input: { text: string }): string =>
  input.text
    .split(tempRoot)
    .join('[temp]')
    .split(repoDir)
    .join('[repo]')
    .replace(/\S*\/\.git\/hook\.head\.sh/g, '[scratch]/.git/hook.head.sh')
    .split('1342Z')
    .join('[timestamp]');

// a consumer-shaped corpus: tracked files, one untracked file, one ignored file
const genCorpusRepo = (input: { name: string }): string => {
  const dir = path.join(tempRoot, input.name);
  fs.mkdirSync(path.join(dir, 'notes'), { recursive: true });
  spawnSync('git', ['init', '-q'], { cwd: dir });
  fs.writeFileSync(path.join(dir, '.gitignore'), 'notes/e.md\n');
  fs.writeFileSync(path.join(dir, 'notes/a.md'), 'paged at 1342Z\n');
  fs.writeFileSync(path.join(dir, 'notes/b.md'), 'shipped on 2026-11-25\n');
  fs.writeFileSync(path.join(dir, 'notes/c.md'), 'ack at 1342Z\n');
  spawnSync('git', ['add', '-A'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'notes/d.md'), 'retro at 1342Z\n');
  fs.writeFileSync(path.join(dir, 'notes/e.md'), 'scratch at 1342Z\n');
  return dir;
};

describe('check.timestamps.probe', () => {
  given('[case1] a cases file with one clock and one date alone', () => {
    const casesFile = genCasesFile({
      name: 'case1',
      lines: ['paged at 1342Z', 'shipped on 2026-11-25'],
    });

    when('[t0] the probe runs in verdict mode', () => {
      const result = runProbe({ args: ['--cases', casesFile] });

      then('it exits 0', () => {
        expect(result.code).toEqual(0);
      });
      then('it marks the clock halt', () => {
        expect(result.stdout).toContain('halt\tpaged at 1342Z\n');
      });
      then('it marks the date alone pass', () => {
        expect(result.stdout).toContain('pass\tshipped on 2026-11-25\n');
      });
      then('the output, masked, matches snapshot', () => {
        expect(asMasked({ text: result.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the probe runs with --show full', () => {
      const result = runProbe({ args: ['--cases', casesFile, '--show', 'full'] });

      then('it exits 0', () => {
        expect(result.code).toEqual(0);
      });
      then('it prints the halt a dev sees, with the case line', () => {
        expect(result.stdout).toContain(
          '✋ ConstraintError: timestamps are forbidden in tracked files',
        );
        expect(result.stdout).toContain('   └─ case.0001.md:1:paged at 1342Z\n');
      });
      then('the output, masked, matches snapshot', () => {
        expect(asMasked({ text: result.stdout })).toMatchSnapshot();
      });
    });
  });

  // several halts in one run drive the loop that unstages through each halted file
  given('[case2] a cases file with clocks on lines 1 and 3, and passes between', () => {
    const casesFile = genCasesFile({
      name: 'case2',
      lines: ['paged at 1342Z', 'no time here', 'ack at 1342Z', 'shipped on 2026-11-25'],
    });

    when('[t0] the probe runs', () => {
      const result = runProbe({ args: ['--cases', casesFile] });

      then('it exits 0', () => {
        expect(result.code).toEqual(0);
      });
      then('it gives one verdict per line, in input order', () => {
        expect(result.stdout).toContain(
          [
            'halt\tpaged at 1342Z',
            'pass\tno time here',
            'halt\tack at 1342Z',
            'pass\tshipped on 2026-11-25',
            '',
          ].join('\n'),
        );
      });
      then('the output, masked, matches snapshot', () => {
        expect(asMasked({ text: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case3] a dir that holds no clock', () => {
    // a repo this suite owns, so the count cannot drift with this repo's own content
    const cleanDir = path.join(tempRoot, 'case3');
    fs.mkdirSync(path.join(cleanDir, 'notes'), { recursive: true });
    spawnSync('git', ['init', '-q'], { cwd: cleanDir });
    fs.writeFileSync(path.join(cleanDir, 'notes/b.md'), 'shipped on 2026-11-25\n');
    spawnSync('git', ['add', '-A'], { cwd: cleanDir });

    when('[t0] the probe reads every tracked file (--cases @tracked)', () => {
      const result = runProbe({
        args: ['--cases', '@tracked', '--hook', hookPath],
        cwd: cleanDir,
      });

      then('it exits 0', () => {
        expect(result.code).toEqual(0);
      });
      then('it reports zero of one file halted, with no halt row', () => {
        expect(result.stdout).toContain('\n\nfiles halted: 0 of 1\n');
        expect(result.stdout).not.toContain('halt\t');
      });
      then('the output, masked, matches snapshot', () => {
        expect(asMasked({ text: result.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the probe scans it (--scan notes)', () => {
      const result = runProbe({
        args: ['--scan', 'notes', '--hook', hookPath],
        cwd: cleanDir,
      });

      then('it exits 0', () => {
        expect(result.code).toEqual(0);
      });
      then('it reports zero of one file halted', () => {
        expect(result.stdout).toContain('files halted: 0 of 1\n');
      });
      then('the output matches snapshot', () => {
        expect(asMasked({ text: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case4] the hook as committed at HEAD', () => {
    const casesFile = genCasesFile({ name: 'case4', lines: ['shipped on 2026-11-25'] });

    when('[t0] the probe runs with --hook @head', () => {
      const result = runProbe({ args: ['--cases', casesFile, '--hook', '@head'] });

      then('it exits 0', () => {
        expect(result.code).toEqual(0);
      });
      then('it echoes --hook @head, and runs the hook read from HEAD', () => {
        expect(result.stdout).toContain(' --hook @head --show verdict\n');
        expect(result.stdout).toContain('.git/hook.head.sh\n');
      });
      then('it gives a verdict for the date alone', () => {
        expect(result.stdout).toContain('pass\tshipped on 2026-11-25\n');
      });
      then('the output, its scratch dir masked, matches snapshot', () => {
        // a date alone passes on the old hook and the new, so the verdict holds as HEAD moves
        expect(asMasked({ text: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case5] bad input', () => {
    const casesFile = genCasesFile({ name: 'case5', lines: ['shipped on 2026-11-25'] });
    // a dir outside any git repo; git's own env var stops its search above the temp root
    const outsideDir = path.join(tempRoot, 'outside');
    fs.mkdirSync(outsideDir, { recursive: true });
    const badTable: {
      name: string;
      args: string[];
      cwd?: string;
      env?: Record<string, string>;
    }[] = [
      { name: 'no input named', args: [] },
      { name: 'both inputs named', args: ['--cases', casesFile, '--scan', 'src'] },
      { name: 'a flag with no value', args: ['--cases'] },
      { name: 'an unknown flag', args: ['--cases', casesFile, '--loud'] },
      { name: 'a --show value outside the set', args: ['--cases', casesFile, '--show', 'loud'] },
      { name: 'a cases file not found', args: ['--cases', path.join(tempRoot, 'absent.txt')] },
      { name: 'a scan dir not found', args: ['--scan', 'absent-dir'] },
      { name: 'a hook not found', args: ['--cases', casesFile, '--hook', path.join(tempRoot, 'absent.sh')] },
      {
        name: 'a cwd outside any git repo',
        args: ['--cases', casesFile],
        cwd: outsideDir,
        env: { GIT_CEILING_DIRECTORIES: tempRoot },
      },
    ];
    badTable.forEach((row, index) => {
      when(`[t${index}] the probe runs with ${row.name}`, () => {
        const result = runProbe({ args: row.args, cwd: row.cwd, env: row.env });

        then('it exits 2', () => {
          expect(result.code).toEqual(2);
        });
        then('it opens stderr with a ConstraintError header', () => {
          expect(result.stderr.startsWith('✋ ConstraintError: ')).toEqual(true);
        });
        then('the refusal, masked, matches snapshot', () => {
          expect(asMasked({ text: result.stderr })).toMatchSnapshot();
        });
      });
    });
  });

  given('[case6] a hook whose pattern grep cannot compile', () => {
    const casesFile = genCasesFile({ name: 'case6', lines: ['shipped on 2026-11-25'] });
    const hookBroken = path.join(tempRoot, 'hook.broken.sh');
    fs.writeFileSync(
      hookBroken,
      fs
        .readFileSync(hookPath, 'utf-8')
        .replace('TIMESTAMP_PATTERN="', 'TIMESTAMP_PATTERN="('),
    );

    when('[t0] the probe runs it', () => {
      const result = runProbe({ args: ['--cases', casesFile, '--hook', hookBroken] });

      then('it exits 1', () => {
        expect(result.code).toEqual(1);
      });
      then('it names the hook exit under its own MalfunctionError header', () => {
        expect(result.stderr).toContain(
          '💥 MalfunctionError: the hook exited 1, neither a pass (0) nor a halt (2)\n   └─ hook stderr\n      ├─\n',
        );
      });
      then('it nests the hook stderr whole, the hook header included', () => {
        expect(result.stderr).toContain(
          '      │  💥 MalfunctionError: check.timestamps could not run its pattern; the guard is broken\n',
        );
      });
      then('the fault, its grep line dropped, matches snapshot', () => {
        // grep words its own compile error per platform; every other line is the probe's or the hook's
        const lines = result.stderr.split('\n').filter((line) => !line.includes('grep: '));
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  // corpus mode, where a clock is found: the HIT rows a maintainer reads before a pattern ships
  given('[case7] a repo with clocks in two tracked files, one untracked, one ignored', () => {
    const corpusDir = genCorpusRepo({ name: 'case7' });

    when('[t0] the probe reads every tracked file (--cases @tracked)', () => {
      const result = runProbe({
        args: ['--cases', '@tracked', '--hook', hookPath],
        cwd: corpusDir,
      });

      then('it exits 0', () => {
        expect(result.code).toEqual(0);
      });
      then('it prints one halt row per tracked file that halts, in name order', () => {
        expect(result.stdout).toContain(
          'halt\tnotes/a.md:1:paged at 1342Z\nhalt\tnotes/c.md:1:ack at 1342Z\n\nfiles halted: 2 of 4\n',
        );
      });
      then('it leaves the untracked and the ignored file unread', () => {
        expect(result.stdout).not.toContain('notes/d.md');
        expect(result.stdout).not.toContain('notes/e.md');
      });
      then('the output, masked, matches snapshot', () => {
        expect(asMasked({ text: result.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the probe scans the dir (--scan notes)', () => {
      const result = runProbe({
        args: ['--scan', 'notes', '--hook', hookPath],
        cwd: corpusDir,
      });

      then('it exits 0', () => {
        expect(result.code).toEqual(0);
      });
      then('it prints a halt row for the tracked and the untracked file that halt', () => {
        expect(result.stdout).toContain(
          'halt\tnotes/a.md:1:paged at 1342Z\nhalt\tnotes/c.md:1:ack at 1342Z\nhalt\tnotes/d.md:1:retro at 1342Z\n\nfiles halted: 3 of 4\n',
        );
      });
      then('it leaves the ignored file unread, as a commit would', () => {
        expect(result.stdout).not.toContain('notes/e.md');
      });
      then('the output, masked, matches snapshot', () => {
        expect(asMasked({ text: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case8] a maintainer who asks for usage', () => {
    when('[t0] the probe runs with --help', () => {
      const result = runProbe({ args: ['--help'] });

      then('it exits 0', () => {
        expect(result.code).toEqual(0);
      });
      then('it prints the usage block', () => {
        expect(result.stdout).toContain('# usage:\n');
      });
      then('the usage matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case9] the route args rhachet passes to every skill', () => {
    const casesFile = genCasesFile({ name: 'case9', lines: ['shipped on 2026-11-25'] });

    when('[t0] the probe runs with --skill, --repo, and --role before its own args', () => {
      const result = runProbe({
        args: [
          '--skill',
          'check.timestamps.probe',
          '--repo',
          '.this',
          '--role',
          'any',
          '--cases',
          casesFile,
        ],
      });

      then('it exits 0, the route args absorbed', () => {
        expect(result.code).toEqual(0);
      });
      then('it gives the verdict as with no route args', () => {
        expect(result.stdout).toContain('pass\tshipped on 2026-11-25\n');
      });
    });
  });
});
