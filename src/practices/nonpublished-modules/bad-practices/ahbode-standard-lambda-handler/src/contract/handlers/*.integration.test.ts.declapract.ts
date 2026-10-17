import { FileCheckType, type FileFixFunction } from 'declapract';

import { asSourceOnRunLambdaEndpoint } from '../../../../../../../utils/asSourceOnRunLambdaEndpoint';

export const check = FileCheckType.CONTAINS;

/**
 * .what = move `promiseLambdaInvocation` off the nonpublished module, onto
 *         `runLambdaEndpoint.onReferenced(...).then(asLambdaEndpointOutput)`
 * .why  = the old successor, simple-lambda-testing-methods, is retired (#650); the move lands on
 *         sdk-aws-lambda in one apply, so an adopter never passes through the retired lib
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};
  return {
    contents: asSourceOnRunLambdaEndpoint({
      contents: contents
        .replace(
          `import { promiseLambdaInvocation } from '../../__nonpublished_modules__/ahbode-standard-lambda-handler';`,
          `import { invokeHandlerForTesting } from 'simple-lambda-testing-methods';`,
        )
        .replace(/promiseLambdaInvocation/g, 'invokeHandlerForTesting'),
    }),
  };
};
