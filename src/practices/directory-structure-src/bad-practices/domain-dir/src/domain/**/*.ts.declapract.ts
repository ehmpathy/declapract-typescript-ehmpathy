import { FileCheckType, type FileFixFunction } from 'declapract';

// if files exist in src/domain/, this is a bad practice
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move src/domain/objects/* to src/domain.objects/*
  // move src/domain/* to src/domain.objects/*
  const newPath = context.relativeFilePath
    .replace('src/domain/objects/', 'src/domain.objects/')
    .replace('src/domain/', 'src/domain.objects/');

  return {
    contents,
    relativeFilePath: newPath,
  };
};
