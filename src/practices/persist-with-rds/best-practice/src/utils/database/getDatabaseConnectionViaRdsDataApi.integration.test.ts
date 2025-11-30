import { UnexpectedCodePathError } from 'helpful-errors';
import devConfig from '../../../config/dev.json';
import testConfig from '../../../config/test.json';
import { getDatabaseConnectionViaRdsDataApi } from './getDatabaseConnectionViaRdsDataApi';

const configs = [
  { name: 'test', config: testConfig },
  { name: 'dev', config: devConfig }, // we test both, to be on the safe side
] as const;

const getConnection = async (config: typeof configs[number]['config']) => {
  const tunnel = config.database.tunnel.lambda;
  if (!tunnel || tunnel.via !== 'rds-data-api') {
    throw new Error(`expected rds-data-api tunnel in ${config} config`);
  }
  return getDatabaseConnectionViaRdsDataApi({
    resourceArn: tunnel.resourceArn,
    secretArn: tunnel.secretArn,
    database: config.database.target.database,
    endpoint: tunnel.endpoint,
  });
};

// Settings that affect query behavior and should match between test and dev
const PARITY_SETTINGS = [
  'standard_conforming_strings',
  'backslash_quote',
  'escape_string_warning',
] as const;

describe('getDatabaseConnectionViaRdsDataApi', () => {
  describe('testdb parity with livedb:dev', () => {
    it('should have matching postgres major versions', async () => {
      const [testConnection, devConnection] = await Promise.all([
        getConnection(testConfig),
        getConnection(devConfig),
      ]);

      const [testResult, devResult] = await Promise.all([
        testConnection.query<{ version: string }>({
          sql: 'SELECT version() AS version',
        }),
        devConnection.query<{ version: string }>({
          sql: 'SELECT version() AS version',
        }),
      ]);

      await Promise.all([testConnection.end(), devConnection.end()]);

      // Extract major version (e.g., "PostgreSQL 13.20" -> "13")
      const extractMajorVersion = (versionString?: string): string => {
        const match = versionString?.match(/PostgreSQL (\d+)/);
        if (!match)
          throw new Error(`Could not parse version: ${versionString}`);
        return (
          match[1] ?? UnexpectedCodePathError.throw('version not detected')
        );
      };

      const testMajorVersion = extractMajorVersion(testResult.rows[0]?.version);
      const devMajorVersion = extractMajorVersion(devResult.rows[0]?.version);

      expect(testMajorVersion).toEqual(devMajorVersion);
    });

    it('should have matching postgres settings', async () => {
      const [testConnection, devConnection] = await Promise.all([
        getConnection(testConfig),
        getConnection(devConfig),
      ]);

      // Arrays are passed as PostgreSQL array literals, require cast to array type
      const settingsQuery = `
        SELECT name, setting
        FROM pg_settings
        WHERE name = ANY($1::text[])
        ORDER BY name
      `;

      const [testResult, devResult] = await Promise.all([
        testConnection.query<{ name: string; setting: string }>({
          sql: settingsQuery,
          values: [PARITY_SETTINGS],
        }),
        devConnection.query<{ name: string; setting: string }>({
          sql: settingsQuery,
          values: [PARITY_SETTINGS],
        }),
      ]);

      await Promise.all([testConnection.end(), devConnection.end()]);

      const toSettingsMap = (
        rows: { name: string; setting: string }[],
      ): Record<string, string> =>
        Object.fromEntries(rows.map((r) => [r.name, r.setting]));

      const testSettings = toSettingsMap(testResult.rows);
      const devSettings = toSettingsMap(devResult.rows);

      expect(testSettings).toEqual(devSettings);
    });
  });

  describe.each(configs)('with $name config', ({ config }) => {
    it('should be able to connect and execute a query', async () => {
      const dbConnection = await getConnection(config);
      const result = await dbConnection.query({ sql: 'SELECT 1 AS value' });
      expect(result.rows.length).toEqual(1);
      expect(result.rows[0]).toEqual({ value: 1 });
      await dbConnection.end();
    });

    it('should correctly set search_path to resolve tables in configured schema', async () => {
      const dbConnection = await getConnection(config);
      // Query a table that exists in the homeservicesdb schema without schema prefix
      // If search_path is correctly set, this will resolve to homeservicesdb.home_service
      const result = await dbConnection.query<{ id: string }>({
        sql: 'SELECT id FROM home_service LIMIT 1',
      });
      // The query should succeed (not throw "relation does not exist")
      // It may return 0 or more rows depending on data, but should not error
      expect(result.rows).toBeDefined();
      await dbConnection.end();
    });
  });
});
