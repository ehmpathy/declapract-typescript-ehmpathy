import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  // remove the file: a null contents result deletes it
  return { contents: null };
};
