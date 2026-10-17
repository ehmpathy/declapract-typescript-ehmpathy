import type { FileCheckContext } from 'declapract';
import { given, then, when } from 'test-fns';

import { PG_CLIENT_SSL_REVIEW_MARKER } from '../../../../../../utils/withPgClientSslDeclared';
import { check, fix } from './*.ts.declapract';

const context = {
  relativeFilePath: 'src/utils/database/getSurfDatabaseConnection.ts',
} as FileCheckContext; // note: these declarations read only the relative path

const asFixed = (contents: string): string =>
  (fix(contents, context) as { contents: string }).contents;

const clientFromConfig = `import { Client } from 'pg';

import { getConfig } from '@src/utils/config/getConfig';

export const getSurfDatabaseConnection = async () => {
  const config = await getConfig();
  const client = new Client({
    host: config.database.tunnel.local.host,
    port: config.database.tunnel.local.port,
  });
  await client.connect();
  return client;
};
`;

const clientElsewhere = `import pg from 'pg';

export const getWaveArchiveClient = () =>
  new pg.Client({ host: process.env.WAVE_ARCHIVE_HOST })
`;

describe('pg-client-without-ssl (#652)', () => {
  given('[case1] a pg Client built from the app config with no ssl', () => {
    when('[t0] check runs', () => {
      then('the bad practice is detected', () => {
        expect(() => check(clientFromConfig, context)).not.toThrow();
      });
    });

    when('[t0.1] check runs on a retired factory path', () => {
      then('the file is left to old-get-database-connection, so two fixes never race', () => {
        ['getDatabaseConnection.ts', 'getDatabaseConnection.integration.test.ts'].forEach(
          (name) =>
            expect(() =>
              check(clientFromConfig, {
                relativeFilePath: `src/utils/database/${name}`,
              } as FileCheckContext),
            ).toThrow('does not match bad practice'),
        );
      });
    });

    when('[t1] fix runs', () => {
      const fixed = asFixed(clientFromConfig);
      then('the client declares verified tls from the cluster endpoint', () => {
        expect(fixed).toContain(
          '    port: config.database.tunnel.local.port,\n    ssl: asDatabaseClientSsl({ clusterEndpoint: config.database.tunnel.lambda?.host ?? null }),\n  });',
        );
        expect(fixed).toContain(
          "import { getConfig } from '@src/utils/config/getConfig';\nimport { asDatabaseClientSsl } from '@src/utils/database/asDatabaseClientSsl';",
        );
        expect(fixed).toMatchSnapshot();
      });
      then('check no longer detects it, so apply converges', () => {
        expect(() => check(fixed, context)).toThrow('does not match bad practice');
      });
      then('a second fix changes zero bytes', () => {
        expect(asFixed(fixed)).toEqual(fixed);
      });
    });
  });

  given('[case2] a pg Client that does not read the app config', () => {
    when('[t0] fix runs', () => {
      const fixed = asFixed(clientElsewhere);
      then('the file is kept as is, with a review pointer at its top', () => {
        expect(fixed).toEqual(`${PG_CLIENT_SSL_REVIEW_MARKER}\n${clientElsewhere}`);
      });
      then('a second fix changes zero bytes', () => {
        expect(asFixed(fixed)).toEqual(fixed);
      });
    });
  });

  given('[case3] sources with no plaintext pg Client', () => {
    const sources = {
      'a client that declares ssl': clientFromConfig.replace(
        'port: config.database.tunnel.local.port,',
        'port: config.database.tunnel.local.port,\n    ssl: false,',
      ),
      'a string that mentions new Client': `export const doc = 'call new Client({ host }) to connect';\n`,
      'an elasticsearch Client (not pg)': `import { Client } from '@elastic/elasticsearch';\n\nexport const search = new Client({ node: process.env.SEARCH_NODE });\n`,
      'a property Client on a non-pg module': `import opensearch from '@opensearch-project/opensearch';\n\nexport const search = new opensearch.Client({ node: process.env.SEARCH_NODE });\n`,
      'a Client with no import at all': `export const client = new Client({ host: 'localhost' });\n`,
      'an absent file': null,
    };
    Object.entries(sources).forEach(([name, source]) =>
      when(`[t0] check runs on ${name}`, () => {
        then('the bad practice is not detected', () => {
          expect(() => check(source, context)).toThrow('does not match bad practice');
        });
      }),
    );
  });

  given('[case4] a pg Client reached through an alias or a namespace import', () => {
    const sources = {
      'an aliased named import': `import { Client as PgClient } from 'pg';\n\nexport const client = new PgClient({ host: 'localhost' });\n`,
      'a namespace import': `import * as pg from 'pg';\n\nexport const client = new pg.Client({ host: 'localhost' });\n`,
    };
    Object.entries(sources).forEach(([name, source]) =>
      when(`[t0] check runs on ${name}`, () => {
        then('the bad practice is detected', () => {
          expect(() => check(source, context)).not.toThrow();
        });
      }),
    );
  });
});
