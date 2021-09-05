import expect from 'expect';
import { getRdsVariables } from '../../../../getVariables';
import { withJSONContentsParsing } from '../../../../withJSONContentsParsing';

export const check = withJSONContentsParsing((contents, context) => {
  const { databaseClusterHost, databaseName, databaseUserName } = getRdsVariables(context);
  expect(contents).toEqual(
    expect.objectContaining({
      database: {
        admin: {
          host: databaseClusterHost.prod,
          port: 5432,
          database: databaseName,
          schema: databaseName,
          username: databaseUserName.cicdUser,
          password: '__PARAM__',
        },
        service: {
          host: databaseClusterHost.prod,
          port: 5432,
          database: databaseName,
          schema: databaseName,
          username: databaseUserName.serviceUser,
          password: '__PARAM__',
        },
      },
    }),
  );
});
