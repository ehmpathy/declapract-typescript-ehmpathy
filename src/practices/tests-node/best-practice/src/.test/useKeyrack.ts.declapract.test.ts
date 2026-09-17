import type { execFileSync } from 'node:child_process';

import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import {
  exportAwsCredentialsFromSsoProfile,
  getOneAwsSsoProfileFromEnv,
  spliceAwsStaticCredsIntoEnv,
} from './useKeyrack';

/**
 * .what = clamps the two user-faced paths of the useKeyrack aws credential export: the FAILURE
 *         path a consumer on a stale/absent sso login actually reads, and the ALL-CLEAR path.
 * .why  = the export runs at jest-setup load (via useKeyrack) in every consumer, so its error is
 *         the first output a surfer on a dead login reads. per `rule.forbid.friction-hazards` the
 *         user-faced error path must be snapped, so a regression of the message (or of the profile
 *         interpolation) reddens.
 * .teeth = the failure case asserts a ConstraintError (exit 2, caller-must-fix), the fix named, and
 *          the real cause preserved on the chain. revert the helper's throw to a bare `Error` and the
 *          `instanceof ConstraintError` assertion reddens (r2.n1). the all-clear case proves only the
 *          `export KEY=VALUE` lines parse, so a garbled line cannot silently seed a wrong cred.
 * .note = the `.declapract.test.ts` suffix is this repo's UNIT-test marker (jest.unit.config's
 *         testMatch is `**\/*.declapract.test.ts`), NOT a claim that a `useKeyrack.declapract.ts`
 *         DECLARATION exists. the subject is the collocated TEMPLATE util (`./useKeyrack.ts`), the
 *         injectable leaves the one-line `useKeyrack` orchestrator composes; declapract's compile
 *         step strips `.declapract.test.ts` (+ `.snap`) before publish, so this file is neither
 *         shipped nor applied to a consumer even though it sits inside `best-practice/`.
 */

// a stub in the shape execFileSync returns (a utf8 string). the cast is the sanctioned
// external-boundary idiom — execFileSync is heavily overloaded, so a test double is cast once here.
const asExec = (fn: () => string): typeof execFileSync =>
  fn as unknown as typeof execFileSync;

describe('exportAwsCredentialsFromSsoProfile', () => {
  given('[case1] the aws cli fails (a stale or absent sso login)', () => {
    const execThatFails = asExec(() => {
      throw new Error('The SSO session associated with this profile has expired');
    });

    when('[t0] the export runs against the failed cli', () => {
      const error = getError(() =>
        exportAwsCredentialsFromSsoProfile(
          { profile: 'my-sso-profile' },
          { exec: execThatFails },
        ),
      );

      then('it throws a ConstraintError (caller-must-fix, exit 2)', () => {
        expect(error).toBeInstanceOf(ConstraintError);
      });

      then('the message names the fix + the exact profile', () => {
        expect(error.message).toContain(
          "failed to export aws credentials from sso profile 'my-sso-profile'",
        );
        expect(error.message).toContain(
          'run: aws sso login --profile my-sso-profile',
        );
      });

      then('the real cause is preserved on the chain (not swallowed)', () => {
        expect((error as Error).cause).toBeInstanceOf(Error);
        expect(((error as Error).cause as Error).message).toContain(
          'SSO session',
        );
      });

      then('the user-faced message matches snapshot', () => {
        expect(error.message).toMatchSnapshot('credential-export failure message');
      });
    });
  });

  given('[case2] the aws cli returns a valid env-format credential block', () => {
    const execThatSucceeds = asExec(
      () =>
        [
          'export AWS_ACCESS_KEY_ID=AKIAEXAMPLE',
          'export AWS_SECRET_ACCESS_KEY=secretExampleValue',
          'export AWS_SESSION_TOKEN=sessionExampleToken',
          '', // a final blank line the cli emits — must be ignored, not seed an empty key
        ].join('\n'),
    );

    when('[t0] the export runs against the valid cli', () => {
      const creds = exportAwsCredentialsFromSsoProfile(
        { profile: 'my-sso-profile' },
        { exec: execThatSucceeds },
      );

      then('only the three export lines parse into the record', () => {
        expect(creds).toEqual({
          AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
          AWS_SECRET_ACCESS_KEY: 'secretExampleValue',
          AWS_SESSION_TOKEN: 'sessionExampleToken',
        });
      });

      then('the parsed record matches snapshot', () => {
        expect(creds).toMatchSnapshot('credential-export all-clear record');
      });
    });
  });
});

