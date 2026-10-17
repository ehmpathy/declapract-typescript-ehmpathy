/**
 NOTE: because db owner is not allowed to create extensions, these changes are applied manually

  NOTE: for the integration test db, these are applied automatically when the docker instance starts
*/
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";
