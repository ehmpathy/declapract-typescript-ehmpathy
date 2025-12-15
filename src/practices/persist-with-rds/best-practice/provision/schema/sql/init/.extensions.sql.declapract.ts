import { FileCheckType, type FileFixFunction } from 'declapract';

const grabCreateExtensionLinesFromContents = (contents: string) =>
  contents
    .split('\n')
    .filter((line) => line.startsWith('CREATE EXTENSION IF NOT EXISTS'));

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents, context) => {
  // if the file doesn't exist, create what we want to see - with an additional example of how it can be extended
  if (!contents)
    return {
      contents: `${context.declaredFileContents!.trim()}\n-- CREATE EXTENSION IF NOT EXISTS ...`,
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

  // and set the contents equal to what we want to see + their custom ones
  return {
    contents: [
      context.declaredFileContents!.trim(),
      ...foundCustomCreateExtensionLines,
    ].join('\n'),
  };
};
