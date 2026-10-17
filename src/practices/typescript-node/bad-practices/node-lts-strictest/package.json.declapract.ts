import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { asPackageJSON } from '../../../../utils/asPackageJSON';

const PRACTICE = 'typescript-node/node-lts-strictest';

const RETIRED_TSCONFIG = '@tsconfig/node-lts-strictest';

/**
 * .what = whether any root tsconfig*.json still extends the retired tsconfig base.
 * .why  = the package must stay while a tsconfig extends it, or tsc cannot load the config (F42).
 */
const isRetiredTsconfigExtended = (input: {
  projectRoot: string | null;
}): boolean => {
  const root = input.projectRoot;
  if (!root || !existsSync(root)) return false;
  return readdirSync(root)
    .filter((name) => /^tsconfig.*\.json$/.test(name))
    .some((name) =>
      readFileSync(path.join(root, name), 'utf-8').includes(RETIRED_TSCONFIG),
    );
};

/**
 * .what = whether a package.json declares the retired tsconfig base, in either section.
 */
const isRetiredTsconfigDeclared = (input: {
  contents: string | null;
}): boolean => {
  const pkg = asPackageJSON(
    { contents: input.contents ?? '{}' },
    { practice: PRACTICE },
  );
  return !!(
    pkg.dependencies?.[RETIRED_TSCONFIG] ??
    pkg.devDependencies?.[RETIRED_TSCONFIG]
  );
};

/**
 * .what = flags `@tsconfig/node-lts-strictest` once no tsconfig extends it.
 * .why  = the typescript-node practice swapped it for `@tsconfig/strictest` + `@tsconfig/node20`
 *         and left the old package in devDependencies, which depcheck then flags (#660).
 */
export const check: FileCheckFunction = (contents, context) => {
  if (
    isRetiredTsconfigDeclared({ contents }) &&
    !isRetiredTsconfigExtended({
      projectRoot: context?.getProjectRootDirectory?.() ?? null,
    })
  )
    return; // bad practice detected
  throw new Error(
    `does not match bad practice: ${RETIRED_TSCONFIG} absent, or a tsconfig still extends it`,
  );
};

/**
 * .what = removes the retired tsconfig base from both dep sections.
 */
export const fix: FileFixFunction = (contents, context) => {
  if (
    !contents ||
    isRetiredTsconfigExtended({
      projectRoot: context?.getProjectRootDirectory?.() ?? null,
    })
  )
    return { contents };
  const pkg = asPackageJSON({ contents }, { practice: PRACTICE });
  const without = (deps: Record<string, string> | undefined) =>
    deps
      ? Object.fromEntries(
          Object.entries(deps).filter(([name]) => name !== RETIRED_TSCONFIG),
        )
      : undefined;
  return {
    contents: JSON.stringify(
      {
        ...pkg,
        dependencies: without(pkg.dependencies),
        devDependencies: without(pkg.devDependencies),
      },
      null,
      2,
    ),
  };
};
