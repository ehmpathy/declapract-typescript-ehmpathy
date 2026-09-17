import {
  DatabaseConnection,
  getOneDatabaseConnection,
} from './getOneDatabaseConnection';

export interface DatabaseContext {
  dbConnection: DatabaseConnection;
}

/**
 * wraps the function to provide a managed database connection to it's context, if one was not already passed in
 *
 * note
 * - manages the database connection it gives to the function by opening it and closing it once the function finishes
 * - if a database connection was passed in as part of the arguments, it will instead use that one and will not close it once it finishes (useful for transactions)
 *
 * example usage:
 * ```
 *   const findById = withDatabaseContext(({ id }: { id: string }, context: { dbConnection: DatabaseConnection }) => {
 *     // do logic with dbConnection
 *   });
 *   // ...
 *   await findById({ id: 821 }); // note how we don't have to pass in the dbConnection
 * ```
 */
export const withDatabaseContext = <P1, P2 extends DatabaseContext, R>(
  logic: (input: P1, context: P2) => R | Promise<R>,
) => {
  return async (
    input: P1,
    context: Omit<P2, 'dbConnection'> & { dbConnection?: DatabaseConnection },
  ) => {
    // open the db connection, if one was not given
    const dbConnection =
      context.dbConnection ?? (await getOneDatabaseConnection());

    // try and run the logic with db connection
    try {
      // as-cast — why types miss: the input context is `Omit<P2,'dbConnection'> &
      //   { dbConnection? }`; the spread `{ ...context, dbConnection }` re-adds a
      //   NON-optional dbConnection, but ts cannot prove a spread of a generic
      //   `Omit<P2,…> & {…}` reconstitutes the exact `P2` (microsoft/TypeScript#35858).
      // correct type: the value IS `P2` — every P2 key is present (the omit dropped
      //   only dbConnection, which the spread restores with a concrete connection).
      // removal path: ts resolves spread-of-generic to the original type
      //   (microsoft/TypeScript#35858), or the caller passes a fully-typed P2 in.
      return await logic(input, { ...context, dbConnection } as P2);
    } finally {
      // make sure to close the db connection, both when `logic` throws an error or succeeds
      if (!context.dbConnection) await dbConnection.end();
    }
  };
};
