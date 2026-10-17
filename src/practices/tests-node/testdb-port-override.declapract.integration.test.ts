import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import { getModuleExportsFromTsSource } from '../../utils/getModuleExportsFromTsSource';

/**
 * .what = executes the REAL shipped `useTestdbPortOverride` template through its branches, with
 *         every boundary (fs, path, helpful-errors, the persist-with-rds port source) stubbed, and
 *         pins that both jest envs call it where the app opens the local testdb in-process
 * .why  = the app dials a worktree's testdb port only via the TESTDB_PORT this step declares. if
 *         the step stops to declare it, a worktree's suite silently dials the declared port and
 *         reads another checkout's db; if it declares a wrong port, every query fails far from cause
 * .teeth = drop the absent-source early return and [case1] reddens (TESTDB_PORT set where no
 *          per-worktree port exists); ask the source with a non-test access, or skip the assignment,
 *          and [case2] reddens; drop either loud check and [case3]/[case4] redden; drop the call
 *          from either jest env, or the acceptance env's test-access gate, and [case5] reddens
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads the shipped templates off
 *         the filesystem. no real subprocess, no git — the port source is stubbed. it sits at the
 *         PRACTICE ROOT so declapract never emits it (`rule.require.declapract-integration-tests`)
 */

const P = join(__dirname, 'best-practice');
const SOURCE_PATH = join(
  P,
  'src/.test/assets/database/useTestdbPortOverride.ts',
);
const read = (rel: string): string => readFileSync(join(P, rel), 'utf8');

type PortAsk = { access: string; portDeclared: number };

/**
 * .what = run the template once with its boundaries stubbed; report TESTDB_PORT after, the asks
 *         the port source received, and any error thrown
 */
const runUseTestdbPortOverride = (input: {
  portSource: 'absent' | 'present' | 'drifted';
  testConfig: string | null; // null = the config/test.json file is absent
}): { portDeclaredAfter: string | null; portAsks: PortAsk[]; error: Error | null } => {
  const portAsks: PortAsk[] = [];

  class FakeConstraintError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConstraintError';
    }
  }

  // decide which file a path refers to by its tail — the template joins cwd with a fixed name
  const isPortSourcePath = (p: string): boolean =>
    p.endsWith('src/.test/assets/database/getTestdbPort.ts');
  const isConfigPath = (p: string): boolean => p.endsWith('config/test.json');

  const requireStub = (id: string): unknown => {
    if (isPortSourcePath(id) && input.portSource === 'present')
      return {
        getTestdbPort: (ask: PortAsk): number => {
          portAsks.push(ask);
          return ask.portDeclared + 77;
        },
      };
    if (isPortSourcePath(id)) return {};
    if (id === 'node:fs')
      return {
        existsSync: (p: string): boolean => {
          if (isPortSourcePath(p)) return input.portSource !== 'absent';
          return isConfigPath(p) && input.testConfig !== null;
        },
        readFileSync: (): string => input.testConfig ?? '',
      };
    if (id === 'node:path')
      return { join: (...parts: string[]): string => parts.join('/') };
    if (id === 'helpful-errors') return { ConstraintError: FakeConstraintError };
    throw new Error(`unexpected require: ${id}`);
  };

  const { useTestdbPortOverride } = getModuleExportsFromTsSource<{
    useTestdbPortOverride: () => void;
  }>({ source: readFileSync(SOURCE_PATH, 'utf8'), requireStub });

  // run against a clean TESTDB_PORT; restore the prior value after
  const portOverridePrior = process.env.TESTDB_PORT;
  delete process.env.TESTDB_PORT;
  try {
    useTestdbPortOverride!();
    return {
      portDeclaredAfter: process.env.TESTDB_PORT ?? null,
      portAsks,
      error: null,
    };
  } catch (caught) {
    if (!(caught instanceof Error)) throw caught;
    return { portDeclaredAfter: process.env.TESTDB_PORT ?? null, portAsks, error: caught };
  } finally {
    if (portOverridePrior === undefined) delete process.env.TESTDB_PORT;
    if (portOverridePrior !== undefined)
      process.env.TESTDB_PORT = portOverridePrior;
  }
};

const COMPLETE_CONFIG = JSON.stringify({
  database: { tunnel: { local: { host: 'localhost', port: 7821 } } },
});

describe('useTestdbPortOverride declares the testdb port the app dials', () => {
  given('[case1] a repo without persist-with-rds (no port source)', () => {
    when('[t0] the step runs', () => {
      const result = useBeforeAll(async () =>
        runUseTestdbPortOverride({ portSource: 'absent', testConfig: null }),
      );
      then('it declares naught, and never throws', () => {
        expect(result.error).toEqual(null);
        expect(result.portDeclaredAfter).toEqual(null);
      });
    });
  });

  given('[case2] a persist-with-rds repo with a complete config/test.json', () => {
    when('[t0] the step runs', () => {
      const result = useBeforeAll(async () =>
        runUseTestdbPortOverride({
          portSource: 'present',
          testConfig: COMPLETE_CONFIG,
        }),
      );
      then('it asks the port source with test access and the declared port', () => {
        expect(result.portAsks).toEqual([{ access: 'test', portDeclared: 7821 }]);
      });
      then('it declares the per-worktree port as TESTDB_PORT', () => {
        expect(result.error).toEqual(null);
        expect(result.portDeclaredAfter).toEqual(String(7821 + 77));
      });
    });
  });

  given('[case3] a port source whose export drifted', () => {
    when('[t0] the step runs', () => {
      const result = useBeforeAll(async () =>
        runUseTestdbPortOverride({
          portSource: 'drifted',
          testConfig: COMPLETE_CONFIG,
        }),
      );
      then('it fails loud with a ConstraintError that names the export', () => {
        expect(result.error?.name).toEqual('ConstraintError');
        expect(result.error?.message).toContain('exports no getTestdbPort');
        expect(result.portDeclaredAfter).toEqual(null);
      });
    });
  });

  given('[case4] a port source, but config/test.json declares no port', () => {
    [null, JSON.stringify({ database: { tunnel: {} } })].forEach((testConfig) => {
      when(`[t0] config/test.json is ${testConfig === null ? 'absent' : 'portless'}`, () => {
        const result = useBeforeAll(async () =>
          runUseTestdbPortOverride({ portSource: 'present', testConfig }),
        );
        then('it fails loud with a ConstraintError that names the absent key', () => {
          expect(result.error?.name).toEqual('ConstraintError');
          expect(result.error?.message).toContain('database.tunnel.local.port');
          expect(result.portDeclaredAfter).toEqual(null);
        });
      });
    });
  });

  given('[case5] the jest envs that open the local testdb in-process', () => {
    then('jest.integration.env.ts declares the port before the wake probes it', () => {
      const env = read('jest.integration.env.ts');
      expect(env).toContain(
        "import { useTestdbPortOverride } from './src/.test/assets/database/useTestdbPortOverride';",
      );
      expect(env.indexOf('useTestdbPortOverride();')).toBeGreaterThan(-1);
      expect(env.indexOf('useTestdbPortOverride();')).toBeLessThan(
        env.indexOf('useWakeOfTestdb();'),
      );
    });

    then('jest.acceptance.env.ts declares the port only with test access', () => {
      const env = read('jest.acceptance.env.ts');
      expect(env).toContain("if (access === 'test') useTestdbPortOverride();");
    });
  });
});
