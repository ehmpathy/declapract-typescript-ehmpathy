import type { FileCheckFunction, FileFixFunction } from 'declapract';

import {
  isGetDatabaseConnectionImporter,
  withGetDatabaseConnectionRepointed,
} from '../../../../../../utils/withGetDatabaseConnectionRepointed';

/**
 * .what = the two retired files this bad-practice declares by their own path
 * .why = each has its own declaration (delete on a template match, else keep); this wildcard
 *        repoints every OTHER importer, so the two never race on one file
 */
const RETIRED_FILE_PATHS = [
  'src/utils/database/getDatabaseConnection.ts',
  'src/utils/database/getDatabaseConnection.integration.test.ts',
];

export const check: FileCheckFunction = (contents, context) => {
  if (
    contents &&
    !RETIRED_FILE_PATHS.includes(context.relativeFilePath) &&
    isGetDatabaseConnectionImporter({ source: contents })
  )
    return; // bad practice detected: this file imports the retired factory module
  throw new Error(
    'does not match bad practice: no import of src/utils/database/getDatabaseConnection',
  );
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  return { contents: withGetDatabaseConnectionRepointed({ source: contents }) };
};
