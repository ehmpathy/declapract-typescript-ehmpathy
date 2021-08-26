import expect from 'expect';

import { getServiceVariables } from '../../../../getVariables';

export const check = async (contents: string | null) => {
  const { organizationName, serviceName } = await getServiceVariables();
  expect(JSON.parse(contents ?? '')).toMatchObject(
    expect.objectContaining({
      parameterStoreNamespace: `${organizationName}.${serviceName}.dev`, // test env should use dev env's parameters (and provisioned resources in general)
    }),
  );
};
