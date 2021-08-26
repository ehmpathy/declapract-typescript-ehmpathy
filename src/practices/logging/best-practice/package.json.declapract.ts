import expect from 'expect';
import { defineMinPackageVersionRegex } from 'declapract';

export const check = (contents: string | null) =>
  expect(JSON.parse(contents ?? '')).toMatchObject(
    expect.objectContaining({
      devDependencies: expect.objectContaining({
        'simple-leveled-log-methods': expect.stringMatching(defineMinPackageVersionRegex('0.1.1')),
      }),
    }),
  );
