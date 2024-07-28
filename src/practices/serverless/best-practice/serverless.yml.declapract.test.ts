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
});
