import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  const line = 'package.json merge=npm-packagejson-merge';

  // if file doesn't exist, create it
  if (!contents) {
    return {
      contents: `# auto-resolve package.json dependency conflicts via semver rules\n${line}\n`,
    };
  }

  // if line already exists, return as-is
  if (contents.includes(line)) {
    return { contents };
  }

  // append the line
  const newContents =
    contents.trimEnd() +
    '\n\n' +
    `# auto-resolve package.json dependency conflicts via semver rules\n${line}\n`;
  return { contents: newContents };
};
