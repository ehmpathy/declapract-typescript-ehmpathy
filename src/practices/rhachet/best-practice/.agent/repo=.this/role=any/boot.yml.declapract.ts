import type { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'yaml';

/**
 * .what = the `not` globs this practice declares — the deep glossary variants, dropped from boot.
 * .why  = each term's say file names its `.reason` path, so a ref line per variant adds no reach and
 *         costs a path line per term on every boot. `not` drops them. the findsert adds only these
 *         two globs, never the whole template, so a consumer's own boot entries survive.
 */
const declaredNotGlobs: readonly string[] = [
  'briefs/domain.terms/term=*._.choice.reason.md',
  'briefs/domain.terms/term=*._.choice.example=*.md',
];

/**
 * .what = the token cap this practice findserts for the resident `say` payload at each boot.
 * .why  = a boot whose say-content exceeds this halts, so the corpus cannot silently bloat context.
 *         findserted so an extant consumer inherits the cap on upgrade, not only a fresh one — the
 *         template block ships to a new consumer, this findsert reaches the ones already on disk.
 *         findsert semantics: absent -> add; present -> leave the consumer's chosen value untouched,
 *         so a consumer who deliberately raised or lowered the cap is never reverted (F62).
 */
const declaredBudgetTokens = 5_000;

/**
 * .what = the comment the findsert attaches above the `budget:` key it injects.
 * .why  = a bare `budget:\n  tokens: 5000` gives a consumer no clue why the value is plain, so a
 *         later tidy-up could "improve" it to `5_000` and silently make the cap a yaml STRING. the
 *         findserted block must carry the same NOTE the shipped template does, so the trap is warned
 *         at the exact spot the value lands — and it names the boot halt and its remedy.
 * .note = the yaml serializer prefixes each line with `# `, so a space at the front renders `# budget`.
 */
const declaredBudgetComment = [
  ' budget = the token cap on the say payload; a boot over it halts.',
  ' to fix a halt: demote a say glob to ref, use a .min brief, or raise the cap.',
  ' plain `5000`, never `5_000`: yaml 1.2 reads an underscore integer as a string.',
].join('\n');

/**
 * .what = true when a consumer's boot.yml already declares `budget.tokens` (any value).
 * .why  = the findsert gate: add the cap only when a consumer carries none, so a present value — even
 *         a divergent one a consumer chose on purpose — is preserved (findsert, never upsert).
 */
const hasBudgetTokens = (doc: yaml.Document): boolean =>
  doc.getIn(['budget', 'tokens']) !== undefined;

/**
 * .what = true when the consumer curates in the legacy SUBJECT mode (`always.briefs`).
 * .why  = the findsert writes into whichever mode the consumer already uses, so a subject-mode
 *         consumer is never corrupted into an invalid mixed `always:` + `briefs:` file.
 */
const isSubjectMode = (doc: yaml.Document): boolean =>
  doc.getIn(['always', 'briefs']) !== undefined;

/**
 * .what = the key path of a briefs level list (`ref` or `not`) in the consumer's mode.
 */
const asBriefsLevelPath = (input: {
  doc: yaml.Document;
  level: 'ref' | 'not';
}): string[] =>
  isSubjectMode(input.doc)
    ? ['always', 'briefs', input.level]
    : ['briefs', input.level];

/**
 * .what = reads the globs a consumer's boot.yml carries at one level (`ref` or `not`).
 * .why  = the read half: the union and the move are computed against the consumer's real lists.
 */
const getCurrentLevelGlobs = (input: {
  doc: yaml.Document;
  level: 'ref' | 'not';
}): string[] => {
  // the yaml node api is an external boundary; a documented projection to json is the in-repo norm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node: any = input.doc.getIn(asBriefsLevelPath(input));
  if (!yaml.isSeq(node)) return [];
  return (node.toJSON() as string[] | null) ?? [];
};

/**
 * .what = the mutable `not` seq node to union into: the consumer's extant one, or a seeded one.
 * .why  = a plain [] becomes a js array without the `.add` the union relies on, so seed a real seq.
 */
const getOrSeedNotSeq = (doc: yaml.Document): yaml.YAMLSeq => {
  const path = asBriefsLevelPath({ doc, level: 'not' });
  const extant = doc.getIn(path);
  if (yaml.isSeq(extant)) return extant;
  const seq = new yaml.YAMLSeq();
  doc.setIn(path, seq);
  return seq;
};

/**
 * .what = the boot.yml a consumer should hold: its extant file with the declared globs under `not`
 *         (and out of `ref`) and the budget cap findserted, or the whole template where it has none
 * .why  = a findsert by construction: a glob already under `not` stays there once, a consumer's own
 *         `ref` entries stay, a budget already set is left as the consumer chose it, and every other
 *         line (say entries, comments, mode) is preserved because the file is mutated in place via
 *         the yaml document api, never regenerated.
 * .note = a fixed point — an already-conformant file is returned verbatim (no round-trip), so
 *         `fix(fix(x)) === fix(x)` and `check` passes on its own output.
 */
const defineExpectedContents = (
  contents: string | null,
  declaredContents: string,
): string => {
  // a fresh consumer (no boot.yml) gets the whole declared template verbatim.
  if (!contents) return declaredContents;

  // measure what the consumer lacks
  const doc = yaml.parseDocument(contents);
  const notGlobs = getCurrentLevelGlobs({ doc, level: 'not' });
  const refGlobs = getCurrentLevelGlobs({ doc, level: 'ref' });
  const absentFromNot = declaredNotGlobs.filter(
    (glob) => !notGlobs.includes(glob),
  );
  const strayInRef = declaredNotGlobs.filter((glob) => refGlobs.includes(glob));
  const budgetAbsent = !hasBudgetTokens(doc);

  // already conformant → return the consumer's file verbatim (no round-trip).
  if (absentFromNot.length === 0 && strayInRef.length === 0 && !budgetAbsent)
    return contents;

  // move: drop each declared glob from `ref`; drop the `ref` key if it empties
  // .note = deliberate mutation — the yaml document api mutates nodes in place to keep comments
  if (strayInRef.length > 0) {
    const refPath = asBriefsLevelPath({ doc, level: 'ref' });
    const refSeq = doc.getIn(refPath) as yaml.YAMLSeq;
    refSeq.items = refSeq.items.filter(
      (item) =>
        !strayInRef.includes(String(yaml.isScalar(item) ? item.value : item)),
    );
    if (refSeq.items.length === 0) doc.deleteIn(refPath);
  }

  // union: add each absent declared glob under `not`
  if (absentFromNot.length > 0) {
    const notSeq = getOrSeedNotSeq(doc);
    absentFromNot.forEach((glob) => notSeq.add(glob));
  }

  // findsert the budget cap — only when the consumer declares none, so a chosen value survives.
  // attach the NOTE above the `budget:` key so the plain-5000 yaml trap is warned where it lands.
  if (budgetAbsent) {
    // .note = a key built via a node (not `setIn`) is a Scalar, which can carry a commentBefore;
    //         a `setIn`-made key is a bare string and would drop the NOTE in silence
    if (!yaml.isMap(doc.contents)) doc.contents = doc.createNode({});
    const budgetKey = doc.createNode('budget');
    budgetKey.commentBefore = declaredBudgetComment;
    (doc.contents as yaml.YAMLMap).add(
      doc.createPair(budgetKey, { tokens: declaredBudgetTokens }),
    );
  }

  return doc.toString();
};

/**
 * .what = throws when a consumer's boot.yml lacks a declared `not` glob, still lists one under `ref`,
 *         lacks a budget, or is absent entirely.
 * .why  = `check` is the GATE: declapract runs `fix` only when `check` rejects.
 * .note = best-practice semantics are inverted — a THROW means the practice is violated, a return
 *         means it is followed. see `.agent/repo=.this/role=any/briefs/declapract-check-semantics.md`.
 *         the equality is against the FINDSERT output, never the whole template, so a consumer's own
 *         boot entries pass the check untouched.
 */
export const check: FileCheckFunction = (contents, context) => {
  expect(contents).toEqual(
    defineExpectedContents(contents, context.declaredFileContents ?? ''),
  );
};

/**
 * .what = unions the declared `not` globs into a consumer's boot.yml (moved out of `ref`) and
 *         findserts the budget cap (or writes the template if absent).
 * .why  = fix forward once, for every consumer — never a whole-file overwrite that would drop a
 *         consumer's own say/ref curation (#105 req 1, #689).
 */
export const fix: FileFixFunction = (contents, context) => {
  return {
    contents: defineExpectedContents(
      contents,
      context.declaredFileContents ?? '',
    ),
  };
};
