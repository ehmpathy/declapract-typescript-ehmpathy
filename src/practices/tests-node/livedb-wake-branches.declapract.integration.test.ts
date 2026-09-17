import { readFileSync } from 'node:fs';

import { given, then, useBeforeAll, when } from 'test-fns';
import ts from 'typescript';

/**
 * .what = executes the REAL shipped `useWakeOfLivedb` template through its deterministic
 *         decide-gate branches, with every boundary (fs, child_process, env) injected — so
 *         the wake's actual logic runs, not a source-text pin of it.
 * .why  = `livedb-wake-globalsetup.declapract.integration.test.ts` pins the wake by SOURCE TEXT
 *         (it `.toContain`s `process.env.CI`, `=== 'prod'`, `.database?.tunnel`, …). a logic
 *         bug that keeps those tokens — an inverted gate, a swallowed timeout, a classifier that
 *         rethrows every failure — sails through every pin green. the decide-steps are pure
 *         state decisions (ci-skip, prod-skip, tunnel present/absent, parse-failure throw) and
 *         the failure classifier is a pure allowlist, so they run for real here with no live
 *         infra — the repo's own `runTargetSlug`/`probeTestDb` pattern.
 * .the-invariant = each gate lets the wake through ONLY when it should: not-ci ∧ not-prod ∧
 *         reaches-cluster. a config the consumer authored but the setup cannot parse throws
 *         (never a silent false). a wake-command failure is tolerated loud; a non-child-process
 *         error is rethrown.
 * .teeth = invert any gate in the template (drop the ci return, the prod return, the tunnel
 *          gate) and the matched case reddens — a caller reaches the cluster it must not, or
 *          skips one it must. drop the parse-failure throw and the malformed-config case
 *          reddens. widen the classifier to rethrow-none and the non-child-process case reddens.
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads the shipped template off
 *         the filesystem. no network, no real subprocess — the child_process boundary is stubbed,
 *         so the deployed cluster is never touched. it sits at the PRACTICE ROOT (not under
 *         `best-practice/`), because declapract's compile strips `.declapract.test.ts` (+ `.snap`)
 *         but NOT `.declapract.integration.test.ts` — so an integration clamp collocated inside
 *         `best-practice/` would SHIP to a consumer and apply as an EQUALS template until
 *         ehmpathy/declapract#109 lands. the practice-root home keeps it out of the emission set
 *         while it still clamps the shipped template by path (`rule.require.declapract-integration-tests`).
 */

const SOURCE_PATH = `${__dirname}/best-practice/src/.test/useWakeOfLivedb.ts`;

/**
 * .what = transpile the template to CommonJS + execute its sole export with every boundary
 *         stubbed, then report what crossed each boundary (the exec calls, the stderr warns).
 * .why  = the template imports `node:fs`, `node:child_process`, `node:path`, `helpful-errors`;
 *         a require-stub feeds each a controlled fake so the real decide-logic runs against
 *         inputs this test dictates, and the boundary effects are observed rather than performed.
 */
