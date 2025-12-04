import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * check that they're contained in the file
 */
export const check: FileCheckType = FileCheckType.CONTAINS;

/**
 * the header comment for the package lock exclusions section
 */
const HEADER =
  '# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233';

/**
 * the entries that should appear under the header
 */
const ENTRIES = ['pnpm-lock.json -diff', 'package-lock.json -diff'];

/**
 * fix by ensuring all entries are present under the header
 */
export const fix: FileFixFunction = (contents) => {
  // if no contents, create the file with the header and entries
  if (!contents) {
    return { contents: [HEADER, ...ENTRIES].join('\n') + '\n' };
  }

  const lines = contents.split('\n');

  // find the header line index
  const headerIndex = lines.findIndex((line) => line.trim() === HEADER);

  // if header not found, append the whole section at the end
  if (headerIndex === -1) {
    const newContent =
      contents.trimEnd() + '\n\n' + [HEADER, ...ENTRIES].join('\n') + '\n';
    return { contents: newContent };
  }

  // find which entries are missing after the header
  const missingEntries = ENTRIES.filter((entry) => !contents.includes(entry));

  // if no missing entries, nothing to fix
  if (missingEntries.length === 0) {
    return { contents };
  }

  // insert missing entries right after the header
  const newLines = [
    ...lines.slice(0, headerIndex + 1),
    ...missingEntries,
    ...lines.slice(headerIndex + 1),
  ];

  return { contents: newLines.join('\n') };
};
