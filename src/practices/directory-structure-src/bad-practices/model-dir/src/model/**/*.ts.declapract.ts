import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS; // if we see that files with this path exist, its bad practice

export const fix: FileFixFunction = (_, context) => {
  return {
    relativeFilePath: context.relativeFilePath
      .replace('src/model/', 'src/domain/')
      .replace('domainObjects/', 'objects/'),
  };
};
