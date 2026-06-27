import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  const newPath = context.relativeFilePath.replace(
    /^provision\/aws\/environments\/dev\//,
    'provision/aws/environments/prep/',
  );
  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
