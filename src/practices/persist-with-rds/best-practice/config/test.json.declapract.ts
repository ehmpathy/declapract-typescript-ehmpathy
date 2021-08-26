import expect from 'expect';
import { getRdsVariables } from '../../../../getVariables';

export const check = async () => {
  const { databaseName, databaseUserName } = await getRdsVariables();
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
  });
};
