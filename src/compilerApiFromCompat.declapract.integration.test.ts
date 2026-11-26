import fs from 'node:fs';
import path from 'node:path';

import type { FileCheckContext } from 'declapract';
import { given, then } from 'test-fns';

import { check as checkCompilerApiFromTypescript } from './practices/typescript-node/bad-practices/compiler-api-from-typescript/src/**/*.ts.declapract';
import { getAllPathsUnderDir, PRACTICE_TREE_SKIP_DIRS } from './utils/getAllPathsUnderDir';

const context = {} as FileCheckContext; // the check reads only the contents

/**
 * .what = true when the shipped `compiler-api-from-typescript` check flags the source.
 * .why  = the clamp grades this repo by the same parser-based check adopters receive, so a mention in
 *   a string or comment never counts; only the check's own "not detected" signal clears a source.
 */
const isCompilerApiLoadedFromTypescript = (input: { source: string }): boolean => {
  try {
    checkCompilerApiFromTypescript(input.source, context);
    return true; // the check returns when the bad practice is detected
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('does not match bad practice')) return false;
    throw error;
  }
};

/**
 * .what = clamps that no module here reads the compiler api from the `typescript` package.
 * .why  = a declaration runs inside the adopter's repo, so `import 'typescript'` loads the adopter's
 *   compiler. at typescript 7 that package exports only `{ version, versionMajorMinor }`, so an ast-based
 *   check would throw, and declapract reads a thrown bad-practice check as "not detected": the
 *   check goes quiet. `@typescript/typescript6` carries the classic api apart from the adopter's tsc.
 */
describe('compiler api source', () => {
  const SRC = __dirname;

  given('[case1] every typescript module under src/', () => {
    // the walk returns a symlinked dir as a plain path, so the .ts filter drops it; a `.test` dir holds
    // fixture consumer repos, which import `typescript` on purpose, and never ships
    // read each module once; every predicate below is pure over the captured source
    const sources = getAllPathsUnderDir({ dir: SRC, skip: PRACTICE_TREE_SKIP_DIRS })
      .filter((file) => file.endsWith('.ts'))
      .map((file) => ({ file, source: fs.readFileSync(file, 'utf-8') }));

    then('none imports the compiler api from the typescript package, per the shipped check', () => {
      const offenders = sources.filter(({ source }) => isCompilerApiLoadedFromTypescript({ source }));
      expect(offenders.map(({ file }) => path.relative(SRC, file))).toEqual([]);
    });

    then('the scan reaches the ast readers, so the clamp above cannot pass on an empty walk', () => {
      const readers = sources.filter(({ source }) => source.includes(`from '@typescript/typescript6'`));
      expect(readers).not.toEqual([]);
    });
  });

  given('[case2] the package manifest', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(SRC, '..', 'package.json'), 'utf-8'));

    then('the compat package is a runtime dependency, so it installs in every adopter', () => {
      // the version is package.json's own claim; the invariant is the section it sits in
      expect(pkg.dependencies['@typescript/typescript6']).toMatch(/^\d+\.\d+\.\d+$/);
      expect(pkg.devDependencies?.['@typescript/typescript6']).toBeUndefined();
    });
  });
});
