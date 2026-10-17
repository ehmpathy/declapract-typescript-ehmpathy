import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getOneDatabasePort } from './best-practice/src/utils/database/getOneDatabasePort';

/**
 * .what = clamps the TESTDB_PORT override the app dials: honored with test access, ignored with
 *         every other access, and loud when malformed
 * .why  = the app reads a worktree's testdb port from TESTDB_PORT, which the test harness declares.
 *         an override that leaked past test access would let a stray env var redirect a prep or prod
 *         connection, and a malformed one would dial a port no db binds
 * .teeth = drop the `access !== 'test'` gate and [case2] reddens (prep dials the override); drop the
 *          port validation and [case3] reddens (no ConstraintError)
 * .note = the `.declapract.test.ts` suffix is this repo's UNIT-test marker; the subject is the
 *         shipped TEMPLATE, a pure function with its env injected
 */

const PORT_DECLARED = 7821;

describe('getOneDatabasePort', () => {
  given('[case1] test access', () => {
    when('[t0] TESTDB_PORT is set', () => {
      then('it dials the override port', () => {
        expect(
          getOneDatabasePort(
            { access: 'test', portDeclared: PORT_DECLARED },
            { env: { TESTDB_PORT: '8123' } },
          ),
        ).toEqual(8123);
      });
    });

    when('[t1] TESTDB_PORT is unset', () => {
      then('it dials the declared port', () => {
        expect(
          getOneDatabasePort(
            { access: 'test', portDeclared: PORT_DECLARED },
            { env: {} },
          ),
        ).toEqual(PORT_DECLARED);
      });
    });
  });

  given('[case2] an access other than test, with TESTDB_PORT set', () => {
    (['prep', 'prod'] as const).forEach((access) => {
      when(`[t0] access is ${access}`, () => {
        then('it ignores the override and dials the declared port', () => {
          expect(
            getOneDatabasePort(
              { access, portDeclared: 5432 },
              { env: { TESTDB_PORT: '8123' } },
            ),
          ).toEqual(5432);
        });
      });
    });

    when('[t1] TESTDB_PORT is malformed', () => {
      then('it still ignores the override, never throws', () => {
        expect(
          getOneDatabasePort(
            { access: 'prod', portDeclared: 5432 },
            { env: { TESTDB_PORT: 'not-a-port' } },
          ),
        ).toEqual(5432);
      });
    });
  });

  given('[case3] test access, with a malformed TESTDB_PORT', () => {
    ['not-a-port', '81.5', '-1', '0', '70000', ' 8123'].forEach(
      (portOverride) => {
        when(`[t0] TESTDB_PORT is '${portOverride}'`, () => {
          then('it fails loud with a ConstraintError that names the fix', async () => {
            const error = await getError(async () =>
              getOneDatabasePort(
                { access: 'test', portDeclared: PORT_DECLARED },
                { env: { TESTDB_PORT: portOverride } },
              ),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('TESTDB_PORT is not a valid port');
            expect(JSON.stringify(error)).toContain('positive integer port');
          });
        });
      },
    );
  });
});
