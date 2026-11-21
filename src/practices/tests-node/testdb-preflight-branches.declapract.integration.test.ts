import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, useBeforeAll, when } from 'test-fns';
import { getModuleExportsFromTsSource } from '../../utils/getModuleExportsFromTsSource';
import { getOneTestConfig, probeTestDb } from './best-practice/jest.integration.env.db';

// a cold ci host pulls the postgres image before the real-call cases run
jest.setTimeout(240_000);

// the whole error a human reads (header, context, hint), with the host's cwd masked
const asErrorSnapped = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).split(process.cwd()).join('<cwd>');

/**
 * .what = executes the REAL shipped `useWakeOfTestdb` template through its deterministic
 *         decide-gate branches, with every boundary (fs, path, helpful-errors, probeTestDb)
 *         injected — so the preflight's actual logic runs, not a source-text pin of it.
 * .why  = a source-text pin (`.toContain('databaseUserName')`, `.toContain('config/test.json')`)
 *         sails green past a logic bug that keeps the tokens — an inverted own-db gate, a probe
 *         called before the config check, a validation that omits a key. the decide-steps are pure
 *         state decisions (owns-db yes/no, config present/absent, config complete/incomplete) so
 *         they run for real here with no live db — the probeTestDb boundary is stubbed, so no psql
 *         subprocess is spawned and no local testdb is touched.
 * .the-invariant = the preflight fires ONLY when the service owns a db AND its config is complete;
 *         a service that owns no db is a no-op; an own-db service with an absent or incomplete
 *         config fails LOUD (a ConstraintError that names the fix), never a silent skip.
 * .teeth = invert the own-db gate and the no-db case reddens (a probe fires where it must not).
 *          drop the absent-config throw and that case reddens. drop a key from the completeness
 *          check and the incomplete-config case reddens. mis-map a probe arg and the complete case
 *          reddens (the probe receives the wrong host/port/role). probe the declared port where
 *          the harness declared TESTDB_PORT and the worktree case reddens (the wake would probe
 *          the default port while a worktree's db binds its own — #674).
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads the shipped template off
 *         the filesystem. the decide-gate cases stub the probeTestDb boundary; the probe's own
 *         contract is proven apart, by a real psql against a real postgres in docker. it
 *         sits at the PRACTICE ROOT (not under `best-practice/`), because declapract's compile
 *         strips `.declapract.test.ts` (+ `.snap`) but NOT `.declapract.integration.test.ts` — so an
 *         integration clamp collocated inside `best-practice/` would SHIP to a consumer and apply as
 *         an EQUALS template until ehmpathy/declapract#109 lands. the practice-root home keeps it out
 *         of the emission set while it still clamps the shipped template by path
 *         (`rule.require.declapract-integration-tests`).
 */

const SOURCE_PATH = `${__dirname}/best-practice/src/.test/useWakeOfTestdb.ts`;
const DB_SOURCE_PATH = `${__dirname}/best-practice/jest.integration.env.db.ts`;

const COMPLETE_CONFIG = JSON.stringify({
  database: {
    tunnel: { local: { host: 'localhost', port: 5432 } },
    role: { crud: { username: 'svc_x_crud', password: 'pw' } },
    target: { database: 'svc_x_testdb' },
  },
});

type ProbeArgs = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

/**
 * .what = transpile the template to CommonJS + execute its sole export with every boundary
 *         stubbed, then report what crossed the probe boundary (the probeTestDb calls).
 * .why  = the template imports `node:fs`, `node:path`, `helpful-errors`, and the neighbor
 *         `../../jest.integration.env.db` probe; a require-stub feeds each a controlled fake so the
 *         real decide-logic runs against inputs this test dictates, and the probe is observed
 *         rather than performed (no psql subprocess, no local db).
 */
