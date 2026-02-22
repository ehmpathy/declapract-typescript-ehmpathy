import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS; // if any files exist in acceptance/, flag as bad practice

/**
 * .what = moves any file from acceptance/ to blackbox/
 * .why = ensures all files are moved, not just .ts files — prevents silent data loss for hidden paths
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
