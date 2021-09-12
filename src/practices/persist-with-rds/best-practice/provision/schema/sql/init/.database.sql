/**
 * this command creates the database that the service will use
 * - this not managed by sql-schema-control
 *   - requires superuser privileges
 *   - sql-schema-control needs a db to run _in_
 * - this is applied
 *   - automatically for integration-test db
 *   - by the deployment script for live deployments
 */
CREATE DATABASE @declapract{variable.databaseName};
