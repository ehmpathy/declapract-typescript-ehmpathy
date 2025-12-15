import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS; // if a file exists with this path pattern, then it's bad practice

export const fix: FileFixFunction = async (contents, { relativeFilePath }) => {
  // Move from integration_test_db to testdb
  const newPath = relativeFilePath.replace(
    'provision/docker/integration_test_db',
    'provision/docker/testdb',
  );
  return {
    contents,
    relativeFilePath: newPath,
  };
};
