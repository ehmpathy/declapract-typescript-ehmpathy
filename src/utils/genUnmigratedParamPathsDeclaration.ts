import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { isJsonObject } from './asJsonMergedDeep';
import { readFile } from './readFile';

const EXPLICIT_PARAM_PREFIX = '$.at(aws::param/';
export const UNMIGRATED_PARAM_PATHS_MARKER_KEY = '@declapract:review';
export const UNMIGRATED_PARAM_PATHS_MARKER =
  'explicit aws::param paths: copy each value to the derived name /{org}/{project}/{config}/{keyPath}, then swap the explicit path for the bare placeholder (declapract-typescript-ehmpathy#544, see provision/aws/readme.md)';

const CONFIG_FILES = ['config/test.json', 'config/prep.json', 'config/prod.json'];

/**
 * .what = whether any of the repo's config/{test,prep,prod}.json holds an explicit param path
 * .why  = all three carry the marker together, so config's divergent-config-shapes check never
 *         sees one file with a key the others lack
 */
const isExplicitParamPathFoundInAnyConfig = async (input: {
  root: string;
}): Promise<boolean> => {
  const found = await Promise.all(
    CONFIG_FILES.map((file) =>
      readFile({ filePath: `${input.root}/${file}` }).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return ''; // an absent config holds no path
          throw error;
        },
      ),
    ),
  );
  return found.some((contents) => contents.includes(EXPLICIT_PARAM_PREFIX));
};

/**
 * .what = the declaration (check, fix) of the `unmigrated-param-paths` bad-practice, for one
 *         config/{env}.json
 * .why  = an explicit `$.at(aws::param/…)` path cannot auto-flip to the bare placeholder: the bare
 *         form derives a param name that holds no value until someone copies it there. so the fix
 *         stamps a top-level review key that names the copy step, and leaves every path as is.
 *         zod's object schema strips the unknown key on parse, so getConfig is unaffected.
 */
export const genUnmigratedParamPathsDeclaration = (): {
  check: FileCheckFunction;
  fix: FileFixFunction;
} => {
  const check: FileCheckFunction = async (contents, context) => {
    if (!contents) throw new Error('config file is absent');
    const parsed: unknown = JSON.parse(contents);
    if (isJsonObject(parsed) && UNMIGRATED_PARAM_PATHS_MARKER_KEY in parsed)
      throw new Error('already marked');
    const isFound = await isExplicitParamPathFoundInAnyConfig({
      root: context.getProjectRootDirectory(),
    });
    if (isFound) return; // an explicit param path, unmarked → bad practice
    throw new Error('no explicit param path');
  };

  const fix: FileFixFunction = (contents) => {
    if (!contents) return {};
    const parsed: unknown = JSON.parse(contents);
    if (!isJsonObject(parsed)) return { contents };
    const marked = {
      [UNMIGRATED_PARAM_PATHS_MARKER_KEY]: UNMIGRATED_PARAM_PATHS_MARKER,
      ...parsed,
    };
    return { contents: `${JSON.stringify(marked, null, 2)}\n` };
  };

  return { check, fix };
};
