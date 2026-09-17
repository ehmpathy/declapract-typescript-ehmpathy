import type { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'yaml';

/**
 * .what = the ref globs this practice declares — the deep glossary variants that stay on-demand.
 * .why  = the boot.yml default is say-all (see the template); these two globs are the sole
 *         demotions to ref, so a consumer's whole glossary rides in context while the reason-deep
 *         and example variants stay a path-only fetch away. the findsert ensures a consumer's file
 *         carries these two demotions, never the whole template — so its own boot entries survive.
 */
const declaredRefGlobs: readonly string[] = [
  'briefs/domain.terms/term=*._.choice.reason.md',
  'briefs/domain.terms/term=*._.choice.example=*.md',
];

/**
 * .what = the token cap this practice findserts for the resident `say` payload at each boot.
 * .why  = a boot whose say-content exceeds this halts, so the corpus cannot silently bloat context.
 *         findserted so an extant consumer inherits the cap on upgrade, not only a fresh one — the
 *         template block ships to a new consumer, this findsert reaches the ones already on disk.
 *         findsert semantics: absent -> add; present -> leave the consumer's chosen value untouched,
 *         so a consumer who deliberately raised or lowered the cap is never reverted.
 */
const declaredBudgetTokens = 5_000;

/**
 * .what = the comment the findsert attaches above the `budget:` key it injects.
 * .why  = a bare `budget:\n  tokens: 5000` gives a consumer no clue why the value is plain, so a
 *         later tidy-up could "improve" it to `5_000` and silently make the cap a yaml STRING. the
 *         findserted block must carry the same NOTE the shipped template does, so the trap is warned
 *         at the exact spot the value lands.
 * .note = the yaml serializer prefixes each line with `# `, so a space at the front renders `# budget`.
 */
const declaredBudgetComment = [
  ' budget — the token cap for the resident `say` payload at each boot.',
  ' a boot whose say-content exceeds this halts, so the corpus cannot silently bloat',
  ' context. remedies: demote a say glob to ref, adopt a .min brief variant, or raise',
  ' this cap deliberately.',
  ' NOTE: plain `5000`, not `5_000` — yaml 1.2 (the yaml v2 default) reads an underscore',
  ' integer as a STRING, which would silently make the cap non-numeric.',
].join('\n');

/**
 * .what = true when a consumer's boot.yml already declares `budget.tokens` (any value).
 * .why  = the findsert gate: add the cap only when a consumer carries none, so a present value — even
 *         a divergent one a consumer chose on purpose — is preserved (findsert, never upsert).
 */
const hasBudgetTokens = (doc: yaml.Document): boolean =>
  doc.getIn(['budget', 'tokens']) !== undefined;

/**
 * .what = reads the ref globs a consumer's boot.yml currently carries, from whichever mode it uses.
 * .why  = a consumer may curate in SIMPLE mode (top-level `briefs.ref`) or the legacy SUBJECT mode
 *         (`always.briefs.ref`). read from whichever exists so the union is computed against the
 *         consumer's real ref list, never a presumed one. no mutation here — this is the read half.
 */
const getCurrentRefGlobs = (doc: yaml.Document): string[] => {
  // the yaml node api is an external boundary; a documented projection to json is the in-repo norm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node: any =
    doc.getIn(['always', 'briefs', 'ref']) ?? doc.getIn(['briefs', 'ref']);
  if (!node) return [];
  return (node.toJSON() as string[] | null) ?? [];
};

/**
 * .what = the mutable ref seq node to union into: the consumer's extant one, or a seeded simple-mode one.
 * .why  = union into whichever ref list already exists (subject or simple), so a subject-mode consumer
 *         is never corrupted into an invalid mixed `always:`+`briefs:` file. only when NEITHER exists
 *         does the fix seed a simple-mode `briefs.ref` — the go-forward shape.
 */
const getOrSeedRefSeq = (doc: yaml.Document): unknown => {
  const subject = doc.getIn(['always', 'briefs', 'ref']);
  if (subject) return subject;
  const simple = doc.getIn(['briefs', 'ref']);
  if (simple) return simple;
  // neither ref list exists — seed a real seq node (a plain [] becomes a js
  // array without the `.add` the union relies on), then union into it.
  const seq = new yaml.YAMLSeq();
  doc.setIn(['briefs', 'ref'], seq);
  return seq;
};

/**
 * .what = the boot.yml a consumer should hold — its extant file with the declared ref globs unioned in
 *         and the budget cap findserted, or the whole declared template when the consumer has none yet.
 * .why  = a findsert by construction: a glob already present stays present once, a budget already set
 *         is left as the consumer chose it, and every other line (a consumer's own say/ref entries,
 *         comments, mode) is preserved because the file is mutated in place via the yaml document api,
 *         never regenerated.
 * .note = a fixed point — an already-conformant file is returned verbatim (no round-trip), so
 *         `fix(fix(x)) === fix(x)` and `check` passes on its own output; without both, `declapract
 *         fix` would rewrite this file forever.
 */
const defineExpectedContents = (
  contents: string | null,
  declaredContents: string,
): string => {
  // a fresh consumer (no boot.yml) gets the whole declared template verbatim.
  if (!contents) return declaredContents;

  const doc = yaml.parseDocument(contents);
  const absentGlobs = declaredRefGlobs.filter(
    (glob) => !getCurrentRefGlobs(doc).includes(glob),
  );
  const budgetAbsent = !hasBudgetTokens(doc);

  // already conformant → return the consumer's file verbatim (no round-trip).
  if (absentGlobs.length === 0 && !budgetAbsent) return contents;

  // deliberate mutation — the yaml document api mutates the seq node in place to
  // preserve the adjacent comments; there is no immutable seq-add.
  if (absentGlobs.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refSeq = getOrSeedRefSeq(doc) as any;
    absentGlobs.forEach((glob) => refSeq.add(glob));
  }

  // findsert the budget cap — only when the consumer declares none, so a chosen value survives.
  // attach the NOTE above the `budget:` key so the plain-5000 yaml trap is warned where it lands.
  if (budgetAbsent) {
    doc.setIn(['budget', 'tokens'], declaredBudgetTokens);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const budgetPair = (doc.contents as any)?.items?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => yaml.isScalar(item.key) && item.key.value === 'budget',
    );
    if (budgetPair?.key) budgetPair.key.commentBefore = declaredBudgetComment;
  }

  return doc.toString();
};

