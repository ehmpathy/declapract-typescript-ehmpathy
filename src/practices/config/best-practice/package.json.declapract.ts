import expect from 'expect';
import { defineMinPackageVersionRegex } from 'declapract';

export const check = (contents: string | null) =>
  expect(JSON.parse(contents ?? '')).toMatchObject(
    expect.objectContaining({
      devDependencies: expect.objectContaining({
        'config-with-paramstore': expect.stringMatching(defineMinPackageVersionRegex('1.1.1')),
      }),
    }),
  );
