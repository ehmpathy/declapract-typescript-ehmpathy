import { given, then } from 'test-fns';

import { fix } from './serverless.yml.declapract';

describe('serverless.yml', () => {
  given('a sls.yaml with STAGE env var', () => {
    const example = `
service: svc-example

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
    STAGE: \${self:provider.stage} # deploy specifying which stage we're targeting
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true
    `.trim();

    then('it should add accessByStage custom block', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain('accessByStage:');
      expect(fixed.contents).toContain('dev: prep');
      expect(fixed.contents).toContain('prod: prod');
    });

    then('it should replace STAGE with ACCESS + COMMIT', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain('ACCESS:');
      expect(fixed.contents).toContain('COMMIT:');
      expect(fixed.contents).not.toContain('STAGE: ${self:provider.stage}');
    });

    then('it should add variablesResolutionMode after service line', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain('variablesResolutionMode: 20210326');
    });
  });

  given('a sls.yaml that needs the timezone environmental variable', () => {
    const example = `
service: svc-notifications

package:
  artifact: .artifact/contents.zip

plugins:
  - serverless-prune-plugin

provider:
  name: aws
  runtime: nodejs16.x
  memorySize: 1024 # optional, in MB, default is 1024
  timeout: 60 # default timeout to 1min, for resilience against increased cold start times; individual functions can override this
  stage: \${opt:stage}
  stackTags:
    app: ahbode
    environment: \${self:provider.stage}
    product: \${self:service}
  environment:
    NODE_ENV: production # deploy with production optimizations of all resources, to make \`dev\` and \`prod\` stage deployments equivalent functionally (i.e., the same code paths in dev and prod)
    STAGE: \${self:provider.stage} # deploy specifying which stage we're targeting, to enable targeting the correct config + resources (e.g., hit dev db -vs- prod db)
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true # https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html
  deploymentBucket: serverless-deployment-xyz-\${self:provider.stage}
    `.trim();
    then('it should be able to add the timezone env var', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain('TZ: UTC');
    });
  });

  given('a sls.yaml that needs account:GetAccountInformation policy', () => {
    const example = `
service: svc-example

provider:
  name: aws
  runtime: nodejs16.x
  iamRoleStatements:
    # parameter store access
    - Effect: Allow
      Action:
        - ssm:GetParameter
      Resource: arn:aws:ssm:\${aws:region}:\${aws:accountId}:parameter/*
    `.trim();

    then(
      'it should append GetAccountInformation policy if not already present',
      async () => {
        const fixed = await fix(example, {} as any);
        expect(fixed.contents).toContain('account:GetAccountInformation');
        expect(fixed.contents).toContain(
          '# allow access inference from account name',
        );
      },
    );

    then(
      'it should not duplicate GetAccountInformation policy if already present',
      async () => {
        const exampleWithPolicy = `
service: svc-example

provider:
  name: aws
  runtime: nodejs16.x
  iamRoleStatements:
    # allow access inference from account name
    - Effect: Allow
      Action:
        - account:GetAccountInformation
      Resource: '*'
      `.trim();
        const fixed = await fix(exampleWithPolicy, {} as any);
        const matches = (
          fixed.contents?.match(/account:GetAccountInformation/g) || []
        ).length;
        expect(matches).toBe(1);
      },
    );
  });
});
