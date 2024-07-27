import { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

export const check: FileCheckFunction = async (contents) => {
  expect(JSON.parse(contents ?? 'null')).toEqual(
    expect.objectContaining({
      license: expect.any(String), // we shouldn't have a license declared for service code
    }),
  );
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if no contents
  const packageJSON = JSON.parse(contents);
  const updatedPackageJSON = {
    ...packageJSON,
    license: undefined,
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
