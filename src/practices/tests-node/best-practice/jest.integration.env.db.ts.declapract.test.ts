import type { execFileSync } from 'node:child_process';

import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import {
  asPsqlStderr,
  asTestdbConnectionFix,
  asTestdbPortDeclared,
  getAllTestConfigKeysAbsent,
  isTestConfigComplete,
  probeTestDb,
} from './jest.integration.env.db';

/**
 * .what = clamps the testdb preflight's user-faced failure paths: the real-stderr path a surfer with
 *         a bad password / unapplied schema actually reads, the empty-stderr path (absent psql or a
 *         timeout), and the password-in-env hygiene of the all-clear path.
 * .why  = the preflight runs at jest-setup load in every consumer, so its error is the first output a
 *         surfer on an unreachable testdb reads. the prior form discarded psql's stderr and named one
 *         hardcoded cause, so a real defect one layer down (the crud role never created) read as a
 *         down container and the suggested fix was inert (`rule.forbid.failhide`, graded blocker here,
 *         with a dedicated `mech-failhides` review lane).
 * .teeth = revert the helper to swallow stderr + a hardcoded message and [case1] "psql's own words"
 *          reddens; revert the stderr branch's fix to `start:testdb`-first and [case1] "the fix names
 *          the auth/schema cause" reddens; drop the empty-stderr branch and [case2] reddens;
 *          interpolate the password into the args and [case3] "password rides in env" reddens.
 * .note = the `.declapract.test.ts` suffix is this repo's UNIT-test marker (jest.unit.config's
 *         testMatch), NOT a claim that a declaration exists. the subject is the shipped TEMPLATE
 *         helper (`jest.integration.env.db.ts`); declapract's loader excludes `.test.ts`, so this
 *         file is neither loaded as a declaration nor copied to a consumer.
 */

// a stub in the shape execFileSync is called with. the cast is the sanctioned external-boundary
// idiom -- execFileSync is heavily overloaded, so a test double is cast once here.
const asExec = (fn: (...args: any[]) => any): typeof execFileSync =>
  fn as unknown as typeof execFileSync;

const input = {
  host: 'localhost',
  port: 7821,
  username: 'svc_gateway_user',
  password: '__CHANG3_ME__',
  database: 'svc_gateway',
};

