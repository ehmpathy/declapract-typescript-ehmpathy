import expect from 'expect';
import { defineMinPackageVersionRegex } from 'declapract';

import { getServiceVariables } from '../../../getVariables';

export const check = async () => {
  const { serviceName } = await getServiceVariables();
  return expect.objectContaining({
    private: true, // services should not be publicly publishable
    name: serviceName,
    version: expect.stringMatching(defineMinPackageVersionRegex('0.0.0')),
    scripts: expect.objectContaining({
      prepush: 'npm run test && npm run build',
      preversion: 'npm run prepush',
      postversion: 'git push origin HEAD --tags --no-verify',
    }),
  });
};