const runUseWakeOfTestdb = (input: {
  declapractUse: string | null; // null = the declapract.use.yml file is absent
  testConfig: string | null; // null = the config/test.json file is absent
  testdbPortOverride: string | null; // null = the harness declared no TESTDB_PORT
}): { probeCalls: ProbeArgs[] } => {
  // .note = deliberate mutation: a spy scoped to one run, so each call the stubbed probe receives is seen
  const probeCalls: ProbeArgs[] = [];

  // decide which file a path refers to by its tail — the template joins cwd with a fixed name
  const asFileKey = (p: string): 'use' | 'config' | 'other' => {
    if (p.endsWith('declapract.use.yml')) return 'use';
    if (p.endsWith('test.json')) return 'config';
    return 'other';
  };
  const contentFor = (key: 'use' | 'config'): string | null =>
    key === 'use' ? input.declapractUse : input.testConfig;

  const fsStub = {
    existsSync: (p: string): boolean => {
      const key = asFileKey(p);
      return key !== 'other' && contentFor(key) !== null;
    },
    readFileSync: (p: string): string => {
      const key = asFileKey(p);
      return (key === 'use' || key === 'config' ? contentFor(key) : '') ?? '';
    },
  };

  // the db module's real config transformers, over the same fake fs; only the probe is observed
  const dbModule = getModuleExportsFromTsSource<Record<string, unknown>>({
    source: readFileSync(DB_SOURCE_PATH, 'utf8'),
    requireStub: (id: string): unknown => {
      if (id === 'node:fs') return fsStub;
      if (id === 'helpful-errors') return { ConstraintError };
      return {};
    },
  });

  const requireStub = (id: string): unknown => {
    if (id === 'node:fs') return fsStub;
    if (id === 'node:path')
      return { join: (...parts: string[]): string => parts.join('/') };
    if (id === 'helpful-errors') return { ConstraintError };
    if (id === '../../jest.integration.env.db')
      return {
        ...dbModule,
        probeTestDb: (args: ProbeArgs): void => {
          probeCalls.push(args);
        },
      };
    return {};
  };

  const { useWakeOfTestdb } = getModuleExportsFromTsSource<{
    useWakeOfTestdb: () => void;
  }>({ source: readFileSync(SOURCE_PATH, 'utf8'), requireStub });

  // declare TESTDB_PORT as the harness would, for this call only; restore the prior value after
  const portOverridePrior = process.env.TESTDB_PORT;
  if (input.testdbPortOverride === null) delete process.env.TESTDB_PORT;
  if (input.testdbPortOverride !== null)
    process.env.TESTDB_PORT = input.testdbPortOverride;
  try {
    useWakeOfTestdb!();
  } finally {
    if (portOverridePrior === undefined) delete process.env.TESTDB_PORT;
    if (portOverridePrior !== undefined)
      process.env.TESTDB_PORT = portOverridePrior;
  }

  return { probeCalls };
};

