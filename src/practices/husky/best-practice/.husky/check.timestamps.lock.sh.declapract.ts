import type { FileContentsFunction } from 'declapract';
import { FileCheckType } from 'declapract';

import { createHash } from 'node:crypto';
import { readFile } from '../../../../utils/readFile';

/**
 * .what = the git blob id of some file contents, as `git hash-object` computes it
 * .why  = the lock hook compares blob ids with plain git, so no sha256 tool must exist on the host
 */
export const asGitBlobId = (input: { contents: string }): string =>
  createHash('sha1')
    .update(`blob ${Buffer.byteLength(input.contents)}\0`)
    .update(input.contents)
    .digest('hex');

/**
 * .what = declare the timestamp lock hook, stamped with the blob id of the declared timestamp hook
 * .why  = the lock id is derived from the hook template at apply time, so the two can never drift;
 *         a practice upgrade rewrites both at once, and any hand edit to the hook halts the commit
 */
export const contents: FileContentsFunction = async () => {
  // read the declared timestamp hook and the lock template
  const hook = await readFile({ filePath: `${__dirname}/check.timestamps.sh` });
  const lock = await readFile({
    filePath: `${__dirname}/check.timestamps.lock.sh`,
  });

  // stamp the hook's blob id into the lock
  return lock.replace('__EXPECTED_BLOB__', asGitBlobId({ contents: hook }));
};

/**
 * the lock is a whole-file template with no usecase branch, so exact match is scope-safe
 */
export const check = FileCheckType.EQUALS;
