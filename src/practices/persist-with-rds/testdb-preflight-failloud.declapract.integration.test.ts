import { readFileSync } from 'fs';
import { join } from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = clamps the testdb preflight probe (#589) to fail LOUD, not hide
 * .why  = the prior probe swallowed psql stderr (`> /dev/null 2>&1`), printed one
 *         hardcoded diagnosis regardless of the true cause, and passed the secret
 *         inline in the connection string (which leaks it to `ps`). so a bad
 *         password, a port conflict, and an image build failure all read the same,
 *         and the real cause never surfaced on timeout.
 * .teeth = revert the fix (restore `> /dev/null 2>&1` + the inline password + the
 *          single hardcoded line) and each `then` below goes red.
 * .note  = a `.declapract.test.ts` at the practice ROOT is a UNIT-test marker — it is
 *          not loaded as a declaration nor copied to a consumer. it anchors on
 *          __dirname (not process.cwd()) so it reads the shipped template directly.
 */

const source = readFileSync(
  join(
    __dirname,
    'best-practice/provision/docker/testdb/wait-for-postgres.sh',
  ),
  'utf8',
);

describe('testdb preflight fails loud (#589)', () => {
  given('the shipped wait-for-postgres preflight probe', () => {
    when('[t0] it runs the psql probe', () => {
      then('it does not swallow the probe stderr to /dev/null', () => {
        expect(source).not.toContain('/dev/null');
      });

      then('it captures the probe stderr for surfacing on timeout', () => {
        expect(source).toContain('lasterr=$(psql');
        expect(source).toContain('2>&1');
      });
    });

    when('[t1] the probe fails past the timeout', () => {
      then('it echoes the captured last error to stderr', () => {
        expect(source).toContain('>&2 echo "$lasterr"');
      });

      then('it no longer prints only the one hardcoded diagnosis', () => {
        expect(source).not.toContain('postgres too long');
      });
    });

    when('[t2] it authenticates to postgres', () => {
      then('it passes the secret via PGPASSWORD, not inline in the connstring', () => {
        // the secret rides PGPASSWORD (never the connstring, which leaks to `ps`), and
        // the env read uses the safe-default form per rule.require.safe-shell-vars
        expect(source).toContain('export PGPASSWORD="${POSTGRES_PASSWORD:-}"');
        expect(source).not.toContain('password=$POSTGRES_PASSWORD');
      });
    });

    when('[t3] a consumer shell runs it under nounset', () => {
      then('it opens with set -eu so an unset env fails loud, not silent', () => {
        expect(source).toContain('set -eu');
      });

      then('it reads every optional env var with the ${VAR:-} default form', () => {
        // no bare "$VAR" env read survives: under set -u a bare read is an unbound-variable
        // crash; the :- default keeps a loud, correct connect attempt instead
        expect(source).not.toContain('"$POSTGRES_PASSWORD"');
        expect(source).not.toContain('dbname=$POSTGRES_DB ');
        expect(source).toContain('${POSTGRES_DB:-}');
      });
    });

    when('[t4] the shipped probe is vibechecked as a whole', () => {
      then('the emitted wait-for-postgres.sh matches snapshot', () => {
        // snapshot the whole shipped probe so a reword that keeps the pinned tokens green
        // (a reshaped psql invocation, a rephrased echo, a moved PGPASSWORD export) reddens a
        // vibecheck in review — the tokens above prove presence, this proves the exact text
        // (rule.require.contract-snapshot-exhaustiveness)
        expect(source).toMatchSnapshot('wait-for-postgres.sh preflight probe');
      });
    });
  });
});
