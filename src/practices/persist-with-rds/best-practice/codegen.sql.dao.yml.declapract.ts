import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS; // contains since the user may have exclusions in that "for" object

const DIALECT_LINE = /^dialect: .*$/m;
const LANGUAGE_LINE = /^language: .*$/m;

/**
 * .what = moves the found config onto the declared `dialect` line, and keeps every other line
 * .why = a CONTAINS check has no default fix for a file that exists, so a repo on a stale dialect
 *        (10.7, eight majors behind) could never converge on its own (#664)
 * .note = a second pass finds the declared line already in place, so it changes naught
 */
export const fix: FileFixFunction = (contents, context) => {
  // write the declared config where none exists
  const declared = context.declaredFileContents!;
  if (!contents) return { contents: declared };

  // swap the found dialect line for the declared one
  const dialectDeclared = declared.match(DIALECT_LINE)?.[0];
  if (!dialectDeclared) return { contents };
  if (DIALECT_LINE.test(contents))
    return { contents: contents.replace(DIALECT_LINE, dialectDeclared) };

  // or add it under the language line, where the template declares it
  const languageFound = contents.match(LANGUAGE_LINE)?.[0];
  if (languageFound)
    return {
      contents: contents.replace(
        LANGUAGE_LINE,
        `${languageFound}\n${dialectDeclared}`,
      ),
    };
  return { contents: `${dialectDeclared}\n${contents}` };
};
