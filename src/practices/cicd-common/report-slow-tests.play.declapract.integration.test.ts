import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = integration test for the report-slow-tests shell the .test.yml workflow shells out to.
 * .why  = the prior inline report filtered on `perfStats.runtime`, a key jest 30 dropped — so it
 *         matched zero rows and went silent-green for its whole life (radio #602). this clamps the
 *         go-forward: it reads endTime-startTime, ranks by wall-clock, and — the whole point of the
 *         fix — fails LOUD if a future schema change zeroes the durations again, never silent-green.
 * .how  = spawn the shipped best-practice/.github/workflows/report-slow-tests.sh against fixture
 *         jest-results.json files, with GITHUB_STEP_SUMMARY pointed at a temp file, and assert the
 *         exit code, the summary table, and the stdout annotations.
 * .note = subject is the SHIPPED shell template. this file sits at the PRACTICE ROOT (not under
 *         best-practice/), so declapract's loader — which walks only best-practice/ for templates —
 *         never reads it as a declaration and never copies it to a consumer. it is the play-test
 *         counterpart to husky/check.timestamps.play.declapract.integration.test.ts.
 */

// the shell under test (the distributed best-practice template)
const scriptPath = path.join(
  __dirname,
  'best-practice/.github/workflows/report-slow-tests.sh',
);

// write a fixture jest-results.json + a fresh summary sink into a temp dir; return their paths
const genFixture = (
  jestText: string,
): { resultsPath: string; summaryPath: string } => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-slow-tests-'));
  const resultsPath = path.join(dir, 'jest-results.json');
  const summaryPath = path.join(dir, 'step-summary.md');
  fs.writeFileSync(resultsPath, jestText);
  fs.writeFileSync(summaryPath, '');
  return { resultsPath, summaryPath };
};

/**
 * .what = spawn the report against a fixture's raw text; return exit code + stdout + the summary
 * .why  = raw text lets a case hand the report a file jest never finished, which no object can express
 */
const runReportOverText = (
  jestText: string,
): { code: number | null; stdout: string; summary: string } => {
  const { resultsPath, summaryPath } = genFixture(jestText);
  const res = spawnSync('bash', [scriptPath, resultsPath], {
    encoding: 'utf-8',
    env: { ...process.env, GITHUB_STEP_SUMMARY: summaryPath },
  });
  // mask the random fixture dir, so a snapshot neither churns per run nor holds a host path
  const asMaskedFixtureDir = (text: string): string =>
    text.split(path.dirname(resultsPath)).join('[fixture]');
  return {
    code: res.status,
    stdout: asMaskedFixtureDir(res.stdout),
    summary: asMaskedFixtureDir(fs.readFileSync(summaryPath, 'utf-8')),
  };
};

// spawn the report against a fixture object, serialized as jest writes it
const runReport = (
  jestResults: unknown,
): { code: number | null; stdout: string; summary: string } =>
  runReportOverText(JSON.stringify(jestResults));

/**
 * .what = one file entry in the shape jest 30 --json emits (@jest/test-result formatTestResult)
 * .why  = the report reads only startTime, endTime, and each assertion's status; a fixture with
 *         exactly those fields proves which ones the "ran a test" filter depends on
 */
const asFileResult = (input: {
  name: string;
  startTime: number;
  endTime: number;
  tests: ('passed' | 'failed' | 'pending')[];
}) => ({
  name: input.name,
  startTime: input.startTime,
  endTime: input.endTime,
  status: input.tests.every((test) => test === 'pending') ? 'skipped' : 'passed',
  assertionResults: input.tests.map((status) => ({ status })),
});

