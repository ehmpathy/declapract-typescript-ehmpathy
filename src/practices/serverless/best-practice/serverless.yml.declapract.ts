import { FileCheckType } from 'declapract';
import type { FileFixFunction } from 'declapract/dist/domain';

export const check = FileCheckType.CONTAINS; // i.e., check that the contents of the file contains what's declared (default is equals)

const listAccountAliasesPolicy = `    # allow inferring access from account alias
    - Effect: Allow
      Action:
        - iam:ListAccountAliases
      Resource: '*'`;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if file dne; // TODO: update to provision file from declared contents
  let fixed = contents
    .replace(/runtime: nodejs\d\d.x/, 'runtime: nodejs16.x')
    .replace(/ {2}- serverless-offline .*\n/, '') // a plugin we no longer use (never used it, no need to have it)
    .replace(/ {2}- serverless-pseudo-parameters .*\n/, '') // a plugin we no longer use (serverless supports variables natively now)
    .replace(/#\{AWS::Region\}/g, '${aws:region}') // use the serverless native variables, instead of the pseudo-parameters format
    .replace(/#\{AWS::AccountId\}/g, '${aws:accountId}') // use the serverless native variables, instead of the pseudo-parameters format
    .replace('## paramstore access', '# parameter store access')
    .replace(
      '## allow invocation of other lambdas',
      '# allow invocation of other lambdas',
    )
    .replace(
      'environment:\n    NODE_ENV:',
      'environment:\n    TZ: UTC # guarantee that utc timezone will be used explicitly, to facilitate a pit of success\n    NODE_ENV:',
    )
    .replace(
      'NODE_ENV: ${self:custom.stageToNodeEnvMapping.${self:provider.stage}}\n  deploymentBucket',
      'NODE_ENV: ${self:custom.stageToNodeEnvMapping.${self:provider.stage}}\n    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true # https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html\n  deploymentBucket',
    ) // add this env flag
    .replace(
      /service: ([a-zA-Z0-9-]+)\n\n?provider:/,
      'service: $1\n\npackage:\n  artifact: .artifact/contents.zip\n\nprovider:',
    )
    .replace(
      '  artifact: .artifact/contents.zip\n\nprovider:', // if no plugins at all
      '  artifact: .artifact/contents.zip\n\nplugins:\n  - serverless-prune-plugin\n\nprovider:', // add the sls prune plugin
    )
    .replace(
      '  timeout: 10',
      '  timeout: 60 # default timeout to 1min, for resilience against increased cold start times; individual functions can override this', // bump the timeout
    );

  // Append ListAccountAliases policy if not already present
  if (!fixed.includes('iam:ListAccountAliases')) {
    if (/iamRoleStatements:\s*\n/.test(fixed)) {
      fixed = fixed.replace(
        /iamRoleStatements:\s*\n/,
        `iamRoleStatements:\n${listAccountAliasesPolicy}\n`,
      );
    }
  }

  return { contents: fixed };
};
