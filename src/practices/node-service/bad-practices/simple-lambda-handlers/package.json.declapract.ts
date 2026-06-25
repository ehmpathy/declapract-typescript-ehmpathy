import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

/**
 * .what = removes simple-lambda-handlers and adds sdk-aws-lambda
 * .why = sdk-aws-lambda is the modern replacement with better patterns
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const packageJSON = JSON.parse(contents);

  const updatedPackageJSON = {
    ...packageJSON,
    dependencies: {
      ...packageJSON.dependencies,
      'simple-lambda-handlers': undefined,
      'sdk-aws-lambda':
        packageJSON.dependencies?.['sdk-aws-lambda'] ?? '^0.1.0',
    },
  };

  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
