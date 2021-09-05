import expect from 'expect';
import { getRdsVariables } from '../../../../getVariables';
import { withJSONContentsParsing } from '../../../../withJSONContentsParsing';

export const check = withJSONContentsParsing((contents, context) => {
  const { databaseClusterHost, databaseName, databaseUserName } = getRdsVariables(context);
  expect(contents).toEqual(
    expect.objectContaining({
      database: {
        admin: {
          host: 'localhost',
          port: 7821,
          database: databaseName,
          schema: databaseName,
          username: databaseUserName.cicdUser,
          password: '__CHANG3_ME__',
        },
        service: {
          host: 'localhost',
          port: 7821,
          database: databaseName,
          schema: databaseName,
          username: databaseUserName.serviceUser,
          password: '__CHANG3_ME__',
        },
      },
    }),
  );
});
