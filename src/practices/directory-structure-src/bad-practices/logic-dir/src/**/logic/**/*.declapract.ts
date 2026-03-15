import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

/**
 * .what = moves any file from any /logic/ to /domain.operations/
 * .why = ensures all files are moved, not just .ts files — prevents silent data loss for hidden paths
 */
export const fix: FileFixFunction = (contents, context) => {
  const newPath = context.relativeFilePath.replace(
    /\/logic\//g,
    '/domain.operations/',
  );

  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
