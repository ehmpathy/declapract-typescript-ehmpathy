import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};
  return {
    contents: contents
      .replace(
        `import { promiseLambdaInvocation } from '../../__nonpublished_modules__/ahbode-standard-lambda-handler';`,
        `import { invokeHandlerForTesting } from 'simple-lambda-testing-methods';`,
      )
      .replace(/promiseLambdaInvocation/g, 'invokeHandlerForTesting'),
  };
};