describe('the useWakeOfTestdb decide-gate runs its real branches (executed, no live db)', () => {
  given('a service that owns no db (declapract.use.yml declares no databaseUserName)', () => {
    when('the gate reads the declaration', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfTestdb({
          declapractUse: 'useCase: lambda-service\n',
          testConfig: COMPLETE_CONFIG,
          testdbPortOverride: null,
        }),
      );
      then('it is a no-op (the testdb is never preflighted)', () => {
        expect(state.probeCalls).toEqual([]);
      });
    });
  });

  given('a service that owns a db (declapract.use.yml declares a databaseUserName)', () => {
    const OWN_DB_USE = 'databaseUserName: svc-x-crud\n';

    when('its config/test.json is complete, and the harness declared no TESTDB_PORT', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfTestdb({
          declapractUse: OWN_DB_USE,
          testConfig: COMPLETE_CONFIG,
          testdbPortOverride: null,
        }),
      );
      then('it preflights the testdb with the config tunnel + role, at the declared port', () => {
        expect(state.probeCalls).toEqual([
          {
            host: 'localhost',
            port: 5432,
            username: 'svc_x_crud',
            password: 'pw',
            database: 'svc_x_testdb',
          },
        ]);
      });
    });

    when('its config/test.json is complete, and the harness declared TESTDB_PORT (a worktree)', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfTestdb({
          declapractUse: OWN_DB_USE,
          testConfig: COMPLETE_CONFIG,
          testdbPortOverride: String(5432 + 77),
        }),
      );
      then('it probes the per-worktree port the db binds, not the declared one', () => {
        expect(state.probeCalls).toEqual([
          {
            host: 'localhost',
            port: 5432 + 77,
            username: 'svc_x_crud',
            password: 'pw',
            database: 'svc_x_testdb',
          },
        ]);
      });
    });

    when('the harness declared a malformed TESTDB_PORT', () => {
      then('it throws a ConstraintError that names TESTDB_PORT, and never probes', () => {
        // .note = deliberate mutation: a spy scoped to this then, so a probe made before the throw is seen
        const probeCallsSeen: ProbeArgs[][] = [];
        const error = (() => {
          try {
            probeCallsSeen.push(
              runUseWakeOfTestdb({
                declapractUse: OWN_DB_USE,
                testConfig: COMPLETE_CONFIG,
                testdbPortOverride: 'not-a-port',
              }).probeCalls,
            );
            return null;
          } catch (caught) {
            return caught;
          }
        })();
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ConstraintError);
        expect((error as Error).message).toContain('TESTDB_PORT');
        expect(asErrorSnapped(error)).toMatchSnapshot('testdb wake failure, malformed TESTDB_PORT');
        expect(probeCallsSeen).toEqual([]);
      });
    });

    when('its config/test.json is absent', () => {
      then('it throws a ConstraintError that names config/test.json (never a silent skip)', () => {
        const error = (() => {
          try {
            runUseWakeOfTestdb({
              declapractUse: OWN_DB_USE,
              testConfig: null,
              testdbPortOverride: null,
            });
            return null;
          } catch (caught) {
            return caught;
          }
        })();
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ConstraintError);
        expect((error as Error).message).toContain('config/test.json');
        expect(asErrorSnapped(error)).toMatchSnapshot('testdb wake failure, absent config');
      });
    });

    when('its config/test.json lacks an expected key (no role.crud)', () => {
      then('it throws a ConstraintError that names the missing keys', () => {
        const incomplete = JSON.stringify({
          database: {
            tunnel: { local: { host: 'localhost', port: 5432 } },
            target: { database: 'svc_x_testdb' },
          },
        });
        const error = (() => {
          try {
            runUseWakeOfTestdb({
              declapractUse: OWN_DB_USE,
              testConfig: incomplete,
              testdbPortOverride: null,
            });
            return null;
          } catch (caught) {
            return caught;
          }
        })();
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ConstraintError);
        expect((error as Error).message).toContain('lacks an expected key');
        // it names exactly the absent keys, not the whole contract
        expect((error as Error).message).toContain(
          'declare database.role.crud.username (string), database.role.crud.password (string)',
        );
        expect((error as Error).message).not.toContain('database.tunnel.local.host');
        expect(asErrorSnapped(error)).toMatchSnapshot('testdb wake failure, incomplete config');
      });
    });
  });
});

/**
 * .what = a port no process listens on: the os grants a free one, and the listener closes at once
 * .why  = a real psql against it meets a real refused connect, never a stand-in error object
 */
const getOnePortClosed = async (): Promise<number> =>
  new Promise((done, fail) => {
    const server = createServer();
    server.on('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => done(port));
    });
  });

/**
 * .what = a real postgres in docker, on a port the os picks, with one known role
 * .why  = the preflight's contract is with a real psql against a real server, so the real server
 *         speaks the auth fault and the all-clear, not a hand-built stderr
 */
const genTestdbReal = async (): Promise<{ containerId: string; port: number }> => {
  const run = spawnSync(
    'docker',
    [
      'run', '-d', '--rm',
      '-e', 'POSTGRES_USER=svc_crud',
      '-e', 'POSTGRES_PASSWORD=pw-real',
      '-e', 'POSTGRES_DB=svc_testdb',
      '-p', '127.0.0.1::5432',
      'postgres:16-alpine',
    ],
    { encoding: 'utf-8', timeout: 180_000 },
  );
  if (run.status !== 0) throw new Error(`docker run of the real testdb failed: ${run.stderr}`);
  const containerId = run.stdout.trim();
  const mapped = spawnSync('docker', ['port', containerId, '5432/tcp'], { encoding: 'utf-8' });
  const port = Number(/:(\d+)\s*$/m.exec(mapped.stdout)?.[1]);
  if (!port) throw new Error(`docker port named no host port: ${mapped.stdout}${mapped.stderr}`);

  // wait for the real server to accept the role; the image's init server listens on no tcp port
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = spawnSync('psql', ['-h', '127.0.0.1', '-p', String(port), '-U', 'svc_crud', '-d', 'svc_testdb', '-c', 'SELECT 1'], {
      encoding: 'utf-8',
      env: { ...process.env, PGPASSWORD: 'pw-real' },
      timeout: 3000,
    });
    if (ready.status === 0) return { containerId, port };
    await new Promise((done) => setTimeout(done, 1000));
  }
  throw new Error(`the real testdb never accepted a connect on 127.0.0.1:${port}`);
};

