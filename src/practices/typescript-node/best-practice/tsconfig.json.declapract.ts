import { FileCheckType, type FileFixFunction } from 'declapract';
import { MalfunctionError } from 'helpful-errors';

import { asJsoncParsed } from '../../../utils/asJsoncParsed';
import {
  asJsonMergedDeep,
  type JsonArrayUnionRule,
} from '../../../utils/asJsonMergedDeep';
import { asTsconfigWithTs7OptionsFolded } from '../../../utils/asTsconfigWithTs7OptionsFolded';

export const check = FileCheckType.CONTAINS;

/**
 * .what = every tsconfig array unions with the adopter's, save `extends`.
 * .why  = `include`, `exclude`, `types`, and each `paths` value list entries an adopter extends (an
 *         extra exclude, a `vitest/globals` type, a second alias target), so each found-only entry
 *         stays after the declared ones. `extends` is an ordered override chain: a later base wins,
 *         so an adopter's prior base kept after the template's would override it; it is swapped whole.
 */
const isTsconfigArrayUnioned: JsonArrayUnionRule = (input) =>
  input.path.join('.') !== 'extends';

/**
 * .what = the declared tsconfig merged into the found one, key by key, each array unioned save `extends`.
 * .why  = the default contains-fix swaps every declared array whole, so an adopter's own entries
 *         vanished on any apply; the contains-check reads only the declared indices, so a union that
 *         leads with the declared entries passes it. declared leaves win; found-only keys stay, in
 *         found order, then the keys found lacked.
 * .note = with no tsconfig, the template lands verbatim, its comments kept, as the default fix writes
 *         it; a merge that changes aught writes `JSON.stringify(…, null, 2)`, as the default fix does;
 *         a merge that changes naught leaves the file as written.
 * .note = it folds the options typescript 7 removed first, the same fold the bad-practice
 *         `tsconfig-options-removed-in-ts7` runs: a merge over an unfolded `baseUrl` would add the
 *         template's `./src/*` beside the adopter's bare `src/*`, and a later fold would rebase the
 *         template's value onto a nested `baseUrl` too. so the file converges in either fix order
 */
export const fix: FileFixFunction = (contents, context) => {
  const declaredContents = context.declaredFileContents;
  if (declaredContents === null || declaredContents === undefined)
    throw new MalfunctionError(
      'typescript-node tsconfig.json fix ran with no declared template',
      { relativeFilePath: context.relativeFilePath },
    );
  if (!contents) return { contents: declaredContents };

  // fold the removed options before the merge, so the merge never reads a stale baseUrl
  const folded = asTsconfigWithTs7OptionsFolded({
    contents,
    root: context.getProjectRootDirectory(),
  });
  const found = asJsoncParsed({ contents: folded });
  const merged = asJsonMergedDeep({
    declared: asJsoncParsed({ contents: declaredContents }),
    found,
    path: [],
    isLeafKept: () => false,
    isArrayUnioned: isTsconfigArrayUnioned,
  });

  // a tsconfig the merge would not change keeps its folded bytes, comments and all, so a fix converges
  if (JSON.stringify(merged) === JSON.stringify(found))
    return { contents: folded };
  return { contents: JSON.stringify(merged, null, 2) };
};
