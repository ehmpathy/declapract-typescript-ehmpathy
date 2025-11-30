import pg, { Client } from 'pg';

import {
  type DatabaseConnection,
  DatabaseQueryError,
} from './getDatabaseConnection';

// https://github.com/brianc/node-postgres/pull/353#issuecomment-283709264
pg.types.setTypeParser(20, (value) => parseInt(value, 10)); // cast bigints to numbers; by default, pg returns bigints as strings, since max val of bigint is bigger than max safe value in js
pg.types.setTypeParser(1700, (value) => parseFloat(value)); // cast numerics to numbers; by default, pg returns numerics as strings

export const getDatabaseConnectionViaJdbc = async (config: {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}): Promise<DatabaseConnection> => {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
  });
  await client.connect();

  return {
    query: (args: { sql: string; values?: any[] }) =>
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
