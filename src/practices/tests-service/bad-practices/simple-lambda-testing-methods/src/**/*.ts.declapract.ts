import type { FileCheckFunction, FileFixFunction } from 'declapract';

import {
  asSourceOnRunLambdaEndpoint,
  isOnRetiredLambdaTestLib,
} from '../../../../../../utils/asSourceOnRunLambdaEndpoint';

/**
 * .what = detects an integration test still on simple-lambda-testing-methods
 * .why  = the lib is retired for sdk-aws-lambda's runLambdaEndpoint (#650)
 */
export const check: FileCheckFunction = (contents) => {
  if (contents && isOnRetiredLambdaTestLib({ contents })) return; // bad practice detected
  throw new Error('does not match bad practice');
};

/**
 * .what = moves the test onto runLambdaEndpoint.onReferenced / .onSerialized
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};
  return { contents: asSourceOnRunLambdaEndpoint({ contents }) };
};
