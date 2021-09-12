/**
 * creates a cicd user, with total control over the database and the schema, to be used by sql-schema-control
 * - full control required since it'll be managing all resources for this db
 * - this not managed by sql-schema-control
 *   - requires superuser privileges
 *   - sql-schema-control needs a user to run _under_
 * - this is applied
 *   - automatically for integration-test db
 *   - by the deployment script for live deployments
 */
CREATE USER @declapract{variable.databaseUserName.cicdUser} WITH PASSWORD '__CHANG3_ME__'; -- create cicd user
ALTER DATABASE @declapract{variable.databaseName} OWNER TO @declapract{variable.databaseUserName.cicdUser}; -- make the cicd user the owner of the database
ALTER SCHEMA @declapract{variable.databaseName} OWNER TO @declapract{variable.databaseUserName.cicdUser}; -- make the cicd user the owner of the schema, too
ALTER USER @declapract{variable.databaseUserName.cicdUser} WITH CREATEROLE; -- allow the cicd user to create other users
