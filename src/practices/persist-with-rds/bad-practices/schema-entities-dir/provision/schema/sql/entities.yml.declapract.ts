import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (_, context) => {
  return {
    // rename file to "domain.yml"
    relativeFilePath: context.relativeFilePath.replace(
      /entities\.yml$/,
      'domain.yml',
    ),
  };
};
