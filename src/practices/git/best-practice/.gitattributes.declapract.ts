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
 * .what = every line this practice manages: each section's header and entries, latest and prior
 * .why  = the fix lifts each of these out of wherever it sits, so none can linger out of place,
 *         out of order, or twice
 */
const ALL_MANAGED_LINES = SECTIONS.flatMap((s) => [
  s.header.latest,
  ...s.header.priors,
  ...s.entries.latest,
  ...s.entries.priors,
]);

/**
 * .what = the canonical block: each section's latest header + latest entries, in declared order
 * .why  = the check is CONTAINS — the file must hold the whole template as one contiguous run of
 *         text — so the fix must emit this block verbatim. a section re-assembled in place (an
 *         entry inserted after its header, or a stray entry left outside its section) is a fixed
 *         point that never CONTAINS the template, so the plan would flag the file on every run
 */
const CANONICAL_BLOCK = SECTIONS.map((s) =>
  [s.header.latest, ...s.entries.latest].join('\n'),
).join('\n\n');

/**
 * .what = the repo-own lines of a .gitattributes: every managed line dropped, runs of blank
 *         lines collapsed to one, and the edges trimmed
 * .why  = the repo keeps every line this practice does not manage, in its own order
 */
const asRepoOwnBlock = (input: { contents: string }): string => {
  // drop every managed line, wherever it sits
  const linesRepoOwn = input.contents
    .split('\n')
    .filter((line) => !ALL_MANAGED_LINES.includes(line.trim()));

  // collapse runs of blank lines into one (drop a blank that follows a blank)
  const linesCollapsed = linesRepoOwn.filter(
    (line, index) =>
      !(
        line.trim() === '' &&
        index > 0 &&
        linesRepoOwn[index - 1]!.trim() === ''
      ),
  );

  return linesCollapsed.join('\n').trim();
};

/**
 * .what = the repo-own lines first, then the canonical block, with exactly one final newline
 * .why  = legacy headers and entries drop, duplicates collapse to one, and the output CONTAINS the
 *         template — so the check passes on the fixed output and a second fix changes zero
 */
export const fix: FileFixFunction = (contents) => {
  const repoOwnBlock = asRepoOwnBlock({ contents: contents ?? '' });
  return {
    contents: `${[repoOwnBlock, CANONICAL_BLOCK].filter((block) => block).join('\n\n')}\n`,
  };
};
