import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { given, then, when } from 'test-fns';

import { getAllPathsUnderDir } from './utils/getAllPathsUnderDir';

/**
 * .what = clamps that no best-practice template under `src/` reaches a peer `src/` file through a
 *         `../` import; it must use the `@src/` alias (#630).
 * .why  = a template is one file of a tree that several practices write. a `../` import pins the
 *         template to the exact dir depth its author saw, so an adopter who moves the peer (or a
 *         practice that relocates it) breaks the compile. `@src/` names the peer by its place in
 *         the repo, which the shipped tsconfig paths, jest moduleNameMapper, and tsc-alias all map.
 * .teeth = put `import { access } from '../environment';` back into
 *          `config/best-practice/src/utils/config/getConfig.ts` and case1 goes red with that line.
 * .note = an import that leaves `src/` (e.g. `src/.test/*` to a repo-root jest helper) has no
 *         `@src/` form, so it is out of scope.
 */

const practicesDir = join(__dirname, 'practices');

/**
 * .what = every `.ts`/`.tsx` template a practice ships under its best-practice `src/`
 */
const getAllSrcTemplates = (): { practice: string; path: string }[] =>
  readdirSync(practicesDir)
    .map((practice) => ({
      practice,
      dir: join(practicesDir, practice, 'best-practice'),
    }))
    .filter(({ dir }) => existsSync(join(dir, 'src')))
    .flatMap(({ practice, dir }) =>
      getAllPathsUnderDir({ dir: join(dir, 'src'), skip: ['node_modules'] })
        .filter((path) => /\.tsx?$/.test(path))
        .filter((path) => !/\.declapract\.(test\.)?ts$/.test(path))
        .map((path) => ({ practice, path: relative(dir, path) })),
    );

/**
 * .what = the `../` import specifiers in a template that land back inside `src/`
 * .note = path.join collapses the `..` segments, so the joined path names the import's target
 */
const getAllParentImportsInsideSrc = (input: {
  practice: string;
  path: string;
}): string[] => {
  const contents = readFileSync(
    join(practicesDir, input.practice, 'best-practice', input.path),
    'utf8',
  );
  const specifiers = [
    ...contents.matchAll(/from\s+'(\.\.\/[^']*)'/g),
    ...contents.matchAll(/import\(\s*'(\.\.\/[^']*)'\s*\)/g),
  ].map((match) => match[1]!);
  return specifiers.filter((specifier) =>
    join(dirname(input.path), specifier).startsWith('src/'),
  );
};

describe('best-practice src templates import peers via @src/, never ../ (#630)', () => {
  const templates = getAllSrcTemplates();

  given('[case0] the src templates', () => {
    then('at least one is found, so the clamp is not vacuous', () => {
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  given('[case1] every src template', () => {
    when('[t0] its `../` imports are read', () => {
      then('none lands back inside src/', () => {
        const offenders = templates.flatMap((template) =>
          getAllParentImportsInsideSrc(template).map(
            (specifier) =>
              `${template.practice}: ${template.path} ← '${specifier}'`,
          ),
        );
        expect(offenders).toEqual([]);
      });
    });
  });
});
