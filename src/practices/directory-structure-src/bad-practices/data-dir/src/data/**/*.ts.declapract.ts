import { FileCheckType, type FileFixFunction } from 'declapract';

// if files exist in src/data/, this is a bad practice
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move src/data/dao/* to src/access/daos/*
  // move src/data/clients/* to src/access/sdks/*
  // move other src/data/* to src/access/*
  const newPath = context.relativeFilePath
    .replace('src/data/dao/', 'src/access/daos/')
    .replace('src/data/clients/', 'src/access/sdks/')
    .replace('src/data/', 'src/access/');

  return {
    contents,
    relativeFilePath: newPath,
  };
};
