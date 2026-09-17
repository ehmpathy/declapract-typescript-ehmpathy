import { FileCheckType, type FileFixFunction } from 'declapract';

import { asPrepConfigPath } from '../../../../../utils/asPrepConfigPath';
import { migrateDevConfigToPrep } from '../../../../../utils/migrateDevConfigToPrep';

export const check = FileCheckType.EXISTS;

/**
 * .what = rewrite the rds password placeholder `"__CHANG3_ME__"` to the aws-param reference.
 * .why  = the rds config twin adds this one transform the config twin lacks; a named op keeps the
 *         declarer's `fix` a what-not-how read (rule.require.named-transformers).
 */
const withAwsParamPlaceholder = (input: { contents: string }): string =>
  input.contents.replace(/"__CHANG3_ME__"/g, '"$.at(aws::param)"');

export const fix: FileFixFunction = (contents, context) => {
  // move config/dev.json → config/prep.json and migrate the tier tokens (dev → prep).
  // both halves are shared utils (one source for both declarers): migrateDevConfigToPrep
  // owns the content migration, asPrepConfigPath owns the relocate. this declarer adds the
  // rds-only aws-param placeholder rewrite on top.
  const updatedContents = contents
    ? withAwsParamPlaceholder({
        contents: migrateDevConfigToPrep({ contents }),
      })
    : contents;

  return {
    contents: updatedContents ?? null,
    relativeFilePath: asPrepConfigPath({
      relativeFilePath: context.relativeFilePath,
    }),
  };
};
