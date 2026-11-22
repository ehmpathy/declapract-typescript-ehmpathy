/**
 * .what = two copies of a jsonc text, each the same length as the original, so one offset maps all three.
 *         `text` has each comment swapped for spaces (newlines kept); `shape` also masks each `{ } [ ]`
 *         inside a string, so brace and bracket bounds read the structure alone.
 */
export interface JsoncView {
  text: string;
  shape: string;
}

/**
 * .what = a json string, escapes included; or a jsonc line or block comment.
 * .why  = strings match first, so a `//` inside one is never read as a comment.
 */
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff); // the utf-8 bom some editors save at the head
const JSONC_STRING = /"(?:[^"\\\n]|\\.)*"/g;
const JSONC_STRING_OR_COMMENT =
  /("(?:[^"\\\n]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/g;

/**
 * .what = the comment-blanked and structure-masked copies of a jsonc text.
 * .why  = a tsconfig is jsonc; a JSON.parse round-trip would drop the comments an adopter wrote, a regex
 *         on the raw text would match a commented-out `// "baseUrl": "."`, and a value such as
 *         `"./app/[id]/*"` would end its array early. lookups run on these copies, values read from
 *         `text`, and edits splice the raw contents at the same offsets.
 * .note = one tokenizer, in utf-16 offsets like every other string index, so a comment that holds an
 *         emoji keeps its length and cannot shift a later splice.
 */
export const asJsoncView = (input: { contents: string }): JsoncView => {
  // a byte order mark at the head reads as one space, so JSON.parse accepts it and every offset holds
  const text = input.contents
    .replace(new RegExp(`^${BYTE_ORDER_MARK}`), ' ')
    .replace(
      JSONC_STRING_OR_COMMENT,
      (token, string?: string) => string ?? token.replace(/[^\n]/g, ' '),
    );
  const shape = text.replace(JSONC_STRING, (string) =>
    string.replace(/[{}[\]]/g, '_'),
  );
  return { text, shape };
};
