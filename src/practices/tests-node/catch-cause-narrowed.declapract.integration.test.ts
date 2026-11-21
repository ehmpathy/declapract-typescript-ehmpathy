import { type ExecFileSyncOptions, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, useBeforeAll, when } from 'test-fns';
import ts from 'typescript';

import { exportAwsCredentialsFromSsoProfile } from './best-practice/src/.test/useKeyrack';

/**
 * .what = clamps #632: the tests-node templates that rethrow inside a `catch` hand `cause` an
 *         `Error`, never the raw `unknown` the catch binds.
 * .why  = an adopter's tsconfig extends `@tsconfig/strictest`, which turns on
 *         `useUnknownInCatchVariables`. there a `catch (error)` binds `unknown`, and helpful-errors
 *         types `cause` as `Error | undefined` — so `{ cause: error }` fails the adopter's type check
 *         in a file the upgrade itself added. this repo never type-checks its `best-practice/`
 *         templates (its tsconfig includes only `*.declapract.ts`), so the defect shipped unseen.
 * .teeth = revert either site to `{ cause: error }` and its case reddens with TS2322.
 * .note = INTEGRATION: it reads the shipped templates off the filesystem and compiles them with the
 *         real typescript checker under the strictness flags an adopter carries. it sits at the
 *         practice root, so declapract never reads it as a declaration.
 * .note = the same file runs useKeyrack's aws export against the real aws cli (#784 #806): the cli's
 *         real stale-login exit and real credential block, offline, under a scratch aws home.
 */

const P = join(__dirname, 'best-practice');

const SITES = [
  { rel: 'src/.test/useKeyrack.ts', name: 'useKeyrack.ts' },
  { rel: 'jest.integration.env.db.ts', name: 'jest.integration.env.db.ts' },
];

/**
 * .what = type-check one template under adopter strictness; return the diagnostics that name `cause`.
 * .why  = the template imports packages this repo may not install (e.g. `rhachet/keyrack`), so an
 *         unresolved-import diagnostic is noise here; only an assignability error on the line that
 *         carries `cause` is the defect class under test.
 */
const getCauseDiagnostics = (input: { path: string }): string[] => {
  const program = ts.createProgram([input.path], {
    strict: true,
    useUnknownInCatchVariables: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    types: ['node'],
  });
  return ts
    .getPreEmitDiagnostics(program)
    .filter((diag) => diag.file?.fileName === input.path)
    .filter((diag) => {
      const line = diag.file!.getLineAndCharacterOfPosition(diag.start ?? 0).line;
      const text = diag.file!.text.split('\n')[line] ?? '';
      return text.includes('cause');
    })
    .map((diag) => ts.flattenDiagnosticMessageText(diag.messageText, '\n'));
};

/**
 * .what = the real execFileSync, run under a scratch aws home: a config file with one sso profile
 *         (no cached login) and one static profile, and no aws cred from the host env
 * .why  = the export's contract is with the real aws cli, so the real cli reads a real config and
 *         speaks a real stale login and a real credential block, offline and with no host login
 * .note = the wrapper adds only `env`: jest sandboxes `process.env`, so a child the template spawns
 *         would never see an edit to it. the file, args, and every other option pass as the template set them
 */
const genExecUnderAwsHomeScratch = (): typeof execFileSync => {
  const home = genTempDir({ slug: 'declapract-aws-home-scratch' });
  mkdirSync(join(home, '.aws'), { recursive: true });
  writeFileSync(
    join(home, '.aws/config'),
    [
      '[profile surf-sso]',
      'sso_start_url = https://surf-example.awsapps.com/start',
      'sso_region = us-east-1',
      'sso_account_id = 123456789012',
      'sso_role_name = surf',
      'region = us-east-1',
      '',
      '[profile surf-static]',
      'aws_access_key_id = surf-access-key-example',
      'aws_secret_access_key = surf-secret-example',
      'region = us-east-1',
      '',
    ].join('\n'),
  );
  // the host env, less every aws cred and profile key, so no host login leaks into the real call
  const envScratch: NodeJS.ProcessEnv = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('AWS_'))),
    HOME: home,
    AWS_CONFIG_FILE: join(home, '.aws/config'),
    AWS_SHARED_CREDENTIALS_FILE: join(home, '.aws/credentials'),
  };
  const execUnderScratch = (file: string, args: string[], options: ExecFileSyncOptions) =>
    execFileSync(file, args, { ...options, env: envScratch });
  // .note = execFileSync is heavily overloaded, so the wrapper is cast once at this boundary
  return execUnderScratch as unknown as typeof execFileSync;
};

describe('exportAwsCredentialsFromSsoProfile against the real aws cli (#784 #806)', () => {
  given('[case1] an sso profile with no cached login', () => {
    when('[t0] the export runs', () => {
      const result = useBeforeAll(async () => ({
        error: getError(() =>
          exportAwsCredentialsFromSsoProfile({ profile: 'surf-sso' }, { exec: genExecUnderAwsHomeScratch() }),
        ),
      }));

      then('it throws a ConstraintError that names the sso login fix, the real cli fault on its chain', () => {
        expect(result.error).toBeInstanceOf(ConstraintError);
        expect(result.error.message).toContain("failed to export aws credentials from sso profile 'surf-sso'");
        expect(result.error.message).toContain('run: aws sso login --profile surf-sso');
        // the cause is the real cli's own exit, never a stand-in object
        expect(result.error.cause).toBeInstanceOf(Error);
        expect((result.error.cause as Error).message).toContain(
          'Command failed: aws configure export-credentials --profile surf-sso --format env',
        );
      });
    });
  });

  given('[case2] a profile the real cli reads offline (static keys in the config)', () => {
    when('[t0] the export runs', () => {
      const result = useBeforeAll(async () => ({
        creds: exportAwsCredentialsFromSsoProfile({ profile: 'surf-static' }, { exec: genExecUnderAwsHomeScratch() }),
      }));

      then("it parses the real cli's credential block into the record", () => {
        expect(result.creds).toMatchObject({
          AWS_ACCESS_KEY_ID: 'surf-access-key-example',
          AWS_SECRET_ACCESS_KEY: 'surf-secret-example',
        });
      });
    });
  });
});

describe('#632 a template catch narrows its cause to an Error', () => {
  for (const site of SITES) {
    given(`[case] ${site.name}`, () => {
      when('[t0] it is type-checked under strictest (useUnknownInCatchVariables)', () => {
        const diagnostics = useBeforeAll(async () => ({
          list: getCauseDiagnostics({ path: join(P, site.rel) }),
        }));

        then('no diagnostic lands on a `cause` line', () => {
          expect(diagnostics.list).toEqual([]);
        });
      });
    });
  }
});
