import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { getAllPathsUnderDir } from './getAllPathsUnderDir';

const CODE_FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const WALK_SKIP_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage'];

/**
 * .what = whether any code file under the named dirs of a repo imports (or requires) a package.
 * .why  = a fix must never remove a dependency while a live import of it remains — that leaves
 *         a tree that does not build (#642, #643, #663). this scan is the gate such a fix consults.
 * .note = matches a static import, a side-effect import, a `require(…)`, and a dynamic `import(…)`
 *         of the package or any of its subpaths. a dir absent from the repo is skipped.
 */
export const isPackageImportedInRepo = (input: {
  projectRoot: string;
  packageName: string;
  dirs: string[];
}): boolean => {
  // the escaped name, so a scope `@` or a `.` reads literally
  const escaped = input.packageName.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const importPattern = new RegExp(
    `(?:\\bfrom\\s+|\\bimport\\s+|\\brequire\\(\\s*|\\bimport\\(\\s*)['"]${escaped}(?:/[^'"]*)?['"]`,
  );

  // every code file under each named dir that exists
  const codeFiles = input.dirs
    .map((dir) => path.join(input.projectRoot, dir))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => getAllPathsUnderDir({ dir, skip: WALK_SKIP_DIRS }))
    .filter((file) =>
      CODE_FILE_EXTENSIONS.some((extension) => file.endsWith(extension)),
    );

  return codeFiles.some((file) =>
    importPattern.test(readFileSync(file, 'utf-8')),
  );
};
