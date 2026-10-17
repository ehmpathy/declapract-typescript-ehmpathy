import { readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import yaml from 'yaml';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = holds the pr gate the practices emit to the production build (#678) and to the
 *         evaluation suite (#669):
 *           1. every workflow a push or a pull request triggers, that runs a test, also runs
 *              `npm run build` somewhere in its call closure
 *           2. in `.test.yml`, each job that runs a test kind which imports the built artifact
 *              (types, integration, acceptance, evaluation) runs `npm run build` in an earlier step
 *           3. `.test.yml` runs `npm run test:evaluation --if-present`
 * .why  = #678 asked for a `test:build` pr job so a build break surfaces before deploy. the pr gate
 *         already runs the same `npm run build` the deploy runs (`test-types`, and every shard), so a
 *         new job would only duplicate it. what the issue needs is that the coverage cannot regress
 *         — a template edit that drops the build step must go red here, not in a deploy.
 * .note = the closure follows local `uses: ./.github/workflows/<x>` refs by basename, the same
 *         resolution `workflowCallerCalleeReconciliation` uses: a consumer receives one `<x>.yml`.
 * .note = INTEGRATION by the same rule as `actionPins`: it reads the disk.
 */

const REPO_ROOT = join(__dirname, '..');
const PRACTICES_DIR = join(__dirname, 'practices');

/**
 * .what = the test kinds that import the built artifact, so they owe a build step before them
 */
const TEST_KINDS_ON_BUILD = ['types', 'integration', 'acceptance', 'evaluation'];

interface Step {
  run: string;
}

interface Job {
  name: string;
  uses: string | null;
  steps: Step[];
}

interface Workflow {
  path: string;
  base: string;
  triggers: string[];
  jobs: Job[];
}

/**
 * .what = the trigger names of a workflow, across the yaml `on:` key gotcha
 * .why  = a yaml 1.1 parser folds `on:` to the boolean key `true`, so both reads are tried
 */
const asTriggerNames = (parsed: Record<string, unknown>): string[] => {
  const on = parsed['on'] ?? parsed[true as unknown as string];
  if (typeof on === 'string') return [on];
  if (Array.isArray(on)) return on as string[];
  return on && typeof on === 'object' ? Object.keys(on) : [];
};

const asWorkflowFromText = (input: { path: string; text: string }): Workflow => {
  const parsed = (yaml.parse(input.text) ?? {}) as Record<string, unknown>;
  const jobs = (parsed['jobs'] ?? {}) as Record<string, Record<string, unknown>>;
  return {
    path: input.path,
    base: basename(input.path),
    triggers: asTriggerNames(parsed),
    jobs: Object.entries(jobs).map(([name, job]) => ({
      name,
      uses: typeof job['uses'] === 'string' ? job['uses'] : null,
      steps: (Array.isArray(job['steps']) ? (job['steps'] as Record<string, unknown>[]) : []).map(
        (step) => ({ run: typeof step['run'] === 'string' ? step['run'] : '' }),
      ),
    })),
  };
};

const getAllWorkflowTemplates = (): Workflow[] =>
  getAllPathsUnderDir({ dir: PRACTICES_DIR, skip: PRACTICE_TREE_SKIP_DIRS })
    .filter((path) => path.includes('/.github/workflows/') && /\.ya?ml$/.test(path))
    .sort()
    .map((path) =>
      asWorkflowFromText({ path: relative(REPO_ROOT, path), text: readFileSync(path, 'utf-8') }),
    );

const isRunBuild = (run: string): boolean => /\bnpm run build\b/.test(run);
const isRunTest = (run: string): boolean => /\bnpm run test:/.test(run);
const isRunTestOfKind = (input: { run: string; kind: string }): boolean =>
  new RegExp(`\\bnpm run test:${input.kind}\\b`).test(input.run);

/**
 * .what = every step run in a workflow and the local workflows it calls, transitively
 */
const getAllRunsInClosure = (input: {
  workflow: Workflow;
  byBase: Map<string, Workflow>;
  seen: Set<string>;
}): string[] => {
  if (input.seen.has(input.workflow.base)) return [];
  input.seen.add(input.workflow.base);
  return input.workflow.jobs.flatMap((job) => {
    const callee = /^\.\/\.github\/workflows\/(.+)$/.exec(job.uses ?? '')?.[1];
    const calleeFound = callee ? input.byBase.get(callee) : undefined;
    const runsCallee = calleeFound
      ? getAllRunsInClosure({ workflow: calleeFound, byBase: input.byBase, seen: input.seen })
      : [];
    return [...job.steps.map((step) => step.run), ...runsCallee];
  });
};

/**
 * .what = the pr-gate workflows that run a test but never the build, in their closure
 */
const asWorkflowsTestedUnbuilt = (input: { workflows: Workflow[] }): string[] => {
  const byBase = new Map(input.workflows.map((flow) => [flow.base, flow]));
  return input.workflows
    .filter((flow) => flow.triggers.some((name) => name === 'push' || name === 'pull_request'))
    .filter((flow) => {
      const runs = getAllRunsInClosure({ workflow: flow, byBase, seen: new Set() });
      return runs.some(isRunTest) && !runs.some(isRunBuild);
    })
    .map((flow) => flow.path);
};

/**
 * .what = the jobs that run a build-bound test kind with no build in an earlier step
 */
const asJobsTestedBeforeBuild = (input: { workflow: Workflow }): string[] =>
  input.workflow.jobs
    .filter((job) => {
      const runs = job.steps.map((step) => step.run);
      const firstTest = runs.findIndex((run) =>
        TEST_KINDS_ON_BUILD.some((kind) => isRunTestOfKind({ run, kind })),
      );
      if (firstTest === -1) return false;
      return !runs.slice(0, firstTest).some(isRunBuild);
    })
    .map((job) => `${input.workflow.path} :: ${job.name}`);

describe('the pr gate runs the production build (#678) and the evaluation suite (#669)', () => {
  given('[case1] every workflow template under src/practices', () => {
    const scene = useBeforeAll(() => {
      const workflows = getAllWorkflowTemplates();
      const testYml = workflows.find(
        (flow) => flow.base === '.test.yml' && flow.path.includes('/cicd-common/'),
      );
      return { workflows, testYml };
    });

    when('[t0] the walk itself is checked', () => {
      then('it reaches the cicd-common .test.yml -- if red, the walk reaches no pr gate', () => {
        expect(scene.testYml).toBeDefined();
      });
    });

    when('[t1] each pr-gate workflow is followed through its calls', () => {
      then(
        'each one that runs a test also runs `npm run build` -- if red, restore the build step the deploy relies on',
        () => {
          expect(asWorkflowsTestedUnbuilt({ workflows: scene.workflows })).toEqual([]);
        },
      );
    });

    when('[t2] the jobs of .test.yml are read', () => {
      then(
        'each job that runs a build-bound test builds first -- if red, add `npm run build` before that test step',
        () => {
          expect(asJobsTestedBeforeBuild({ workflow: scene.testYml! })).toEqual([]);
        },
      );

      then('a job runs the evaluation suite, a no-op where the command is absent (#669)', () => {
        const runs = scene.testYml!.jobs.flatMap((job) => job.steps.map((step) => step.run));
        expect(runs).toContain('npm run test:evaluation --if-present');
      });

      then('the jobs that build, in order, read as declared', () => {
        expect(
          scene.testYml!.jobs
            .filter((job) => job.steps.some((step) => isRunBuild(step.run)))
            .map((job) => job.name),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] a corpus that is defective on purpose', () => {
    const caller = [
      'on:',
      '  push:',
      'jobs:',
      '  suite:',
      '    uses: ./.github/workflows/.demo-test.yml',
    ].join('\n');
    const callee = [
      'on:',
      '  workflow_call:',
      'jobs:',
      '  test-types:',
      '    runs-on: ubuntu-24.04',
      '    steps:',
      '      - run: npm run test:types',
      '      - run: npm run build',
    ].join('\n');

    when('[t0] the corpus is read the way the walk reads a real one', () => {
      const workflows = [
        asWorkflowFromText({ path: 'demo/.github/workflows/test.yml', text: caller }),
        asWorkflowFromText({ path: 'demo/.github/workflows/.demo-test.yml', text: callee }),
      ];

      then('a build after the test reads as a test before the build', () => {
        expect(asJobsTestedBeforeBuild({ workflow: workflows[1]! })).toEqual([
          'demo/.github/workflows/.demo-test.yml :: test-types',
        ]);
      });

      then('a closure with no build at all is named by its trigger workflow', () => {
        const unbuilt = [
          workflows[0]!,
          asWorkflowFromText({
            path: 'demo/.github/workflows/.demo-test.yml',
            text: callee.replace('      - run: npm run build\n', '').replace(
              '      - run: npm run build',
              '',
            ),
          }),
        ];
        expect(asWorkflowsTestedUnbuilt({ workflows: unbuilt })).toEqual([
          'demo/.github/workflows/test.yml',
        ]);
      });
    });
  });
});
