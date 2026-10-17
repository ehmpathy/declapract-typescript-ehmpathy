import type { FileCheckFunction, FileFixFunction } from 'declapract';

import {
  isPgClientWithoutSsl,
  withPgClientSslDeclared,
} from '../../../../../../utils/withPgClientSslDeclared';

/**
 * .what = the retired factory files that `old-get-database-connection` declares by their own path
 * .why = that bad-practice deletes them on a template match; were this wildcard to flag them too,
 *        two fixes would race on one file (a rewrite turns a template match into a kept edit, or
 *        a second unlink hits a file already gone), so the retired files are left to their owner
 */
const RETIRED_FILE_PATHS = [
  'src/utils/database/getDatabaseConnection.ts',
  'src/utils/database/getDatabaseConnection.integration.test.ts',
];

export const check: FileCheckFunction = (contents, context) => {
  if (
    contents !== null &&
    !RETIRED_FILE_PATHS.includes(context.relativeFilePath) &&
    isPgClientWithoutSsl({ source: contents })
  )
    return; // bad practice detected
  throw new Error('does not match bad practice: every pg Client declares ssl');
};

export const fix: FileFixFunction = (contents) => {
  if (contents === null) return { contents };
  return { contents: withPgClientSslDeclared({ source: contents }) };
};
