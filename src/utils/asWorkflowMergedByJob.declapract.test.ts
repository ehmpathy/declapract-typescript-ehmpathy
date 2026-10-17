import { given, then, when } from 'test-fns';
import { parse } from 'yaml';

import { asWorkflowMergedByJob } from './asWorkflowMergedByJob';
import { getAllWorkflowJobDrifts } from './getAllWorkflowJobDrifts';

const DECLARED = `name: provision

on:
  push:
    branches:
      - "main"
  pull_request:
    paths:
      - provision/**
  workflow_dispatch:

permissions:
  id-token: write # required for oidc
  contents: read

jobs:
  aws-prep-terraform:
    uses: ./.github/workflows/.terraform.yml
    with:
      working-directory: provision/aws/environments/prep
      creds-aws-role-arn-plan: \${{ vars.CREDS_CICD_AWS_PREP_OIDC_ROLE_ARN }}

  github:
    uses: ./.github/workflows/.declastruct.yml
    with:
      wish-path: provision/github.repo/resources.ts
      github-environment-apply: \${{ (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/')) && 'production-on-main' || 'production-on-else-apply' }} # main/tag => on-main
`;

// a pre-oidc caller: the declared job carries the retired access-key inputs, a repo-own job
// trails it, and the trigger has no paths gate
const FOUND_PRE_OIDC = `name: provision

on:
  push:
    branches:
      - "main"
  pull_request:
  workflow_dispatch:

permissions:
  id-token: write # required for oidc
  contents: read

jobs:
  aws-prep-terraform:
    uses: ./.github/workflows/.terraform.yml
    with:
      working-directory: provision/aws/environments/prep
      github-environment: prep # the retired input
      aws-account-id: "123"
    secrets:
      aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}

  # the repo's own job, which the practice never declares
  repo-own-seed:
    uses: ./.github/workflows/.seed.yml
    with:
      target: prep
`;

const isGithubTerraformJob = (input: { job: unknown }): boolean =>
  JSON.stringify(input.job).includes('provision/github/');

