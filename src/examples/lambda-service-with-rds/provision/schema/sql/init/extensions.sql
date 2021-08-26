/**
  NOTE:
   - this must be done manually,
      - sql-schema-control can not do this for us these commands must be run as superuser; db-owner is not sufficient
   - this is done automatically in the integration-test-db environment, due to the `/init` directory in the docker provisioning step
   - this must be done by the postgres superuser

  to do this in datagrip, sign in as the super user, then use the "switch current schema" button to switch to the correct database (yeah... datagrip says "schema" even though we're picking a postgres "database" here)
*/
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
