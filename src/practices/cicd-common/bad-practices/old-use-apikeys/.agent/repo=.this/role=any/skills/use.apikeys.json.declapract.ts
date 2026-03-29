import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  return { contents: null };
};
