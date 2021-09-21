import { FileCheckFunction, FileFixFunction } from 'declapract';

import { getServiceVariables } from '../../../../../../getVariables';
import { defineFunctionNameFromTestFileName } from '../../../../defineFunctionNameFromTestFileName';

export const check: FileCheckFunction = (contents) => {
  if (
    contents?.includes(`import { invokeLambda } from '../_utils/invokeLambda';`)
  )
    return; // then it matches bad practice
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = async (contents, context) => {
  if (!contents) return {}; // do nothing if no contents. really, this shouldn't have been called
  const { serviceName } = await getServiceVariables(context);
  return {
    contents: contents
      .replace(
        // replace the bad import
        `import { invokeLambda } from '../_utils/invokeLambda';`,
        [
          `import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';`,
          `import { stage } from '../../src/utils/environment';`,
          `import { locally } from '../environment';`,
        ].join('\n'),
      )
      .replace(
        // replace calls to the fn
        /invokeLambda\(\{/g,
        'invokeLambdaForTesting({',
      )
      .replace(
        // replace the inputs
        /name\: '(\w+)',/g,
        [
          `service: '${serviceName}',`,
          `function: '$1',`,
          `stage,`,
          `locally,`,
        ].join('\n'),
      )
      .replace(/data\: /g, 'event: '),
  };
};
