import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import yaml from 'yaml';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = holds every workflow TEMPLATE under `src/practices` to job-scope oidc (#550 part 2):
 *           1. a workflow with a job that runs steps carries no workflow-level `id-token`
 *           2. each job that mints an oidc token declares `id-token: write` at job scope
 *           3. no job grants `id-token: write` that does not mint one
 *           4. a job-level `permissions:` block also grants `contents: read`
 *           5. a local reusable-call job grants `id-token: write` only where its callee mints one
 * .why  = a workflow-level `permissions:` block reaches EVERY job in the file. a lint, unit, or
 *         install job that never touches aws can then mint an oidc token and assume the cloud role,
 *         and a poisoned action in any of those jobs reaches for it (owasp cicd-sec-3 + cicd-sec-4).
 *         at job scope the grant reaches only the job that calls `configure-aws-credentials`.
 * .note = a workflow whose jobs are ALL reusable calls (`uses: ./.github/workflows/<x>`) may keep
 *         the workflow-level grant: no step of its own can mint the token, and a callee job cannot
 *         exceed its caller's grant — so the caller must hold it as the upper bound.
 * .note = a job-level `permissions:` block REPLACES the workflow-level one for that job, it does
 *         not merge. so the job that gains `id-token: write` must restate `contents: read`, or its
 *         checkout loses read access in a private repo — assertion 4 holds that.
 * .note = INTEGRATION by the same rule as `actionPins`: it walks the filesystem, and
 *         `rule.forbid.unit.remote-boundaries` puts any test that reads the disk in the
 *         integration suite.
 */

const REPO_ROOT = join(__dirname, '..');
const PRACTICES_DIR = join(__dirname, 'practices');

interface WorkflowJob {
  name: string;
  runsSteps: boolean;
  mintsOidc: boolean;
  /**
   * .what = the reusable workflow a call job names (`uses:` at job level), or null for a step job
   * .why  = a callee cannot exceed its caller's grant, so a call job whose callee mints must hold
   *         `id-token: write` itself; the grant is earned only where that callee mints, so the
   *         callee is read too
   */
  calleeUses: string | null;
  permissions: Record<string, string> | null;
}

interface Workflow {
  path: string;
  permissions: Record<string, string> | null;
  jobs: WorkflowJob[];
}

/**
 * .what = whether a step mints an oidc token
 * .why  = three shapes reach for the token: the aws credentials action, a direct request to the
 *         runner's token endpoint, and `npm publish --provenance` (npm trusted publish)
 */
const isStepOidcMinter = (step: Record<string, unknown>): boolean => {
  const uses = typeof step['uses'] === 'string' ? step['uses'] : '';
  const run = typeof step['run'] === 'string' ? step['run'] : '';
  return (
    uses.startsWith('aws-actions/configure-aws-credentials@') ||
    run.includes('ACTIONS_ID_TOKEN_REQUEST') ||
    run.includes('--provenance')
  );
};

/**
 * .what = a permissions node as a key→value record, or null when absent
 * .why  = github accepts a map or a shorthand string (`read-all`); a string reads as no map, and
 *         so does an array, which is no valid permissions shape
 * .note = a documented cast: a yaml map parses to a plain object of scalars here
 */
const asPermissionsRecord = (node: unknown): Record<string, string> | null =>
  node && typeof node === 'object' && !Array.isArray(node)
    ? (node as Record<string, string>)
    : null;

/**
 * .what = the jobs and grants of one workflow, read from its text
 * .why  = pure, so the defective-corpus case below exercises the same parse the walk uses
 */
const asWorkflowFromText = (input: { path: string; text: string }): Workflow => {
  const parsed = yaml.parse(input.text) ?? {};
  const jobs = (parsed.jobs ?? {}) as Record<string, Record<string, unknown>>;
  return {
    path: input.path,
    permissions: asPermissionsRecord(parsed.permissions),
    jobs: Object.entries(jobs).map(([name, job]) => {
      const steps = Array.isArray(job['steps'])
        ? (job['steps'] as Record<string, unknown>[])
        : [];
      return {
        name,
        runsSteps: steps.length > 0,
        mintsOidc: steps.some(isStepOidcMinter),
        calleeUses: typeof job['uses'] === 'string' ? job['uses'] : null,
        permissions: asPermissionsRecord(job['permissions']),
      };
    }),
  };
};

/**
 * .what = every workflow template under the practice tree
 */
const getAllWorkflowTemplates = (): Workflow[] =>
  getAllPathsUnderDir({ dir: PRACTICES_DIR, skip: PRACTICE_TREE_SKIP_DIRS })
    .filter((path) => path.includes('/.github/workflows/') && /\.ya?ml$/.test(path))
    .sort()
    .map((path) =>
      asWorkflowFromText({
        path: relative(REPO_ROOT, path),
        text: readFileSync(path, 'utf-8'),
      }),
    );

// a reusable call into this repo's own workflows; a call into another repo cannot be read here
const LOCAL_CALL_PREFIX = './.github/workflows/';

/**
 * .what = the workflows a local reusable call may land on: each template of that file name
 * .why  = a practice's caller may name a workflow another practice declares, so every template
 *         of that name is a candidate callee
 */
const getAllCalleesOfUses = (input: { workflows: Workflow[]; uses: string }): Workflow[] =>
  input.workflows.filter((flow) =>
    flow.path.endsWith(`/.github/workflows/${input.uses.slice(LOCAL_CALL_PREFIX.length)}`),
  );

/**
 * .what = whether a workflow mints an oidc token, in a job of its own or through a local call
 * .why  = a caller's grant is the callee's upper bound, so the grant is earned only where some
 *         job down the call chain mints. `seen` stops a call cycle
 */
const isWorkflowOidcMinter = (input: { workflows: Workflow[]; flow: Workflow; seen: string[] }): boolean =>
  input.flow.jobs.some(
    (job) =>
      job.mintsOidc ||
      (job.calleeUses !== null &&
        job.calleeUses.startsWith(LOCAL_CALL_PREFIX) &&
        getAllCalleesOfUses({ workflows: input.workflows, uses: job.calleeUses })
          .filter((callee) => !input.seen.includes(callee.path))
          .some((callee) =>
            isWorkflowOidcMinter({ workflows: input.workflows, flow: callee, seen: [...input.seen, input.flow.path] }),
          )),
  );

/**
 * .what = the five reports, each a list of offenders named `<path> :: <job>`
 * .why  = one transformer the real walk and the defective corpus both read, so the red state a
 *         maintainer meets is the same text the green state proves empty
 */
const asIdTokenScopeReports = (input: { workflows: Workflow[] }) => ({
  workflowScopeGrants: input.workflows
    .filter((flow) => flow.jobs.some((job) => job.runsSteps))
    .filter((flow) => flow.permissions?.['id-token'] !== undefined)
    .map((flow) => flow.path),
  mintersWithoutGrant: input.workflows.flatMap((flow) =>
    flow.jobs
      .filter((job) => job.mintsOidc && job.permissions?.['id-token'] !== 'write')
      .map((job) => `${flow.path} :: ${job.name}`),
  ),
  // a local call job's grant is judged by the next report; a call into another repo cannot be read, so it earns none
  grantsWithoutMinter: input.workflows.flatMap((flow) =>
    flow.jobs
      .filter(
        (job) =>
          job.permissions?.['id-token'] === 'write' &&
          !job.mintsOidc &&
          !(job.calleeUses?.startsWith(LOCAL_CALL_PREFIX) ?? false),
      )
      .map((job) => `${flow.path} :: ${job.name}`),
  ),
  // a local call job's grant is earned only where its callee mints; an unread callee earns none
  callGrantsWithoutCalleeMinter: input.workflows.flatMap((flow) =>
    flow.jobs
      .filter(
        (job) =>
          job.permissions?.['id-token'] === 'write' &&
          job.calleeUses !== null &&
          job.calleeUses.startsWith(LOCAL_CALL_PREFIX) &&
          !getAllCalleesOfUses({ workflows: input.workflows, uses: job.calleeUses }).some((callee) =>
            isWorkflowOidcMinter({ workflows: input.workflows, flow: callee, seen: [flow.path] }),
          ),
      )
      .map((job) => `${flow.path} :: ${job.name}`),
  ),
  jobBlocksWithoutContentsRead: input.workflows.flatMap((flow) =>
    flow.jobs
      .filter((job) => job.permissions !== null && job.permissions['contents'] !== 'read')
      .map((job) => `${flow.path} :: ${job.name}`),
  ),
});

/**
 * .what = one line per job that holds `id-token: write` — the map a reviewer reads
 */
const asIdTokenGrantTable = (input: { workflows: Workflow[] }): string[] =>
  input.workflows.flatMap((flow) =>
    flow.jobs
      .filter((job) => job.permissions?.['id-token'] === 'write')
      .map((job) => `${flow.path} :: ${job.name}`),
  );

describe('workflow templates grant id-token at job scope (#550)', () => {
  given('[case1] every workflow template under src/practices', () => {
    const scene = useBeforeAll(() => {
      const workflows = getAllWorkflowTemplates();
      return { workflows, reports: asIdTokenScopeReports({ workflows }) };
    });

    when('[t0] the walk itself is checked', () => {
      then('it reaches the oidc minters -- if red, the walk reaches no aws-auth job at all', () => {
        const minters = scene.workflows.flatMap((flow) =>
          flow.jobs.filter((job) => job.mintsOidc),
        );
        expect(minters.length).toBeGreaterThan(0);
      });
    });

    when('[t1] each workflow is read for its grants', () => {
      then(
        'no workflow with step jobs grants id-token at workflow scope -- if red, move the grant down to the jobs that mint the token',
        () => {
          expect(scene.reports.workflowScopeGrants).toEqual([]);
        },
      );

      then(
        'each job that mints an oidc token grants id-token at job scope -- if red, add `permissions: { contents: read, id-token: write }` to that job',
        () => {
          expect(scene.reports.mintersWithoutGrant).toEqual([]);
        },
      );

      then(
        'no job grants id-token that does not mint one -- if red, drop the grant from that job',
        () => {
          expect(scene.reports.grantsWithoutMinter).toEqual([]);
        },
      );

      then(
        'no reusable-call job grants id-token unless its callee mints one -- if red, drop the grant from that call job',
        () => {
          expect(scene.reports.callGrantsWithoutCalleeMinter).toEqual([]);
        },
      );

      then(
        'each job-level permissions block restates contents: read -- if red, a job-level block replaces the workflow one, so add `contents: read`',
        () => {
          expect(scene.reports.jobBlocksWithoutContentsRead).toEqual([]);
        },
      );

      then('the grant table reads as declared', () => {
        expect(asIdTokenGrantTable({ workflows: scene.workflows })).toMatchSnapshot();
      });
    });
  });

  given('[case2] a corpus that is defective on purpose', () => {
    const text = [
      'on:',
      '  workflow_call:',
      'permissions:',
      '  id-token: write',
      '  contents: read',
      'jobs:',
      '  lint:',
      '    runs-on: ubuntu-24.04',
      '    permissions:',
      '      id-token: write',
      '    steps:',
      '      - run: npm run test:lint',
      '  deploy:',
      '    runs-on: ubuntu-24.04',
      '    steps:',
      '      - uses: aws-actions/configure-aws-credentials@7474bc4690e29a8392af63c5b98e7449536d5c3a # v4',
    ].join('\n');

    when('[t0] the corpus is read the way the walk reads a real one', () => {
      const workflows = [asWorkflowFromText({ path: 'demo/.github/workflows/.demo.yml', text })];

      then('each report names its offender -- the text a maintainer meets on red', () => {
        const reports = asIdTokenScopeReports({ workflows });
        expect(reports.workflowScopeGrants).toEqual(['demo/.github/workflows/.demo.yml']);
        expect(reports.mintersWithoutGrant).toEqual(['demo/.github/workflows/.demo.yml :: deploy']);
        expect(reports.grantsWithoutMinter).toEqual(['demo/.github/workflows/.demo.yml :: lint']);
        expect(reports.jobBlocksWithoutContentsRead).toEqual([
          'demo/.github/workflows/.demo.yml :: lint',
        ]);
        expect(reports).toMatchSnapshot();
      });
    });
  });

  given('[case3] a caller that pairs a reusable call with a step job (a gate)', () => {
    const text = [
      'on:',
      '  push:',
      'permissions:',
      '  contents: read',
      'jobs:',
      '  suite:',
      '    permissions:',
      '      id-token: write',
      '      contents: read',
      '    uses: ./.github/workflows/.test.yml',
      '  gate:',
      '    needs: [suite]',
      '    runs-on: ubuntu-24.04',
      '    steps:',
      '      - run: echo gate',
    ].join('\n');

    // the callee: one job of it mints the token the caller's grant bounds
    const calleeMints = [
      'on:',
      '  workflow_call:',
      'jobs:',
      '  deploy:',
      '    runs-on: ubuntu-24.04',
      '    permissions:',
      '      id-token: write',
      '      contents: read',
      '    steps:',
      '      - uses: aws-actions/configure-aws-credentials@7474bc4690e29a8392af63c5b98e7449536d5c3a # v4',
    ].join('\n');

    when('[t0] the corpus is read the way the walk reads a real one', () => {
      const reports = asIdTokenScopeReports({
        workflows: [
          asWorkflowFromText({ path: 'demo/.github/workflows/test.yml', text }),
          asWorkflowFromText({ path: 'demo/.github/workflows/.test.yml', text: calleeMints }),
        ],
      });

      then('the call job may hold the grant its callee needs, and no report names it', () => {
        expect(reports.workflowScopeGrants).toEqual([]);
        expect(reports.grantsWithoutMinter).toEqual([]);
        expect(reports.callGrantsWithoutCalleeMinter).toEqual([]);
        expect(reports.jobBlocksWithoutContentsRead).toEqual([]);
      });
    });
  });

  given('[case4] a reusable-call job that grants id-token while its callee mints none', () => {
    const caller = [
      'on:',
      '  push:',
      'jobs:',
      '  suite:',
      '    permissions:',
      '      id-token: write',
      '      contents: read',
      '    uses: ./.github/workflows/.test.yml',
      '  lint:',
      '    permissions:',
      '      id-token: write',
      '      contents: read',
      '    uses: ./.github/workflows/.lint.yml',
    ].join('\n');
    const calleeMintsNone = [
      'on:',
      '  workflow_call:',
      'jobs:',
      '  unit:',
      '    runs-on: ubuntu-24.04',
      '    steps:',
      '      - run: npm run test:unit',
    ].join('\n');

    when('[t0] the corpus is read the way the walk reads a real one', () => {
      const reports = asIdTokenScopeReports({
        workflows: [
          asWorkflowFromText({ path: 'demo/.github/workflows/test.yml', text: caller }),
          asWorkflowFromText({ path: 'demo/.github/workflows/.test.yml', text: calleeMintsNone }),
        ],
      });

      then('it names each call job whose grant no callee earns, an unread callee too', () => {
        // `.lint.yml` is absent from the corpus, so its call job earns no grant either
        expect(reports.callGrantsWithoutCalleeMinter).toEqual([
          'demo/.github/workflows/test.yml :: suite',
          'demo/.github/workflows/test.yml :: lint',
        ]);
      });
    });
  });

  given('[case5] a call into another repo that grants id-token', () => {
    const caller = [
      'on:',
      '  push:',
      'jobs:',
      '  release:',
      '    permissions:',
      '      id-token: write',
      '      contents: read',
      '    uses: some-org/some-repo/.github/workflows/release.yml@v1',
    ].join('\n');

    when('[t0] the corpus is read the way the walk reads a real one', () => {
      const reports = asIdTokenScopeReports({
        workflows: [asWorkflowFromText({ path: 'demo/.github/workflows/release.yml', text: caller })],
      });

      then('the grant is named, since no callee this suite can read earns it', () => {
        expect(reports.grantsWithoutMinter).toEqual(['demo/.github/workflows/release.yml :: release']);
        // the local-call report reads only local callees, so it never claims this one
        expect(reports.callGrantsWithoutCalleeMinter).toEqual([]);
      });
    });
  });
});
