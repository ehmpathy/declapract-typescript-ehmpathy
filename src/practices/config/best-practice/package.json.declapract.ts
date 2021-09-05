import expect from 'expect';
import { defineMinPackageVersionRegex } from 'declapract';
import { withJSONContentsParsing } from '../../../withJSONContentsParsing';

export const check = withJSONContentsParsing((contents) => {
  expect(contents).toMatchObject(
    expect.objectContaining({
      devDependencies: expect.objectContaining({
        'config-with-paramstore': expect.stringMatching(defineMinPackageVersionRegex('1.1.1')),
      }),
    }),
  );
});
