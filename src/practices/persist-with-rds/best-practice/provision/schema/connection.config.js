/**
 * .what = database credentials for sql-schema-control
 * .why = reuses app's getConfig for consistent config resolution
 */
require('esbuild-register');
const { getConfig } = require('../../src/utils/config/getConfig');

const promiseSchemaControlCredentials = async () => {
  const config = await getConfig();

  // select the cicd grant to connect as; default to for-apply (full/write access).
  // the plan job opts down to the readonly for-plan grant via GRANT=plan.
  const grant = process.env.GRANT === 'plan' ? 'for-plan' : 'for-apply';
  const role = config.database.role.cicd[grant];

  const credentials = {
    host: config.database.tunnel.local.host,
    port: config.database.tunnel.local.port,
    database: config.database.target.database,
    schema: config.database.target.schema,
    username: role.username,
    password: role.password,
  };
  return credentials;
};

module.exports = {
  promiseConfig: promiseSchemaControlCredentials,
};
