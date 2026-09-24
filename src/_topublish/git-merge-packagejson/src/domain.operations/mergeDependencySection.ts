import { compareVersions } from './compareVersions';
import { detectRemovalIntent } from './detectRemovalIntent';

/**
 * .what = merge a dependency section from base, ours, theirs branches
 * .why = resolve version conflicts via semver rules, union additions, honor removals
 */
export const mergeDependencySection = (input: {
  base: Record<string, string> | undefined;
  ours: Record<string, string> | undefined;
  theirs: Record<string, string> | undefined;
}): Record<string, string> => {
  const { base, ours, theirs } = input;

  // collect all dep names across all branches
  const allDepNames = new Set<string>([
    ...Object.keys(base ?? {}),
    ...Object.keys(ours ?? {}),
    ...Object.keys(theirs ?? {}),
  ]);

  // build merged section
  const merged: Record<string, string> = {};

  for (const depName of allDepNames) {
    // check if removed in either branch
    const removalIntent = detectRemovalIntent({ depName, base, ours, theirs });
    if (removalIntent.removed) {
      // removal wins over update — exclude from merged
      continue;
    }

    // get versions from each branch
    const versionOurs = ours?.[depName];
    const versionTheirs = theirs?.[depName];

    // if only in one branch, use that version
    if (versionOurs && !versionTheirs) {
      merged[depName] = versionOurs;
      continue;
    }
    if (versionTheirs && !versionOurs) {
      merged[depName] = versionTheirs;
      continue;
    }

    // both branches have this dep
    if (versionOurs && versionTheirs) {
      // if equal, use either
      if (versionOurs === versionTheirs) {
        merged[depName] = versionOurs;
        continue;
      }

      // compare and pick higher
      const comparison = compareVersions({
        versionA: versionOurs,
        versionB: versionTheirs,
      });

      if (comparison === 'a-higher') {
        merged[depName] = versionOurs;
      } else if (comparison === 'b-higher') {
        merged[depName] = versionTheirs;
      } else {
        // equal or incomparable — prefer ours as the "current" branch
        merged[depName] = versionOurs;
      }
    }
  }

  return merged;
};
