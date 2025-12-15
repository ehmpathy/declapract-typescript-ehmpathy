import type { FileCheckFunction } from 'declapract';
import expect from 'expect';

export const check: FileCheckFunction = (contents) => {
  expect(JSON.stringify(contents ?? 'null')).toMatchObject(
    expect.objectContaining({
      dependencies: expect.objectContaining({
        moment: expect.any(String),
      }),
    }),
  );
};
