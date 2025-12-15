import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};
  return {
    contents: contents.replace(
      `import { createStandardHandler } from '../../__nonpublished_modules__/ahbode-standard-lambda-handler';`,
      `import { createStandardHandler } from 'simple-lambda-handlers';`,
    ),
  };
};
