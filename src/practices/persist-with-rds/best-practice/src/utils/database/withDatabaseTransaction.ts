import { DatabaseConnection } from './getDatabaseConnection';

export const withDatabaseTransaction = <
  P,
  C extends { dbConnection: DatabaseConnection },
  R,
>(
  logic: (input: P, context: C) => R | Promise<R>,
): typeof logic => {
  return (async (input: P, context: C) => {
    await context.dbConnection.query({ sql: 'START TRANSACTION' }); // begin transaction
    try {
      const result = await logic(input, context); // run the request
      await context.dbConnection.query({ sql: 'COMMIT' }); // commit if successful
      return result;
    } catch (error) {
      await context.dbConnection.query({ sql: 'ROLLBACK' }); // rollback if not successful
      throw error;
    }
  }) as typeof logic;
};
