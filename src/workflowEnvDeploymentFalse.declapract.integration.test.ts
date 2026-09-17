import { readFileSync } from 'node:fs';

import { given, then, useBeforeAll, when } from 'test-fns';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = holds every job-level `environment:` gate in this repo's workflow TEMPLATES to the
 *         no-deployment block form:
 *
 *           environment:
 *             name: <x>
 *             deployment: false
 *
 *         and forbids the flat inline form (`environment: <x>`), which is the one that makes
 *         github auto-create a Deployment object and spray "deployed to <env>" statuses onto the
 *         PR/commit timeline (#578).
 * .why  = a github workflow `environment:` key does double duty: it binds the built-in protection
 *         rules (required reviewers, tag/branch policy) AND, as a side effect, logs a Deployment +
 *         statuses to the timeline. `deployment: false` (github, march-2026) keeps the gate and
 *         drops the timeline noise — on BOTH plan and apply gates. a template that reverts to the
 *         flat form silently restores the noise in every consumer that receives it, and no other
 *         check can see it (the flat form is valid yaml that deploys fine).
 * .note = every `environment:` in a github workflow yaml is a job-level deployment environment —
 *         github has no step-level `environment:` (step/job vars are `env:`). so a scan of the
 *         workflow templates needs no yaml parse to find the gates: each `environment:` line IS
 *         one. (this does NOT hold for serverless.yml or docker-compose.yml, where `environment:`
 *         is a runtime env-var map — those live outside `.github/workflows/` and the walk never
 *         reaches them.)
 * .note = this is an INTEGRATION test by the same rule as `actionPins`: it walks the filesystem
 *         (`readFileSync` over every workflow template), and `rule.forbid.unit.remote-boundaries`
 *         puts any test that crosses that boundary in the integration suite. it needs no
 *         credential and no network; the boundary alone classifies it.
 * .note = the two GitHub-SIDE confirms this template shape depends on — neither readable from the
 *         repo tree, so each is a documented bound, not an assertion here:
 *           1. an empty name (a caller that omits the input, e.g. prep on .deploy-sls) must mean
 *              "no environment", as it does in the flat form. the block form's `name` is the same
 *              field, so this holds by github's own desugaring — but it is unverified from here.
 *           2. `deployment: false` is INCOMPATIBLE with a custom deployment-protection-rule APP:
 *              the job fails loud. built-in rules (reviewers, wait timer, tag/branch policy) are
 *              fine. a consumer whose prod environment carries a custom App rule must drop
 *              `deployment: false` there — a one-line, fail-loud revert, never a silent break.
 */

/**
 * .what = the root under which every declared workflow template lives.
 * .why  = a template is copied verbatim to a consumer, so its `environment:` shape must be correct
 *         here — a consumer cannot fix it locally (the next `declapract fix` reverts a hand-edit).
 * .note = anchored on `__dirname`, so the walk holds wherever jest is invoked from.
 */
const PRACTICES_DIR = `${__dirname}/practices`;

/**
 * .what = the flat inline form — `environment: <value>` on one line — that triggers the
 *         auto-Deployment. a trailing `#comment` value does not count (there is none in practice).
 */
const FLAT_INLINE = /^\s+environment:\s+[^#\s]/;

/** .what = the block-form opener — `environment:` with no value after the colon. */
const BLOCK_OPENER = /^\s+environment:\s*$/;

/** .what = the `deployment: false` KEY line (not the prose mention in a comment, which starts `#`). */
const DEPLOYMENT_FALSE_KEY = /^\s+deployment:\s+false\s*$/;

interface WorkflowTemplate {
  path: string;
  flatInline: number;
  blockOpeners: number;
  deploymentFalseKeys: number;
}

const isWorkflowTemplatePath = (path: string): boolean =>
  path.includes('/.github/workflows/') && path.endsWith('.yml');

const readWorkflowTemplate = (path: string): WorkflowTemplate => {
  const lines = readFileSync(path, 'utf8').split('\n');
  return {
    path,
    flatInline: lines.filter((line) => FLAT_INLINE.test(line)).length,
    blockOpeners: lines.filter((line) => BLOCK_OPENER.test(line)).length,
    deploymentFalseKeys: lines.filter((line) => DEPLOYMENT_FALSE_KEY.test(line))
      .length,
  };
};

/** .what = the paths of templates that carry ANY flat inline `environment:` form (the forbidden one). */
const getFlatInlineOffenderPaths = (input: {
  templates: WorkflowTemplate[];
}): string[] =>
  input.templates
    .filter((template) => template.flatInline > 0)
    .map((template) => template.path);

/**
 * .what = the templates whose block-opener count and `deployment: false` count disagree — a block
 *         gate that lacks (or duplicates) its `deployment: false` key.
 */
const getUnbalancedDeploymentFalse = (input: {
  templates: WorkflowTemplate[];
}): { path: string; blockOpeners: number; deploymentFalseKeys: number }[] =>
  input.templates
    .filter(
      (template) => template.blockOpeners !== template.deploymentFalseKeys,
    )
    .map((template) => ({
      path: template.path,
      blockOpeners: template.blockOpeners,
      deploymentFalseKeys: template.deploymentFalseKeys,
    }));

describe('workflow templates gate without a timeline Deployment (#578)', () => {
  given('every workflow template under src/practices', () => {
    const state = useBeforeAll(() => {
      const templates = getAllPathsUnderDir({
        dir: PRACTICES_DIR,
        skip: PRACTICE_TREE_SKIP_DIRS,
      })
        .filter(isWorkflowTemplatePath)
        .map(readWorkflowTemplate);
      const withGate = templates.filter(
        (template) => template.blockOpeners + template.flatInline > 0,
      );
      return { templates, withGate };
    });

    when('the walk resolves', () => {
      then('it finds the templates that carry an environment gate', () => {
        // guards against a vacuous pass: the walk must reach real files AND real gates, so the
        // per-template assertions below run against a non-empty set. a floor, not an exact count —
        // an exact total is a second, hand-maintained authority for the same fact that any
        // unrelated template that adds or drops a gate would redden with an opaque diff. the
        // load-bearing checks are the per-template properties: no flat inline form, and every
        // block opener carries `deployment: false`.
        expect(state.templates.length).toBeGreaterThan(0);
        expect(state.withGate.length).toBeGreaterThan(0);
      });

      // the guard's SPEECH is its contract: snapshot the per-gate template shape (path + the three
      // counts it computes) so a reword that recomputes a structurally-different gate datum reddens
      // a vibecheck, not just the green toEqual([]) below.
      then('the resolved environment-gate shape matches snapshot', () => {
        const gateShape = state.withGate
          .map((template) => ({
            path: template.path.slice(template.path.indexOf('/practices/')),
            flatInline: template.flatInline,
            blockOpeners: template.blockOpeners,
            deploymentFalseKeys: template.deploymentFalseKeys,
          }))
          .sort((a, b) => a.path.localeCompare(b.path));
        expect(gateShape).toMatchSnapshot('workflow environment-gate shape');
      });
    });

    when('each template is read', () => {
      then('NO template uses the flat inline environment form', () => {
        const offenders = getFlatInlineOffenderPaths({
          templates: state.templates,
        });
        expect(offenders).toEqual([]);
      });

      then('every environment block carries deployment: false', () => {
        const offenders = getUnbalancedDeploymentFalse({
          templates: state.templates,
        });
        expect(offenders).toEqual([]);
      });
    });
  });
});
