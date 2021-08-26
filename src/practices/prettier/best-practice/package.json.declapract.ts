import expect from 'expect';
import { defineMinPackageVersionRegex } from 'declapract';

export const check = (contents: string | null) =>
  expect(JSON.parse(contents ?? '')).toMatchObject(
    expect.objectContaining({
      devDependencies: expect.objectContaining({
        prettier: expect.stringMatching(defineMinPackageVersionRegex('2.0.0')),
      }),
      scripts: expect.objectContaining({
        format: "prettier --write '**/*.ts' --config ./prettier.config.js",
      }),
    }),
  );
