import { toMilliseconds } from 'iso-time';

/**
 * .what = the connect and query bounds every pg client in this service carries
 * .why = pg's defaults wait forever. a cluster that accepts the socket and never
 *        answers — the shape of a major-version flip — would otherwise hold each
 *        lambda for its full timeout, at full concurrency
 * .note = connect outlasts an aurora serverless v2 resume from zero acu (~15s);
 *         query sits under the lambda timeout so the error surfaces, never a kill
 */
export const databaseClientTimeouts = {
  connectionTimeoutMillis: toMilliseconds({ seconds: 20 }),
  query_timeout: toMilliseconds({ seconds: 30 }),
};
