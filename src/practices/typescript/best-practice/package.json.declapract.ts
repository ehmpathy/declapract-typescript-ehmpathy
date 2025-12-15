import { FileCheckType, type FileContentsFunction } from 'declapract';

import { readFile } from '../../../utils/readFile';

export const contents: FileContentsFunction = async (context) => {
  // grab the superset of best practices content
  const contentsSuperset = await readFile(`${__dirname}/package.json`);

  // remove things that are irrelevant, based on other practices in use in project
  let contents = contentsSuperset;
  if (!context.projectPractices.includes('artifact'))
    contents = contents.replace(` && npm run build:artifact`, '');

  // return the narrowed contents
  return contents;
};

export const check = FileCheckType.CONTAINS;
