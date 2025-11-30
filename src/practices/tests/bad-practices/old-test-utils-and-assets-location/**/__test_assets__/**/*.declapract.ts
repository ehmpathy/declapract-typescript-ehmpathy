import type { FileFixFunction } from 'declapract';
import { FileCheckType } from 'declapract';

export const check = FileCheckType.EXISTS; // if files exist in __test_assets__ directories, it's bad practice

export const fix: FileFixFunction = (contents, context) => {
  // move from any/**/__test_assets__/**/* to .test.assets/**/*
  const newPath = context.relativeFilePath.replace(
    /__test_assets__\//g,
    '.test.assets/',
  );

  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
