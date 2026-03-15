import { FileCheckType, type FileFixFunction } from 'declapract';

// if files exist in __nonpublished_modules__/, this is a bad practice
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move any /__nonpublished_modules__/ to /_topublish/
  const newPath = context.relativeFilePath.replace(
    /__nonpublished_modules__\//g,
    '_topublish/',
  );

  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
