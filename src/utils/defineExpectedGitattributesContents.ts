import { UnexpectedCodePathError } from 'helpful-errors';

/**
 * .what = one section of a `.gitattributes`: a header comment, then its entries
 * .why  = a section is the unit a practice owns. `retired` names the forms a section once
 *         took, so a fix lifts them out of an extant file rather than leave them to linger. the
 *         gitignore declarers name the same concept `ignoresRetired`
 * .note = `header.latest` must open with the declarer tag, `# [<declarer>] `. the tag is how every
 *         other declarer recognizes this section and keeps it in place
 */
export type GitattributesSection = {
  header: { latest: string; retired: readonly string[] };
  entries: { latest: readonly string[]; retired: readonly string[] };
};

/**
 * .what = every practice that declares the repo-root `.gitattributes`, in emit order
 * .why  = git takes the last line that matches a path, so the order of sections decides which
 *         declarer wins where two match one path. `rhachet` sits last: its exceptions
 *         (`*.yield.*`, `.radio/**` → `-linguist-generated`) must be the last managed match for
 *         a route path, or a later collapse line (`*.test.ts`) would fold a yield or a radio
 *         record named like a test
 * .note = a new declarer adds itself here, at the place its lines must hold. the util throws on
 *         a declarer absent from this list, so that place is decided, never defaulted
 */
export const declarersOrderedForGitattributes: readonly string[] = [
  'git',
  'tests-any',
  'persist-with-rds',
  'persist-with-dynamodb',
  'rhachet',
];

/**
 * .what = emits the `.gitattributes` a practice declares, given the repo's extant one
 * .why  = shared across every practice that declares this file. git takes the last line
 *         that matches a path, so order carries load, and a sorted union (the `.gitignore`
 *         method) cannot serve. every declarer must emit one identical layout, or each
 *         rewrites the file the other produced, on every `declapract apply`:
 *         - managed sections first, grouped by declarer in `declarersOrderedForGitattributes`
 *           order, each declarer's sections in the order it declares them
 *         - a tagged block whose declarer is not in that list (a hand-written tag) after the
 *           known declarers, in code-unit order
 *         - the repo's own lines last, in their own order, so a repo-own
 *           `<path> -linguist-generated` line wins over a managed collapse line
 * .why  = each declarer knows only its own sections. it recognizes another declarer's section
 *         by the tag in its header and keeps that block verbatim, in canonical place. so
 *         `fix_A(fix_B(x)) === fix_B(fix_A(x))`, and each is a fixed point
 * .note = no fix edits another declarer's section, not even to drop a line it also holds. two
 *         sections may then both carry one entry (`src/access/daos/**`, rds and dynamodb); both
 *         are collapse lines above every exception, so a repeat is inert under last-match-wins
 *
 * .note = a new declarer of the repo-root `.gitattributes` imports this rather than re-derive
 *         it: a hand-rolled copy can pass its own check and still oscillate against the rest.
 *         the cross-declarer clamps sit in `src/gitattributesDeclarers.declapract.test.ts` and
 *         `src/gitattributesDeclarers.declapract.integration.test.ts`.
 */
export const defineExpectedGitattributesContents = (input: {
  contents: string | null;
  declarer: string;
  sections: readonly GitattributesSection[];
}): string => {
  // reject a declarer with no decided place in the emit order
  if (!declarersOrderedForGitattributes.includes(input.declarer))
    throw new UnexpectedCodePathError(
      'gitattributes declarer has no place in declarersOrderedForGitattributes',
      { declarer: input.declarer, declarers: declarersOrderedForGitattributes },
    );

  // reject a section whose header does not carry this declarer's tag; the layout rests on it
  input.sections.forEach((section) => {
    if (asDeclarerOfHeader({ line: section.header.latest }) !== input.declarer)
      throw new UnexpectedCodePathError(
        'gitattributes section header lacks its declarer tag',
        { declarer: input.declarer, header: section.header.latest },
      );
  });

  // split the extant file into blocks; a blank run ends a block (crlf in, lf out)
  const blocks = asGitattributesBlocks({ contents: input.contents ?? '' });

  // keep each block another declarer tagged, verbatim
  const sectionsForeign = asSectionsForeign({
    blocks,
    declarer: input.declarer,
  });

  // the rest is repo-own, minus every line this declarer manages, wherever it sits
  const blocksRepoOwn = asBlocksRepoOwn({
    blocks,
    declarer: input.declarer,
    sections: input.sections,
  });

  // order every managed section: by declarer rank, then as declared or as found
  const sectionsOrdered = asSectionsOrdered({
    sections: [
      ...sectionsForeign,
      ...asSectionsOwn({ declarer: input.declarer, sections: input.sections }),
    ],
  });

  // emit managed sections, then the repo-own blocks, one blank line apart
  return asGitattributesContents({
    blocks: [...sectionsOrdered.map((section) => section.lines), ...blocksRepoOwn],
  });
};