describe('asWorkflowMergedByJob', () => {
  given('[case1] a pre-oidc caller with a repo-own job (#685)', () => {
    when('[t0] the merge runs', () => {
      const merged = asWorkflowMergedByJob({
        found: FOUND_PRE_OIDC,
        declared: DECLARED,
        dropJobWhen: null,
      });

      then('each declared job matches its declared shape', () => {
        const jobs = parse(merged).jobs;
        expect(jobs['aws-prep-terraform']).toEqual(
          parse(DECLARED).jobs['aws-prep-terraform'],
        );
        expect(jobs.github).toEqual(parse(DECLARED).jobs.github);
      });

      then('the repo-own job survives, unchanged', () => {
        expect(parse(merged).jobs['repo-own-seed']).toEqual(
          parse(FOUND_PRE_OIDC).jobs['repo-own-seed'],
        );
        expect(merged).toContain(
          '# the repo\'s own job, which the practice never declares',
        );
      });

      then('the declared trigger lands, with its declared config', () => {
        expect(parse(merged).on.pull_request.paths).toEqual(['provision/**']);
      });

      then('the absent declared job lands beside its declared neighbor, above the repo job', () => {
        const names = Object.keys(parse(merged).jobs);
        expect(names).toEqual(['aws-prep-terraform', 'github', 'repo-own-seed']);
      });

      then('a long expression line is not folded', () => {
        expect(merged).toContain(
          "github-environment-apply: ${{ (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/')) && 'production-on-main' || 'production-on-else-apply' }} # main/tag => on-main",
        );
      });

      then('no drift remains', () => {
        expect(
          getAllWorkflowJobDrifts({
            found: merged,
            declared: DECLARED,
            dropJobWhen: null,
          }),
        ).toEqual([]);
      });

      then('the merge is a fixed point', () => {
        expect(
          asWorkflowMergedByJob({
            found: merged,
            declared: DECLARED,
            dropJobWhen: null,
          }),
        ).toEqual(merged);
      });

      then('before + after match snapshot', () => {
        expect(FOUND_PRE_OIDC).toMatchSnapshot('provision.yml — before');
        expect(merged).toMatchSnapshot('provision.yml — after merge');
      });
    });
  });

  given('[case2] a workflow already merged', () => {
    when('[t0] the merge runs', () => {
      then('the found text returns byte for byte', () => {
        const merged = asWorkflowMergedByJob({
          found: DECLARED,
          declared: DECLARED,
          dropJobWhen: null,
        });
        expect(merged).toEqual(DECLARED);
      });
    });
  });

  given('[case3] a terraform github job that points at the deleted provision/github/ dir (#608)', () => {
    const found = `name: provision

on:
  pull_request:

jobs:
  github-terraform:
    uses: ./.github/workflows/.terraform.yml
    with:
      working-directory: provision/github/environment

  aws:
    uses: ./.github/workflows/.terraform.yml
    with:
      working-directory: provision/aws/environments/prod
`;

    when('[t0] the merge runs with a drop rule for provision/github/', () => {
      const merged = asWorkflowMergedByJob({
        found,
        declared: DECLARED,
        dropJobWhen: isGithubTerraformJob,
      });

      then('the obsolete terraform github job is dropped', () => {
        expect(parse(merged).jobs['github-terraform']).toBeUndefined();
      });

      then('the aws job survives, unchanged', () => {
        expect(parse(merged).jobs.aws).toEqual(parse(found).jobs.aws);
      });

      then('the declared github job lands', () => {
        expect(parse(merged).jobs.github).toEqual(parse(DECLARED).jobs.github);
      });

      then('one blank line sits between top-level keys, even where an empty value ended a block', () => {
        // the found `on:` ends on an empty `pull_request:`, where the parser parks the blank
        // line; the merge must neither double that gap nor drop the one above `jobs:`
        expect(merged).not.toContain('\n\n\n');
        expect(merged).toContain('workflow_dispatch:\n\npermissions:');
        expect(merged).toContain('contents: read\n\njobs:');
      });

      then('the drift check flags the obsolete job before the merge', () => {
        expect(
          getAllWorkflowJobDrifts({
            found,
            declared: DECLARED,
            dropJobWhen: isGithubTerraformJob,
          }),
        ).toContain("job 'github-terraform' is obsolete and must be dropped");
      });

      then('the merge is a fixed point', () => {
        expect(
          asWorkflowMergedByJob({
            found: merged,
            declared: DECLARED,
            dropJobWhen: isGithubTerraformJob,
          }),
        ).toEqual(merged);
      });
    });

    when('[t1] the merge runs with no drop rule', () => {
      then('the undeclared job is never stripped', () => {
        const merged = asWorkflowMergedByJob({
          found,
          declared: DECLARED,
          dropJobWhen: null,
        });
        expect(parse(merged).jobs['github-terraform']).toEqual(
          parse(found).jobs['github-terraform'],
        );
      });
    });
  });

  given("[case4] an adopter's own triggers beside the declared ones (#685)", () => {
    // the adopter keeps a nightly schedule, a dispatch with inputs, and a push tag filter; the
    // found pull_request lacks the config the declared one carries
    const found = `name: provision

on:
  push:
    branches:
      - "main"
    tags:
      - v* # the adopter's own tag filter
  pull_request:
  workflow_dispatch:
    inputs:
      reason:
        description: why this run
  schedule:
    - cron: "0 6 * * *" # the adopter's nightly drift plan

permissions:
  id-token: write # required for oidc
  contents: read

jobs:
  github:
    uses: ./.github/workflows/.declastruct.yml
    with:
      wish-path: provision/github.repo/resources.ts
      github-environment-apply: \${{ (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/')) && 'production-on-main' || 'production-on-else-apply' }} # main/tag => on-main
`;

    when('[t0] the merge runs', () => {
      const merged = asWorkflowMergedByJob({
        found,
        declared: DECLARED,
        dropJobWhen: null,
      });

      then('the declared pull_request config lands', () => {
        expect(parse(merged).on.pull_request).toEqual(
          parse(DECLARED).on.pull_request,
        );
      });

      then("the adopter's schedule survives, comment and all", () => {
        expect(parse(merged).on.schedule).toEqual(parse(found).on.schedule);
        expect(merged).toContain(
          '- cron: "0 6 * * *" # the adopter\'s nightly drift plan',
        );
      });

      then("the adopter's workflow_dispatch inputs survive", () => {
        expect(parse(merged).on.workflow_dispatch).toEqual(
          parse(found).on.workflow_dispatch,
        );
      });

      then('the declared push trigger is set to its declared shape', () => {
        // push is a declared trigger, so the declaration owns its whole shape; only undeclared
        // triggers are the adopter's own
        expect(parse(merged).on.push).toEqual(parse(DECLARED).on.push);
      });

      then('a job inserted above a found job keeps a blank line between them', () => {
        expect(merged).toContain(
          'CREDS_CICD_AWS_PREP_OIDC_ROLE_ARN }}\n\n  github:',
        );
      });

      then('no drift remains', () => {
        expect(
          getAllWorkflowJobDrifts({
            found: merged,
            declared: DECLARED,
            dropJobWhen: null,
          }),
        ).toEqual([]);
      });

      then('a second merge is a fixed point', () => {
        expect(
          asWorkflowMergedByJob({
            found: merged,
            declared: DECLARED,
            dropJobWhen: null,
          }),
        ).toEqual(merged);
      });

      then('before + after match snapshot', () => {
        expect(found).toMatchSnapshot('adopter triggers — before');
        expect(merged).toMatchSnapshot('adopter triggers — after merge');
      });
    });

    when('[t1] the drift is read before the merge', () => {
      then('the declared triggers that differ are flagged, and no adopter trigger is', () => {
        expect(
          getAllWorkflowJobDrifts({
            found,
            declared: DECLARED,
            dropJobWhen: null,
          }),
        ).toEqual([
          "trigger 'push' differs from its declared shape",
          "trigger 'pull_request' differs from its declared shape",
          "job 'aws-prep-terraform' is absent",
        ]);
      });
    });
  });
});
