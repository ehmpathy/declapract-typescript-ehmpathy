import { FileCheckType, type FileFixFunction } from 'declapract';

const grabCreateExtensionLinesFromContents = (contents: string) =>
  contents
    .split('\n')
    .filter((line) => line.startsWith('CREATE EXTENSION IF NOT EXISTS'));

// an example line, written with a fresh file, that shows how the file can be extended
const EXAMPLE_LINE = '-- CREATE EXTENSION IF NOT EXISTS ...';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents, context) => {
  // if the file doesn't exist, create what we want to see - with an additional example of how it can be extended
  if (!contents)
    return {
      contents: `${context.declaredFileContents!.trim()}\n${EXAMPLE_LINE}`,
    };

  // if the file does exist, then find all the custom create extension lines
  const requiredCreateExtensionLines = grabCreateExtensionLinesFromContents(
    context.declaredFileContents!,
  );
  const foundCreateExtensionLines =
    grabCreateExtensionLinesFromContents(contents);
  const foundCustomCreateExtensionLines = foundCreateExtensionLines.filter(
    (foundCreateExtensionLine) =>
      !requiredCreateExtensionLines.some((requiredCreateExtensionLine) =>
        foundCreateExtensionLine.includes(requiredCreateExtensionLine),
      ), // if this found create-extension statement is not a required one, then its custom
  );

  // keep the example line where present, so a second fix over the fresh file is a no-op (#536)
  const exampleLinesKept = contents.split('\n').includes(EXAMPLE_LINE)
    ? [EXAMPLE_LINE]
    : [];

  // and set the contents equal to what we want to see + their custom ones
  return {
    contents: [
      context.declaredFileContents!.trim(),
      ...foundCustomCreateExtensionLines,
      ...exampleLinesKept,
    ].join('\n'),
  };
};
