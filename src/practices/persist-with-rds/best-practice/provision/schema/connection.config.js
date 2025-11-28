const Config = require('config-with-paramstore').default;

const configInstance = new Config();
const getConfig = async () =>
  configInstance.get(process.env.STAGE || undefined);

const promiseSchemaControlCredentials = async () => {
  const config = await getConfig();
  const credentials = {
    host: config.database.tunnel.local.host,
    port: config.database.tunnel.local.port,
    database: config.database.target.database, // i.e., db = schema
    schema: config.database.target.schema,
    username: config.database.role.cicd.username,
    password: config.database.role.cicd.password,
  };
  return credentials;
};

module.exports = {
  promiseConfig: promiseSchemaControlCredentials,
};
