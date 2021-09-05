import { FileCheckFunction } from 'declapract';
import expect from 'expect';
import { withJSONContentsParsing } from '../../../../withJSONContentsParsing';

export const check: FileCheckFunction = withJSONContentsParsing(async (contents) => {
  expect(contents).toEqual(
    expect.objectContaining({
      license: expect.any(String), // we shouldn't have a license
    }),
  );
});
