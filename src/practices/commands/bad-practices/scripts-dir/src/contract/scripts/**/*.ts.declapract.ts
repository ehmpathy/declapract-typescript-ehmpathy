import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS; // if we see that files with this path exist, its bad practice

export const fix: FileFixFunction = (_, context) => {
  return {
    relativeFilePath: context.relativeFilePath.replace(
      'src/contract/scripts/',
      'src/contract/commands/',
    ),
  };
};
