import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  // delete the file - sdk-config replaces config-with-paramstore
  return { contents: null };
};
