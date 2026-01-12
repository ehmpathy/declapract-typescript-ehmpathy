import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS; // if any ts files exist in accept.blackbox/, flag as bad practice

/**
 * .what = moves ts files from accept.blackbox/ to blackbox/
 * .why = blackbox/ naming is simpler and makes the testing philosophy explicit
 */
export const fix: FileFixFunction = (contents, context) => {
  // move from accept.blackbox/ to blackbox/
  const newPath = context.relativeFilePath.replace(
    /^accept\.blackbox\//,
    'blackbox/',
  );
  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
