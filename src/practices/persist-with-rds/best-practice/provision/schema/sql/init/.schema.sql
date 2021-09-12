/**
 * this command creates the schema that the service + sql-schema-control will use
 * - this command must be run inside of the database that was created for this service
 * - this creates a schema with the same name as the database
 * - this not managed by sql-schema-control
 *   - sql-schema-control needs a schema to run _in_
 * - this is applied
 *   - automatically for integration-test db
 *   - by the deployment script for live deployments
*/
CREATE SCHEMA @declapract{variable.databaseName};
