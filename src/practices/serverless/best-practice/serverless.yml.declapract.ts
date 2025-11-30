import { FileCheckType } from 'declapract';
import { FileFixFunction } from 'declapract/dist/domain';

export const check = FileCheckType.CONTAINS; // i.e., check that the contents of the file contains what's declared (default is equals)

const rdsDataApiPolicy = `    # allow RDS Data API access
    - Effect: Allow
      Action:
        - rds-data:ExecuteStatement
        - rds-data:BatchExecuteStatement
        - rds-data:BeginTransaction
        - rds-data:CommitTransaction
        - rds-data:RollbackTransaction
      Resource: arn:aws:rds:\${aws:region}:\${aws:accountId}:cluster:ahbodedb*
    # allow Secrets Manager access for RDS Data API credentials
    - Effect: Allow
      Action:
        - secretsmanager:GetSecretValue
      Resource: arn:aws:secretsmanager:\${aws:region}:\${aws:accountId}:secret:rds-db-credentials/*`;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if file dne; // TODO: update to provision file from declared contents
  // TODO: when we have special support for yml, do this better (i.e., instead of string replace, just add to the yml object after parsing it)
  let fixed = contents
    .replace(/runtime\: nodejs\d\d.x/, 'runtime: nodejs16.x')
    .replace(/  - serverless-offline .*\n/, '') // a plugin we no longer use (never used it, no need to have it)
    .replace(/  - serverless-pseudo-parameters .*\n/, '') // a plugin we no longer use (serverless supports variables natively now)
    .replace(/\#\{AWS\:\:Region\}/g, '${aws:region}') // use the serverless native variables, instead of the pseudo-parameters format
    .replace(/\#\{AWS\:\:AccountId\}/g, '${aws:accountId}') // use the serverless native variables, instead of the pseudo-parameters format
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
      /service: ([a-zA-Z0-9\-]+)\n\n?provider:/,
      'service: $1\n\npackage:\n  artifact: .artifact/contents.zip\n\nprovider:',
    )
    .replace(
      '  artifact: .artifact/contents.zip\n\nprovider:', // if no plugins at all
      '  artifact: .artifact/contents.zip\n\nplugins:\n  - serverless-prune-plugin\n\nprovider:', // add the sls prune plugin
    )
    .replace(
      '  timeout: 10',
      '  timeout: 60 # default timeout to 1min, for resilience against increased cold start times; individual functions can override this', // bump the timeout
    )
    // Remove VPC config that uses SSM parameters (no longer needed with RDS Data API)
    .replace(
      /\s*vpc:\s*\n\s*securityGroupIds:\s*\n\s*- \$\{ssm:\/tf\/infrastructure\/vpc\/main\/lambdaSecurityGroupId\}\s*\n\s*subnetIds:\s*\n\s*- \$\{ssm:\/tf\/infrastructure\/vpc\/main\/lambdaSubnet1Id\}\s*\n\s*- \$\{ssm:\/tf\/infrastructure\/vpc\/main\/lambdaSubnet2Id\}\s*\n\s*- \$\{ssm:\/tf\/infrastructure\/vpc\/main\/lambdaSubnet3Id\}/,
      '',
    );

  // Append RDS Data API policy if not already present
  if (!fixed.includes('rds-data:ExecuteStatement')) {
    // Find the iamRoleStatements section and append the policy
    if (/iamRoleStatements:\s*\n/.test(fixed)) {
      fixed = fixed.replace(
        /iamRoleStatements:\s*\n/,
        `iamRoleStatements:\n${rdsDataApiPolicy}\n`,
      );
    }
  }

  return { contents: fixed };
};
