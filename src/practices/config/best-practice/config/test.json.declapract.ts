import expect from 'expect';

import { getServiceVariables } from '../../../../getVariables';
import { withJSONContentsParsing } from '../../../../withJSONContentsParsing';

export const check = withJSONContentsParsing((contents, context) => {
  const { organizationName, serviceName } = getServiceVariables(context);
  expect(contents).toMatchObject(
    expect.objectContaining({
      parameterStoreNamespace: `${organizationName}.${serviceName}.dev`, // test env should use dev env's parameters (and provisioned resources in general)
    }),
  );
});
