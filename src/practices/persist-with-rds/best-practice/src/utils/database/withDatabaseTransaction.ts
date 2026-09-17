import type { DatabaseConnection } from './getOneDatabaseConnection';

/**
 * .what = wraps a logic fn so it runs inside one db transaction: START TRANSACTION,
 *         run the logic, COMMIT on success, ROLLBACK + rethrow on failure. the
 *         transaction rides the injected `context.dbConnection`.
 * .why = gives any logic atomic semantics — every write commits together, or none
 *        does — without each op repeating the begin/commit/rollback dance. a partial
 *        write cannot survive a throw.
 * .note = the wrapper is ALWAYS async — it awaits the transaction — so its honest
 *         return type is `Promise<Awaited<R>>`, NOT `logic`'s `R | Promise<R>`. the
 *         return type is declared explicitly so no `as` cast is needed and no type
 *         lie is told: a caller of a sync `logic` correctly sees a Promise back.
 */
export const withDatabaseTransaction = <
  P,
  C extends { dbConnection: DatabaseConnection },
  R,
>(
  logic: (input: P, context: C) => R | Promise<R>,
): ((input: P, context: C) => Promise<Awaited<R>>) => {
  return async (input: P, context: C) => {
    await context.dbConnection.query({ sql: 'START TRANSACTION' }); // begin transaction
    try {
      const result = await logic(input, context); // run the request
      await context.dbConnection.query({ sql: 'COMMIT' }); // commit if successful
      return result;
    } catch (error) {
      await context.dbConnection.query({ sql: 'ROLLBACK' }); // rollback if not successful
      throw error;
    }
  };
};
