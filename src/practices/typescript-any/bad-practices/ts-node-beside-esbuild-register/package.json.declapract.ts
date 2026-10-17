import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { asPackageJSON } from '../../../../utils/asPackageJSON';
import { isPackageImportedInRepo } from '../../../../utils/isPackageImportedInRepo';

const PRACTICE = 'typescript-any/ts-node-beside-esbuild-register';

/**
 * .what = whether the repo still needs ts-node.
 * .why  = the tests practice moved the jest config loader to esbuild-register; ts-node stays only
 *         where a file or script still reaches it (F42):
 *         - a script that calls it
 *         - a code file that imports or requires it
 *         - a root jest config with no `@jest-config-loader` pragma (jest loads a .ts config via
 *           ts-node by default)
 */
const isTsNodeStillUsed = (input: {
  scripts: Record<string, string>;
  projectRoot: string | null;
}): boolean => {
  // a package.json command that calls ts-node
  if (
    Object.values(input.scripts).some((command) => /\bts-node\b/.test(command))
  )
    return true;

  // with no repo root to read, keep it
  const root = input.projectRoot;
  if (!root || !existsSync(root)) return true;

  // a code file that imports or requires it
  if (
    isPackageImportedInRepo({
      projectRoot: root,
      packageName: 'ts-node',
      dirs: ['.'],
    })
  )
    return true;

  // a root jest .ts config that jest would load via ts-node
  return readdirSync(root)
    .filter((name) => /^jest\..*\.ts$/.test(name))
    .some(
      (name) =>
        !readFileSync(path.join(root, name), 'utf-8').includes(
          '@jest-config-loader',
        ),
    );
};

interface PackageJsonDeps {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/**
 * .what = whether a package.json holds ts-node beside esbuild-register.
 */
const isTsNodeBesideEsbuildRegister = (input: {
  pkg: PackageJsonDeps;
}): boolean => {
  const all = { ...input.pkg.dependencies, ...input.pkg.devDependencies };
  return !!all['ts-node'] && !!all['esbuild-register'];
};

/**
 * .what = flags ts-node once esbuild-register replaced it and no file still reaches it.
 * .why  = the jest move to @swc/jest + esbuild-register left ts-node installed, which depcheck then
 *         flags (#660).
 */
export const check: FileCheckFunction = (contents, context) => {
  const pkg: PackageJsonDeps = asPackageJSON(
    { contents: contents ?? '{}' },
    { practice: PRACTICE },
  );
  if (
    isTsNodeBesideEsbuildRegister({ pkg }) &&
    !isTsNodeStillUsed({
      scripts: pkg.scripts ?? {},
      projectRoot: context?.getProjectRootDirectory?.() ?? null,
    })
  )
    return; // bad practice detected
  throw new Error(
    'does not match bad practice: no ts-node beside esbuild-register, or ts-node is still used',
  );
};

/**
 * .what = removes ts-node from both dep sections.
 */
export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents };
  const pkg: PackageJsonDeps = asPackageJSON(
    { contents },
    { practice: PRACTICE },
  );
  if (
    !isTsNodeBesideEsbuildRegister({ pkg }) ||
    isTsNodeStillUsed({
      scripts: pkg.scripts ?? {},
      projectRoot: context?.getProjectRootDirectory?.() ?? null,
    })
  )
    return { contents };
  const without = (deps: Record<string, string> | undefined) =>
    deps
      ? Object.fromEntries(
          Object.entries(deps).filter(([name]) => name !== 'ts-node'),
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
