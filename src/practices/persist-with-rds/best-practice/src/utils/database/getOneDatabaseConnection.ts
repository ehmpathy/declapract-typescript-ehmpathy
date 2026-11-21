import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import { getDuration, type IsoTimeStamp, now, toMilliseconds } from 'iso-time';
import pg, { Client, type QueryResult, type QueryResultRow } from 'pg';

import { getConfig } from '@src/utils/config/getConfig';
import { getEnvironment } from '@src/utils/environment';

import { asDatabaseClientSsl } from './asDatabaseClientSsl';
import { databaseClientTimeouts } from './databaseClientTimeouts';
import { getOneDatabasePort } from './getOneDatabasePort';

// https://github.com/brianc/node-postgres/pull/353#issuecomment-283709264
pg.types.setTypeParser(20, (value) => parseInt(value, 10)); // cast bigints to numbers; by default, pg returns bigints as strings, since max val of bigint is bigger than max safe value in js
pg.types.setTypeParser(1700, (value) => parseFloat(value)); // cast numerics to numbers; by default, pg returns numerics as strings

export interface DatabaseConnection {
  query: <Row extends QueryResultRow>(args: {
    sql: string;
    values?: unknown[];
  }) => Promise<QueryResult<Row>>;
  end: () => Promise<void>;
}

export class DatabaseQueryError extends HelpfulError {
  constructor({
    sql,
    values,
    caught,
  }: {
    sql: string;
    values?: unknown[];
    caught: Error;
  }) {
    const message = `
caught error querying database: ${caught.message}

sql:
  ${sql.trim()}

values:
  ${JSON.stringify(values)}
    `.trim();
    super(message, { sql, values, cause: caught });
  }
}

/**
 * .what = how soon a connect must fault to earn the one retry
 * .why = the retry connects under the full 35s bound, so the connect phase, retry and pause
 *        included, stays near 41s, under the template's 60s lambda timeout
 */
const connectRetryWindow = toMilliseconds({ seconds: 5 });

/**
 * .what = whether a failed connect is a transient fault a fresh connect may clear
 * .why = a burst of connects mid-resume can drop some sessions (a reset socket) or meet the
 *        connection cap, and aws advises one retry for those. a timeout is excluded: a second
 *        35s wait would outlast the lambda. an auth or config fault is excluded: a retry repeats it
 * .note = 53300 is postgres's `too_many_connections`
 */
const isDatabaseConnectErrorTransient = (input: {
  error: unknown;
}): boolean => {
  if (typeof input.error !== 'object' || input.error === null) return false;
  return (
    'code' in input.error &&
    (input.error.code === 'ECONNRESET' || input.error.code === '53300')
  );
};

/**
 * .what = whether a failed connect earns the one retry
 * .why = only a transient fault that arrived fast earns it: a transient fault late in the
 *        first connect would push a second full connect past the lambda, so it surfaces instead
 */
const isConnectRetryEarned = (input: {
  error: unknown;
  since: IsoTimeStamp;
  until: IsoTimeStamp;
}): boolean => {
  const elapsed = getDuration({
    of: { range: { since: input.since, until: input.until } },
  });
  return (
    isDatabaseConnectErrorTransient({ error: input.error }) &&
    toMilliseconds(elapsed) <= connectRetryWindow
  );
};

/**
 * .what = waits 250-750ms, at random, before the one retry
 * .why = lambdas that meet one full cluster (53300) at once would retry at once and meet it full
 *        again; a spread lets the cap drain between them
 */
const waitForConnectRetryPause = async (): Promise<void> => {
  const pause =
    toMilliseconds({ milliseconds: 250 }) +
    Math.random() * toMilliseconds({ milliseconds: 500 });
  await new Promise((done) => setTimeout(done, pause));
};

/**
 * .what = the fault a connect threw, or null when the client connected
 * .why = names the settle, so the retry below reads as a branch on the fault
 */
const getOneConnectFault = async (input: {
  client: Client;
}): Promise<unknown | null> =>
  input.client.connect().then(
    () => null,
    (error: unknown) => error,
  );

/**
 * .what = connects a pg client, with one retry on a fast transient fault
 * .why = a failed pg Client cannot connect again, so the retry builds a fresh one
 */
const getOneConnectedClient = async (input: {
  genClient: () => Client;
}): Promise<Client> => {
  // the first connect; most connects end here
  const connectSince = now();
  const clientFirst = input.genClient();
  const errorFirst = await getOneConnectFault({ client: clientFirst });
  if (errorFirst === null) return clientFirst;

  // only a fast transient fault earns the one retry; every other fault surfaces as is
  const isRetryEarned = isConnectRetryEarned({
    error: errorFirst,
    since: connectSince,
    until: now(),
  });
  if (!isRetryEarned) throw errorFirst;
  await waitForConnectRetryPause();
  const clientRetry = input.genClient();
  await clientRetry.connect();
  return clientRetry;
};

/**
 * .what = opens one pg client on the tunnel for this environment, encrypted and bounded
 * .why = the one place the app builds a pg client, so every connection carries the same tls,
 *        the same timeouts, and the same DatabaseQueryError
 * .note = mode 'readonly' reads config under the plan grant and connects as the cicd for-plan
 *         role, then marks the session read only. the session mode is a guard against a slip,
 *         not a security boundary: a query can still flip it back. the boundary is the for-plan
 *         role's own grants
 */
export const getOneDatabaseConnection = async (
  input: { mode: 'readwrite' | 'readonly' } = { mode: 'readwrite' },
): Promise<DatabaseConnection> => {
  const environment = await getEnvironment();

  // read the config under the grant the mode needs; readonly never reads a write credential
  const config =
    input.mode === 'readonly'
      ? await getConfig({ grant: 'plan' })
      : await getConfig();
  const target = config.database.target;
  const role =
    input.mode === 'readonly'
      ? config.database.role.cicd['for-plan']
      : config.database.role.crud;

  // determine which tunnel to use based on environment.server
  const tunnel =
    environment.server === 'cloud@aws.lambda'
      ? config.database.tunnel.lambda
      : config.database.tunnel.local;

  // ensure tunnel is defined for the requested server
  if (!tunnel) {
    throw new UnexpectedCodePathError(
      `Database tunnel not configured for environment.server + env.access`,
      { environment },
    );
  }

  // connect a client, encrypted and verified wherever a cluster endpoint is declared
  const client = await getOneConnectedClient({
    genClient: () =>
      new Client({
        host: tunnel.host,
        port: getOneDatabasePort({
          access: environment.access,
          portDeclared: tunnel.port,
        }), // a worktree's testdb binds a port of its own; the test harness declares it via TESTDB_PORT
        user: role.username,
        password: role.password,
        database: target.database,
        ssl: asDatabaseClientSsl({
          clusterEndpoint: config.database.tunnel.lambda?.host ?? null,
        }),
        ...databaseClientTimeouts,
      }),
  });
  await client.query(`SET search_path TO ${target.schema}, public;`); // https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-

  // mark a readonly session read only, so a write from it fails loud
  if (input.mode === 'readonly')
    await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;');

  // declare our interface
  return {
    query: (args: { sql: string; values?: unknown[] }) =>
      client.query(args.sql, args.values).catch((error) => {
        throw new DatabaseQueryError({
          sql: args.sql,
          values: args.values,
          caught: error,
        });
      }),
    end: () => client.end(),
  };
};
