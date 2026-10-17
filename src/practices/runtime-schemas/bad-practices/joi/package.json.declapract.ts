import { FileCheckType, type FileFixFunction } from 'declapract';

import { isVersionBelowFloor } from '../../../../utils/isVersionBelowFloor';
import { ZOD_VERSION_PINNED } from '../../../../utils/zodVersionPinned';

export const check = FileCheckType.CONTAINS;

/**
 * .what = drop joi, and declare zod at the exact version sdk-aws-lambda pins.
 * .why  = a `^3.24.0` default beside sdk-aws-lambda's exact `zod@4.4.3` left two zod copies in the
 *         tree, a caret range that drifts, and a v3 floor below the practice's own (#654). the pin
 *         is the one constant the runtime-schemas `pnpm.overrides.zod` also reads (#545), so the
 *         direct dep and the override name one version.
 * .note = an extant zod at or above the pin is the adopter's choice and is kept.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const packageJSON = JSON.parse(contents);
  const zodDeclared: string | undefined = packageJSON.dependencies?.zod;
  const zod =
    zodDeclared &&
    !isVersionBelowFloor({ version: zodDeclared, floor: ZOD_VERSION_PINNED })
      ? zodDeclared
      : ZOD_VERSION_PINNED;
  const updatedPackageJSON = {
    ...packageJSON,
    dependencies: {
      ...packageJSON.dependencies,
      joi: undefined,
      zod,
    },
    // a devDependencies section the repo never declared is not added
    ...('devDependencies' in packageJSON
      ? {
          devDependencies: {
            ...packageJSON.devDependencies,
            '@types/joi': undefined,
          },
        }
      : {}),
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
