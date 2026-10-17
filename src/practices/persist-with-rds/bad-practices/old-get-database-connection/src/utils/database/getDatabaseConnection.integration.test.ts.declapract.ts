import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asTemplateFingerprint } from '../../../../../../../utils/asTemplateFingerprint';
import {
  isGetDatabaseConnectionImporter,
  withGetDatabaseConnectionRepointed,
} from '../../../../../../../utils/withGetDatabaseConnectionRepointed';

/**
 * .what = the fingerprint of the one test body persist-with-rds shipped at this path
 * .why = that test duplicates getOneDatabaseConnection.integration.test.ts, so the fix deletes it
 *        when the repo still holds the shipped body; an edited copy is repointed instead
 */
export const OLD_TEST_TEMPLATE_FINGERPRINTS: string[] = [
  '9f828d9d66611826e89a00ba28a28496d0648f13d2b937b8d599844256f63213', // 66284e3, unchanged through b8d4803
];

export const check: FileCheckFunction = (contents) => {
  // detect the shipped duplicate, or any copy that still reaches the retired module
  if (
    contents !== null &&
    (OLD_TEST_TEMPLATE_FINGERPRINTS.includes(
      asTemplateFingerprint({ source: contents }),
    ) ||
      isGetDatabaseConnectionImporter({ source: contents }))
  )
    return; // bad practice detected
  throw new Error(
    'does not match bad practice: no shipped getDatabaseConnection test, and no import of the retired module',
  );
};

export const fix: FileFixFunction = (contents) => {
  if (contents === null) return { contents };

  // delete the shipped duplicate
  const fingerprint = asTemplateFingerprint({ source: contents });
  if (OLD_TEST_TEMPLATE_FINGERPRINTS.includes(fingerprint))
    return { contents: null };

  // keep an edited copy, repointed onto the new factory
  return { contents: withGetDatabaseConnectionRepointed({ source: contents }) };
};
