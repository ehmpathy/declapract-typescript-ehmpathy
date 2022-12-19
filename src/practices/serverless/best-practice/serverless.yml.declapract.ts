import { FileCheckType } from 'declapract';
import { FileFixFunction } from 'declapract/dist/domain';

export const check = FileCheckType.CONTAINS; // i.e., check that the contents of the file contains what's declared (default is equals)

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if file dne; // TODO: update to provision file from declared contents
  return {
    contents: contents
      .replace(/runtime\: nodejs\d\d.x/, 'runtime: nodejs14.x')
      .replace('\nplugins:\n', '')
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
        'NODE_ENV: ${self:custom.stageToNodeEnvMapping.${self:provider.stage}}\n  deploymentBucket',
        'NODE_ENV: ${self:custom.stageToNodeEnvMapping.${self:provider.stage}}\n    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true # https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html\n  deploymentBucket',
      ), // add this env flag // TODO: when we have special support for yml, do this better (i.e., instead of string replace, just add to the yml object after parsing it)
  };
};
