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
 * .what = drops prior headers + prior entries, and dedupes latest entries (keep first)
 * .why = the fix must not re-emit a legacy line, nor a second copy of a managed entry;
 *        a named transform keeps cleanContent a narrative of what happens, not how
 */
const asLinesWithLegacyDroppedAndDeduped = (input: {
  lines: string[];
}): string[] => {
  const { lines } = input.lines.reduce<{
    lines: string[];
    seen: Set<string>;
  }>(
    (acc, line) => {
      const trimmed = line.trim();

      // skip prior headers + prior entries
      if (ALL_PRIOR_HEADERS.includes(trimmed)) return acc;
      if (ALL_PRIOR_ENTRIES.includes(trimmed)) return acc;

      // skip duplicate latest entries (keep first occurrence)
      if (ALL_LATEST_ENTRIES.includes(trimmed)) {
        if (acc.seen.has(trimmed)) return acc;
        return {
          lines: [...acc.lines, line],
          seen: new Set([...acc.seen, trimmed]),
        };
      }

      return { lines: [...acc.lines, line], seen: acc.seen };
    },
    { lines: [], seen: new Set<string>() },
  );
  return lines;
};

/**
 * removes legacy headers, duplicate entries, and cleans up empty lines
 */
const cleanContent = (content: string): string => {
  // drop legacy headers, legacy entries, and duplicate latest entries (keep first)
  const cleanedLines = asLinesWithLegacyDroppedAndDeduped({
    lines: content.split('\n'),
  });

  // collapse multiple consecutive empty lines into one (drop an empty that follows an empty)
  const collapsedLines = cleanedLines.filter((line, index) => {
    const isEmpty = line.trim() === '';
    const prevWasEmpty = index > 0 && cleanedLines[index - 1]!.trim() === '';
    return !(isEmpty && prevWasEmpty);
  });

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

  // find which entries are absent from the content
  const entriesAbsent = section.entries.latest.filter(
    (entry) => !content.includes(entry),
  );

  // find the header line index
  const headerIndex = lines.findIndex(
    (line) => line.trim() === section.header.latest,
  );

  // if header not found, append header and only absent entries
  if (headerIndex === -1) {
    return (
      content.trimEnd() +
      '\n\n' +
      [section.header.latest, ...entriesAbsent].join('\n') +
      '\n'
    );
  }

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

  // clean up legacy headers and duplicates, then ensure each section exists
  const result = SECTIONS.reduce(
    (acc, section) => ensureSection(acc, section),
    cleanContent(contents),
  );

  // trim to exactly one final newline
  return { contents: result.trimEnd() + '\n' };
};
