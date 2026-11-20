import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { ConstraintError } from 'helpful-errors';

/**
 * .what = the shape of `config/test.json` the testdb preflight and the port override read
 * .note = every key is optional here: a config is read before it is checked, so the shape admits
 *         a partial file; `isTestConfigComplete` narrows it to the keys the preflight needs
 */
type TestConfigShape = {
  database?: {
    tunnel?: { local?: { host?: unknown; port?: unknown } };
    role?: { crud?: { username?: unknown; password?: unknown } };
    target?: { database?: unknown };
  };
};

/**
 * .what = read and parse `config/test.json`, or null when the file is absent
 * .why  = both the testdb wake and the port override read this file; one named read replaces two
 *         inline parses, and a malformed file names its path rather than throw a bare SyntaxError
 */
export const getOneTestConfig = (input: { path: string }): TestConfigShape | null => {
  if (!existsSync(input.path)) return null;
  const text = readFileSync(input.path, 'utf8');
  try {
    // every leaf of the shape is `unknown`, and each reader checks the type of what it reads
    return JSON.parse(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    // the engine's own message quotes the source near the fault, which can hold the crud password,
    // so neither it nor the SyntaxError rides out; the path and the fix are enough to act on
    throw new ConstraintError(`${input.path} is not valid json`, {
      path: input.path,
      hint: 'fix the json syntax in that file (an editor flags the fault), or run `npx declapract apply` to restore it',
    });
  }
};

/**
 * .what = each key the testdb preflight dials with that a test config lacks, or holds in the
 *         wrong type, each with the type it must hold
 * .why  = an incomplete config names exactly what to fix, never a generic "a key is absent"
 */
export const getAllTestConfigKeysAbsent = (input: { testConfig: TestConfigShape }): string[] => {
  const database = input.testConfig.database;
  const keysExpected: { key: string; value: unknown; type: 'string' | 'number' }[] = [
    { key: 'database.tunnel.local.host', value: database?.tunnel?.local?.host, type: 'string' },
    { key: 'database.tunnel.local.port', value: database?.tunnel?.local?.port, type: 'number' },
    { key: 'database.role.crud.username', value: database?.role?.crud?.username, type: 'string' },
    { key: 'database.role.crud.password', value: database?.role?.crud?.password, type: 'string' },
    { key: 'database.target.database', value: database?.target?.database, type: 'string' },
  ];
  return keysExpected
    .filter((expected) => typeof expected.value !== expected.type)
    .map((expected) => `${expected.key} (${expected.type})`);
};

/**
 * .what = whether a test config holds every key the testdb preflight dials with
 * .why  = names the presence check, so the wake reads what it checks, not how
 */
export const isTestConfigComplete = (input: {
  testConfig: TestConfigShape;
}): input is {
  testConfig: {
    database: {
      tunnel: { local: { host: string; port: number } };
      role: { crud: { username: string; password: string } };
      target: { database: string };
    };
  };
} => getAllTestConfigKeysAbsent(input).length === 0;

/**
 * .what = the testdb port a test config declares, or null when it declares none
 * .why  = names the nested read the port override needs
 */
export const asTestdbPortDeclared = (input: { testConfig: TestConfigShape | null }): number | null => {
  const port = input.testConfig?.database?.tunnel?.local?.port;
  return typeof port === 'number' ? port : null;
};

/**
 * .what = what psql said on stderr when it failed, or '' when it said naught
 * .why  = names the decode of execFileSync's fault; an `in` narrow reads `stderr`, never a cast
 */
export const asPsqlStderr = (input: { error: unknown }): string => {
  if (typeof input.error !== 'object' || input.error === null) return '';
  if (!('stderr' in input.error)) return '';
  return String(input.error.stderr ?? '').trim();
};

/**
 * .what = classify a psql fault: psql exited non-zero, psql stalled past its timeout, psql is
 *         absent from PATH, or a fault of another kind
 * .why  = only the first three are a testdb the caller must fix; any other fault (a permission
 *         fault, an unknown spawn error, a kill by a signal with no timeout) is its own cause, so it
 *         is rethrown, never relabeled
 */
const asPsqlFaultKind = (input: { error: unknown }): 'exit' | 'stall' | 'absent' | 'other' => {
  if (typeof input.error !== 'object' || input.error === null) return 'other';
  if ('code' in input.error && input.error.code === 'ENOENT') return 'absent';
  if ('code' in input.error && input.error.code === 'ETIMEDOUT') return 'stall';
  if ('status' in input.error && typeof input.error.status === 'number' && input.error.status !== 0)
    return 'exit';
  return 'other';
};

/**
 * .what = what psql said, or why it said naught (a timeout)
 * .why  = names the fallback, so the error body reads what it shows, not how it picks it
 */
const asPsqlSaidOrWhy = (input: { said: string; faultKind: 'exit' | 'stall' }): string => {
  if (input.said) return input.said;
  return '(no stderr — the call timed out)';
};

/**
 * .what = indent every line of a block, so a multi-line psql reply reads as one nested section
 * .why  = psql often answers in two lines (`psql: error: …` then `FATAL: …`); an indent on the first
 *         line alone would leave the cause itself at column 0, outside the block it belongs to
 */
const asIndentedBlock = (input: { text: string; indent: string }): string =>
  input.text
    .split('\n')
    .map((line) => `${input.indent}${line}`)
    .join('\n');

/**
 * .what = the fix to name for a testdb psql could not reach, as the last branch of the error tree
 * .why  = names the fix choice. psql SPOKE => it reached the server, so the container is up
 *         and the fault is auth or schema; `start:testdb` is what the surfer ran to get here, so it is
 *         the wrong first move. a silent psql (a timeout) is the one cause that points at a down container
 */
export const asTestdbConnectionFix = (input: { said: string; faultKind: 'exit' | 'stall' | 'absent' }): string => {
  if (input.faultKind === 'absent')
    return '   └─ fix: install the postgres client so `psql` is on PATH (e.g. `apt install postgresql-client`)';
  if (!input.said)
    return [
      '   └─ fix: psql got no reply within its timeout; the container is likely down, or the host too loaded to answer',
      '      ├─ check the testdb runs (`docker ps`); if it does not, run `npm run start:testdb`',
      '      └─ if it runs, the host is slow: rerun once a heavy job on this host quiets',
    ].join('\n');
  return [
    '   └─ fix: psql reached the server, so the container is up; the fault is likely auth or schema',
    '      ├─ check the crud user + password in config/test.json match what the testdb was seeded with',
    "      ├─ check this service's schema was applied to the testdb",
    "      ├─ check the server that answered is this repo's testdb, not another repo's on the same port (`docker ps` names each holder)",
    '      └─ only if the container is in fact down, run `npm run start:testdb`',
  ].join('\n');
};

/**
 * .what = verify the local testdb is reachable, via a `SELECT 1` preflight, before a suite runs.
 * .why  = this preflight runs at jest-setup load, so its error is the first output a surfer reads
 *         when the testdb is unreachable. it surfaces psql's own words, so a bad password, an
 *         unapplied schema, an absent psql, and a down container each read as what they are. it
 *         lives apart from `jest.integration.env.ts` (a jest-setup module whose logic cannot be
 *         unit-tested in place) so the failure path is a pure fn with the `exec` boundary injected.
 * .note = PGPASSWORD rides in `env`, never in the command args. node puts the failed command verbatim
 *         onto the thrown error's message, so a password passed as an arg would reach any log that
 *         prints that error. the args are an argv array (no shell), so a config value with shell
 *         metacharacters cannot be interpreted either (no injection).
 * .note = a testdb psql cannot reach is CALLER-must-fix (a local testdb the human starts), so it
 *         throws a ConstraintError (exit 2) that NAMES the fix and PRESERVES the fault on the chain.
 *         a fault of any other kind is rethrown as is.
 */
export const probeTestDb = (
  input: {
    host: string;
    port: number | string;
    username: string;
    password: string;
    database: string;
  },
  context: { exec?: typeof execFileSync } = {},
): void => {
  const exec = context.exec ?? execFileSync;

  try {
    exec(
      'psql',
      [
        '-h',
        String(input.host),
        '-p',
        String(input.port),
        '-U',
        input.username,
        '-d',
        input.database,
        '-c',
        'SELECT 1',
      ],
      {
        timeout: 3000,
        // stdout ignored (the SELECT 1 result is noise); stderr piped so psql's words reach the human
        stdio: ['ignore', 'ignore', 'pipe'],
        env: { ...process.env, PGPASSWORD: input.password },
      },
    );
  } catch (error) {
    // a fault that is not a testdb psql could reach is its own cause; rethrow it, never relabel it
    const faultKind = asPsqlFaultKind({ error });
    if (faultKind === 'other') throw error;

    // surface what psql said, and the fix that fits it; an absent psql never ran, so it said naught
    const said = asPsqlStderr({ error });
    const lines =
      faultKind === 'absent'
        ? [`cant probe the testdb at ${input.host}:${input.port}, since psql is absent from PATH`]
        : [
            `cant connect to the testdb at ${input.host}:${input.port}`,
            '   ├─ psql said',
            asIndentedBlock({ text: asPsqlSaidOrWhy({ said, faultKind }), indent: '   │     ' }),
            '   │',
          ];
    throw new ConstraintError(
      [...lines, asTestdbConnectionFix({ said, faultKind })].join('\n'),
      // a catch binds `unknown` under strictest, and `cause` is typed `Error`; narrow, never cast,
      // so a non-Error throw is re-homed into an Error rather than dropped
      {
        cause: error instanceof Error ? error : new Error(String(error)),
        host: input.host,
        port: input.port,
      },
    );
  }
};
