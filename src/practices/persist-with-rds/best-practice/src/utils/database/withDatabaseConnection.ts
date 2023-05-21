import {
  DatabaseConnection,
  getDatabaseConnection,
} from './getDatabaseConnection';

/**
 * wraps the function to provide a managed database connection to it, if one was not already passed in
 *
 * note
 * - manages the database connection it gives to the function by opening it and closing it once the function finishes
 * - if a database connection was passed in as part of the arguments, it will instead use that one and will not close it once it finishes (useful for transactions)
 *
 * example usage:
 * ```
 *   const findById = withDatabaseConnection(({ id, dbConnection }: { id: string; dbConnection: DatabaseConnection }) => {
 *     // do logic with dbConnection
 *   });
 *   // ...
 *   await findById({ id: 821 }); // note how we don't have to pass in the dbConnection
 * ```
 */
export const withDatabaseConnection = <
  P extends { dbConnection: DatabaseConnection },
  R,
>(
  logic: (args: P) => R | Promise<R>,
) => {
  return async (
    args: Omit<P, 'dbConnection'> & { dbConnection?: DatabaseConnection },
  ) => {
    // open the db connection, if one was not given
    const dbConnection = args.dbConnection ?? (await getDatabaseConnection());

    // try and run the logic with db connection
    try {
      return await logic({ ...args, dbConnection } as P); // as P because: https://github.com/microsoft/TypeScript/issues/35858
    } finally {
      // make sure to close the db connection, both when `logic` throws an error or succeeds
      if (!args.dbConnection) await dbConnection.end();
    }
  };
};
