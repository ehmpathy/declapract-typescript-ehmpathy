import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if no contents
  // Replace integration-test-db with testdb in all paths
  const fixed = contents.replace(/integration-test-db/g, 'testdb');
  return { contents: fixed };
};
