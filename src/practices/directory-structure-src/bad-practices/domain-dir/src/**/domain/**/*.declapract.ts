import { FileCheckType, type FileFixFunction } from 'declapract';

// if files exist in any /domain/, this is a bad practice
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move any /domain/objects/* to /domain.objects/*
  // move any /domain/* to /domain.objects/*
  const newPath = context.relativeFilePath
    .replace(/\/domain\/objects\//g, '/domain.objects/')
    .replace(/\/domain\//g, '/domain.objects/');

  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
