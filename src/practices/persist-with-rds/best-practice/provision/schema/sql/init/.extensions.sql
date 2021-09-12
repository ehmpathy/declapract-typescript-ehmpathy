/**
 * postgres databases use extensions to increase functionality
 * - we have a minimum set of extensions that are required for sql-schema-generator
 * - services may also include their own extensions if they want additional functionality
 * - this is not managed by sql-schema-control
 *   - requires superuser privileges, cicd user only has db_owner privileges
 * - this is applied
 *   - automatically for integration-test db (through `provision/docker/.../init/` directory, with files cp'd by npm provision scripts)
 *   - by the deployment script for live deployments
 */

-- extensions required for all sql-schema-generator resources:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- extensions required for custom use cases in this service:
