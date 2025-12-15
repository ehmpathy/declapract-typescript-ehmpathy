import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents: context.declaredFileContents }; // init as declared if file dne

  return {
    contents: JSON.stringify(
      { ...JSON.parse(contents), ...JSON.parse(context.declaredFileContents!) },
      null,
      2,
    ),
  };
};
