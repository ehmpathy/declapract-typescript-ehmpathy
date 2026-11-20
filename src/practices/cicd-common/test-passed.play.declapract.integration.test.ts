import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, when } from 'test-fns';
import yaml from 'yaml';

/**
 * .what = proves the `test-passed` gate (#781 #782): the one check branch protection requires
 * .why  = protection that names inner jobs strands every upgrade pr whose jobs were renamed; the
 *         gate decouples the two. it must pass only on a green suite, treat a skipped job as a
 *         pass, and name each job that failed or was cancelled
 * .how  = run the gate's own `run` script from test.yml under bash, with the env github sets
 */

const workflowsDir = path.join(__dirname, 'best-practice/.github/workflows');

// the workflows under test, parsed
// .note = yaml.parse returns any (an external boundary); each cast names only the paths read, and
//         an absent path reads undefined, which [case1] reddens by name
const testYml = yaml.parse(fs.readFileSync(path.join(workflowsDir, 'test.yml'), 'utf-8')) as {
  jobs: Record<
    string,
    { if?: string; needs?: string[]; steps?: { run?: string; env?: Record<string, string> }[] }
  >;
};
const dotTestYml = yaml.parse(fs.readFileSync(path.join(workflowsDir, '.test.yml'), 'utf-8')) as {
  on: { workflow_call: { outputs: Record<string, { value: string }> } };
  jobs: Record<string, unknown>;
};

// the gate's verdict script, as github runs it
const gateScript = testYml.jobs['test-passed']?.steps?.[0]?.run ?? '';

/**
 * .what = run the gate's verdict step under bash, with the env github sets for it
 * .why  = proves the step itself, not a copy: SUITE_RESULT and SUITE_JOB_RESULTS are what the
 *         `env:` block feeds it, and GITHUB_STEP_SUMMARY is the file github renders
 */
const runGate = (input: {
  suiteResult: string;
  jobResults: Record<string, string> | null;
}): { code: number | null; stdout: string; summary: string } => {
  const summaryPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'test-passed-')), 'summary.md');
  const res = spawnSync('bash', ['-e', '-c', gateScript], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      SUITE_RESULT: input.suiteResult,
      SUITE_JOB_RESULTS: JSON.stringify(input.jobResults),
      GITHUB_STEP_SUMMARY: summaryPath,
      // the run github names, so the halt's run link is fixed in a snapshot
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_REPOSITORY: 'ehmpathy/svc-surf',
      GITHUB_RUN_ID: '1234',
    },
  });
  const summary = fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath, 'utf-8') : '';
  return { code: res.status, stdout: res.stdout, summary };
};

