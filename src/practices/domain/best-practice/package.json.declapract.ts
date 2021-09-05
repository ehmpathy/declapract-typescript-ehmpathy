import expect from 'expect';
import { defineMinPackageVersionRegex } from 'declapract';
import { withJSONContentsParsing } from '../../../withJSONContentsParsing';

export const check = withJSONContentsParsing((contents) => {
  expect(contents).toMatchObject(
    expect.objectContaining({
      dependencies: expect.objectContaining({
        'domain-objects': expect.stringMatching(defineMinPackageVersionRegex('0.7.2')),
        joi: expect.stringMatching(defineMinPackageVersionRegex('17.4.0')),
      }),
      devDependencies: expect.objectContaining({
        '@types/joi': expect.stringMatching(defineMinPackageVersionRegex('17.4.0')),
      }),
    }),
  );
});
