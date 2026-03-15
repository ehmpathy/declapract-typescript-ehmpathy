import { FileCheckType, type FileFixFunction } from 'declapract';

// if files exist in any /data/, this is a bad practice
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move any /data/dao/* to /access/daos/*
  // move any /data/clients/* to /access/sdks/*
  // move other /data/* to /access/*
  const newPath = context.relativeFilePath
    .replace(/\/data\/dao\//g, '/access/daos/')
    .replace(/\/data\/clients\//g, '/access/sdks/')
    .replace(/\/data\//g, '/access/');

  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
