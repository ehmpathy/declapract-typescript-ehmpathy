import { FileCheckType, type FileFixFunction } from 'declapract';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';

// check that the file contains the core structure
export const check = FileCheckType.CONTAINS;

/**
 * .what = replaces target file with expected content
 * .why = ensures the skill file matches the best-practice version
 */
export const fix: FileFixFunction = () => {
  const expectedContent = readFileSync(
    join(dirname(__filename), 'use.apikeys.sh'),
    'utf-8',
  );
  return { contents: expectedContent };
};
