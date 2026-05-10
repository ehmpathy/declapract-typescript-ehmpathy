import type { FileFixFunction } from 'declapract';
import { FileCheckType } from 'declapract';

export const check = FileCheckType.CONTAINS; // i.e., check that the contents of the file contains what's declared (default is equals)

const accessInferencePolicy = `    # allow access inference from account name
    - Effect: Allow
      Action:
        - account:GetAccountInformation
      Resource: '*'`;

const accessByStageCustom = `custom:
  accessByStage:
    dev: prep
    prod: prod

`;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if file dne
  let fixed = contents
    .replace(/runtime: nodejs\d\d.x/, 'runtime: nodejs22.x')
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

  // add variablesResolutionMode after service line if not present
  if (!fixed.includes('variablesResolutionMode:')) {
    fixed = fixed.replace(
      /^(service: [a-zA-Z0-9-]+)\n/m,
      '$1\n\nvariablesResolutionMode: 20210326\n',
    );
  }

  // add custom accessByStage block before provider if not present
  if (!fixed.includes('accessByStage:')) {
    fixed = fixed.replace(/\nprovider:/, `\n${accessByStageCustom}provider:`);
  }

  // replace STAGE env var with ACCESS + COMMIT pattern
  if (
    fixed.includes('STAGE: ${self:provider.stage}') &&
    !fixed.includes('ACCESS:')
  ) {
    fixed = fixed.replace(
      /STAGE: \$\{self:provider\.stage\}[^\n]*/,
      "ACCESS: ${self:custom.accessByStage.${opt:stage}, 'prep'} # sdk-environment access tier, to target the correct config + resources (e.g., hit dev db -vs- prod db)\n    COMMIT: ${env:COMMIT} # sdk-environment commit slug, must be set by deploy command",
    );
  }

  // replace old iam:ListAccountAliases with account:GetAccountInformation
  if (fixed.includes('iam:ListAccountAliases')) {
    fixed = fixed.replace(
      /# allow inferring access from account alias\n\s+- Effect: Allow\n\s+Action:\n\s+- iam:ListAccountAliases\n\s+Resource: '\*'/,
      accessInferencePolicy.trim(),
    );
  }

  // add account:GetAccountInformation policy if not present
  if (!fixed.includes('account:GetAccountInformation')) {
    if (/iamRoleStatements:\s*\n/.test(fixed)) {
      fixed = fixed.replace(
        /iamRoleStatements:\s*\n/,
        `iamRoleStatements:\n${accessInferencePolicy}\n`,
      );
    }
  }

  // add ssm:GetParameter to SSM permissions if only GetParameters exists
  if (
    fixed.includes('ssm:GetParameters') &&
    !fixed.includes('ssm:GetParameter\n')
  ) {
    fixed = fixed.replace(
      /Action: 'ssm:GetParameters'/,
      'Action:\n        - ssm:GetParameter\n        - ssm:GetParameters',
    );
  }

  return { contents: fixed };
};
