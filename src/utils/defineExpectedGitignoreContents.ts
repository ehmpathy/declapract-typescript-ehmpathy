import { dedupe } from 'domain-objects';

/**
 * .what = the ignores whose POSITION carries load, in the sequence git requires
 * .why  = a `.gitignore` negation re-includes a path only when it appears AFTER the
 *         pattern it negates. hoist a `!` line above its target and git silently drops
 *         the negation -- the file still reads as correct while every test-fixture
 *         `node_modules` it protects is re-ignored.
 * .why  = it lives HERE, shared, rather than in each declaration, because every
 *         practice that declares the repo-root `.gitignore` must emit an IDENTICAL
 *         tail or the two converge no longer, and `declapract fix` rewrites the file on
 *         every run. one constant makes that drift unrepresentable.
 * .note = `.test*` dirs hold cloned repos (test fixtures via `genTempDir`), whose
 *         `node_modules` must stay tracked.
 * .note = `readonly` carries load here, it is not decoration. this array is
 *         module-cached and shared by every declarer, so ONE in-place mutation anywhere
 *         (`.push`, an in-place `.sort`, `.reverse`) would break convergence for ALL of
 *         them at once -- at runtime, with no compiler signal. `readonly` makes that
 *         unrepresentable rather than merely discouraged
 *         (`rule.prefer.prevent-over-correct`).
 * .note = typed `readonly string[]` rather than `as const`: `as const` narrows the
 *         elements to literal types, which would make `orderedPatterns.has(line)` below
 *         reject a plain `string`. this form keeps the element type while it forbids the
 *         mutation.
 */
export const ignoresOrderedForGitignore: readonly string[] = [
  'node_modules',
  '!.test*/**/node_modules',
  '!.test*/**/node_modules/**',
];

/**
 * .what = emits the `.gitignore` a practice declares, given the repo's extant one
 * .why  = a findsert by construction -- the file's own lines are unioned in before the
 *         sort, so a repo's custom ignores survive and a line already present stays
 *         present once. and it is a fixed point: `fix(fix(x)) === fix(x)`.
 * .why  = SHARED across every practice that declares this file. convergence between
 *         two declarers rests on the whole ALGORITHM, not merely the tail -- union,
 *         then sort, then append. two copies could drift step-for-step; one cannot.
 * .note = `sortable` vs `ordered` is the domain's split for a declared line: inert
 *         position vs load-carrying position. see
 *         `.agent/repo=.this/role=any/briefs/domain.terms/term=ordered._.choice._.md`.
 *
 * ⚠️ .note = **THIS FUNCTION IS THE CONTRACT, NOT A CONVENIENCE.** every practice that declares
 *         the repo-root `.gitignore` converges only because all of them route through here. a
 *         declaration that hand-rolls its own union/sort/tail instead of this import is OUTSIDE
 *         that guarantee -- it may satisfy its own check and still oscillate against the rest,
 *         forever, on every `declapract fix`.
 *
 *         that failure mode is measured, not hypothetical. every declaration of this file once
 *         carried its own copy of the algorithm, and one of them fell behind: it sorted every
 *         line and emitted no ordered tail, which hoists the `!` negations above their target and
 *         turns them inert. re-derive any declaration by hand today and the clamps reproduce it
 *         exactly -- that declaration's own idempotency assertions stay green while every
 *         cross-declarer assertion goes red.
 *
 *         no build step stops the next author from a repeat. so: **if you declare the repo-root
 *         `.gitignore` from a new practice, import this -- do not re-derive it.** a lint rule or a
 *         single-owner registry would be the durable guard; today the cross-declarer clamps are.
 */
