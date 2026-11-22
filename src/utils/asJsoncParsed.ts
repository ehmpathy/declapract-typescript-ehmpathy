import { ConstraintError } from 'helpful-errors';

import { asTextSpliced } from './asTextSpliced';
import { asJsoncView } from './asJsoncView';

/**
 * .what = the value a jsonc text holds: comments blanked, each comma before a close dropped, then JSON.parse.
 * .why  = a tsconfig template and an adopter tsconfig both carry comments and a last-entry comma, and
 *         JSON.parse rejects each; this reads them with no json5 dependency.
 * .note = the commas are found on the view's `shape`, so a `,]` inside a string is never cut.
 */
export const asJsoncParsed = (input: { contents: string }): unknown => {
  const view = asJsoncView({ contents: input.contents });
  const commasBeforeClose = [...view.shape.matchAll(/,(?=\s*[}\]])/g)].map(
    (comma) => ({
      start: comma.index ?? 0,
      end: (comma.index ?? 0) + 1,
      text: '',
    }),
  );
  const json = asTextSpliced({ contents: view.text, splices: commasBeforeClose });
  try {
    return JSON.parse(json);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new ConstraintError('jsonc contents do not parse', {
      reason: error.message,
      head: input.contents.slice(0, 120),
      hint: 'fix the json syntax at the reported position, then re-run',
    });
  }
};
