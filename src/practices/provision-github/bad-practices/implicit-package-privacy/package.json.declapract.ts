import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';

const PRACTICE = 'provision-github';

/**
 * .what = the root keys `private` sits after, per package-json-order, in their relative order
 * .why = the fix inserts `private` where package-json-order wants it, so the two practices converge
 */
const KEYS_BEFORE_PRIVATE = ['name', 'author', 'description'];

/**
 * .what = whether a package.json declares its visibility explicitly, as a boolean `private`
 * .why = provision-github derives repo visibility from `private`, and fails closed: only an
 *        explicit `"private": false` makes a repo public. an absent or non-boolean key leaves the
 *        visibility implicit, so the key must always be explicit, in sync with the repo
 */
const isPrivacyExplicit = (input: { pkg: Record<string, unknown> }): boolean =>
  typeof input.pkg.private === 'boolean';

/**
 * .what = the package.json, with `"private": true` set where `private` was not an explicit boolean
 * .note = an extant non-boolean value is replaced in place; an absent key is inserted before
 *         `version`, else after the last of name/author/description, else first. no other key moves
 */
export const asPackageJsonWithPrivacyExplicit = (input: {
  pkg: Record<string, unknown>;
}): Record<string, unknown> => {
  // an explicit boolean is the owner's choice; never touch it
  if (isPrivacyExplicit({ pkg: input.pkg })) return input.pkg;

  // a present, non-boolean value is replaced where it sits
  const keys = Object.keys(input.pkg);
  if (keys.includes('private')) return { ...input.pkg, private: true };
  // an absent key is inserted where package-json-order places it
  const indexVersion = keys.indexOf('version');
  const indexAfterLead = Math.max(
    ...KEYS_BEFORE_PRIVATE.map((key) => keys.indexOf(key)),
  );
  const indexInsert = indexVersion >= 0 ? indexVersion : indexAfterLead + 1;
  const keysOrdered = [
    ...keys.slice(0, indexInsert),
    'private',
    ...keys.slice(indexInsert),
  ];
  return Object.fromEntries(
    keysOrdered.map((key) => [key, key === 'private' ? true : input.pkg[key]]),
  );
};

/**
 * .what = detects a package.json whose `private` is absent or not a boolean
 * .note = bad-practice semantics: return = detected (fix runs); throw = not detected (skip)
 */
export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('no package.json; no privacy to declare');
  const pkg = asPackageJSON({ contents }, { practice: PRACTICE });
  if (isPrivacyExplicit({ pkg }))
    throw new Error('package.json declares private explicitly');
};

/**
 * .what = backfills `"private": true` where visibility is implicit; keeps 2-space json and an
 *         end-of-file newline
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const pkg = asPackageJSON({ contents }, { practice: PRACTICE });
  return {
    contents: `${JSON.stringify(asPackageJsonWithPrivacyExplicit({ pkg }), null, 2)}\n`,
  };
};
