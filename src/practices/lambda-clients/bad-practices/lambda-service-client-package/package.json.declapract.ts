import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // should not reach here, file should exist; if doesnt though, do nothing
  const parsedContents = JSON.parse(contents);
  const fixedParsedContents = {
    ...parsedContents,
    dependencies: {
      ...parsedContents.dependencies,
      'lambda-service-client': undefined, // remove this module
    },
  };
  return { contents: JSON.stringify(fixedParsedContents, null, 2) };
};
