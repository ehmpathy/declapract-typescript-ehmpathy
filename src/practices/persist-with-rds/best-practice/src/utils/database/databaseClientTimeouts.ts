import { toMilliseconds } from 'iso-time';

/**
 * .what = the connect and query bounds every pg client in this service carries
 * .why = pg's defaults wait forever. a cluster that accepts the socket and never
 *        answers — the shape of a major-version flip — would otherwise hold each
 *        lambda for its full timeout, at full concurrency
 * .note = connect outlasts an aurora serverless v2 resume from zero acu: a client-woken
 *         resume takes 19-30s, and aws puts one after a pause past 24h at 30s or more.
 *         each bound alone sits under the template's 60s lambda timeout, so a connect or a
 *         query that hangs surfaces as an error. a slow connect then a slow query can sum past
 *         60s; that pair ends in a lambda timeout. a lambda bound under 35s cannot outlast a resume
 */
export const databaseClientTimeouts = {
  connectionTimeoutMillis: toMilliseconds({ seconds: 35 }),
  query_timeout: toMilliseconds({ seconds: 30 }),
};
