import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';
import { isPackageImportedInRepo } from '../../../../utils/isPackageImportedInRepo';

const PRACTICE = 'cache/unfloored-cache-member';

/**
 * .what = every cache family member the `cache` best-practice declares a floor for.
 * .why  = `.ifInstalled()` reads an absent floor as "not used", so a member with no floor sits
 *         below any version unseen (#625). this list is the declared set; a test asserts it equals
 *         the floors in `best-practice/package.json`, so the two cannot drift apart.
 */
export const CACHE_FAMILY_MEMBERS_FLOORED = [
  'simple-in-memory-cache',
  'simple-localstorage-cache',
  'simple-on-disk-cache',
  'with-domain-driven-cache',
  'with-domain-driven-caching',
  'with-simple-cache',
] as const;

/**
 * .what = retired cache family members, each mapped to the member that replaced it.
 */
const CACHE_FAMILY_MEMBERS_RETIRED: Record<
  string,
  { into: string; version: string }
> = {
  'with-simple-caching': { into: 'with-simple-cache', version: '0.17.3' },
};

/**
 * .what = the shape of a cache family package name.
 * .why  = a member the floors do not name is the gap #625 reports; this shape is how `plan` sees
 *         a member the declaration never listed, so the next family member cannot slip past.
 */
const CACHE_FAMILY_PATTERN =
  /^(?:simple-[a-z0-9-]+-cache|with-(?:simple|domain-driven)-cach(?:e|ing))$/;

const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies'] as const;

/**
 * .what = whether src still imports a package.
 */
const isImportedInSrc = (input: {
  packageName: string;
  projectRoot: string | null;
}): boolean =>
  !!input.projectRoot &&
  isPackageImportedInRepo({
    projectRoot: input.projectRoot,
    packageName: input.packageName,
    dirs: ['src'],
  });

/**
 * .what = the cache family members a package.json declares that hold no floor.
 * .note = a retired member that src still imports is left out: it cannot move until the import
 *         moves, and the `src/**` half of this bad-practice stamps that import with the move.
 */
const getCacheMembersUnfloored = (input: {
  packageJSON: Record<string, any>;
  projectRoot: string | null;
}): string[] =>
  DEPENDENCY_SECTIONS.flatMap((section) =>
    Object.keys(input.packageJSON[section] ?? {}),
  )
    .filter((name) => CACHE_FAMILY_PATTERN.test(name))
    .filter(
      (name) =>
        !(CACHE_FAMILY_MEMBERS_FLOORED as readonly string[]).includes(name),
    )
    .filter(
      (name) =>
        !CACHE_FAMILY_MEMBERS_RETIRED[name] ||
        !isImportedInSrc({
          packageName: name,
          projectRoot: input.projectRoot,
        }),
    );

/**
 * .what = one dependency section, with each retired member moved to the member that replaced it.
 * .note = an extant replacement version is the adopter's choice and is kept.
 */
const asSectionWithRetiredMoved = (input: {
  section: Record<string, string | undefined>;
  retired: string[];
}): Record<string, string | undefined> =>
  input.retired.reduce((deps, name) => {
    if (!deps[name]) return deps;
    const replacement = CACHE_FAMILY_MEMBERS_RETIRED[name]!;
    return {
      ...deps,
      [name]: undefined, // undefined drops the key from the written json
      [replacement.into]: deps[replacement.into] ?? replacement.version,
    };
  }, input.section);

/**
 * .what = flags a package.json that declares a cache family member with no floor.
 * .why  = so `plan` names the member, rather than read its absence as a pass (#625).
 */
export const check: FileCheckFunction = (contents, context) => {
  const unfloored = getCacheMembersUnfloored({
    packageJSON: asPackageJSON(
      { contents: contents ?? '{}' },
      { practice: PRACTICE },
    ),
    projectRoot: context?.getProjectRootDirectory?.() ?? null,
  });
  if (unfloored.length) return; // bad practice detected
  throw new Error(
    'does not match bad practice: every cache family member holds a floor',
  );
};

/**
 * .what = moves each retired member to the member that replaced it, in its own section.
 * .note = a member this practice does not know is left in place for a human to floor here; `plan`
 *         keeps it named until then.
 */
export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents };
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  const unfloored = getCacheMembersUnfloored({
    packageJSON,
    projectRoot: context?.getProjectRootDirectory?.() ?? null,
  });
  const retired = unfloored.filter(
    (name) => CACHE_FAMILY_MEMBERS_RETIRED[name],
  );
  if (!retired.length) return { contents };

  // move each retired member within each section that declares one
  const updatedPackageJSON = DEPENDENCY_SECTIONS.reduce(
    (current, section) =>
      current[section]
        ? {
            ...current,
            [section]: asSectionWithRetiredMoved({
              section: current[section],
              retired,
            }),
          }
        : current,
    packageJSON,
  );
  return { contents: JSON.stringify(updatedPackageJSON, null, 2) };
};
