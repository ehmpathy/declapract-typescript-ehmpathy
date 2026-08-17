import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS; // if any files exist in accept.blackbox/, flag as bad practice

/**
 * .what = moves any file from accept.blackbox/ to blackbox/
 * .why = ensures all files are moved, not just .ts files — prevents silent data loss for hidden paths
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