describe('test-passed gate', () => {
  given('[case1] the gate as declared in test.yml', () => {
    when('[t0] its job is read', () => {
      then('it needs the suite and runs always, so a red or cancelled suite still reports', () => {
        expect(testYml.jobs['test-passed']?.needs).toEqual(['suite']);
        expect(testYml.jobs['test-passed']?.if).toEqual('always()');
        expect(gateScript).not.toEqual('');
      });
      then('its step reads the suite roll-up and every exported job result, the env runGate stands in for', () => {
        // a mistyped wire here would leave every red as `no job result reached the gate`
        expect(testYml.jobs['test-passed']?.steps?.[0]?.env).toEqual({
          SUITE_RESULT: '${{ needs.suite.result }}',
          SUITE_JOB_RESULTS: '${{ toJSON(needs.suite.outputs) }}',
        });
      });
      then('.test.yml exports a result for every job it declares, so no job slips past the gate', () => {
        const outputJobs = Object.entries(dotTestYml.on.workflow_call.outputs).map(([key, output]) => {
          expect(output.value).toEqual(`\${{ jobs.${key.replace(/^result-/, '')}.result }}`);
          return key.replace(/^result-/, '');
        });
        expect(outputJobs.sort()).toEqual(Object.keys(dotTestYml.jobs).sort());
      });
      then('every check the older protection requires still reports, so the first upgrade pr can merge', () => {
        // .why = an adopter's live protection names these until its main apply flips it to the gate;
        //        a rename here would strand that adopter's upgrade pr on a check no job reports
        const installYml = yaml.parse(fs.readFileSync(path.join(workflowsDir, '.install.yml'), 'utf-8')) as {
          jobs: Record<string, { name?: string }>;
        };
        const jobsOfSuite = dotTestYml.jobs as Record<string, { name?: string; uses?: string }>;
        const asCheckName = (input: { jobs: Record<string, { name?: string }>; id: string }) =>
          input.jobs[input.id] ? (input.jobs[input.id]?.name ?? input.id) : null;
        expect(jobsOfSuite.install?.uses).toEqual('./.github/workflows/.install.yml');
        const checksReported = [
          `suite / ${asCheckName({ jobs: jobsOfSuite, id: 'install' })} / ${asCheckName({ jobs: installYml.jobs, id: 'pnpm' })}`,
          ...[
            'enshard',
            'test-commits',
            'test-types',
            'test-format',
            'test-lint',
            'test-unit',
            'test-integration',
            'test-acceptance-locally',
          ].map((id) => `suite / ${asCheckName({ jobs: jobsOfSuite, id })}`),
        ];
        expect(checksReported).toEqual([
          'suite / install / pnpm',
          'suite / enshard',
          'suite / test-commits',
          'suite / test-types',
          'suite / test-format',
          'suite / test-lint',
          'suite / test-unit',
          'suite / test-integration',
          'suite / test-acceptance-locally',
        ]);
      });
    });
  });

  given('[case2] a green suite, with a skipped acceptance', () => {
    when('[t0] the gate runs', () => {
      const result = runGate({
        suiteResult: 'success',
        jobResults: {
          'result-test-unit': 'success',
          'result-test-integration': 'success',
          'result-test-acceptance-locally': 'skipped',
        },
      });

      then('it passes with exit 0', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain('✨ every suite job passed or was skipped');
      });
      then('the log and summary match snapshot', () => {
        expect(result.stdout).toMatchSnapshot('test-passed — passed');
        expect(result.summary).toMatchSnapshot('test-passed summary — passed');
      });
    });
  });

  given('[case3] a red acceptance suite', () => {
    when('[t0] the gate runs', () => {
      const result = runGate({
        suiteResult: 'failure',
        jobResults: {
          'result-test-unit': 'success',
          'result-test-shards-acceptance': 'failure',
          'result-test-acceptance-locally': 'failure',
        },
      });

      then('it fails with exit 1, and names each failed job in its log and summary', () => {
        expect(result.code).toEqual(1);
        expect(result.stdout).toContain('✋ ConstraintError: the suite did not pass\n   ├─ roll-up: failure');
        expect(result.stdout).toContain('suite / test-acceptance-locally: failure');
        expect(result.stdout).toContain('suite / test-shards-acceptance: failure');
        expect(result.stdout).not.toContain('test-unit');
        expect(result.summary).toContain('- suite / test-acceptance-locally: failure');
        // the halt links the run and names the rerun, so a flake is not read as a code fault
        expect(result.stdout).toContain('run: https://github.com/ehmpathy/svc-surf/actions/runs/1234');
        expect(result.stdout).toContain('rerun the failed jobs');
      });
      then('the log and summary match snapshot', () => {
        expect(result.stdout).toMatchSnapshot('test-passed — red acceptance');
        expect(result.summary).toMatchSnapshot('test-passed summary — red acceptance');
      });
    });
  });

  given('[case4] a cancelled suite', () => {
    when('[t0] the gate runs', () => {
      const result = runGate({
        suiteResult: 'cancelled',
        jobResults: { 'result-test-unit': 'cancelled' },
      });

      then('it fails with exit 1, and names the cancelled job', () => {
        expect(result.code).toEqual(1);
        expect(result.stdout).toContain('suite / test-unit: cancelled');
        // a cancel has no cause of its own, so the fix leads with the rerun
        expect(result.stdout).toContain('└─ fix: rerun the cancelled jobs in that run');
        expect(result.stdout).toMatchSnapshot('test-passed — cancelled');
        expect(result.summary).toMatchSnapshot('test-passed summary — cancelled');
      });
    });
  });

  given('[case5] a red suite whose job results never reached the gate', () => {
    when('[t0] the gate runs with empty outputs', () => {
      const result = runGate({ suiteResult: 'failure', jobResults: {} });

      then('it still fails with exit 1, and says where to look', () => {
        expect(result.code).toEqual(1);
        expect(result.stdout).toContain('no job result reached the gate');
        // the summary a reviewer reads on the check page says why, not just `failure`
        expect(result.summary).toContain('- no job result reached the gate');
        // no job is named, so the fix never points at one
        expect(result.stdout).toContain('fix: open the suite jobs in that run and find the step that failed');
        expect(result.stdout).not.toContain('open the job named above');
        expect(result.stdout).toMatchSnapshot('test-passed — no job result');
        expect(result.summary).toMatchSnapshot('test-passed summary — no job result');
      });
    });
  });

  given('[case5.1] a green suite whose job results never reached the gate', () => {
    when('[t0] the gate runs with empty outputs', () => {
      const result = runGate({ suiteResult: 'success', jobResults: {} });

      then('it passes on the roll-up, and warns that no job result arrived, since the names only explain a red', () => {
        // .why = a gate that vetoed a green on absent names would block every pr on a wire fault
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain('::warning title=test-passed::no job result reached the gate');
        // the green claims the roll-up alone, never that every job passed, since none was seen
        expect(result.stdout).toContain('✨ the suite rolled up as success; no job result reached the gate to name');
        expect(result.stdout).not.toContain('every suite job passed');
        // a green carries no red reason in its summary
        expect(result.summary).toEqual('## test-passed\n\n- roll-up: success\n');
        expect(result.stdout).toMatchSnapshot('test-passed — green roll-up, no job result');
        expect(result.summary).toMatchSnapshot('test-passed summary — green roll-up, no job result');
      });
    });
  });

  given('[case6] a suite that rolled up as success while a job failed', () => {
    when('[t0] the gate runs', () => {
      const result = runGate({
        suiteResult: 'success',
        jobResults: { 'result-test-lint': 'failure' },
      });

      then('the job result wins: it fails with exit 1 and names the job', () => {
        // .why = the roll-up of a reusable call is not documented; the gate reads both, so
        //        neither sense of it can pass a red job
        expect(result.code).toEqual(1);
        expect(result.stdout).toContain('suite / test-lint: failure');
        // the roll-up sits on its own branch, so the header never reads "did not pass" beside "success"
        expect(result.stdout).toContain('✋ ConstraintError: the suite did not pass\n   ├─ roll-up: success');
        expect(result.stdout).not.toContain('did not pass (suite: success)');
        expect(result.stdout).toMatchSnapshot('test-passed — job result wins');
        expect(result.summary).toMatchSnapshot('test-passed summary — job result wins');
      });
    });
  });

  given('[case7] a red suite whose every job result reads passed (a step outside the jobs failed)', () => {
    when('[t0] the gate runs', () => {
      const result = runGate({
        suiteResult: 'failure',
        jobResults: { 'result-test-unit': 'success', 'result-test-lint': 'skipped' },
      });

      then('it fails with exit 1, and says the results arrived rather than claim none did', () => {
        expect(result.code).toEqual(1);
        expect(result.stdout).not.toContain('no job result reached the gate');
        expect(result.stdout).toContain('every job result reads passed or skipped, yet the suite failed');
        expect(result.summary).toContain('- every job result reads passed or skipped, yet the suite failed');
        expect(result.stdout).toContain('fix: open the suite jobs in that run and find the step that failed');
        expect(result.stdout).toMatchSnapshot('test-passed — red suite, green job results');
        expect(result.summary).toMatchSnapshot('test-passed summary — red suite, green job results');
      });
    });
  });

  given('[case8] a red suite whose outputs are null', () => {
    when('[t0] the gate runs', () => {
      const result = runGate({ suiteResult: 'failure', jobResults: null });

      then('it fails with exit 1 through its own message and summary, never a jq fault', () => {
        expect(result.code).toEqual(1);
        expect(result.stdout).toContain('✋ ConstraintError: the suite did not pass\n   ├─ roll-up: failure');
        expect(result.stdout).toContain('no job result reached the gate');
        expect(result.summary).toContain('- roll-up: failure');
      });
    });
  });
});
