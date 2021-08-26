/**
  the service user has maximally restricted permissions

  this is the user that the service will be using to interact with the database
*/
CREATE USER @declapract{variable.databaseUserName.serviceUser} WITH PASSWORD '__CHANG3_ME__';
-- ALTER USER @declapract{variable.databaseUserName.serviceUser} WITH PASSWORD '__actual_password__';

-- grant usage
GRANT USAGE ON SCHEMA @declapract{variable.databaseName} TO @declapract{variable.databaseUserName.serviceUser};

-- grant specific privileges to resources in the schema, for all created now and onward (i.e., all)
ALTER DEFAULT PRIVILEGES IN SCHEMA @declapract{variable.databaseName} GRANT SELECT, INSERT, UPDATE ON TABLES TO @declapract{variable.databaseUserName.serviceUser};
ALTER DEFAULT PRIVILEGES IN SCHEMA @declapract{variable.databaseName} GRANT EXECUTE ON FUNCTIONS TO @declapract{variable.databaseUserName.serviceUser};
ALTER DEFAULT PRIVILEGES IN SCHEMA @declapract{variable.databaseName} GRANT USAGE, SELECT ON SEQUENCES TO @declapract{variable.databaseUserName.serviceUser};