const runUseWakeOfLivedb = async (input: {
  env: 'test' | 'prep' | 'prod' | null;
  ci: boolean;
  configText: string | null; // null = the config file is absent
  wakeThrows?: unknown; // when set, the stubbed execSync throws this
}): Promise<{ execCalls: string[]; stderr: string[] }> => {
  const source = readFileSync(SOURCE_PATH, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const execCalls: string[] = [];
  const stderr: string[] = [];

  class FakeConstraintError extends Error {
    public readonly cause: unknown;
    constructor(message: string, meta?: { cause?: unknown }) {
      super(message);
      this.name = 'ConstraintError';
      this.cause = meta?.cause;
    }
  }

  const requireStub = (id: string): unknown => {
    if (id === 'node:child_process')
      return {
        execSync: (cmd: string): void => {
          execCalls.push(cmd);
          if (input.wakeThrows !== undefined) throw input.wakeThrows;
        },
      };
    if (id === 'node:fs')
      return {
        existsSync: (): boolean => input.configText !== null,
        readFileSync: (): string => input.configText ?? '',
      };
    if (id === 'node:path')
      return { join: (...parts: string[]): string => parts.join('/') };
    if (id === 'helpful-errors') return { ConstraintError: FakeConstraintError };
    return {};
  };

  const moduleExports: Record<
    string,
    (i: { env: 'test' | 'prep' | 'prod' | null }) => Promise<void>
  > = {};

  // control the two process globals the template reads, and capture its stderr warns
  const priorCi = process.env.CI;
  if (input.ci) process.env.CI = '1';
  else delete process.env.CI;
  const priorWrite = process.stderr.write.bind(process.stderr);
  (process.stderr as unknown as { write: (s: string) => boolean }).write = (
    s: string,
  ): boolean => {
    stderr.push(s);
    return true;
  };

  try {
    // eslint-disable-next-line no-new-func
    new Function('exports', 'require', transpiled)(moduleExports, requireStub);
    await moduleExports.useWakeOfLivedb!({ env: input.env });
  } finally {
    (process.stderr as unknown as { write: (s: string) => boolean }).write =
      priorWrite as never;
    if (priorCi === undefined) delete process.env.CI;
    else process.env.CI = priorCi;
  }

  return { execCalls, stderr };
};

const TUNNEL_CONFIG = '{"database":{"tunnel":{"lambda":{"host":"x"}}}}';

describe('the useWakeOfLivedb decide-gate runs its real branches (executed, no live infra)', () => {
  given('a service that reaches the shared cluster (config declares a db tunnel)', () => {
    when('the caller is not in ci and targets prep', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfLivedb({ env: 'prep', ci: false, configText: TUNNEL_CONFIG }),
      );
      then('it wakes the cluster via the rhx skill for that access', () => {
        expect(state.execCalls).toEqual(['rhx use.rds.capacity --env prep']);
      });
    });

    when('the target access is null (defaults to prep)', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfLivedb({ env: null, ci: false, configText: TUNNEL_CONFIG }),
      );
      then('it wakes the prep cluster by default', () => {
        expect(state.execCalls).toEqual(['rhx use.rds.capacity --env prep']);
      });
    });

    when('the run is in ci', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfLivedb({ env: 'prep', ci: true, configText: TUNNEL_CONFIG }),
      );
      then('it does NOT wake (ci wakes via the dedicated workflow step)', () => {
        expect(state.execCalls).toEqual([]);
      });
    });

    when('the target access is prod', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfLivedb({ env: 'prod', ci: false, configText: TUNNEL_CONFIG }),
      );
      then('it does NOT wake (prod never scales to 0)', () => {
        expect(state.execCalls).toEqual([]);
      });
    });
  });

  given('a service that reaches no shared cluster', () => {
    when('its config is absent', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfLivedb({ env: 'prep', ci: false, configText: null }),
      );
      then('it does NOT wake (no known cluster)', () => {
        expect(state.execCalls).toEqual([]);
      });
    });

    when('its config declares no db tunnel', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfLivedb({ env: 'prep', ci: false, configText: '{"database":{}}' }),
      );
      then('it does NOT wake (no reaches-cluster signal)', () => {
        expect(state.execCalls).toEqual([]);
      });
    });
  });

  given('a config the consumer authored but the setup cannot parse', () => {
    when('the wake gate reads it', () => {
      then('it throws a ConstraintError that names the parse failure (never a silent false)', async () => {
        const error = await runUseWakeOfLivedb({
          env: 'prep',
          ci: false,
          configText: '{ not: valid json',
        }).catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).name).toBe('ConstraintError');
        expect((error as Error).message).toContain('could not parse');
      });
    });
  });

  given('the wake command fails', () => {
    when('it fails with a child-process shape (a non-zero exit)', () => {
      const state = useBeforeAll(() =>
        runUseWakeOfLivedb({
          env: 'prep',
          ci: false,
          configText: TUNNEL_CONFIG,
          wakeThrows: { status: 1 },
        }),
      );
      then('it tolerates the failure (non-fatal) and warns loud to stderr', () => {
        expect(state.stderr.length).toBe(1);
      });
      then('the wake-failure warn matches snapshot', () => {
        expect(state.stderr[0]).toMatchSnapshot('useWakeOfLivedb wake-failure warn');
      });
    });

    when('it fails with a NON-child-process shape (a code malfunction)', () => {
      then('it rethrows, never warns it away (rule.forbid.failhide)', async () => {
        const error = await runUseWakeOfLivedb({
          env: 'prep',
          ci: false,
          configText: TUNNEL_CONFIG,
          wakeThrows: new Error('a real bug in this module'),
        }).catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('a real bug in this module');
      });
    });
  });
});
