import { DatabaseConnection, getDatabaseConnection } from './getDatabaseConnection';

/**
 * wraps the input function and gives it a managed database connection
 *
 * managed meaning: it is opened when it is passed in and it is closed when the logic finishes running or throws an error.
 *
 * example usage:
 * ```
 *   const findById = withDatabaseConnection(({ id, dbConnection }: { id: string; dbConnection: DatabaseConnection }) => {
 *     // do logic with dbConnection
 *   });
 *   // ...
 *   await findById({ id: 821 }); // note how we dont have to pass in the dbConnection
 * ```
 */
export const withDatabaseConnection = <P extends { dbConnection: DatabaseConnection }, R>(logic: (args: P) => R | Promise<R>) => {
  return async (args: Omit<P, 'dbConnection'>) => {
    // open the db connection
    const dbConnection = await getDatabaseConnection();

    // try and run the logic with db connection
    try {
      return await logic({ ...args, dbConnection } as P); // as P because: https://github.com/microsoft/TypeScript/issues/35858
    } finally {
      // make sure to close the db connection, both when `logic` throws an error or succeeds
      await dbConnection.end();
    }
  };
};
