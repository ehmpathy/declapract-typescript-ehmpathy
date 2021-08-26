import { defineMinPackageVersionRegex } from 'declapract';
import expect from 'expect';

export const check = (contents: string | null) =>
  expect(JSON.parse(contents ?? '')).toMatchObject(
    expect.objectContaining({
      dependencies: expect.objectContaining({
        'date-fns': expect.stringMatching(defineMinPackageVersionRegex('2.14.0')),
      }),
    }),
  );
