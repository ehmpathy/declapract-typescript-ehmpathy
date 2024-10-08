import pg, { Client, QueryResult, QueryResultRow } from 'pg';

import { getConfig } from '../config/getConfig';

// https://github.com/brianc/node-postgres/pull/353#issuecomment-283709264
pg.types.setTypeParser(20, (value) => parseInt(value, 10)); // cast bigints to numbers; by default, pg returns bigints as strings, since max val of bigint is bigger than max safe value in js
pg.types.setTypeParser(1700, (value) => parseFloat(value)); // cast numerics to numbers; by default, pg returns numerics as strings

export interface DatabaseConnection {
  query: <Row extends QueryResultRow>(args: {
    sql: string;
    values?: any[];
  }) => Promise<QueryResult<Row>>;
  end: () => Promise<void>;
}

export class DatabaseQueryError extends Error {
  constructor({
    sql,
    values,
    caught,
  }: {
    sql: string;
    values?: any[];
    caught: Error;
  }) {
    const message = `
caught error querying database: ${caught.message}

sql:
  ${sql.trim()}

values:
  ${JSON.stringify(values)}
    `.trim();
    super(message);
  }
}

export const getDatabaseConnection = async (): Promise<DatabaseConnection> => {
  const config = await getConfig();
  const dbConfig = config.database.service;
  const client = new Client({
    host: dbConfig.host,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.schema,
    port: dbConfig.port,
  });
  await client.connect();
  await client.query(`SET search_path TO ${dbConfig.schema}, public;`); // https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-
  const dbConnection = {
    query: ({ sql, values }: { sql: string; values?: (string | number)[] }) =>
      client.query(sql, values),
    end: () => client.end(),
  };
  return {
    query: (args: { sql: string; values?: any[] }) =>
      dbConnection.query(args).catch((error) => {
        throw new DatabaseQueryError({
          sql: args.sql,
          values: args.values,
          caught: error,
        });
      }),
    end: () => dbConnection.end(),
  };
};
