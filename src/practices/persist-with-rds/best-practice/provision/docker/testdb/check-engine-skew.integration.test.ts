import { genTempDir, given, then, useThen, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = run the skew check, against a testdb pin and a supplied livedb version, or the livedb
 */
const runSkewCheck = (input: {
  testdbPin: string | null;
  livedbVersion: string | null;
}): { status: number | null; stdout: string; stderr: string } => {
  const dockerfileArgs = (() => {
    if (input.testdbPin === null) return [];
    const dockerfile = join(
      genTempDir({ slug: 'check-engine-skew' }),
      'build-image.dockerfile',
    );
    writeFileSync(dockerfile, `${input.testdbPin}\n`);
    return ['--dockerfile', dockerfile];
  })();
  const result = spawnSync(
    'bash',
    [
      join(__dirname, 'check-engine-skew.sh'),
      ...dockerfileArgs,
      ...(input.livedbVersion === null
        ? []
        : ['--livedb-version', input.livedbVersion]),
    ],
    { encoding: 'utf-8', env: process.env },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

describe('check-engine-skew', () => {
  given('[case1] the testdb leads the livedb', () => {
    when('[t0] the check runs', () => {
      const result = useThen('it halts', async () =>
        runSkewCheck({
          testdbPin: 'FROM postgres:17.11',
          livedbVersion: '13.23',
        }),
      );

      then('it exits 2 and names both fixes', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError');
        expect(result.stderr).toContain('pin the testdb to postgres 13');
      });
    });
  });

  given('[case2] the testdb trails the livedb', () => {
    when('[t0] the check runs', () => {
      const result = useThen('it passes with a warn', async () =>
        runSkewCheck({
          testdbPin: 'FROM postgres:13.20',
          livedbVersion: '17.11',
        }),
      );

      then('it exits 0 and emits a github warn', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('::warning title=engine skew::');
      });
    });
  });

  given('[case3] the majors match', () => {
    when('[t0] the check runs', () => {
      const result = useThen('it passes', async () =>
        runSkewCheck({
          testdbPin: 'FROM postgres:17.11',
          livedbVersion: '17.7',
        }),
      );

      then('it exits 0 with no warn', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('majors match');
        expect(result.stdout).not.toContain('::warning');
      });
    });
  });

  // the gate: the one case that reads the livedb through aws. it needs rds:DescribeDBClusters on
  // the livedb's account, and with no grant it fails loud on the MalfunctionError, which names it
  given('[case4] the livedb, read through aws', () => {
    when('[t0] the check runs against this repo testdb pin', () => {
      const result = useThen('the read completes', async () =>
        runSkewCheck({ testdbPin: null, livedbVersion: null }),
      );

      then('the read succeeds, never a malfunction', () => {
        expect(result.stderr).not.toContain('💥 MalfunctionError');
        expect(result.status).not.toEqual(1);
      });

      then('the testdb does not lead the livedb', () => {
        expect(result.stderr).not.toContain('✋ ConstraintError');
        expect(result.status).toEqual(0);
      });

      then('it reports the version the livedb returned', () => {
        expect(result.stdout).toMatch(/livedb: postgres \d+(\.\d+)*\n/);
      });
    });
  });
});
