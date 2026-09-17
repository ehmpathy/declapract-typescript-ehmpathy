import { FileCheckType, type FileFixFunction } from 'declapract';

import { asPrepConfigPath } from '../../../../../utils/asPrepConfigPath';
import { migrateDevConfigToPrep } from '../../../../../utils/migrateDevConfigToPrep';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move config/dev.json → config/prep.json and migrate the tier tokens (dev → prep).
  // both halves are shared utils, one source for both declarers: migrateDevConfigToPrep
  // owns the content migration, asPrepConfigPath owns the relocate.
  const fixed = contents ? migrateDevConfigToPrep({ contents }) : contents;
  return {
    contents: fixed ?? null,
    relativeFilePath: asPrepConfigPath({
      relativeFilePath: context.relativeFilePath,
    }),
  };
};
