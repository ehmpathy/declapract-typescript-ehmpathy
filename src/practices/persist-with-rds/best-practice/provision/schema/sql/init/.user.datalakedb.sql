/**
 * grants read access to `datalakedb_federated_query_reader` so that we can query this db from redshift
 * - this not managed by sql-schema-control
 *   - since it does not apply in integration test environment (since that user wont exist there)
 * - this is applied
 *   - by the deployment script for live deployments
 */
GRANT USAGE ON SCHEMA @declapract{variable.databaseName} TO datalakedb_federated_query_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA @declapract{variable.databaseName} TO datalakedb_federated_query_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA @declapract{variable.databaseName} GRANT SELECT ON TABLES TO datalakedb_federated_query_reader;

-- don't forget to hop into the datalakedb and add the ext_@declapract{variable.databaseName}
