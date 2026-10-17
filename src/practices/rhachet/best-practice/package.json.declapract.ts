import { FileCheckType, type FileContentsFunction } from 'declapract';

import { getFileTextOrNull } from '../../../utils/getFileTextOrNull';
import { readFile } from '../../../utils/readFile';

/**
 * .what = whether a package.json declares a `link:.` self-dep (a rhachet roles package)
 * .why  = such a repo links its own roles, and `rhachet init` loads their hooks from `dist/`; any
 *         dep whose value is `link:.` counts, so a self-dep under an alias still keys the build
 */
const hasSelfLinkDep = (input: { packageJson: string }): boolean => {
  const parsed = JSON.parse(input.packageJson) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return [
    ...Object.values(parsed.dependencies ?? {}),
    ...Object.values(parsed.devDependencies ?? {}),
  ].some((version) => version === 'link:.' || version === 'link:./');
};

/**
 * .what = declare the rhachet package.json, with `npm run build && ` before `rhachet init` in a
 *         repo that self-links its own roles (#520)
 * .why  = a `link:.` repo boots its own roles, whose hooks load from the compiled `dist/`; with no
 *         build first, hook discovery fails before jest starts. CONTAINS used to strip a hand-added
 *         build step; a branch on the repo's own package.json keeps it (rule.avoid.runtime-forks)
 */
export const contents: FileContentsFunction = async (context) => {
  // grab the declared package.json
  const declared = await readFile({ filePath: `${__dirname}/package.json` });

  // read the repo's own package.json, if any, to see whether it self-links
  const repoPackageJson = getFileTextOrNull({
    root: context.getProjectRootDirectory(),
    relativePath: 'package.json',
  });
  const isSelfLinked =
    repoPackageJson !== null &&
    hasSelfLinkDep({ packageJson: repoPackageJson });

  // a self-linked repo builds before it inits
  return isSelfLinked
    ? declared.replace(
        '"prepare:rhachet": "rhachet init ',
        '"prepare:rhachet": "npm run build && rhachet init ',
      )
    : declared;
};

export const check = FileCheckType.CONTAINS;
