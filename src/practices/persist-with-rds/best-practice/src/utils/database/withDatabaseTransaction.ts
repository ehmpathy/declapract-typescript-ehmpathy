import { DatabaseConnection } from './getDatabaseConnection';

export const withDatabaseTransaction = <
  P extends { dbConnection: DatabaseConnection },
  R,
>(
  logic: (args: P) => R | Promise<R>,
): typeof logic => {
  return (async (args: P) => {
    await args.dbConnection.query({ sql: 'START TRANSACTION' }); // begin transaction
    try {
      const result = await logic({ ...args }); // run the request
      await args.dbConnection.query({ sql: 'COMMIT' }); // commit if successful
      return result;
    } catch (error) {
      await args.dbConnection.query({ sql: 'ROLLBACK' }); // rollback if not successful
      throw error;
    }
  }) as typeof logic;
};
