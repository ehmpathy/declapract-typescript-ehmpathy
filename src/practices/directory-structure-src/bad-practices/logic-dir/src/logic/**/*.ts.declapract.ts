import { FileCheckType, type FileFixFunction } from 'declapract';

// if files exist in src/logic/, this is a bad practice
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move src/logic/* to src/domain.operations/*
  const newPath = context.relativeFilePath.replace(
    'src/logic/',
    'src/domain.operations/',
  );

  return {
    contents,
    relativeFilePath: newPath,
  };
};