/**
 * .what = throws when a consumer's boot.yml lacks a declared ref glob (or is absent entirely).
 * .why  = `check` is the GATE: declapract runs `fix` only when `check` rejects. so this is what makes
 *         an upgrade actually union the deep-variant ref demotions AND findsert the budget cap into a
 *         consumer that lacks them.
 * .note = best-practice semantics are inverted — a THROW means the practice is violated, a return
 *         means it is followed. see `.agent/repo=.this/role=any/briefs/declapract-check-semantics.md`.
 *         the equality is against the FINDSERT output (globs unioned, budget cap ensured), never the
 *         whole template, so a consumer's own boot entries pass the check untouched.
 */
export const check: FileCheckFunction = (contents, context) => {
  expect(contents).toEqual(
    defineExpectedContents(contents, context.declaredFileContents ?? ''),
  );
};

/**
 * .what = unions the declared ref globs into a consumer's boot.yml and findserts the budget cap (or
 *         writes the template if absent).
 * .why  = fix forward once, for every consumer — never a whole-file overwrite that would drop a
 *         consumer's own say/ref curation (#105 req 1).
 */
export const fix: FileFixFunction = (contents, context) => {
  return {
    contents: defineExpectedContents(
      contents,
      context.declaredFileContents ?? '',
    ),
  };
};
