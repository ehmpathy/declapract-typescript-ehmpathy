import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

/**
 * .what = moves any file from src/contract/scripts/ to src/contract/commands/
 * .why = ensures all files are moved, not just .ts files — prevents silent data loss for hidden paths
 */
export const fix: FileFixFunction = (contents, context) => {
  return {
    contents: contents ?? null,
    relativeFilePath: context.relativeFilePath.replace(
      'src/contract/scripts/',
      'src/contract/commands/',
    ),
  };
};
