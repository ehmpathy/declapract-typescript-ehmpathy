import expect from 'expect';
import { getRdsVariables } from '../../../../getVariables';

export const check = async () => {
  const { databaseClusterHost, databaseName, databaseUserName } = await getRdsVariables();
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
  });
};