describe('probeTestDb against a real psql and a real postgres (#787)', () => {
  given('[case1] a real postgres in docker, and a real psql on PATH', () => {
    const testdb = useBeforeAll(async () => genTestdbReal());
    afterAll(() => {
      spawnSync('docker', ['rm', '-f', testdb.containerId], { encoding: 'utf-8' });
    });
    const asProbeInput = (input: { port: number; password: string }) => ({
      host: '127.0.0.1',
      port: input.port,
      username: 'svc_crud',
      password: input.password,
      database: 'svc_testdb',
    });

    when('[t0] the probe connects with the right password', () => {
      then('it passes silent: the real server answered SELECT 1', () => {
        expect(() => probeTestDb(asProbeInput({ port: testdb.port, password: 'pw-real' }))).not.toThrow();
      });
    });

    when('[t1] the probe connects with a wrong password', () => {
      then("it throws a ConstraintError that carries the real server's own words and the auth fix", () => {
        const error = getError(() => probeTestDb(asProbeInput({ port: testdb.port, password: 'pw-wrong' })));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('   ├─ psql said');
        expect(error.message).toContain('password authentication failed for user "svc_crud"');
        expect(error.message).toContain('the fault is likely auth or schema');
        expect(error.message).not.toContain('pw-wrong');
      });
    });
  });

  given('[case2] a port no server listens on', () => {
    const closed = useBeforeAll(async () => ({ port: await getOnePortClosed() }));

    when('[t0] the probe connects', () => {
      then("it throws a ConstraintError that carries psql's real refused connect", () => {
        const error = getError(() =>
          probeTestDb({ host: '127.0.0.1', port: closed.port, username: 'svc_crud', password: 'pw', database: 'svc_testdb' }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(`cant connect to the testdb at 127.0.0.1:${closed.port}`);
        expect(error.message).toContain('Connection refused');
      });
    });
  });
});

describe('getOneTestConfig (#787 #788)', () => {
  given('[case1] a config/test.json on disk', () => {
    const dir = genTempDir({ slug: 'test-config-from-file' });

    when('[t0] the file is absent', () => {
      then('it returns null, so the caller decides what an absent config means', () => {
        expect(getOneTestConfig({ path: join(dir, 'absent.json') })).toBeNull();
      });
    });

    when('[t1] the file holds valid json', () => {
      then('it returns the parsed config', () => {
        const path = join(dir, 'valid.json');
        writeFileSync(path, JSON.stringify({ database: { tunnel: { local: { port: 7821 } } } }));
        expect(getOneTestConfig({ path })).toEqual({ database: { tunnel: { local: { port: 7821 } } } });
      });
    });

    when('[t2] the file holds malformed json', () => {
      then('it throws a ConstraintError that names the path, never a bare SyntaxError', () => {
        const path = join(dir, 'malformed.json');
        writeFileSync(path, '{ "database": ');
        const error = getError(() => getOneTestConfig({ path }));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(path);
        expect(error.message).toContain('is not valid json');
        // the whole error a human reads, with the temp dir masked
        expect(error.message.split(dir).join('<dir>')).toMatchSnapshot('test config failure, malformed json');
      });
    });

    when('[t3] the malformed json holds a password near its fault', () => {
      then('the error never echoes the source, so the password stays off the terminal and the logs', () => {
        const path = join(dir, 'malformed-secret.json');
        writeFileSync(path, '{ "database": { "role": { "crud": { "password": hunter2secret } } } }');
        const error = getError(() => getOneTestConfig({ path }));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).not.toContain('hunter2secret');
        expect(JSON.stringify(error)).not.toContain('hunter2secret');
        expect(error.cause).toBeUndefined();
      });
    });
  });
});
