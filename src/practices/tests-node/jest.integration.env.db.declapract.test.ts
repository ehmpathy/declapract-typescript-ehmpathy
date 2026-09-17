import type { execFileSync } from 'node:child_process';

import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { probeTestDb } from './best-practice/jest.integration.env.db';

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
      const err: { message: string; stderr: Buffer } = {
        message: 'Command failed',
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

      then('the fix names the auth/schema cause, not a down container', () => {
        // psql SPOKE (a bad password), so the container is UP -- the fix must point at the
        // credential/schema check, NOT `start:testdb` (which the surfer already ran to get here).
        expect(error.message).toContain('the fault is likely auth or schema');
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

  given('[case2] psql is absent from PATH / the call times out (no stderr)', () => {
    const execThatFailsSilently = asExec(() => {
      const err: { message: string; code: string } = {
        message: 'spawn psql ENOENT',
        code: 'ENOENT',
      };
      throw err; // no .stderr
    });

    when('[t0] the preflight runs', () => {
      const error = getError(() =>
        probeTestDb(input, { exec: execThatFailsSilently }),
      );

      then('the empty-stderr branch is named (not masqueraded as a down container)', () => {
        expect(error.message).toContain(
          'psql may be absent from PATH, or the call timed out',
        );
      });
    });
  });

  given('[case3] psql succeeds', () => {
    when('[t0] the preflight runs against a reachable db', () => {
      then('the password rides in env, never in the command args', () => {
        let capturedArgs: readonly string[] = [];
        let capturedEnv: Record<string, string | undefined> = {};
        const execThatSucceeds = asExec(
          (_file: string, args: string[], opts: { env: Record<string, string> }) => {
            capturedArgs = args;
            capturedEnv = opts.env;
            return '';
          },
        );

        probeTestDb(input, { exec: execThatSucceeds });

        expect(capturedEnv.PGPASSWORD).toEqual('__CHANG3_ME__');
        expect(capturedArgs.join(' ')).not.toContain('__CHANG3_ME__');
      });
    });
  });
});
