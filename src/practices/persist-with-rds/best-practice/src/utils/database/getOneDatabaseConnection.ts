import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
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

  // instantiate the client, encrypted and verified wherever a cluster endpoint is declared
  const client = new Client({
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
  });
  await client.connect();
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
