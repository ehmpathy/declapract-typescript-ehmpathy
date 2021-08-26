import expect from 'expect';
import { getRdsVariables } from '../../../../getVariables';

export const check = async () => {
  const { databaseClusterHost, databaseName, databaseUserName } = await getRdsVariables();
  expect.objectContaining({
    database: {
      admin: {
        host: databaseClusterHost.dev,
        port: 5432,
        database: databaseName,
        schema: databaseName,
        username: databaseUserName.cicdUser,
        password: '__CHANG3_ME__',
      },
      service: {
        host: databaseClusterHost.dev,
        port: 5432,
        database: databaseName,
        schema: databaseName,
        username: databaseUserName.serviceUser,
        password: '__CHANG3_ME__',
      },
    },
  });
};
