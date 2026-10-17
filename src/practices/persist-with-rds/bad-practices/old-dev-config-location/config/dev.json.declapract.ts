import { FileCheckType, type FileFixFunction } from 'declapract';

import { asPrepConfigPath } from '../../../../../utils/asPrepConfigPath';
import { migrateDevConfigToPrep } from '../../../../../utils/migrateDevConfigToPrep';

export const check = FileCheckType.EXISTS;

/**
 * .what = move config/dev.json → config/prep.json and migrate the access tokens (dev → prep)
 * .why  = both halves are shared utils (one source for both declarers): migrateDevConfigToPrep
 *         owns the content migration, asPrepConfigPath owns the relocate. the `__CHANG3_ME__`
 *         passwords stay as they are — `deploy.database.sh` creates prep users with that
 *         password, so a flip to `$.at(aws::param)` would point the app at params that hold no
 *         value (#683).
 */
export const fix: FileFixFunction = (contents, context) => ({
  contents: contents
    ? migrateDevConfigToPrep({ contents })
    : (contents ?? null),
  relativeFilePath: asPrepConfigPath({
    relativeFilePath: context.relativeFilePath,
  }),
});
