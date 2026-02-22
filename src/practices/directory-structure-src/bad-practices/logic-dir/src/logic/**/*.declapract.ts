import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

/**
 * .what = moves any file from src/logic/ to src/domain.operations/
 * .why = ensures all files are moved, not just .ts files — prevents silent data loss for hidden paths
 */
export const fix: FileFixFunction = (contents, context) => {
  const newPath = context.relativeFilePath.replace(
    'src/logic/',
    'src/domain.operations/',
  );

  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
