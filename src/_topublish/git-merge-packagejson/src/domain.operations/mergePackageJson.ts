import { mergeDependencySection } from './mergeDependencySection';
import { parsePackageJson } from './parsePackageJson';

/**
 * dependency sections that we auto-resolve
 */
const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

type DependencySection = (typeof DEPENDENCY_SECTIONS)[number];

/**
 * .what = merge package.json from base, ours, theirs branches
 * .why = auto-resolve dependency version conflicts, preserve non-dep fields as-is
 */
export const mergePackageJson = (input: {
  baseContent: string;
  oursContent: string;
  theirsContent: string;
}): { merged: string; hasConflictsLeft: boolean } => {
  const { baseContent, oursContent, theirsContent } = input;

  // parse all three package.json files
  const base = parsePackageJson({ content: baseContent, branch: 'base' });
  const ours = parsePackageJson({ content: oursContent, branch: 'ours' });
  const theirs = parsePackageJson({ content: theirsContent, branch: 'theirs' });

  // start with ours as the base for the merged result
  const merged: Record<string, unknown> = { ...ours };

  // merge each dependency section
  for (const section of DEPENDENCY_SECTIONS) {
    const baseSection = base[section] as Record<string, string> | undefined;
    const oursSection = ours[section] as Record<string, string> | undefined;
    const theirsSection = theirs[section] as Record<string, string> | undefined;

    // skip if section doesn't exist in any branch
    if (!baseSection && !oursSection && !theirsSection) {
      continue;
    }

    // merge the section
    const mergedSection = mergeDependencySection({
      base: baseSection,
      ours: oursSection,
      theirs: theirsSection,
    });

    // only include section if it has deps
    if (Object.keys(mergedSection).length > 0) {
      merged[section] = mergedSection;
    } else {
      delete merged[section];
    }
  }

  // check for unresolved conflicts in non-dep fields
  // conflict markers look like: <<<<<<< or ======= or >>>>>>>
  const hasConflictsLeft = detectConflictMarkers(oursContent);

  // format as json with 2-space indent
  const mergedJson = JSON.stringify(merged, null, 2) + '\n';

  return { merged: mergedJson, hasConflictsLeft };
};

/**
 * .what = detect git conflict markers in content
 * .why = determine if there are unresolved conflicts in non-dep fields
 */
const detectConflictMarkers = (content: string): boolean => {
  const conflictPattern = /^(<{7}|={7}|>{7})/m;
  return conflictPattern.test(content);
};
