/**
  NOTE:
   - this must be done manually, sql-schema-control can not do this for us
   - this is done automatically in the integration-test-db environment
   - this must be done by the postgres superuser
*/
CREATE DATABASE @declapract{variable.databaseName};