export const defineExpectedGitignoreContents = (input: {
  contents: string | null;
  ignoresSortable: readonly string[];
  /**
   * .what = lines a practice once declared and now replaces; dropped from the file
   * .why  = a union never removes a line, so a superseded line would linger forever.
   *         safe across declarers: no other declarer re-adds a line it never declared
   */
  ignoresRetired?: readonly string[];
}): string => {
  // parse the repo's extant file into groups of entries (CRLF in, LF out)
  const groupsFromFile = asGitignoreGroups({ contents: input.contents ?? '' });

  // drop the ordered lines (re-appended as the tail) and any rule seen earlier in the file;
  // a dropped rule's comments stay, as a comment run with no rule
  const orderedPatterns = new Set(ignoresOrderedForGitignore);
  const retiredPatterns = new Set(input.ignoresRetired ?? []);
  const rulesInFile = groupsFromFile.flat().map((entry) => entry.rule);
  const groupsDeduped = groupsFromFile.map((group, groupIndex) =>
    group.map((entry, entryIndex): GitignoreEntry => {
      if (entry.rule === null) return entry;
      const position =
        groupsFromFile.slice(0, groupIndex).flat().length + entryIndex;
      const isDropped =
        orderedPatterns.has(entry.rule) ||
        retiredPatterns.has(entry.rule) ||
        rulesInFile.indexOf(entry.rule) < position;
      return isDropped ? { rule: null, comments: entry.comments } : entry;
    }),
  ).map((group) =>
    group.filter((entry) => entry.rule !== null || entry.comments.length > 0),
  );

  // lift the file's own negations out of the sort; they re-emit below the tail, in file order
  // .why = a negation acts only below its target, and a sort would hoist `!` above all
  const entriesNegated = groupsDeduped
    .flat()
    .filter((entry) => isGitignoreNegation({ entry }));
  const groupsSortable = groupsDeduped.map((group) =>
    group.filter((entry) => !isGitignoreNegation({ entry })),
  );

  // union this practice's absent lines into the last group, right above the tail
  const rulesPresent = new Set(groupsSortable.flat().map((entry) => entry.rule));
  const entriesDeclared = dedupe([...input.ignoresSortable])
    .filter((rule) => !!rule && !rulesPresent.has(rule))
    .map((rule): GitignoreEntry => ({ rule, comments: [] }));
  const groupsUnioned = [
    ...groupsSortable.slice(0, -1),
    [...(groupsSortable.slice(-1)[0] ?? []), ...entriesDeclared],
  ];

  // sort each group within itself, then emit groups apart by one blank line
  const body = groupsUnioned
    .map((group) => asGitignoreGroupSorted({ group }))
    .filter((group) => group.length > 0)
    .map((group) =>
      group.flatMap((entry) => [
        ...entry.comments,
        ...(entry.rule === null ? [] : [entry.rule]),
      ]),
    )
    .map((lines) => lines.join('\n'));

  // append the ordered tail, sequence preserved, then the file's own negations with their comments
  const linesNegated = entriesNegated.flatMap((entry) => [
    ...entry.comments,
    ...(entry.rule === null ? [] : [entry.rule]),
  ]);
  return [body.join('\n\n'), ...ignoresOrderedForGitignore, ...linesNegated, '']
    .filter((chunk, index) => index > 0 || chunk.length > 0)
    .join('\n');
};

/**
 * .what = one rule of a `.gitignore`, with the comment lines directly above it
 * .why  = a comment explains the rule below it, so the two sort as one unit (#540).
 *         `rule: null` marks a comment run with no rule below it in its group; it keeps
 *         its place at the group's end
 */
type GitignoreEntry = { rule: string | null; comments: string[] };

/**
 * .what = parses a `.gitignore` into groups (runs apart by blank lines) of entries
 * .why  = the line model must match the format: CRLF endings, comments bound to the line
 *         below them, and blank lines that group a file (#540)
 */
const asGitignoreGroups = (input: { contents: string }): GitignoreEntry[][] => {
  // split into lines; drop each terminal carriage return so CRLF parses as LF
  const lines = input.contents.split('\n').map((line) => line.replace(/\r$/, ''));

  // split into groups at each run of blank lines
  const groupsOfLines = lines
    .reduce<string[][]>(
      (groups, line) =>
        line.trim() === ''
          ? [...groups, []]
          : [...groups.slice(0, -1), [...(groups.slice(-1)[0] ?? []), line]],
      [[]],
    )
    .filter((group) => group.length > 0);

  // bind each comment run to the rule below it
  return groupsOfLines.map((group) =>
    group.reduce<GitignoreEntry[]>((entries, line) => {
      const last = entries.slice(-1)[0];
      const lastIsOpen = !!last && last.rule === null;
      const prior = lastIsOpen ? entries.slice(0, -1) : entries;
      const comments = lastIsOpen ? last.comments : [];
      if (line.startsWith('#'))
        return [...prior, { rule: null, comments: [...comments, line] }];
      return [...prior, { rule: line, comments }];
    }, []),
  );
};

/**
 * .what = whether an entry is a repo's own `!` negation (the ordered tail is dropped before this)
 * .why  = a negation's position carries load, so it is never sorted
 */
const isGitignoreNegation = (input: { entry: GitignoreEntry }): boolean =>
  input.entry.rule !== null && input.entry.rule.startsWith('!');

/**
 * .what = sorts one group's entries by rule; a comment run with no rule stays at the end
 * .why  = the sort is the declarers' shared convergence step, so it stays the plain
 *         code-unit sort of the rule text, as before; a comment now rides with its rule
 */
const asGitignoreGroupSorted = (input: {
  group: GitignoreEntry[];
}): GitignoreEntry[] => [
  ...input.group
    .filter((entry): entry is { rule: string; comments: string[] } => entry.rule !== null)
    .sort((a, b) => (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0)),
  ...input.group.filter((entry) => entry.rule === null),
];
