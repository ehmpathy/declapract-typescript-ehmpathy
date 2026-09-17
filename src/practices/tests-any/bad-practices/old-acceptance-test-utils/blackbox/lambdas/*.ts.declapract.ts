import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { getProjectVariables } from '../../../../../../getVariables';

export const check: FileCheckFunction = (contents) => {
  if (
    contents?.includes(`import { invokeLambda } from '../_utils/invokeLambda';`)
  )
    return; // then it matches bad practice
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = async (contents, context) => {
  if (!contents) return {}; // do nothing if no contents. really, this shouldn't have been called
  const { projectName } = await getProjectVariables(context);
  return {
    contents: contents
      .replace(
        // replace the bad import
        `import { invokeLambda } from '../_utils/invokeLambda';`,
        [
          `import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';`,
          `import { locally } from '../environment';`,
        ].join('\n'),
      )
      .replace(
        // replace calls to the fn
        /invokeLambda\(\{/g,
        'invokeLambdaForTesting({',
      )
      .replace(
        // replace the inputs; capture the indent that precedes `name:` so the
        // expanded 3-line option block stays aligned with its siblings
        /^([ \t]*)name: '(\w+)',/gm,
        (_match, indent, fnName) =>
          [
            `${indent}service: '${projectName}',`,
            `${indent}function: '${fnName}',`,
            `${indent}locally,`,
          ].join('\n'),
      )
      .replace(/data: /g, 'event: '),
  };
};
