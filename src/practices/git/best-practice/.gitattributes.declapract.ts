import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * check that they're contained in the file
 */
export const check: FileCheckType = FileCheckType.CONTAINS;

/**
 * sections of gitattributes entries to ensure exist
 */
const SECTIONS: {
  header: { latest: string; priors: string[] };
  entries: { latest: string[]; priors: string[] };
}[] = [
  {
    header: {
      latest:
        '# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233',
      priors: [
        '# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233',
      ],
    },
    entries: {
      latest: ['pnpm-lock.yaml -diff', 'package-lock.json -diff'],
      priors: ['pnpm-lock.json -diff'],
    },
  },
  {
    header: {
      latest:
        '# auto-resolve lock file conflicts by taking theirs; run install after merge',
      priors: [],
    },
    entries: {
      latest: ['pnpm-lock.yaml merge=theirs', 'package-lock.json merge=theirs'],
      priors: ['pnpm-lock.json merge=theirs'],
    },
  },
];

/**
 * all latest entries managed by this practice (for deduplication)
 */
const ALL_LATEST_ENTRIES = SECTIONS.flatMap((s) => s.entries.latest);

/**
 * all prior entries that should be removed
 */
const ALL_PRIOR_ENTRIES = SECTIONS.flatMap((s) => s.entries.priors);

/**
 * all prior headers that should be removed
 */
const ALL_PRIOR_HEADERS = SECTIONS.flatMap((s) => s.header.priors);

/**
 * removes legacy headers, duplicate entries, and cleans up empty lines
 */
const cleanContent = (content: string): string => {
  const lines = content.split('\n');
  const seenEntries = new Set<string>();
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // skip prior headers
    if (ALL_PRIOR_HEADERS.includes(trimmed)) continue;

    // skip prior entries
    if (ALL_PRIOR_ENTRIES.includes(trimmed)) continue;

    // skip duplicate latest entries (keep first occurrence)
    if (ALL_LATEST_ENTRIES.includes(trimmed)) {
      if (seenEntries.has(trimmed)) continue;
      seenEntries.add(trimmed);
    }

    cleanedLines.push(line);
  }

  // collapse multiple consecutive empty lines into one
  const collapsedLines: string[] = [];
  let prevWasEmpty = false;
  for (const line of cleanedLines) {
    const isEmpty = line.trim() === '';
    if (isEmpty && prevWasEmpty) continue;
    collapsedLines.push(line);
    prevWasEmpty = isEmpty;
  }

  return collapsedLines.join('\n').trim();
};

/**
 * ensures a section with header and entries exists in the content
 */
const ensureSection = (
  content: string,
  section: (typeof SECTIONS)[number],
): string => {
  const lines = content.split('\n');

  // find the header line index
  const headerIndex = lines.findIndex(
    (line) => line.trim() === section.header.latest,
  );

  // if header not found, append the whole section at the end
  if (headerIndex === -1) {
    return (
      content.trimEnd() +
      '\n\n' +
      [section.header.latest, ...section.entries.latest].join('\n') +
      '\n'
    );
  }

  // find which entries are absent
  const entriesAbsent = section.entries.latest.filter(
    (entry) => !content.includes(entry),
  );

  // if all entries present, no fix required
  if (entriesAbsent.length === 0) return content;

  // insert absent entries right after the header
  const newLines = [
    ...lines.slice(0, headerIndex + 1),
    ...entriesAbsent,
    ...lines.slice(headerIndex + 1),
  ];

  return newLines.join('\n');
};

/**
 * fix by cleanup of legacy content and ensure all sections are present
 */
export const fix: FileFixFunction = (contents) => {
  // if no contents, create the file with all sections
  if (!contents) {
    const allSections = SECTIONS.map((s) =>
      [s.header.latest, ...s.entries.latest].join('\n'),
    ).join('\n\n');
    return { contents: allSections + '\n' };
  }

  // clean up legacy headers and duplicates first
  let result = cleanContent(contents);

  // ensure each section exists
  for (const section of SECTIONS) {
    result = ensureSection(result, section);
  }

  // normalize to exactly one final newline
  return { contents: result.trimEnd() + '\n' };
};
