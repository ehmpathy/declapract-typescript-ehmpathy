import type { FileCheckFunction, FileFixFunction } from 'declapract';

import {
  isAdhocLambdaClient,
  withLambdaClientGenMarker,
} from '../../../../../withLambdaClientGenMarker';

/**
 * .what = detect a hand-written lambda client under `src/access/sdks/svc*`
 * .why  = the codegen emits a client that matches the peer's live contract (#532)
 */
export const check: FileCheckFunction = (contents) => {
  if (contents && isAdhocLambdaClient({ contents })) return; // bad practice detected
  throw new Error('not a hand-written lambda client');
};

/**
 * .what = stamp a review marker that names the codegen command for this peer
 */
export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return {};
  return {
    contents: withLambdaClientGenMarker({
      contents,
      relativeFilePath: context.relativeFilePath,
    }),
  };
};