/**
 * .what = the declarer a header line names via its `# [<declarer>] ` tag, or null
 * .why  = the tag is how a declarer tells another declarer's section from a repo-own comment
 */
const asDeclarerOfHeader = (input: { line: string }): string | null =>
  input.line.match(/^# \[([a-z0-9-]+)\] /)?.[1] ?? null;

/**
 * .what = a managed section as it sits in a file: its declarer, then its lines (header first)
 */
type GitattributesSectionFound = { declarer: string; lines: readonly string[] };

/**
 * .what = the blocks another declarer tagged, each kept verbatim
 * .why  = a declarer knows only its own sections; the tag is how it keeps every other one
 */
const asSectionsForeign = (input: {
  blocks: readonly (readonly string[])[];
  declarer: string;
}): GitattributesSectionFound[] =>
  input.blocks
    .map((lines) => ({
      declarer: asDeclarerOfHeader({ line: lines[0]! }),
      lines,
    }))
    .filter(
      (block): block is GitattributesSectionFound =>
        block.declarer !== null && block.declarer !== input.declarer,
    );

/**
 * .what = the repo's own blocks: untagged or this declarer's, minus each line it manages
 * .why  = a managed line found anywhere (a hand copy, a prior form) lifts into its section
 */
const asBlocksRepoOwn = (input: {
  blocks: readonly (readonly string[])[];
  declarer: string;
  sections: readonly GitattributesSection[];
}): string[][] => {
  const linesManaged = asLinesManaged({ sections: input.sections });
  return input.blocks
    .filter((lines) => {
      const declarer = asDeclarerOfHeader({ line: lines[0]! });
      return declarer === null || declarer === input.declarer;
    })
    .map((lines) =>
      lines.filter(
        (line) =>
          !linesManaged.has(line.trim()) &&
          asDeclarerOfHeader({ line }) !== input.declarer,
      ),
    )
    .filter((lines) => lines.length > 0);
};

/**
 * .what = every line a declarer manages: each header and entry, latest and prior
 */
const asLinesManaged = (input: {
  sections: readonly GitattributesSection[];
}): ReadonlySet<string> =>
  new Set(
    input.sections.flatMap((section) => [
      section.header.latest,
      ...section.header.retired,
      ...section.entries.latest,
      ...section.entries.retired,
    ]),
  );

/**
 * .what = this declarer's sections, in their latest form
 */
const asSectionsOwn = (input: {
  declarer: string;
  sections: readonly GitattributesSection[];
}): GitattributesSectionFound[] =>
  input.sections.map((section) => ({
    declarer: input.declarer,
    lines: [section.header.latest, ...section.entries.latest],
  }));

/**
 * .what = sections sorted by declarer rank, then by declarer code unit
 * .why  = a stable sort keeps each declarer's own sections in the order found
 */
const asSectionsOrdered = (input: {
  sections: readonly GitattributesSectionFound[];
}): GitattributesSectionFound[] =>
  [...input.sections].sort(
    (a, b) =>
      asDeclarerRank({ declarer: a.declarer }) -
        asDeclarerRank({ declarer: b.declarer }) ||
      asCodeUnitOrder({ a: a.declarer, b: b.declarer }),
  );

/**
 * .what = the file text: blocks one blank line apart, one newline at the end
 */
const asGitattributesContents = (input: {
  blocks: readonly (readonly string[])[];
}): string =>
  `${input.blocks.map((lines) => lines.join('\n')).join('\n\n')}\n`;

/**
 * .what = a declarer's place in the emit order; a declarer absent from the list ranks after all
 * .why  = a hand-written tag must still sort the same way in every declarer's output
 */
const asDeclarerRank = (input: { declarer: string }): number => {
  const rank = declarersOrderedForGitattributes.indexOf(input.declarer);
  return rank === -1 ? declarersOrderedForGitattributes.length : rank;
};

/**
 * .what = a sort comparator by code unit: negative, zero, or positive
 * .why  = `localeCompare` varies by host locale; every declarer must sort one way on every host
 */
const asCodeUnitOrder = (input: { a: string; b: string }): number => {
  if (input.a < input.b) return -1;
  if (input.a > input.b) return 1;
  return 0;
};

/**
 * .what = parses a `.gitattributes` into blocks: runs of lines apart by blank lines
 * .why  = a section is one block (header + entries), so a blank line bounds it
 */
const asGitattributesBlocks = (input: { contents: string }): string[][] =>
  input.contents
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .reduce<string[][]>(
      (blocks, line) =>
        line.trim() === ''
          ? [...blocks, []]
          : [...blocks.slice(0, -1), [...(blocks.slice(-1)[0] ?? []), line]],
      [[]],
    )
    .filter((block) => block.length > 0);
