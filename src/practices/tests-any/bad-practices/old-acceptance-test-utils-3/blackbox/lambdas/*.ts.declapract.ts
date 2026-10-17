import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asSourceOnRunLambdaEndpoint } from '../../../../../../utils/asSourceOnRunLambdaEndpoint';

export const check: FileCheckFunction = (contents) => {
  if (contents?.includes(`import { locally } from '../_utils/environment';`))
    return; // then it matches bad practice
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = async (contents) => {
  if (!contents) return {}; // do nothing if no contents. really, this shouldn't have been called
  // move the environment import, and off the retired test lib in the same apply (#650)
  return {
    contents: asSourceOnRunLambdaEndpoint({
      contents: contents.replace(
        // replace the bad import
        `import { locally } from '../_utils/environment';`,
        `import { locally } from '../environment';`,
      ),
    }),
  };
};