/**
 * .what = clamps the shared aws-sdk-v2 auth guard: after a splice, the static creds are in env AND
 *         AWS_PROFILE is removed.
 * .why  = aws-sdk v2 prefers AWS_PROFILE over static creds when both are set, so a splice that LEFT
 *         AWS_PROFILE in place would auth against no target -- the exact #586 gap. both jest envs
 *         share this one guard (via useKeyrack), so the clamp protects every consumer that invokes
 *         lambdas in tests.
 * .teeth = drop the `delete context.env.AWS_PROFILE` line and [t0]'s "AWS_PROFILE is removed"
 *          assertion reddens; drop the `AWS_` allowlist and [case2]'s "a non-AWS key is not
 *          spliced" assertion reddens.
 */
describe('spliceAwsStaticCredsIntoEnv', () => {
  given('[case1] a profile is set and the export returns creds', () => {
    const exportCredsStub = () => ({
      AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'secretExampleValue',
      AWS_SESSION_TOKEN: 'sessionExampleToken',
    });

    when('[t0] the splice runs against an env that carries AWS_PROFILE', () => {
      const env: NodeJS.ProcessEnv = { AWS_PROFILE: 'my-sso-profile' };
      spliceAwsStaticCredsIntoEnv(
        { profile: 'my-sso-profile' },
        { env, exportCreds: exportCredsStub },
      );

      then('the static creds are spliced into env', () => {
        expect(env.AWS_ACCESS_KEY_ID).toEqual('AKIAEXAMPLE');
        expect(env.AWS_SECRET_ACCESS_KEY).toEqual('secretExampleValue');
        expect(env.AWS_SESSION_TOKEN).toEqual('sessionExampleToken');
      });

      then('AWS_PROFILE is removed (so v2 uses the static creds, not the profile)', () => {
        expect(env.AWS_PROFILE).toBeUndefined();
      });
    });
  });

  given('[case2] the export returns a non-AWS key alongside the aws creds', () => {
    // an allowlist splices only `AWS_`-prefixed keys, so a stray/non-cred key the export
    // may emit (a shell var, an injected line) cannot leak into the process env.
    const exportCredsStub = () =>
      ({
        AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'secretExampleValue',
        AWS_SESSION_TOKEN: 'sessionExampleToken',
        PATH: '/malicious/override',
      }) as unknown as Record<string, string>;

    when('[t0] the splice runs', () => {
      const env: NodeJS.ProcessEnv = { PATH: '/usr/bin' };
      spliceAwsStaticCredsIntoEnv(
        { profile: 'my-sso-profile' },
        { env, exportCreds: exportCredsStub },
      );

      then('the aws creds are spliced', () => {
        expect(env.AWS_ACCESS_KEY_ID).toEqual('AKIAEXAMPLE');
        expect(env.AWS_SESSION_TOKEN).toEqual('sessionExampleToken');
      });

      then('a non-AWS key is not spliced (the allowlist holds; PATH is untouched)', () => {
        // teeth: drop the `key.startsWith('AWS_')` allowlist and this reddens — PATH would be
        // clobbered to '/malicious/override'.
        expect(env.PATH).toEqual('/usr/bin');
      });
    });
  });
});

/**
 * .what = clamps the #564 guard: the sso-profile reader throws a ConstraintError that NAMES the
 *         keyrack fix, so a consumer whose `.agent/keyrack.yml` never declares AWS_PROFILE is told
 *         exactly what to add, not blamed on keyrack.source.
 * .why  = the practice cannot ship the consumer's keyrack.yml (gitignored, consumer-local), so the
 *         guard's error IS the fix-forward (`rule.require.errors-name-the-fix`). the guard runs at
 *         jest-setup load (via useKeyrack) in every aws consumer, so its error is the first output a
 *         consumer on an undeclared manifest reads.
 * .teeth = revert the throw to the bare `'AWS_PROFILE not set. keyrack.source() should have set it.'`
 *          and the "names .agent/keyrack.yml" assertion reddens (the old message named no key).
 */
describe('getOneAwsSsoProfileFromEnv', () => {
  given('[case1] AWS_PROFILE is absent from env', () => {
    when('[t0] the profile is read', () => {
      const error = getError(() => getOneAwsSsoProfileFromEnv({}, { env: {} }));

      then('it throws a ConstraintError (caller-must-fix, exit 2)', () => {
        expect(error).toBeInstanceOf(ConstraintError);
      });

      then('the message names the fix: declare AWS_PROFILE in .agent/keyrack.yml', () => {
        expect(error.message).toContain('AWS_PROFILE');
        expect(error.message).toContain('.agent/keyrack.yml');
      });
    });
  });

  given('[case2] AWS_PROFILE is set in env', () => {
    when('[t0] the profile is read', () => {
      const profile = getOneAwsSsoProfileFromEnv(
        {},
        { env: { AWS_PROFILE: 'my-sso-profile' } },
      );

      then('it returns the profile', () => {
        expect(profile).toEqual('my-sso-profile');
      });
    });
  });
});
