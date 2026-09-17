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
  jestResults: unknown,
): { resultsPath: string; summaryPath: string } => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-slow-tests-'));
  const resultsPath = path.join(dir, 'jest-results.json');
  const summaryPath = path.join(dir, 'step-summary.md');
  fs.writeFileSync(resultsPath, JSON.stringify(jestResults));
  fs.writeFileSync(summaryPath, '');
  return { resultsPath, summaryPath };
};

// spawn the report against a fixture; return exit code + stdout + the summary file contents
const runReport = (
  jestResults: unknown,
): { code: number | null; stdout: string; summary: string } => {
  const { resultsPath, summaryPath } = genFixture(jestResults);
  const res = spawnSync('bash', [scriptPath, resultsPath], {
    encoding: 'utf-8',
    env: { ...process.env, GITHUB_STEP_SUMMARY: summaryPath },
  });
  return {
    code: res.status,
    stdout: res.stdout,
    summary: fs.readFileSync(summaryPath, 'utf-8'),
  };
};

describe('report-slow-tests', () => {
  given('[case1] a report with a slow (>30s), a medium (>10s), and a fast file', () => {
    when('[t0] the report runs', () => {
      const result = useBeforeAll(() =>
        runReport({
          testResults: [
            { name: '/repo/src/medium.test.ts', startTime: 1000, endTime: 16000 }, // 15s
            { name: '/repo/src/fast.test.ts', startTime: 1000, endTime: 3000 }, // 2s
            { name: '/repo/src/slow.test.ts', startTime: 1000, endTime: 41000 }, // 40s
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
    });
  });

  given('[case2] a non-empty report whose durations are all zero (schema drift)', () => {
    // the exact silent-death #602 fixed: testResults present, but no real duration to be read.
    when('[t0] the report runs', () => {
      const result = useBeforeAll(() =>
        runReport({
          testResults: [
            { name: '/repo/src/a.test.ts', startTime: 1000, endTime: 1000 },
            { name: '/repo/src/b.test.ts', startTime: 2000, endTime: 2000 },
          ],
        }),
      );

      then('it fails loud with exit 1 (never silent-green)', () => {
        expect(result.code).toEqual(1);
      });

      then('it prints an error annotation that names the schema drift', () => {
        expect(result.stdout).toContain('::error::');
        expect(result.stdout).toContain('jest --json duration schema');
        expect(result.stdout).toContain('#602');
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
    });
  });
});
