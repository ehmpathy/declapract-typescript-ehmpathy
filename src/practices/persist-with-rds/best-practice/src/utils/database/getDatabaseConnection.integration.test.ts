import { getDatabaseConnection } from './getDatabaseConnection';

describe('getDatabaseConnection', () => {
  it('should be able to connect and execute a query', async () => {
    const dbConnection = await getDatabaseConnection();
    const result = await dbConnection.query({ sql: 'select 1' });
    expect(result.rows.length).toEqual(1);
    await dbConnection.end();
  });
});
