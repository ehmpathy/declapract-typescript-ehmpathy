import { readFileSync } from 'node:fs';

import { given, then, useBeforeAll, when } from 'test-fns';
import ts from 'typescript';

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
 *          reddens (the probe receives the wrong host/port/role).
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads the shipped template off
 *         the filesystem. no network, no real subprocess — the probeTestDb boundary is stubbed. it
 *         sits at the PRACTICE ROOT (not under `best-practice/`), because declapract's compile
 *         strips `.declapract.test.ts` (+ `.snap`) but NOT `.declapract.integration.test.ts` — so an
 *         integration clamp collocated inside `best-practice/` would SHIP to a consumer and apply as
 *         an EQUALS template until ehmpathy/declapract#109 lands. the practice-root home keeps it out
 *         of the emission set while it still clamps the shipped template by path
 *         (`rule.require.declapract-integration-tests`).
 */

const SOURCE_PATH = `${__dirname}/best-practice/src/.test/useWakeOfTestdb.ts`;

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
}): { probeCalls: ProbeArgs[] } => {
  const source = readFileSync(SOURCE_PATH, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const probeCalls: ProbeArgs[] = [];

  class FakeConstraintError extends Error {
    public readonly meta: unknown;
    constructor(message: string, meta?: unknown) {
      super(message);
      this.name = 'ConstraintError';
      this.meta = meta;
    }
  }

  // decide which file a path refers to by its tail — the template joins cwd with a fixed name
  const asFileKey = (p: string): 'use' | 'config' | 'other' => {
    if (p.endsWith('declapract.use.yml')) return 'use';
    if (p.endsWith('test.json')) return 'config';
    return 'other';
  };
  const contentFor = (key: 'use' | 'config'): string | null =>
    key === 'use' ? input.declapractUse : input.testConfig;

  const requireStub = (id: string): unknown => {
    if (id === 'node:fs')
      return {
        existsSync: (p: string): boolean => {
          const key = asFileKey(p);
          return key !== 'other' && contentFor(key) !== null;
        },
        readFileSync: (p: string): string => {
          const key = asFileKey(p);
          return (key !== 'other' && contentFor(key)) || '';
        },
      };
    if (id === 'node:path')
      return { join: (...parts: string[]): string => parts.join('/') };
    if (id === 'helpful-errors') return { ConstraintError: FakeConstraintError };
    if (id === '../../jest.integration.env.db')
      return {
        probeTestDb: (args: ProbeArgs): void => {
          probeCalls.push(args);
        },
      };
    return {};
  };

  const moduleExports: Record<string, () => void> = {};

  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', transpiled)(moduleExports, requireStub);
  moduleExports.useWakeOfTestdb!();

  return { probeCalls };
};

describe('the useWakeOfTestdb decide-gate runs its real branches (executed, no live db)', () => {
  given('a service that owns no db (declapract.use.yml declares no databaseUserName)', () => {
    when('the gate reads the declaration', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfTestdb({
          declapractUse: 'useCase: lambda-service\n',
          testConfig: COMPLETE_CONFIG,
        }),
      );
      then('it is a no-op (the testdb is never preflighted)', () => {
        expect(state.probeCalls).toEqual([]);
      });
    });
  });

  given('a service that owns a db (declapract.use.yml declares a databaseUserName)', () => {
    const OWN_DB_USE = 'databaseUserName: svc-x-crud\n';

    when('its config/test.json is complete', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfTestdb({
          declapractUse: OWN_DB_USE,
          testConfig: COMPLETE_CONFIG,
        }),
      );
      then('it preflights the testdb with the config tunnel + role', () => {
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

    when('its config/test.json is absent', () => {
      then('it throws a ConstraintError that names config/test.json (never a silent skip)', () => {
        const error = (() => {
          try {
            runUseWakeOfTestdb({ declapractUse: OWN_DB_USE, testConfig: null });
            return null;
          } catch (caught) {
            return caught;
          }
        })();
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).name).toBe('ConstraintError');
        expect((error as Error).message).toContain('config/test.json');
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
            });
            return null;
          } catch (caught) {
            return caught;
          }
        })();
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).name).toBe('ConstraintError');
        expect((error as Error).message).toContain('lacks an expected key');
      });
    });
  });
});
