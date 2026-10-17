import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { ConstraintError } from 'helpful-errors';

import { asPackageJSON } from '../../../utils/asPackageJSON';
import { isVersionBelowFloor } from '../../../utils/isVersionBelowFloor';
import { ZOD_VERSION_PINNED } from '../../../utils/zodVersionPinned';

const PRACTICE = 'runtime-schemas';

/**
 * .what = the zod floor; matches the `config` practice's floor so the two declarers agree (#624).
 */
const ZOD_FLOOR = '4.0.0';

/**
 * .what = whether the repo depends on sdk-aws-lambda, whose exact zod pin sets the one zod copy.
 */
const isOnSdkAwsLambda = (input: {
  packageJSON: Record<string, any>;
}): boolean =>
  Boolean(
    input.packageJSON.dependencies?.['sdk-aws-lambda'] ??
      input.packageJSON.devDependencies?.['sdk-aws-lambda'],
  );

/**
 * .what = the zod floor + the single-identity override, read from the keys pnpm actually reads.
 * .why  = a `minVersion` template reads `dependencies` alone, so a `pnpm.overrides.zod` below the
 *         floor read green while pnpm installed the lower copy (#624). and a repo on sdk-aws-lambda
 *         that holds its own zod beside the sdk's exact pin resolves two zod copies, which drives
 *         tsc out of memory (#545). so this check reads both keys, and requires
 *         `pnpm.overrides.zod` at the sdk's exact pin wherever sdk-aws-lambda is present.
 * .note = the override is declared by a check + fix rather than a `@declapract{…}` template, since
 *         declapract 0.13.26 writes the literal template expression into a repo whose `pnpm` key
 *         is absent (F26).
 */
export const check: FileCheckFunction = (contents) => {
  if (!contents) return;
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });

  // the direct zod must be present, at or above the floor
  const zodDeclared: string | undefined = packageJSON.dependencies?.zod;
  if (
    !zodDeclared ||
    isVersionBelowFloor({ version: zodDeclared, floor: ZOD_FLOOR })
  )
    throw new ConstraintError(
      `[${PRACTICE}] dependencies.zod must be >= ${ZOD_FLOOR} — run \`declapract apply\` to raise it`,
      { found: zodDeclared ?? null, required: ZOD_FLOOR },
    );

  // the override pnpm reads must not undercut the floor either
  const zodOverride: string | undefined = packageJSON.pnpm?.overrides?.zod;
  if (
    zodOverride &&
    isVersionBelowFloor({ version: zodOverride, floor: ZOD_FLOOR })
  )
    throw new ConstraintError(
      `[${PRACTICE}] pnpm.overrides.zod (${zodOverride}) undercuts the zod floor ${ZOD_FLOOR}; pnpm installs the override — run \`declapract apply\` to raise it`,
      { found: zodOverride, required: ZOD_FLOOR },
    );

  // on sdk-aws-lambda, one zod copy: the override AND the direct dep name the sdk's exact pin
  if (
    isOnSdkAwsLambda({ packageJSON }) &&
    (zodOverride !== ZOD_VERSION_PINNED || zodDeclared !== ZOD_VERSION_PINNED)
  )
    throw new ConstraintError(
      `[${PRACTICE}] pnpm.overrides.zod and dependencies.zod must both be ${ZOD_VERSION_PINNED} (the zod sdk-aws-lambda pins), so one zod copy resolves — run \`declapract apply\` to set them`,
      {
        found: { override: zodOverride ?? null, dependency: zodDeclared },
        required: ZOD_VERSION_PINNED,
      },
    );
};

/**
 * .what = raise a below-floor zod to the pinned version, and on sdk-aws-lambda set the
 *         `pnpm.overrides.zod` single-identity pin; every other key is kept.
 * .why  = the check above names what pnpm will install; this fix makes it true with one version
 *         constant shared with the joi fixer (#654), so the direct pin and the override agree.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });

  // raise the direct zod when absent or below the floor; a higher adopter choice is kept, except
  // on sdk-aws-lambda: there the override forces the pin anyway, so a higher direct zod would only
  // misstate the installed copy — and pnpm's override-undercuts-dependency would raise the override
  // to it, which this fix would lower again, on every apply
  const zodDeclared: string | undefined = packageJSON.dependencies?.zod;
  const zodDirect =
    isOnSdkAwsLambda({ packageJSON }) ||
    !zodDeclared ||
    isVersionBelowFloor({ version: zodDeclared, floor: ZOD_FLOOR })
      ? ZOD_VERSION_PINNED
      : zodDeclared;

  // the override: the exact pin on sdk-aws-lambda; elsewhere, an undercut override is raised
  const zodOverride: string | undefined = packageJSON.pnpm?.overrides?.zod;
  const zodOverrideDesired = isOnSdkAwsLambda({ packageJSON })
    ? ZOD_VERSION_PINNED
    : zodOverride &&
        isVersionBelowFloor({ version: zodOverride, floor: ZOD_FLOOR })
      ? zodDirect
      : zodOverride;

  const updated = {
    ...packageJSON,
    dependencies: { ...packageJSON.dependencies, zod: zodDirect },
    ...(zodOverrideDesired
      ? {
          pnpm: {
            ...packageJSON.pnpm,
            overrides: {
              ...packageJSON.pnpm?.overrides,
              zod: zodOverrideDesired,
            },
          },
        }
      : {}),
  };
  return { contents: JSON.stringify(updated, null, 2) };
};
