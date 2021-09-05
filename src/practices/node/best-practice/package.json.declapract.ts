import expect from 'expect';
import { defineMinPackageVersionRegex, FileCheckFunction } from 'declapract';

import { getServiceVariables } from '../../../getVariables';
import { withJSONContentsParsing } from '../../../withJSONContentsParsing';

export const check: FileCheckFunction = withJSONContentsParsing((contents, context) => {
  const { serviceName } = getServiceVariables(context);
  expect(contents).toEqual(
    expect.objectContaining({
      private: true, // services should not be publicly publishable
      name: serviceName,
      author: 'ahbode', // the whole ahbode team is the author; no one person
      version: expect.stringMatching(defineMinPackageVersionRegex('0.0.0')),
      scripts: expect.objectContaining({
        prepush: 'npm run test && npm run build',
        preversion: 'npm run prepush',
        postversion: 'git push origin HEAD --tags --no-verify',
      }),
    }),
  );
});
