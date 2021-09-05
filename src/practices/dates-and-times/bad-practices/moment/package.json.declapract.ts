import expect from 'expect';
import { withJSONContentsParsing } from '../../../../withJSONContentsParsing';

export const check = withJSONContentsParsing((contents) => {
  expect(contents).toMatchObject(
    expect.objectContaining({
      dependencies: expect.objectContaining({
        moment: expect.any(String),
      }),
    }),
  );
});
