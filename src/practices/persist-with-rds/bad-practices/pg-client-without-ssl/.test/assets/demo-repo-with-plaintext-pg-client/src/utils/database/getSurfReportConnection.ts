import { Client } from 'pg';

import { getConfig } from '@src/utils/config/getConfig';

/**
 * .what = a second connection the repo built on its own, for the surf report replica
 */
export const getSurfReportConnection = async () => {
  const config = await getConfig();
  const client = new Client({
    host: config.database.tunnel.local.host,
    port: config.database.tunnel.local.port,
    user: config.database.role.crud.username,
    password: config.database.role.crud.password,
    database: config.database.target.database,
  });
  await client.connect();
  return client;
};
