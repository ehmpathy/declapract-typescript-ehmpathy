import { DatabaseConnection } from './getDatabaseConnection';

export const withDatabaseTransaction = <
  P extends { dbConnection: DatabaseConnection },
  R,
  T extends (args: P) => Promise<R>
>(
  logic: T,
): T => {
  return (async (args: Parameters<T>[0]) => {
    await args.dbConnection.query({ sql: 'START TRANSACTION' }); // begin transaction
    try {
      const result = await logic({ ...args }); // run the request
      await args.dbConnection.query({ sql: 'COMMIT' }); // commit if successful
      return result;
    } catch (error) {
      await args.dbConnection.query({ sql: 'ROLLBACK' }); // rollback if not successful
      throw error;
    }
  }) as T;
};
