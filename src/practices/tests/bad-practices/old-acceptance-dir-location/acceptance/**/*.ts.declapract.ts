import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS; // if any ts files exist in acceptance/, flag as bad practice

/**
 * .what = moves ts files from acceptance/ to blackbox/
 * .why = blackbox/ naming makes the testing philosophy explicit
 */
export const fix: FileFixFunction = (contents, context) => {
  // move from acceptance/ to blackbox/
  const newPath = context.relativeFilePath.replace(
    /^acceptance\//,
    'blackbox/',
  );
  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
