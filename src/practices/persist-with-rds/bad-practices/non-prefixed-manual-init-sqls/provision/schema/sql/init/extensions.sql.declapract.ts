import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

// for this one, we want to move the file, not just delete it, since it may have had customizations
export const fix: FileFixFunction = (_, context) => {
  return {
    relativeFilePath: context.relativeFilePath.replace(
      '/extensions.sql',
      '/.extensions.sql',
    ),
  };
};
