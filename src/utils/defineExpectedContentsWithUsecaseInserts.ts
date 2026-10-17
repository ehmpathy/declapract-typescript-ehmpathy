import { MalfunctionError } from 'helpful-errors';

/**
 * .what = one usecase-conditional insert: `text` lands right after the first `after` anchor
 */
export interface UsecaseInsert {
  after: string;
  text: string;
}

/**
 * .what = the contents a usecase-aware best-practice expects: the declared base, plus a set of
 *         inserts when the usecase is in scope, unioned with the inserts the file already holds
 * .why  = one owner per file (#630) means a second practice that needs a few lines in a file must
 *         ride on the owner, not redeclare the file. an EQUALS owner cannot carry that delta, and a
 *         usecase-aware EQUALS strips it under a narrow `--practice` scope (projectPractices goes
 *         dark). so this is a findsert: the base must equal the declared template once the known
 *         inserts are stripped, the inserts are added when the usecase is in scope, and inserts
 *         already present are always kept — so no scope can strip them
 *         (rule.avoid.runtime-forks).
 * .note = a fixed point by construction: its output strips back to the declared base and holds
 *         every insert, so a second pass returns it unchanged.
 */
export const defineExpectedContentsWithUsecaseInserts = (input: {
  contents: string | null;
  declared: string;
  inserts: UsecaseInsert[];
  usecaseInScope: boolean;
}): string => {
  const contents = input.contents;

  // keep the file when its base (the inserts stripped) matches the declared one; else rewrite
  const start =
    contents !== null &&
    input.inserts.reduce(
      (text, insert) => text.split(insert.text).join(''),
      contents,
    ) === input.declared
      ? contents
      : input.declared;

  // inserts are owed when the usecase is in scope, or when the file already carries any of them
  const carried =
    contents !== null &&
    input.inserts.some((insert) => contents.includes(insert.text));
  if (!input.usecaseInScope && !carried) return start;

  // add each absent insert right after its anchor
  return input.inserts.reduce((text, insert) => {
    if (text.includes(insert.text)) return text;
    const at = text.indexOf(insert.after);
    if (at < 0)
      throw new MalfunctionError(
        'usecase insert anchor not found in the declared template; the template drifted from its insert',
        { anchor: insert.after },
      );
    const end = at + insert.after.length;
    return `${text.slice(0, end)}${insert.text}${text.slice(end)}`;
  }, start);
};
