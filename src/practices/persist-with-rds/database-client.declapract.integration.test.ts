import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import ts from 'typescript';

import { isPgClientWithoutSsl } from '../../utils/withPgClientSslDeclared';
import { asDatabaseClientSsl } from './best-practice/src/utils/database/asDatabaseClientSsl';

/**
 * .what = proves the pg client the persist-with-rds templates build: every client verifies tls
 *         (#652), carries the connect and query bounds (#664), and the factory takes a `mode`
 *         whose readonly path reads the plan grant and the for-plan role (#673)
 * .why = a postgres 17 cluster forces ssl, so a plaintext client stops to connect the moment the
 *        cluster upgrades; a client with no bounds hangs a lambda on a cluster that accepts the
 *        socket and never answers; a plan job that connects as the crud role reads a secret its
 *        oidc grant is denied. all three live in bytes no adopter may edit, so they are caught here
 * .teeth = drop `ssl:` or `...databaseClientTimeouts` from getOneDatabaseConnection.ts and case1
 *          reddens; drop the `mode` input and case2 reddens with TS2554; read `role.crud` under the
 *          plan grant and case2 reddens with TS2322 (a password that may be absent)
 * .note = `pg`, `helpful-errors`, `iso-time`, config, and environment are stubbed in memory, so the
 *         check needs none of them installed. INTEGRATION by `rule.forbid.unit.remote-boundaries`:
 *         it reads the shipped templates off the filesystem
 */

const BEST_PRACTICE_DIR = join(__dirname, 'best-practice');
const TEMPLATE_DIR = join(BEST_PRACTICE_DIR, 'src/utils/database');
const FIXTURE_ROOT = '/fixture';

/**
 * .what = every `.ts` template under a dir, as a path relative to the best-practice root
 */
const getAllTemplates = (input: { dir: string }): string[] =>
  readdirSync(input.dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(input.dir, entry.name);
    if (entry.isDirectory()) return getAllTemplates({ dir: path });
    if (!entry.name.endsWith('.ts') || entry.name.includes('.declapract.'))
      return [];
    return [relative(BEST_PRACTICE_DIR, path)];
  });

// the strictest options the typescript-node practice emits, over an in-memory fixture root
const COMPILER_OPTIONS: ts.CompilerOptions = {
  strict: true,
  noUncheckedIndexedAccess: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  allowUnreachableCode: false,
  exactOptionalPropertyTypes: false,
  esModuleInterop: true,
  target: ts.ScriptTarget.ES2020,
  lib: ['lib.es2020.d.ts'],
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  baseUrl: FIXTURE_ROOT,
  paths: { '@src/*': ['src/*'] },
  types: ['node'],
  typeRoots: [join(__dirname, '../../../node_modules/@types')],
  noEmit: true,
};

/**
 * .what = the in-memory stand-ins for the packages and app modules the factory imports
 * .why = each declares only the shape the factory reads, so a wrong read reddens the check
 */
const STUBS: Record<string, string> = {
  'node_modules/pg/index.d.ts': `
import type { ConnectionOptions } from 'node:tls';
export interface QueryResultRow { [column: string]: any }
export interface QueryResult<R extends QueryResultRow = any> { rows: R[] }
export interface ClientConfig {
  host?: string; port?: number; user?: string; password?: string; database?: string;
  ssl?: boolean | ConnectionOptions; connectionTimeoutMillis?: number; query_timeout?: number;
}
export declare class Client {
  constructor(config: ClientConfig);
  connect(): Promise<void>;
  query<R extends QueryResultRow = any>(sql: string, values?: unknown[]): Promise<QueryResult<R>>;
  end(): Promise<void>;
}
declare const pg: { types: { setTypeParser: (oid: number, parse: (value: string) => unknown) => void } };
export default pg;
`,
  'node_modules/helpful-errors/index.d.ts': `
export declare class HelpfulError extends Error { constructor(message: string, metadata?: Record<string, unknown>); }
export declare class UnexpectedCodePathError extends HelpfulError {}
export declare class ConstraintError extends HelpfulError {}
`,
  'node_modules/iso-time/index.d.ts': `
export declare const toMilliseconds: (input: { seconds?: number; minutes?: number }) => number;
`,
  'src/utils/environment.ts': `
export declare const getEnvironment: () => Promise<{
  access: 'test' | 'prep' | 'prod';
  server: 'cloud@aws.lambda' | 'local@node';
}>;
`,
  'src/utils/config/getConfig.ts': `
type Grant = 'plan' | 'apply';
type Secret<TGrant extends Grant> = TGrant extends 'plan' ? string | undefined : string;
export type Config<TGrant extends Grant = 'apply'> = {
  database: {
    target: { database: string; schema: string };
    role: {
      cicd: {
        'for-plan': { username: string; password: string };
        'for-apply': { username: string; password: Secret<TGrant> };
      };
      crud: { username: string; password: Secret<TGrant> };
    };
    tunnel: {
      local: { host: string; port: number };
      lambda: { host: string; port: number } | null;
    };
  };
};
export declare const getConfig: <TGrant extends Grant = 'apply'>(
  input?: { grant: TGrant | null },
) => Promise<Config<TGrant>>;
`,
};

/**
 * .what = the calls an adopter makes on the factory
 * .why = the bare call must keep its sense, and a mode outside the two must not compile
 */
const CALLERS = `
import { getOneDatabaseConnection } from './getOneDatabaseConnection';

export const connections = async () => [
  await getOneDatabaseConnection(),
  await getOneDatabaseConnection({ mode: 'readwrite' }),
  await getOneDatabaseConnection({ mode: 'readonly' }),
];

// @ts-expect-error: only readwrite and readonly are modes
export const forbidden = () => getOneDatabaseConnection({ mode: 'admin' });
`;

