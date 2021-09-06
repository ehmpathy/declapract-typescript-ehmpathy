import { FileCheckFunction } from 'declapract';
import expect from 'expect';

export const check: FileCheckFunction = async (contents) => {
  expect(JSON.parse(contents ?? 'null')).toEqual(
    expect.objectContaining({
      license: expect.any(String), // we shouldn't have a license declared for service code
    }),
  );
};
