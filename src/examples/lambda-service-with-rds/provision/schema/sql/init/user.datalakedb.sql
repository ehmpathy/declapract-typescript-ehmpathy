/**
  NOTE:
   - this must be done manually
   - this must be done by the @declapract{variable.databaseUserName.cicdUser} user
   - this step does not apply in the integration-test-db environment
*/

-- grant usage to dms_replication user, so we can dms data out
GRANT USAGE ON SCHEMA @declapract{variable.databaseName} TO dms_replication;
GRANT SELECT ON ALL TABLES IN SCHEMA @declapract{variable.databaseName} TO dms_replication;
ALTER DEFAULT PRIVILEGES IN SCHEMA @declapract{variable.databaseName} GRANT SELECT ON TABLES TO dms_replication;

-- grant usage to the datalakedb federated query reader user, so we can query data in redshift
GRANT USAGE ON SCHEMA @declapract{variable.databaseName} TO datalakedb_federated_query_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA @declapract{variable.databaseName} TO datalakedb_federated_query_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA @declapract{variable.databaseName} GRANT SELECT ON TABLES TO datalakedb_federated_query_reader;

-- and dont forget to hop into the datalakedb and add the ext_@declapract{variable.databaseName}