describe('report-slow-tests', () => {
  given('[case1] a report with a slow (>30s), a medium (>10s), and a fast file', () => {
    when('[t0] the report runs', () => {
      const result = useBeforeAll(() =>
        runReport({
          testResults: [
            asFileResult({ name: '/repo/src/medium.test.ts', startTime: 1000, endTime: 16000, tests: ['passed'] }), // 15s
            asFileResult({ name: '/repo/src/fast.test.ts', startTime: 1000, endTime: 3000, tests: ['passed'] }), // 2s
            asFileResult({ name: '/repo/src/slow.test.ts', startTime: 1000, endTime: 41000, tests: ['failed'] }), // 40s
          ],
        }),
      );

      then('it exits 0', () => {
        expect(result.code).toEqual(0);
      });

      then('the summary carries the ranked table', () => {
        expect(result.summary).toContain('### slowest test files');
        expect(result.summary).toContain('| duration | file |');
      });

      then('the slowest file is ranked first in the table', () => {
        const slowIdx = result.summary.indexOf('/repo/src/slow.test.ts');
        const mediumIdx = result.summary.indexOf('/repo/src/medium.test.ts');
        const fastIdx = result.summary.indexOf('/repo/src/fast.test.ts');
        expect(slowIdx).toBeGreaterThan(-1);
        expect(slowIdx).toBeLessThan(mediumIdx);
        expect(mediumIdx).toBeLessThan(fastIdx);
      });

      then('it emits a warn annotation for the >30s file', () => {
        expect(result.stdout).toContain(
          '::warning file=/repo/src/slow.test.ts::slow test: 40s',
        );
      });

      then('it emits a notice annotation for the >10s file', () => {
        expect(result.stdout).toContain(
          '::notice file=/repo/src/medium.test.ts::test duration: 15s',
        );
      });

      then('it emits no annotation for the fast file', () => {
        expect(result.stdout).not.toContain('/repo/src/fast.test.ts::');
      });

      then('the summary and annotations match snapshot', () => {
        expect(result.summary).toMatchSnapshot('step summary — ranked');
        expect(result.stdout).toMatchSnapshot('stdout annotations — ranked');
      });
    });
  });

  given('[case2] a non-empty report whose durations are all zero (schema drift)', () => {
    // the exact silent-death #602 fixed: testResults present, but no real duration to be read.
    when('[t0] the report runs', () => {
      const result = useBeforeAll(() =>
        runReport({
          testResults: [
            asFileResult({ name: '/repo/src/a.test.ts', startTime: 1000, endTime: 1000, tests: ['passed'] }),
            asFileResult({ name: '/repo/src/b.test.ts', startTime: 2000, endTime: 2000, tests: ['passed'] }),
          ],
        }),
      );

      then('it fails loud with exit 1 (never silent-green)', () => {
        expect(result.code).toEqual(1);
      });

      then('it prints an error annotation that names the schema drift', () => {
        expect(result.stdout).toContain('::error::');
        expect(result.stdout).toContain('jest --json duration schema');
        expect(result.stdout).toContain('read endTime/startTime'); // names the next move
        expect(result.stdout).not.toMatch(/#\d+/); // a bare issue ref dangles in a consumer repo
      });

      then('the error output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot('stdout — schema drift');
      });
    });
  });

  given('[case3] an empty shard (0 test files)', () => {
    when('[t0] the report runs', () => {
      const result = useBeforeAll(() => runReport({ testResults: [] }));

      then('it exits 0 (an empty shard is legitimate)', () => {
        expect(result.code).toEqual(0);
      });

      then('the summary states the empty-shard state explicitly', () => {
        expect(result.summary).toContain('0 test files');
        expect(result.summary).toContain('empty shard');
      });

      then('the summary matches snapshot', () => {
        expect(result.summary).toMatchSnapshot('step summary — empty shard');
      });
    });
  });

  given('[case4] a shard whose only file was skipped (a credential-gated suite) (#788)', () => {
    when('[t0] the report runs', () => {
      const result = useBeforeAll(() =>
        runReport({
          testResults: [
            asFileResult({ name: '/repo/src/gated.acceptance.test.ts', startTime: 5000, endTime: 5000, tests: ['pending', 'pending'] }),
          ],
        }),
      );

      then('it exits 0, since a skipped file holds no duration to rank', () => {
        // a file that ran no test has a zero span by nature; only files that ran a test are ranked
        expect(result.code).toEqual(0);
        expect(result.stdout).not.toContain('::error::');
      });

      then('the summary states that no file ran a test', () => {
        // one file reads in the singular, so the count reads at a glance
        expect(result.summary).toContain('slow-test report: 1 test file in');
        expect(result.summary).not.toContain('1 test files');
        expect(result.summary).toContain('none ran a test (each was skipped, or failed before its first test)');
      });

      then('the summary matches snapshot', () => {
        expect(result.summary).toMatchSnapshot('step summary — all skipped');
      });
    });
  });

  given('[case5] a shard with one skipped file and one that ran', () => {
    when('[t0] the report runs', () => {
      const result = useBeforeAll(() =>
        runReport({
          testResults: [
            asFileResult({ name: '/repo/src/gated.acceptance.test.ts', startTime: 5000, endTime: 5000, tests: ['pending'] }),
            asFileResult({ name: '/repo/src/live.acceptance.test.ts', startTime: 1000, endTime: 13000, tests: ['passed', 'pending'] }),
          ],
        }),
      );

      then('it exits 0 and ranks only the file that ran', () => {
        expect(result.code).toEqual(0);
        expect(result.summary).toContain('/repo/src/live.acceptance.test.ts');
        expect(result.summary).not.toContain('/repo/src/gated.acceptance.test.ts');
        expect(result.summary).toMatchSnapshot('summary — one skipped file, one that ran');
      });
    });
  });

  given('[case6] a report jest never finished (a runner killed mid-write)', () => {
    when('[t0] the report runs', () => {
      const result = useBeforeAll(() =>
        runReportOverText('{"testResults":[{"name":"/repo/src/a.test.ts","startTi'),
      );

      then('it fails with exit 1 and an error that names a corrupt report, not schema drift', () => {
        expect(result.code).toEqual(1);
        expect(result.stdout).toContain('::error::💥 MalfunctionError: slow-test report could not parse');
        expect(result.stdout).not.toContain('duration schema');
      });

      then('the error output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot('stdout — corrupt report');
      });
    });
  });

  given('[case7] a report whose run counts say tests ran, yet no file shows one (status schema drift)', () => {
    when('[t0] the report runs', () => {
      const result = useBeforeAll(() =>
        runReport({
          numPassedTests: 3,
          numFailedTests: 0,
          testResults: [
            // the per-test status moved to a name the filter does not read
            { name: '/repo/src/a.test.ts', startTime: 1000, endTime: 4000, assertionResults: [{ outcome: 'passed' }] },
          ],
        }),
      );

      then('it fails loud with exit 1, never a quiet "none ran"', () => {
        expect(result.code).toEqual(1);
        expect(result.summary).not.toContain('none ran a test');
      });

      then('it prints an error annotation that names the assertionResults drift and the next move', () => {
        expect(result.stdout).toContain('::error::💥 MalfunctionError: slow-test report found 3 tests that ran');
        expect(result.stdout).toContain('read testResults[].assertionResults[].status');
        expect(result.stdout).toMatchSnapshot('stdout — status schema drift');
      });
    });
  });

  given('[case8] a report whose run counts say tests ran, yet `testResults` moved (an empty shard look-alike)', () => {
    when('[t0] the report runs', () => {
      const result = useBeforeAll(() =>
        runReport({
          numPassedTests: 2,
          numFailedTests: 1,
          fileResults: [asFileResult({ name: '/repo/src/a.test.ts', startTime: 1000, endTime: 4000, tests: ['passed'] })],
        }),
      );

      then('it fails loud with exit 1 as drift, never "0 test files (empty shard)"', () => {
        expect(result.code).toEqual(1);
        expect(result.summary).not.toContain('empty shard');
        expect(result.stdout).toContain(
          '::error::💥 MalfunctionError: slow-test report found 3 tests that ran yet no testResults entry at all',
        );
        // its own hint, never the status-drift hint of case7
        expect(result.stdout).toContain('read the top-level keys of');
        expect(result.stdout).not.toContain('assertionResults');
        expect(result.stdout).toMatchSnapshot('stdout — testResults moved');
      });
    });
  });
});