describe('probeTestDb', () => {
  given('[case1] psql fails with a real cause on stderr (a bad password)', () => {
    const execThatFails = asExec(() => {
      // psql exits 2 on a failed connection; execFileSync sets that as `status`
      const err: { message: string; status: number; stderr: Buffer } = {
        message: 'Command failed',
        status: 2,
        stderr: Buffer.from(
          'psql: error: connection to server failed:\nFATAL:  password authentication failed for user "svc_gateway_user"',
        ),
      };
      throw err;
    });

    when('[t0] the preflight runs against the failed psql', () => {
      const error = getError(() => probeTestDb(input, { exec: execThatFails }));

      then('it throws a ConstraintError (caller-must-fix, exit 2)', () => {
        expect(error).toBeInstanceOf(ConstraintError);
      });

      then("psql's own words reach the human (not a hardcoded guess)", () => {
        expect(error.message).toContain('password authentication failed');
      });

      then("every line of psql's reply sits inside the `psql said` branch, the cause line too", () => {
        // a two-line reply indented on its first line alone would leave the FATAL line at column 0
        expect(error.message).toContain(
          '   ├─ psql said\n   │     psql: error: connection to server failed:\n   │     FATAL:  password authentication failed',
        );
      });

      then('the fix names the auth/schema cause, not a down container', () => {
        // psql SPOKE (a bad password), so the container is up; the fix must point at the
        // credential/schema check, NOT `start:testdb` (which the surfer already ran to get here).
        expect(error.message).toContain('the fault is likely auth or schema');
        // a neighbor testdb on the same port also answers, the collision a per-worktree port exists to prevent
        expect(error.message).toContain("not another repo's on the same port");
        expect(error.message).toContain('config/test.json');
        expect(error.message).toContain('localhost:7821');
      });

      then('start:testdb survives only as the container-down fallback', () => {
        // still present (a down container IS possible), but demoted below the auth/schema check
        expect(error.message).toContain('only if the container is in fact down');
        expect(error.message).toContain('npm run start:testdb');
      });

      then('the real cause is preserved on the chain (not swallowed)', () => {
        expect((error as Error).cause).toBeDefined();
      });

      then('the user-faced message matches snapshot', () => {
        expect(error.message).toMatchSnapshot('testdb-probe failure with stderr');
      });
    });
  });

  given('[case2] psql is absent from PATH', () => {
    const execThatCannotSpawn = asExec(() => {
      const err: { message: string; code: string } = {
        message: 'spawn psql ENOENT',
        code: 'ENOENT',
      };
      throw err; // no .stderr
    });

    when('[t0] the preflight runs', () => {
      const error = getError(() =>
        probeTestDb(input, { exec: execThatCannotSpawn }),
      );

      then('it names the absent psql and its install, not a down container', () => {
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('cant probe the testdb at localhost:7821, since psql is absent from PATH');
        expect(error.message).not.toContain('psql said');
        expect(error.message).toContain('install the postgres client');
        expect(error.message).toMatchSnapshot('testdb-probe failure, psql absent');
        expect(error.message).not.toContain('start:testdb');
      });
    });
  });

  given('[case2.1] the psql call times out (no stderr)', () => {
    const execThatStalls = asExec(() => {
      const err: { message: string; code: string; signal: string } = {
        message: 'spawnSync psql ETIMEDOUT',
        code: 'ETIMEDOUT',
        signal: 'SIGTERM',
      };
      throw err;
    });

    when('[t0] the preflight runs', () => {
      const error = getError(() => probeTestDb(input, { exec: execThatStalls }));

      then('it names the timeout, and both causes: a down container, or a host too slow to answer', () => {
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('(no stderr — the call timed out)');
        expect(error.message).toContain('if it does not, run `npm run start:testdb`');
        expect(error.message).toContain('the host is slow: rerun once a heavy job on this host quiets');
        expect(error.message).toMatchSnapshot('testdb-probe failure, psql stalled');
      });
    });
  });

  given('[case2.2] the spawn faults for another reason (a permission fault) (#788)', () => {
    const permissionFault = Object.assign(new Error('spawnSync psql EACCES'), {
      code: 'EACCES',
    });
    const execThatFaults = asExec(() => {
      throw permissionFault;
    });

    when('[t0] the preflight runs', () => {
      const error = getError(() => probeTestDb(input, { exec: execThatFaults }));

      then('it rethrows the fault as is, never relabeled as a testdb the caller must start', () => {
        // a fault psql never caused must surface as is; relabeled, it would blame a healthy testdb
        expect(error).toBe(permissionFault);
      });
    });
  });

  given('[case2.3] psql is killed by a signal with no timeout (an oom kill, a ctrl-c)', () => {
    const killFault = Object.assign(new Error('spawnSync psql SIGKILL'), {
      status: null,
      signal: 'SIGKILL',
    });
    const execThatIsKilled = asExec(() => {
      throw killFault;
    });

    when('[t0] the preflight runs', () => {
      const error = getError(() => probeTestDb(input, { exec: execThatIsKilled }));

      then('it rethrows the kill as is, never a stall that sends the human to start:testdb', () => {
        expect(error).toBe(killFault);
      });
    });
  });

  given('[case3] psql succeeds', () => {
    when('[t0] the preflight runs against a reachable db', () => {
      then('the password rides in env, never in the command args', () => {
        // a spy, not a mock: it records the one call so the test reads args + env back
        const execSpy = jest.fn(
          (
            _file: string,
            _args: string[],
            _opts: { env: Record<string, string> },
          ) => '',
        );

        probeTestDb(input, { exec: asExec(execSpy) });

        const [, args, opts] = execSpy.mock.calls[0]!;
        expect(opts.env.PGPASSWORD).toEqual('__CHANG3_ME__');
        expect(args.join(' ')).not.toContain('__CHANG3_ME__');
      });
    });
  });
});

