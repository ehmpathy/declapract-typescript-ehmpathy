import { given, then } from 'test-fns';

import { fix } from './serverless.yml.declapract';

describe('serverless.yml', () => {
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

  given('a sls.yaml that needs RDS Data API permissions', () => {
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
      'it should append RDS Data API policy if not already present',
      async () => {
        const fixed = await fix(example, {} as any);
        expect(fixed.contents).toContain('rds-data:ExecuteStatement');
        expect(fixed.contents).toContain('rds-data:BatchExecuteStatement');
        expect(fixed.contents).toContain('rds-data:BeginTransaction');
        expect(fixed.contents).toContain('rds-data:CommitTransaction');
        expect(fixed.contents).toContain('rds-data:RollbackTransaction');
        expect(fixed.contents).toContain('secretsmanager:GetSecretValue');
        expect(fixed.contents).toContain('rds-db-credentials');
      },
    );

    then('it should not duplicate RDS Data API policy if already present', async () => {
      const exampleWithPolicy = `
service: svc-example

provider:
  name: aws
  runtime: nodejs16.x
  iamRoleStatements:
    # allow RDS Data API access
    - Effect: Allow
      Action:
        - rds-data:ExecuteStatement
        - rds-data:BatchExecuteStatement
        - rds-data:BeginTransaction
        - rds-data:CommitTransaction
        - rds-data:RollbackTransaction
      Resource: arn:aws:rds:\${aws:region}:\${aws:accountId}:cluster:ahbodedb*
      `.trim();
      const fixed = await fix(exampleWithPolicy, {} as any);
      const matches = (
        fixed.contents?.match(/rds-data:ExecuteStatement/g) || []
      ).length;
      expect(matches).toBe(1);
    });
  });

  given('a sls.yaml that has VPC config with SSM parameters', () => {
    const example = `
service: svc-example

provider:
  name: aws
  runtime: nodejs16.x
  vpc:
    securityGroupIds:
      - \${ssm:/tf/infrastructure/vpc/main/lambdaSecurityGroupId}
    subnetIds:
      - \${ssm:/tf/infrastructure/vpc/main/lambdaSubnet1Id}
      - \${ssm:/tf/infrastructure/vpc/main/lambdaSubnet2Id}
      - \${ssm:/tf/infrastructure/vpc/main/lambdaSubnet3Id}
  iamRoleStatements:
    - Effect: Allow
      Action:
        - ssm:GetParameter
      Resource: '*'
    `.trim();

    then('it should remove the VPC config', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).not.toContain('vpc:');
      expect(fixed.contents).not.toContain('securityGroupIds');
      expect(fixed.contents).not.toContain('subnetIds');
      expect(fixed.contents).not.toContain('lambdaSecurityGroupId');
      expect(fixed.contents).not.toContain('lambdaSubnet1Id');
    });
  });
});
