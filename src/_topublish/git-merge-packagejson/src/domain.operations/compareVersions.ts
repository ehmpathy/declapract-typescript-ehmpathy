import * as semver from 'semver';

import { stripVersionQualifier } from './stripVersionQualifier';

/**
 * .what = compare two version strings via semver rules
 * .why = determine which version is higher per semver spec
 */
export const compareVersions = (input: {
  versionA: string;
  versionB: string;
}): 'a-higher' | 'b-higher' | 'equal' | 'incomparable' => {
  const { versionA, versionB } = input;

  // strip qualifiers for comparison
  const strippedA = stripVersionQualifier({ version: versionA });
  const strippedB = stripVersionQualifier({ version: versionB });

  // parse as semver
  const parsedA = semver.parse(strippedA.base);
  const parsedB = semver.parse(strippedB.base);

  // if either is not valid semver, they are incomparable
  if (!parsedA || !parsedB) {
    return 'incomparable';
  }

  // compare via semver
  const comparison = semver.compare(parsedA, parsedB);

  if (comparison > 0) {
    return 'a-higher';
  }
  if (comparison < 0) {
    return 'b-higher';
  }
  return 'equal';
};
