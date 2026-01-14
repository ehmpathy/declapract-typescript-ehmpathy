import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * check that they're contained in the file
 */
export const check: FileCheckType = FileCheckType.CONTAINS;

/**
 * sections of gitattributes entries to ensure exist
 */
const SECTIONS = [
  {
    header:
      '# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233',
    entries: ['pnpm-lock.yaml -diff', 'package-lock.json -diff'],
  },
  {
    header:
      '# auto-resolve lock file conflicts by taking theirs; run install after merge',
    entries: ['pnpm-lock.yaml merge=theirs', 'package-lock.json merge=theirs'],
  },
];

/**
 * ensures a section with header and entries exists in the content
 */
const ensureSection = (
  content: string,
  section: { header: string; entries: string[] },
): string => {
  const lines = content.split('\n');

  // find the header line index
  const headerIndex = lines.findIndex((line) => line.trim() === section.header);

  // if header not found, append the whole section at the end
  if (headerIndex === -1) {
    return (
      content.trimEnd() +
      '\n\n' +
      [section.header, ...section.entries].join('\n') +
      '\n'
    );
  }

  // find which entries are missing
  const missingEntries = section.entries.filter(
    (entry) => !content.includes(entry),
  );

  // if no missing entries, nothing to fix
  if (missingEntries.length === 0) return content;

  // insert missing entries right after the header
  const newLines = [
    ...lines.slice(0, headerIndex + 1),
    ...missingEntries,
    ...lines.slice(headerIndex + 1),
  ];

  return newLines.join('\n');
};

/**
 * fix by ensuring all sections are present with their entries
 */
export const fix: FileFixFunction = (contents) => {
  // if no contents, create the file with all sections
  if (!contents) {
    const allSections = SECTIONS.map((s) =>
      [s.header, ...s.entries].join('\n'),
    ).join('\n\n');
    return { contents: allSections + '\n' };
  }

  // ensure each section exists
  let result = contents;
  for (const section of SECTIONS) {
    result = ensureSection(result, section);
  }

  return { contents: result };
};
