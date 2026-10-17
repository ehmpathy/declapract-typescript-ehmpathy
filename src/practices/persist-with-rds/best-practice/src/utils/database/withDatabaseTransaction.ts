import type { DatabaseConnection } from './getOneDatabaseConnection';

/**
 * .what = wraps a logic fn so it runs inside one db transaction: START TRANSACTION,
 *         run the logic, COMMIT on success, ROLLBACK + rethrow on failure. the
 *         transaction rides the injected `context.dbConnection`.
 * .why = gives any logic atomic semantics — every write commits together, or none
 *        does — without each op repeating the begin/commit/rollback dance. a partial
 *        write cannot survive a throw.
 * .note = the wrapper is ALWAYS async — it awaits the transaction — so its return
 *         type is `Promise<R>`, NOT `logic`'s `R | Promise<R>`: a caller of a sync
 *         `logic` sees a Promise back. `R` is already the resolved value, since ts
 *         infers it from the `Promise<R>` arm of the union. `Promise<Awaited<R>>` is
 *         wrong here: `await` of an unconstrained `R` types as `R`, which is not
 *         assignable to `Awaited<R>`, so tsc fails inside this file.
 */
export const withDatabaseTransaction = <
  P,
  C extends { dbConnection: DatabaseConnection },
  R,
>(
  logic: (input: P, context: C) => R | Promise<R>,
): ((input: P, context: C) => Promise<R>) => {
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
