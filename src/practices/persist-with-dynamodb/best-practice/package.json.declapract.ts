import { defineMinPackageVersionRegex } from 'declapract';
import expect from 'expect';

export const check = (contents: string | null) =>
  expect(JSON.parse(contents ?? '')).toMatchObject(
    expect.objectContaining({
      dependencies: expect.objectContaining({
        'simple-dynamodb-client': expect.stringMatching(defineMinPackageVersionRegex('7.0.0')),
      }),
    }),
  );
