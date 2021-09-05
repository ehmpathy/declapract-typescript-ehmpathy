import { defineMinPackageVersionRegex } from 'declapract';
import expect from 'expect';
import { withJSONContentsParsing } from '../../../withJSONContentsParsing';

export const check = withJSONContentsParsing((contents) => {
  expect(contents).toMatchObject(
    expect.objectContaining({
      dependencies: expect.objectContaining({
        'date-fns': expect.stringMatching(defineMinPackageVersionRegex('2.14.0')),
      }),
    }),
  );
});
