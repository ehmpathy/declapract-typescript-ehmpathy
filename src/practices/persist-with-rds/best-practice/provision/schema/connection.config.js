/**
 * .what = database credentials for sql-schema-control
 * .why = reuses app's getConfig for consistent config resolution
 */
require('esbuild-register');
const { getConfig } = require('../../src/utils/config/getConfig');

const promiseSchemaControlCredentials = async () => {
  const config = await getConfig();
  const credentials = {
    host: config.database.tunnel.local.host,
    port: config.database.tunnel.local.port,
    database: config.database.target.database,
    schema: config.database.target.schema,
    username: config.database.role.cicd.username,
    password: config.database.role.cicd.password,
  };
  return credentials;
};

module.exports = {
  promiseConfig: promiseSchemaControlCredentials,
};