/**
 * .what = type-check an in-memory fixture and return each diagnostic as one line
 */
const getDiagnostics = (input: { files: Record<string, string> }): string[] => {
  const files = Object.fromEntries(
    Object.entries(input.files).map(([path, source]) => [
      `${FIXTURE_ROOT}/${path}`,
      source,
    ]),
  );
  const host = ts.createCompilerHost(COMPILER_OPTIONS);
  const readFileBase = host.readFile.bind(host);
  const getSourceFileBase = host.getSourceFile.bind(host);
  const fileExistsBase = host.fileExists.bind(host);
  host.fileExists = (fileName) => fileName in files || fileExistsBase(fileName);
  host.directoryExists = (directoryName) =>
    Object.keys(files).some((path) => path.startsWith(`${directoryName}/`)) ||
    ts.sys.directoryExists(directoryName);
  host.readFile = (fileName) => files[fileName] ?? readFileBase(fileName);
  host.getSourceFile = (fileName, languageVersion, ...rest) => {
    const fixture = files[fileName];
    if (fixture !== undefined)
      return ts.createSourceFile(fileName, fixture, languageVersion, true);
    return getSourceFileBase(fileName, languageVersion, ...rest);
  };
  const program = ts.createProgram({
    rootNames: Object.keys(files),
    options: COMPILER_OPTIONS,
    host,
  });
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const where = diagnostic.file
      ? `${diagnostic.file.fileName.replace(`${FIXTURE_ROOT}/`, '')}:${
          diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0)
            .line + 1
        }`
      : '(global)';
    return `${where} TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
  });
};

describe('persist-with-rds pg client (#652, #664, #673)', () => {
  const readTemplate = (name: string) =>
    readFileSync(join(TEMPLATE_DIR, name), 'utf8');

  given('[case1] every template that builds a pg Client', () => {
    const clients = getAllTemplates({ dir: BEST_PRACTICE_DIR })
      .map((path) => ({
        path,
        source: readFileSync(join(BEST_PRACTICE_DIR, path), 'utf8'),
      }))
      .filter(({ source }) => /new (pg\.)?Client\(/.test(source));

    then('at least one is found, so the clamp is not vacuous', () => {
      expect(clients.map(({ path }) => path)).toContain(
        'src/utils/database/getOneDatabaseConnection.ts',
      );
    });

    then('each declares verified tls', () => {
      expect(
        clients
          .filter(({ source }) => isPgClientWithoutSsl({ source }))
          .map(({ path }) => path),
      ).toEqual([]);
    });

    then('each carries the connect and query bounds', () => {
      expect(
        clients
          .filter(({ source }) => !source.includes('...databaseClientTimeouts'))
          .map(({ path }) => path),
      ).toEqual([]);
    });
  });

  given('[case2] the factory, its tls, and its bounds, where they land', () => {
    when('[t0] tsc runs over them and the calls an adopter makes', () => {
      const diagnostics = useBeforeAll(async () => ({
        lines: getDiagnostics({
          files: {
            ...STUBS,
            'src/utils/database/getOneDatabaseConnection.ts': readTemplate(
              'getOneDatabaseConnection.ts',
            ),
            'src/utils/database/asDatabaseClientSsl.ts': readTemplate(
              'asDatabaseClientSsl.ts',
            ),
            'src/utils/database/rdsCaBundleUsEast1.ts': readTemplate(
              'rdsCaBundleUsEast1.ts',
            ),
            'src/utils/database/databaseClientTimeouts.ts': readTemplate(
              'databaseClientTimeouts.ts',
            ),
            'src/utils/database/getOneDatabasePort.ts': readTemplate(
              'getOneDatabasePort.ts',
            ),
            'src/utils/database/callers.ts': CALLERS,
          },
        }),
      }));

      then('no diagnostic points into the factory or its callers', () => {
        expect(diagnostics.lines).toEqual([]);
      });
    });
  });

  given('[case3] the readonly mode of the factory', () => {
    const factory = readTemplate('getOneDatabaseConnection.ts');

    then('the bare call stays readwrite', () => {
      expect(factory).toContain(
        "input: { mode: 'readwrite' | 'readonly' } = { mode: 'readwrite' }",
      );
    });

    then('readonly reads the plan grant and connects as the for-plan role', () => {
      expect(factory).toContain("await getConfig({ grant: 'plan' })");
      expect(factory).toContain("config.database.role.cicd['for-plan']");
    });

    then('readonly marks the session read only, and says it is a guard, not a boundary', () => {
      expect(factory).toContain(
        "await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;')",
      );
      expect(factory).toContain('not a security boundary');
    });
  });

  given('[case4] the ssl options for each kind of endpoint', () => {
    then('a null endpoint (the local testdb) connects plain', () => {
      expect(asDatabaseClientSsl({ clusterEndpoint: null })).toEqual(false);
    });

    then('a us-east-1 endpoint verifies against the rds roots', () => {
      const ssl = asDatabaseClientSsl({
        clusterEndpoint: 'surfdb.cluster-abc123.us-east-1.rds.amazonaws.com',
      });
      expect(ssl && ssl.rejectUnauthorized).toEqual(true);
      expect(ssl && String(ssl.ca)).toContain('-----BEGIN CERTIFICATE-----');
    });

    then('an endpoint in another region fails loud, with a hint', () => {
      expect(() =>
        asDatabaseClientSsl({
          clusterEndpoint: 'surfdb.cluster-abc123.eu-west-2.rds.amazonaws.com',
        }),
      ).toThrow('not in us-east-1');
    });
  });
});
