import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';
import yaml from 'yaml';

/**
 * .what = the clamp on #785: the github wish's plan runs in its apply's environment on main and tags
 * .why  = github creates an environment the moment a job names it, and the wish declares that
 *         environment. a plan in another environment reads it absent, the apply then reads it
 *         present, and the first post-upgrade merge fails `plan is stale`
 * .how  = read the `github` job of each provision.yml that ships the wish, and evaluate its two
 *         environment expressions for a main push, a tag push, and a branch push
 */

const PROVISION_YMLS = [
  'cicd-service/best-practice/.github/workflows/provision.yml',
  'cicd-package/best-practice/.github/workflows/provision.yml',
  'cicd-app-react-native-expo/best-practice/.github/workflows/provision.yml',
];

// the one ternary form these workflows use: main or a tag picks the first name, else the second
const REF_TERNARY =
  /^\$\{\{\s*\(github\.ref == 'refs\/heads\/main' \|\| startsWith\(github\.ref, 'refs\/tags\/'\)\) && '([a-z-]+)' \|\| '([a-z-]+)'\s*\}\}$/;

/**
 * .what = the environment one expression names for one ref
 * .why  = the expressions are a bare name or the one ref ternary above; the ternary is parsed by
 *         its exact form and computed in plain ts, so a drift in the form fails by name, never
 *         evaluates to a wrong name in silence
 */
const asEnvironmentForRef = (input: { expression: string; ref: string }): string => {
  // a bare name is its own answer
  if (!input.expression.startsWith('${{')) return input.expression;

  // any other expression form is a drift this oracle does not know; fail by name
  const matched = REF_TERNARY.exec(input.expression);
  if (!matched)
    throw new Error(`asEnvironmentForRef: unknown expression form, extend the oracle: ${input.expression}`);

  // main or a tag picks the first name; every other ref picks the second
  const isReleaseRef = input.ref === 'refs/heads/main' || input.ref.startsWith('refs/tags/');
  return isReleaseRef ? matched[1]! : matched[2]!;
};

/**
 * .what = the required status check names the branch protection declares
 * .why  = the declaration imports declastruct providers and carries `@declapract{variable.*}`
 *         literals, so it cannot be invoked here; the `contexts:` array is lifted from the source
 */
const getProtectionContexts = (): string[] => {
  const resources = readFileSync(join(__dirname, 'best-practice/provision/github.repo/resources.ts'), 'utf-8');
  const list = resources.match(/contexts: \[(?<list>[^\]]*)\]/)?.groups?.list;
  if (list === undefined) throw new Error('no `contexts:` array found in resources.ts');
  return [...list.matchAll(/'([^']+)'/g)].map((found) => found[1]!);
};

describe('branch protection requires the stable gate (#781 #782)', () => {
  given('[case1] the main branch protection the github wish declares', () => {
    const contexts = getProtectionContexts();

    when('[t0] the declared contexts are read beside the workflows that report them', () => {
      then('it requires the gate and the pr title check, and no inner job name', () => {
        // a protection that names inner jobs strands every pr whose jobs were renamed
        expect(contexts).toEqual(['test-passed', 'pullreq-title']);
      });

      then('each required name is a top-level job a workflow reports, so none can wait forever', () => {
        // a required context no job reports is a check that can never pass
        const jobsOf = (relpath: string): string[] =>
          Object.keys(
            // .note = yaml.parse returns any (an external boundary); only the job names are read
            (yaml.parse(readFileSync(join(__dirname, '..', relpath), 'utf-8')) as { jobs: Record<string, unknown> })
              .jobs,
          );
        expect(jobsOf('cicd-common/best-practice/.github/workflows/test.yml')).toContain('test-passed');
        expect(jobsOf('cicd-common/best-practice/.github/workflows/review.yml')).toContain('pullreq-title');
      });

      then('the practice readme names the one apply that moves an older protection to the gate', () => {
        // an adopter whose live protection names the pre-`suite /` checks sees its upgrade pr wait on
        // checks no job reports; the readme is where that adopter reads the cure
        const readme = readFileSync(join(__dirname, 'best-practice/.declapract.readme.md'), 'utf-8');
        expect(readme).toContain('from\n  a checkout of the upgrade branch');
        expect(readme).toContain('npx declastruct plan --wish provision/github.repo/resources.ts --into plan.json');
        expect(readme).toContain('npx declastruct apply --plan plan.json');
      });
    });
  });
});

describe('github plan environment (#785)', () => {
  PROVISION_YMLS.forEach((relpath, index) => {
    given(`[case${index + 1}] the github job of ${relpath}`, () => {
      // .note = yaml.parse returns any (an external boundary); the cast names the one path read, and
      //         an absent key reads undefined, which the toEqual below reddens by name
      const workflow = yaml.parse(readFileSync(join(__dirname, '..', relpath), 'utf-8')) as {
        jobs: { github: { with: Record<string, string> } };
      };
      const plan = workflow.jobs.github.with['github-environment-plan']!;
      const apply = workflow.jobs.github.with['github-environment-apply']!;

      ['refs/heads/main', 'refs/tags/v1.2.3'].forEach((ref, index) => {
        when(`[t${index}] it runs on ${ref}`, () => {
          then('the plan runs in the apply environment, so neither reads it absent', () => {
            expect(asEnvironmentForRef({ expression: plan, ref })).toEqual('production-on-main');
            expect(asEnvironmentForRef({ expression: apply, ref })).toEqual('production-on-main');
          });
        });
      });

      when('[t2] it runs on a feature branch', () => {
        then('the plan stays in the readonly plan environment', () => {
          expect(asEnvironmentForRef({ expression: plan, ref: 'refs/heads/feat/x' })).toEqual(
            'production-on-else-plan',
          );
        });
      });

      when('[t3] the job inputs are read whole', () => {
        then('they match snapshot, so a reviewer reads each env expression as shipped', () => {
          expect(workflow.jobs.github.with).toMatchSnapshot(`github job inputs — ${relpath}`);
        });
      });
    });
  });
});
