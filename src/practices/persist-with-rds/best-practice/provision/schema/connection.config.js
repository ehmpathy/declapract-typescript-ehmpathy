const Config = require('config-with-paramstore').default;

const configInstance = new Config();
const getConfig = async () =>
  configInstance.get(process.env.DEPLOYMENT_STAGE || undefined);

const promiseSchemaControlConfig = async () => {
  const config = await getConfig();
  const dbConfig = config.database.admin; // NOTE: schema control must have DDL privileges
  const schemaControlConfig = {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.schema, // i.e., db = schema
    schema: dbConfig.schema,
    username: dbConfig.username,
    password: dbConfig.password,
  };
  return schemaControlConfig;
};

module.exports = {
  promiseConfig: promiseSchemaControlConfig,
};
