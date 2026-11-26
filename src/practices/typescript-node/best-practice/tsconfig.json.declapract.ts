import { FileCheckType, type FileFixFunction } from 'declapract';
import { MalfunctionError } from 'helpful-errors';

import { asJsoncParsed } from '../../../utils/asJsoncParsed';
import {
  asJsonMergedDeep,
  type JsonArrayUnionRule,
} from '../../../utils/asJsonMergedDeep';
import { asTsconfigWithTs7OptionsRemoved } from '../../../utils/asTsconfigWithTs7OptionsRemoved';

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
 * .note = it first removes the options typescript 7 removed, as the bad-practice
 *         `tsconfig-options-removed-in-ts7` does: a merge over a kept `baseUrl` would union the
 *         template's `paths` beside the adopter's ones that resolved against it. so the file converges
 *         in either fix order
 */
export const fix: FileFixFunction = (contents, context) => {
  const declaredContents = context.declaredFileContents;
  if (declaredContents === null || declaredContents === undefined)
    throw new MalfunctionError(
      'typescript-node tsconfig.json fix ran with no declared template',
      { relativeFilePath: context.relativeFilePath },
    );
  if (!contents) return { contents: declaredContents };

  // remove the options typescript 7 removed before the merge, so the merge never reads them
  const cleared = asTsconfigWithTs7OptionsRemoved({ contents });
  const found = asJsoncParsed({ contents: cleared });
  const merged = asJsonMergedDeep({
    declared: asJsoncParsed({ contents: declaredContents }),
    found,
    path: [],
    isLeafKept: () => false,
    isArrayUnioned: isTsconfigArrayUnioned,
  });

  // a tsconfig the merge would not change keeps its cleared bytes, comments and all, so a fix converges
  if (JSON.stringify(merged) === JSON.stringify(found))
    return { contents: cleared };
  return { contents: JSON.stringify(merged, null, 2) };
};
