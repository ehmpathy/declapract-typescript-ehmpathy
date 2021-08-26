/**
  the cicd user has total control over the database and the schema
    (as expected, since it'll be managing all resources in the db)

  NOTE:
    - this is run manually, since our cicd user is what schema-control will be running under
    - this is done automatically in integration-test-db env
    - this must be done by the super user
*/
CREATE USER @declapract{variable.databaseUserName.cicdUser} WITH PASSWORD '__CHANG3_ME__'; -- create cicd user
ALTER DATABASE @declapract{variable.databaseName} OWNER TO @declapract{variable.databaseUserName.cicdUser}; -- make the cicd user the owner of the database
ALTER SCHEMA @declapract{variable.databaseName} OWNER TO @declapract{variable.databaseUserName.cicdUser}; -- make the cicd user the owner of the schema, too
ALTER USER @declapract{variable.databaseUserName.cicdUser} WITH CREATEROLE; -- allow the cicd user to create other users
