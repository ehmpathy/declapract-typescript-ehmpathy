import { FileCheckType, type FileContentsFunction } from 'declapract';

import { readFile } from '../../../utils/readFile';

/**
 * .what = declare the node package.json, with the artifact-build clause included only when the
 *         `artifact` practice is in play for the project.
 * .why  = the node build chains ` && npm run build:artifact` onto its build; a project WITHOUT the
 *         `artifact` practice has no such artifact to build, so the clause would break its build.
 *         a branch on `context.projectPractices` lets one practice serve both (rule.avoid.runtime-forks).
 */
export const contents: FileContentsFunction = async (context) => {
  // grab the superset of best practices content
  const contentsSuperset = await readFile(`${__dirname}/package.json`);

  // remove the artifact-build clause when the artifact practice is absent — immutable const, no reassign
  const contents = context.projectPractices.includes('artifact')
    ? contentsSuperset
    : contentsSuperset.replace(` && npm run build:artifact`, '');

  // return the narrowed contents
  return contents;
};

export const check = FileCheckType.CONTAINS;
