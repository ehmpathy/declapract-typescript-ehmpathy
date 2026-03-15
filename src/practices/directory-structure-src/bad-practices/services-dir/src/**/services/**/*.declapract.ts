import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS; // if a file exists with this path pattern, then it's bad practice

export const fix: FileFixFunction = (contents, context) => {
  // move any /services/* to /domain.operations/* (services = business logic)
  const newPath = context.relativeFilePath.replace(
    /\/services\//g,
    '/domain.operations/',
  );

  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
