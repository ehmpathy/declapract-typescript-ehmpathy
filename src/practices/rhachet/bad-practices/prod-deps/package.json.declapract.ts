import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';

/**
 * .what = detects rhachet and any rhachet-<family>-* package in production dependencies
 * .why = these packages should be devDependencies or peerDependencies, never direct prod deps
 */

// the family segment is a char class `[a-z]+`, so it catches every rhachet family — not just
// `-roles-` but `-brains-` too — while it still excludes a single-segment `rhachet-*` (which
// lacks the second dash). a `-brains-` package missed here stays a prod dep, and if it is also
// a devDep with a different version the manifest carries a duplicate whose two versions conflict.
const rhachetPackagePattern = /^rhachet(-[a-z]+-.*)?$/;
const PRACTICE = 'rhachet/prod-deps';

export const check: FileCheckFunction = (contents) => {
  if (!contents)
    throw new Error(
      `does not match bad practice: [${PRACTICE}] package.json has no contents to scan for a rhachet(-<family>-*) prod dep`,
    );

  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  const prodDeps = Object.keys(packageJSON.dependencies ?? {});

  // check if any rhachet package is in prod dependencies
  const rhachetInProdDeps = prodDeps.some((dep) =>
    rhachetPackagePattern.test(dep),
  );

  if (rhachetInProdDeps) return; // matches bad practice
  // no violation — no rhachet(-<family>-*) package sits in dependencies
  throw new Error(
    'does not match bad practice: no rhachet(-<family>-*) package in dependencies',
  );
};

/**
 * .what = relocate every rhachet(-<family>-*) package from prod deps into dev deps by a pure
 *         partition, then return the two updated maps (inputs untouched, no in-place mutation).
 * .why  = names the relocation as one intent so `fix` reads what-not-how; the body partitions prod
 *         deps into relocated (rhachet) + retained (the rest) rather than a mutate-in-place loop a
 *         reader must simulate (`rule.forbid.inline-decode-friction`, immutability clause).
 */
const withRhachetDepsMovedToDevDeps = (input: {
  prodDeps: Record<string, string>;
  devDeps: Record<string, string>;
}): { prodDeps: Record<string, string>; devDeps: Record<string, string> } => {
  const prodEntries = Object.entries(input.prodDeps);
  // partition: rhachet packages relocate into dev deps; every other prod dep is retained as-is
  const relocated = prodEntries.filter(([dep]) =>
    rhachetPackagePattern.test(dep),
  );
  const retained = prodEntries.filter(
    ([dep]) => !rhachetPackagePattern.test(dep),
  );
  return {
    prodDeps: Object.fromEntries(retained),
    // a relocated rhachet dep wins over any prior devDeps entry of the same name (the prod version)
    devDeps: { ...input.devDeps, ...Object.fromEntries(relocated) },
  };
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });

  // relocate every rhachet package from prod deps into dev deps
  const { prodDeps, devDeps } = withRhachetDepsMovedToDevDeps({
    prodDeps: { ...packageJSON.dependencies },
    devDeps: { ...packageJSON.devDependencies },
  });

  // preserve each section's PRESENCE byte-for-byte: a section the consumer declared
  // (even as an explicit empty `{}`) stays; a section it never had is added only when
  // the move lands a package into it. this mirrors the leveled-term twin, so an
  // already-clean manifest is a true no-op rather than a shape mutation.
  const fixedPackageJSON = {
    ...packageJSON,
    ...('dependencies' in packageJSON ? { dependencies: prodDeps } : {}),
    ...('devDependencies' in packageJSON || Object.keys(devDeps).length > 0
      ? { devDependencies: devDeps }
      : {}),
  };

  return { contents: JSON.stringify(fixedPackageJSON, null, 2) };
};