describe('the preflight transformers (#787)', () => {
  const configComplete = {
    database: {
      tunnel: { local: { host: 'localhost', port: 7821 } },
      role: { crud: { username: 'svc_gateway_user', password: '__CHANG3_ME__' } },
      target: { database: 'svc_gateway' },
    },
  };

  const CASES_COMPLETE = [
    { description: 'every key present', testConfig: configComplete, expected: true },
    { description: 'no database block', testConfig: {}, expected: false },
    {
      description: 'a port declared as a string',
      testConfig: {
        database: { ...configComplete.database, tunnel: { local: { host: 'localhost', port: '7821' } } },
      },
      expected: false,
    },
    {
      description: 'no crud password',
      testConfig: {
        database: { ...configComplete.database, role: { crud: { username: 'svc_gateway_user' } } },
      },
      expected: false,
    },
  ];
  CASES_COMPLETE.map((thisCase) =>
    test(`isTestConfigComplete: ${thisCase.description}`, () => {
      expect(isTestConfigComplete({ testConfig: thisCase.testConfig })).toEqual(thisCase.expected);
    }),
  );

  const CASES_KEYS_ABSENT = [
    { description: 'every key present', testConfig: configComplete, expected: [] },
    {
      description: 'a port declared as a string',
      testConfig: {
        database: { ...configComplete.database, tunnel: { local: { host: 'localhost', port: '7821' } } },
      },
      expected: ['database.tunnel.local.port (number)'],
    },
    {
      description: 'no crud password',
      testConfig: {
        database: { ...configComplete.database, role: { crud: { username: 'svc_gateway_user' } } },
      },
      expected: ['database.role.crud.password (string)'],
    },
  ];
  CASES_KEYS_ABSENT.map((thisCase) =>
    test(`getAllTestConfigKeysAbsent: ${thisCase.description}`, () => {
      expect(getAllTestConfigKeysAbsent({ testConfig: thisCase.testConfig })).toEqual(thisCase.expected);
    }),
  );

  const CASES_PORT = [
    { description: 'a declared number', testConfig: configComplete, expected: 7821 },
    { description: 'an absent config', testConfig: null, expected: null },
    {
      description: 'a port declared as a string',
      testConfig: { database: { tunnel: { local: { port: '7821' } } } },
      expected: null,
    },
  ];
  CASES_PORT.map((thisCase) =>
    test(`asTestdbPortDeclared: ${thisCase.description}`, () => {
      expect(asTestdbPortDeclared({ testConfig: thisCase.testConfig })).toEqual(thisCase.expected);
    }),
  );

  const CASES_STDERR = [
    {
      description: 'a buffer, trimmed',
      error: { stderr: Buffer.from('  FATAL: no such role\n') },
      expected: 'FATAL: no such role',
    },
    { description: 'no stderr key', error: { status: 2 }, expected: '' },
    { description: 'a null stderr', error: { stderr: null }, expected: '' },
    { description: 'not an object', error: 'boom', expected: '' },
  ];
  CASES_STDERR.map((thisCase) =>
    test(`asPsqlStderr: ${thisCase.description}`, () => {
      expect(asPsqlStderr({ error: thisCase.error })).toEqual(thisCase.expected);
    }),
  );

  const CASES_FIX: {
    description: string;
    said: string;
    faultKind: 'exit' | 'stall' | 'absent';
    expected: string;
  }[] = [
    {
      description: 'an absent psql names the client install',
      said: '',
      faultKind: 'absent',
      expected: 'apt install postgresql-client',
    },
    { description: 'a silent stall names start:testdb', said: '', faultKind: 'stall', expected: 'npm run start:testdb' },
    {
      description: 'a psql that spoke names auth or schema first',
      said: 'FATAL: password authentication failed',
      faultKind: 'exit',
      expected: 'container is up',
    },
  ];
  CASES_FIX.map((thisCase) =>
    test(`asTestdbConnectionFix: ${thisCase.description}`, () => {
      expect(asTestdbConnectionFix({ said: thisCase.said, faultKind: thisCase.faultKind })).toContain(
        thisCase.expected,
      );
    }),
  );
});
