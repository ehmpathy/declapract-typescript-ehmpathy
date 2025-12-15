import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS; // if we see that files with this path exist, its bad practice

export const fix: FileFixFunction = (contents, context) => {
  return {
    contents:
      contents?.replace(
        "export * from './domainObjects';", // if it has this, we want to replace it
        "export * from './objects';",
      ) ?? null,
    relativeFilePath: context.relativeFilePath
      .replace('src/model/', 'src/domain/')
      .replace('domainObjects/', 'objects/'),
  };
};
