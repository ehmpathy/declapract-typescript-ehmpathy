import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';

// simple-leveled-log-methods is a RUNTIME log library, so a repo may list it under EITHER
// `dependencies` or `devDependencies`. the old declaration was a `CONTAINS` template pinned to
// `devDependencies` (and a fix that removed it only from there), so it was blind to the
// `dependencies` placement — the bad practice silently never fired for a repo that had the dep at
// runtime. `checkContainsJSON` is path-sensitive, so a CONTAINS template can only ever see one
// section. this is a FileCheckFunction that inspects both, and the fix removes it from both.
const DEPRECATED_DEP = 'simple-leveled-log-methods';
const PRACTICE = 'logs/leveled-term';

export const check: FileCheckFunction = (contents) => {
  if (!contents)
    throw new Error(
      `does not match bad practice: [${PRACTICE}] package.json has no contents to scan for '${DEPRECATED_DEP}'`,
    );

  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  const inProd = Boolean(packageJSON.dependencies?.[DEPRECATED_DEP]);
  const inDev = Boolean(packageJSON.devDependencies?.[DEPRECATED_DEP]);

  if (inProd || inDev) return; // detected — the deprecated dep is present in some section
  // no violation — the deprecated dep is absent from both dependencies + devDependencies
  throw new Error(
    `does not match bad practice: '${DEPRECATED_DEP}' absent from dependencies|devDependencies`,
  );
};

/**
 * .what = return the package.json without `simple-leveled-log-methods` in either dep section,
 *         each section's PRESENCE preserved byte-for-byte.
 * .why  = names the removal as one pure intent, so `fix` reads what-not-how rather than an inline
 *         spread-then-delete a reader must simulate (`rule.require.named-transformers`), to match
 *         the peer rhachet/prod-deps `withRhachetDepsMovedToDevDeps` pure-op discipline. pure over a
 *         fresh clone, so it is independently testable.
 * .note = a section the consumer declared (even as an empty `{}`) stays; a section it never had is
 *         not added. re-spread over `...packageJSON` keeps each key in its original position.
 */
const withoutDeprecatedDep = (input: {
  packageJSON: Record<string, any>;
}): Record<string, any> => {
  const dependencies = { ...input.packageJSON.dependencies };
  const devDependencies = { ...input.packageJSON.devDependencies };
  delete dependencies[DEPRECATED_DEP];
  delete devDependencies[DEPRECATED_DEP];
  return {
    ...input.packageJSON,
    ...('dependencies' in input.packageJSON ? { dependencies } : {}),
    ...('devDependencies' in input.packageJSON ? { devDependencies } : {}),
  };
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  return {
    contents: JSON.stringify(withoutDeprecatedDep({ packageJSON }), null, 2),
  };
};
