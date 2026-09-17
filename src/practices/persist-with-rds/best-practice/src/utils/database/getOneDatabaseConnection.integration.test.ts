import { getOneDatabaseConnection } from './getOneDatabaseConnection';

describe('getOneDatabaseConnection', () => {
  it('should be able to connect and execute a query', async () => {
    const dbConnection = await getOneDatabaseConnection();
    const result = await dbConnection.query({ sql: 'select 1' });
    expect(result.rows.length).toEqual(1);
    await dbConnection.end();
  });
});
