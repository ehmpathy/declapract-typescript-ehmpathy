import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { keyrack } from 'rhachet/keyrack';

/**
 * .what = parse the `export KEY=VALUE` lines of `aws ... export-credentials --format env` into a
 *         `{ KEY: VALUE }` record.
 * .why  = names the line-parse as one pure transform, so `exportAwsCredentialsFromSsoProfile` reads
 *         what-not-how rather than an inline positional `match[1]!`/`match[2]!` decode a reader must
 *         simulate. pure + boundary-free, so it is testable without the exec stub.
 */
const asCredentialsRecordFromExportLines = (input: {
  output: string;
}): Record<string, string> =>
  Object.fromEntries(
    input.output
      .split('\n')
      .map((line) => line.match(/^export\s+(\w+)=(.*)$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map((match) => [match[1]!, match[2]!] as const),
  );

// an sso refresh is network-bound (identity-provider round-trip); a slow-but-valid refresh must not
// read as a dead login. bound it generously, and name the budget so it is not a silent magic number.
const SSO_EXPORT_TIMEOUT_MS = 30000;

/**
 * .what = export the aws credentials of an sso profile into a `{ KEY: VALUE }` record, via
 *         `aws configure export-credentials --format env`.
 * .why  = aws sdk v2 (used by simple-lambda-testing-methods, the blackbox lambda caller) cannot
 *         derive an sso profile from AWS_PROFILE alone — it needs static creds in env. this is the
 *         pure, injectable core of that export. it is a pure fn with the `exec` boundary injected,
 *         so the failure path AND the all-clear path are both clamped + snapped.
 * .note = a failed export is CALLER-must-fix (a stale/absent sso login), so it throws a
 *         `ConstraintError` (exit 2) that NAMES the fix and PRESERVES the real cause on the chain —
 *         a consumer can machine-distinguish "not logged in" from a malfunction a retry would fix
 *         (a caller-must-fix ConstraintError, exit 2, over a server malfunction). the profile is passed as an
 *         argv element, never interpolated into a shell string, so a profile with shell
 *         metacharacters cannot be interpreted (no injection).
 */
export const exportAwsCredentialsFromSsoProfile = (
  input: { profile: string },
  context: { exec?: typeof execFileSync } = {},
): Record<string, string> => {
  const exec = context.exec ?? execFileSync;

  // shell out to the aws cli for the profile's static creds; a failure here is caller-must-fix.
  // an iife keeps the result a const (no `let` reassignment across the try) per immutable-vars.
  const credOutput = ((): string => {
    try {
      // note = `as string` at an external boundary (node child_process types). with
      //        `encoding: 'utf8'` execFileSync returns a string, but its overloads widen
      //        to `string | Buffer` when the options object is passed as a variable rather
      //        than an inline literal. correct type = `string`. removal path = pass the
      //        options as an inline literal, or when @types/node narrows the dynamic-options
      //        overload to honor a string `encoding` value.
      return exec(
        'aws',
        [
          'configure',
          'export-credentials',
          '--profile',
          input.profile,
          '--format',
          'env',
        ],
        { encoding: 'utf8', timeout: SSO_EXPORT_TIMEOUT_MS },
      ) as string;
    } catch (error) {
      throw new ConstraintError(
        `failed to export aws credentials from sso profile '${input.profile}'. run: aws sso login --profile ${input.profile}`,
        { cause: error },
      );
    }
  })();

  // parse the `export KEY=VALUE` lines into a record the caller can splice into process.env
  return asCredentialsRecordFromExportLines({ output: credOutput });
};

/**
 * .what = splice the sso profile's static creds into `env` and REMOVE AWS_PROFILE, so an aws-sdk v2
 *         caller authenticates against the target.
 * .why  = aws-sdk v2 (simple-lambda-testing-methods, the blackbox lambda caller) prefers AWS_PROFILE
 *         over static env creds when both are present, and cannot derive an sso profile from
 *         AWS_PROFILE alone. keyrack.source sets only AWS_PROFILE, so v2 auths against no target.
 *         a splice of static creds AND a removal of AWS_PROFILE makes both v2 and v3 use them. this
 *         is the single practice-owned guard for that v2 boundary, so every repo that invokes lambdas
 *         in tests inherits it rather than rediscovers it after an opaque credential failure. it is
 *         shared by BOTH jest envs (acceptance + integration) via useKeyrack -- the v2 gap is guarded once.
 * .note = `env` is injected so the splice + the AWS_PROFILE removal are clamped without a real
 *         process.env mutation; the caller passes process.env. `exportCreds` is injected too, so the
 *         whole path is a pure fn with both boundaries mockable.
 * .note = the splice is scoped to an `AWS_`-prefixed allowlist, never every key the cli emits. `aws
 *         configure export-credentials --format env` emits only `AWS_*` creds today; the allowlist
 *         keeps a future cli line, a proxy banner, or a nested-util var out of the shared process
 *         env (no hidden side effect on an unrelated key). the AWS_PROFILE removal is DELIBERATE and must
 *         persist for the suite lifetime — v2 prefers AWS_PROFILE over static creds, so a "restore"
 *         would reintroduce the exact auth-against-no-target bug this guard exists to close; it is
 *         scoped to the injected `env`, so a test clamps it without a real process.env edit.
 */
const AWS_CRED_KEY_PREFIX = 'AWS_';
export const spliceAwsStaticCredsIntoEnv = (
  input: { profile: string },
  context: {
    env: NodeJS.ProcessEnv;
    exportCreds?: typeof exportAwsCredentialsFromSsoProfile;
  },
): void => {
  const exportCreds = context.exportCreds ?? exportAwsCredentialsFromSsoProfile;

  // splice ONLY the `AWS_`-prefixed creds — never an arbitrary key the cli happens to emit
  const creds = exportCreds({ profile: input.profile });
  for (const [key, value] of Object.entries(creds))
    if (key.startsWith(AWS_CRED_KEY_PREFIX)) context.env[key] = value;

  // v2 prefers AWS_PROFILE over static creds when both are set, so remove it now that creds are spliced
  delete context.env.AWS_PROFILE;
};

/**
 * .what = read the sso profile from `env.AWS_PROFILE`, or throw a ConstraintError that NAMES the fix.
 * .why  = both aws jest envs need an sso profile, which keyrack.source sets from the consumer's
 *         `.agent/keyrack.yml`. when that manifest never declares AWS_PROFILE, keyrack sets no key
 *         and this guard fires — so the error must name the exact key to add, not blame
 *         keyrack.source (which did its job). the #564 gap: the practice cannot ship the consumer's
 *         keyrack.yml (it is a gitignored, consumer-local file), so it instead tells the consumer
 *         precisely what to declare, and every aws consumer inherits that one coherent guard+message
 *         (an error that names the fix) rather than re-derive it from an opaque credential miss.
 * .note = caller-must-fix (the manifest lacks a key), so a ConstraintError (exit 2). `env` is
 *         injected so both the present and absent paths are clamped without a real process.env read;
 *         the caller passes process.env.
 */
export const getOneAwsSsoProfileFromEnv = (
  input: Record<string, never>,
  context: { env: NodeJS.ProcessEnv },
): string => {
  const profile = context.env.AWS_PROFILE;
  if (!profile)
    throw new ConstraintError(
      'AWS_PROFILE not set. declare it in .agent/keyrack.yml (under env.test, and env.all so every tier sources it), so keyrack.source() can set it.',
    );
  return profile;
};

/**
 * .what = source aws credentials from keyrack for the target tier and export them to `process.env`
 *         in ONE call — the single entrypoint both jest envs use for credential setup.
 * .why  = a jest env must not hand-roll the keyrack.source -> set ACCESS -> aws-sdk-v2 export
 *         sequence inline; that spreads one concern across every env and drifts between them. this is
 *         the org `useKeyrack` convention (svc-jobs / svc-notifications), so a consumer reads one
 *         line rather than re-derives the sequence. it composes the injectable leaves above, so this
 *         repo's test-coverage standard holds — the failure + all-clear paths stay clamped, unlike a
 *         verbatim inline port.
 * .how  =
 *   1. skip in CI (credentials arrive from secrets, not keyrack)
 *   2. skip if the consumer declares no `.agent/keyrack.yml`
 *   3. keyrack.source for the tier (sets AWS_PROFILE)
 *   4. set ACCESS for sdk-environment when the tier is not `test`
 *   5. if static creds are already present, clear AWS_PROFILE so the sdk prefers them, and return
 *   6. else, when the consumer requires aws auth, export the sso profile's static creds via the
 *      shared v2 guard
 * .note = `mode` defaults to `lenient` (the org useKeyrack default); the acceptance env passes
 *         `strict` to keep its fail-fast-on-locked-key behavior.
 */
export const useKeyrack = (input?: {
  env?: 'test' | 'prep' | 'prod';
  owner?: string;
  mode?: 'strict' | 'lenient';
}): void => {
  const env =
    input?.env ?? ((process.env.ACCESS ?? 'test') as 'test' | 'prep' | 'prod');
  const owner = input?.owner ?? 'ehmpath';
  const mode = input?.mode ?? 'lenient';

  // skip in CI — credentials arrive from secrets, not from a local keyrack
  if (process.env.CI) return;

  // skip if the consumer declares no keyrack manifest
  const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
  if (!existsSync(keyrackYmlPath)) return;

  // source the tier's aws profile from keyrack (sets AWS_PROFILE)
  keyrack.source({ env, owner, mode });

  // set ACCESS for sdk-environment when the tier is not the default `test`
  if (env !== 'test') process.env.ACCESS = env;

  // only aws consumers need the v2 static-cred export
  const declapractUsePath = join(process.cwd(), 'declapract.use.yml');
  const requiresAwsAuth =
    existsSync(declapractUsePath) &&
    readFileSync(declapractUsePath, 'utf8').includes('awsAccountId');
  if (!requiresAwsAuth) return;

  // static creds already present (e.g. exported in the shell) — clear AWS_PROFILE so the sdk prefers
  // the static creds (v2 prefers AWS_PROFILE over static creds when both are set), then return
  if (process.env.AWS_ACCESS_KEY_ID) {
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_DEFAULT_PROFILE;
    return;
  }

  // read the sso profile keyrack.source set (throws an error that NAMES the keyrack fix if absent, #564),
  // then splice its static creds into process.env for the aws-sdk-v2 lambda caller
  const awsSsoProfile = getOneAwsSsoProfileFromEnv({}, { env: process.env });
  spliceAwsStaticCredsIntoEnv({ profile: awsSsoProfile }, { env: process.env });
};
