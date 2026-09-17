import type { FileCheckFunction, FileFixFunction } from 'declapract';
import * as ts from 'typescript';

// `Stage.DEVELOPMENT` (value `'dev'`) was overloaded across two axes: the access
// (→ 'prep') and the deploy-stage slug (→ 'dev'). a rewrite cannot know which axis a given
// occurrence sits on. so the fix NEVER guesses it: `Stage.PRODUCTION` and `Stage.TEST` are
// unambiguous and migrate to `'prod'` / `'test'`, but `Stage.DEVELOPMENT` is LEFT IN PLACE.
// because it is left, `check` still detects it, so `declapract plan` stays RED until a
// human decides the axis by hand — the loud, plan-visible "leave the file in violation"
// signal guard #3 demands, never a green plan that hides a possibly-wrong `'prep'` guess.
//
// a red plan alone does not say WHERE the unsettled reference sits or WHAT the human must
// do, so the fix also inserts a `// @declapract:review:` COMMENT directly above each
// `Stage.DEVELOPMENT` line. the comment names the file location (it rides the very line) and
// the choice to make (an access, or the deploy-stage slug). it is a COMMENT, not a value
// splice — the real `Stage.DEVELOPMENT` property access is untouched — so it neither guesses a
// value NOR clears the check (a comment is not a property-access node, so the parser still
// detects the real reference and `plan` stays red). idempotent: a line that already holds the
// marker is skipped, so a second `fix` pass adds no second marker.
//
// this pairs with, and is deliberately UNLIKE, an earlier shape that rewrote
// `Stage.DEVELOPMENT` → `'prep' /* marker */`. that VALUE-SPLICE shape (a) still GUESSED
// `'prep'` (a deploy-stage occurrence, whose correct value is `'dev'`, was silently
// mis-migrated), and (b) once it rewrote the reference, the check no longer matched, so `plan`
// read CLEAN with a possibly-wrong value — the exact silent-break class this wish exists to
// retire. the COMMENT marker forecloses both: no value is emitted (no guess), and the
// still-red plan cannot hide the unsettled axis — it now carries the pointer + the hint.

/**
 * .what = find every `Stage.<member>` reference in real code, via the typescript parser. three
 *         node shapes carry it: a value-position PROPERTY ACCESS (`Stage.PRODUCTION`), a
 *         type-position QUALIFIED NAME (`x: Stage.PRODUCTION`), and a bracket ELEMENT ACCESS with a
 *         string-literal key (`Stage['PRODUCTION']`). all three name the same enum member and must
 *         migrate together.
 * .why  = the parser classifies every token exactly, so a `Stage.PRODUCTION` that sits inside a
 *         comment, a string literal, a template literal's static text, or a REGEX literal is that
 *         token's own text — never one of these three nodes — and is therefore invisible to this
 *         walk BY CONSTRUCTION. a live `${Stage.X}` interpolation, by contrast, IS a property
 *         access and is found. this forecloses the whole "a value spliced into a non-code span"
 *         corruption class that a hand-rolled character mask could only chase one token position
 *         at a time — a `/` after `}`/`)`/`]`, a regex nested in a `${...}`, a brace inside an
 *         interpolated string — each a fresh hole. the parser has none. and the type + bracket
 *         positions close the mirror hole: a `Stage.DEVELOPMENT` in a type annotation or a
 *         `Stage['DEVELOPMENT']` bracket lookup is just as axis-ambiguous as the value form, so it
 *         too must keep `check` red until a human settles it.
 * .note = a `Stage.X` is matched wherever the top-level identifier `Stage` is accessed. a consumer
 *         that shadows the enum with its own object literally named `Stage` is an accepted,
 *         disclosed residual — the org-standard enum name is not re-used locally in practice.
 */
type StageAccess = { member: string; start: number; end: number };

const getStageAccesses = (contents: string): StageAccess[] => {
  const source = ts.createSourceFile(
    'stage-scan.ts',
    contents,
    ts.ScriptTarget.Latest,
    true, // setParentNodes — so getStart(source) reads real offsets
    ts.ScriptKind.TS,
  );
  const accesses: StageAccess[] = [];
  const visit = (node: ts.Node): void => {
    // value position: `Stage.PRODUCTION`
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Stage'
    )
      accesses.push({
        member: node.name.text,
        start: node.getStart(source),
        end: node.getEnd(),
      });

    // type position: `x: Stage.PRODUCTION` (a QualifiedName, `left.right`)
    if (
      ts.isQualifiedName(node) &&
      ts.isIdentifier(node.left) &&
      node.left.text === 'Stage'
    )
      accesses.push({
        member: node.right.text,
        start: node.getStart(source),
        end: node.getEnd(),
      });

    // bracket position: `Stage['PRODUCTION']` (an ElementAccess with a string-literal key)
    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Stage' &&
      ts.isStringLiteral(node.argumentExpression)
    )
      accesses.push({
        member: node.argumentExpression.text,
        start: node.getStart(source),
        end: node.getEnd(),
      });

    ts.forEachChild(node, visit);
  };
  visit(source);
  return accesses;
};

// only PRODUCTION + TEST are unambiguous (prod → 'prod', test → 'test'). DEVELOPMENT is
// axis-ambiguous and is deliberately NOT mapped here — it is never rewritten.
const replacementFor = (member: string): string =>
  member === 'PRODUCTION' ? "'prod'" : "'test'";

/**
 * .what = replace every unambiguous `Stage.PRODUCTION`/`Stage.TEST` PROPERTY ACCESS with its
 *         string literal, spliced into the ORIGINAL at the parser's node offsets — so a comment,
 *         string, template-static, or regex mention is preserved byte-for-byte (it is not a
 *         property-access node, so it is never in the splice set). `Stage.DEVELOPMENT` is never in
 *         the set, so it is left in place (never guessed).
 * .why  = keeps `fix` a what-not-how read; the splice + offset math lives in this one op.
 */
const withUnambiguousStageRefsReplaced = (input: {
  contents: string;
}): string => {
  const accesses = getStageAccesses(input.contents)
    .filter(
      (access) => access.member === 'PRODUCTION' || access.member === 'TEST',
    )
    .sort((a, b) => a.start - b.start);
  // a pure fold over the sorted accesses — carries { spliced, last } with no mutable accumulator
  // (rule.forbid.maintenance-hazards). each step appends the gap since the prior splice plus this
  // member's literal, then advances the cursor past the property access.
  const { spliced, last } = accesses.reduce(
    (acc, access) => ({
      spliced:
        acc.spliced +
        input.contents.slice(acc.last, access.start) +
        replacementFor(access.member),
      last: access.end,
    }),
    { spliced: '', last: 0 },
  );
  return spliced + input.contents.slice(last);
};

/**
 * .what = drop the now-unused `Stage` named-import specifier — ONLY when no real-code `Stage.`
 *         reference remains. done via the parser, so the `Stage` specifier is dropped wherever it
 *         sits in the named-bindings list — first (`{ Stage, A }`), last (`{ A, Stage }`), or MIDDLE
 *         (`{ A, Stage, B }`) — and the surviving specifiers are preserved verbatim. when `Stage`
 *         is the sole specifier, the whole import statement (and its trailing newline) is removed.
 * .why  = a leftover `Stage.DEVELOPMENT` still needs the import to compile, so the import is kept
 *         while any real reference survives; keeps `fix` a what-not-how read. the parser finds the
 *         specifier by its position in the list, so a mid-list `Stage` — which a first/last-only
 *         regex silently skips, leaving a dead import that fails the lint — is dropped like any
 *         other. a comment/string mention of `Stage` is not an import specifier, so it is untouched.
 */
const withUnusedStageImportRemoved = (input: { contents: string }): string => {
  if (getStageAccesses(input.contents).length > 0) return input.contents;

  const source = ts.createSourceFile(
    'stage-import-scan.ts',
    input.contents,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  // find the `Stage` named-import specifier + the NamedImports list it sits in, via the parser
  const found = source.statements.reduce<{
    named: ts.NamedImports;
    decl: ts.ImportDeclaration;
  } | null>((hit, statement) => {
    if (hit) return hit;
    if (!ts.isImportDeclaration(statement)) return null;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) return null;
    const hasStage = bindings.elements.some(
      (specifier) => specifier.name.text === 'Stage',
    );
    return hasStage ? { named: bindings, decl: statement } : null;
  }, null);

  // no `Stage` specifier to drop → leave the file byte-for-byte
  if (!found) return input.contents;

  // the survivors — every specifier that is not `Stage`, kept verbatim by their source text
  const survivors = found.named.elements.filter(
    (specifier) => specifier.name.text !== 'Stage',
  );

  // sole specifier → remove the whole import statement, including its trailing newline
  if (survivors.length === 0) {
    const declStart = found.decl.getStart(source);
    const declEnd = found.decl.getEnd();
    const withTrailingNewline =
      input.contents[declEnd] === '\n' ? declEnd + 1 : declEnd;
    return (
      input.contents.slice(0, declStart) +
      input.contents.slice(withTrailingNewline)
    );
  }

  // otherwise, rebuild the named-bindings list from the survivors + splice it over the original
  const rebuilt = `{ ${survivors
    .map((specifier) => specifier.getText(source))
    .join(', ')} }`;
  return (
    input.contents.slice(0, found.named.getStart(source)) +
    rebuilt +
    input.contents.slice(found.named.getEnd())
  );
};

// the review pointer inserted above each axis-ambiguous `Stage.DEVELOPMENT` line. it names WHERE
// (it rides the reference's line) and WHAT (pick an access, or the deploy-stage slug). the
// literal `Stage.DEVELOPMENT` text here sits in a `//` comment, so the parser never reads it as a
// property access — it never keeps the check red on its own, and it never adds a second real ref.
const REVIEW_MARKER =
  "// @declapract:review: Stage.DEVELOPMENT is axis-ambiguous — pick by hand: an access ('test'|'prep'|'prod') or the deploy-stage slug ('dev'), then delete this marker";

/**
 * .what = insert a `// @declapract:review:` comment above each `Stage.DEVELOPMENT` line, once.
 * .why  = the fix leaves `Stage.DEVELOPMENT` in place so `plan` stays red (guard #3), but a bare
 *         red plan names neither the file/line nor the axis to pick. the comment supplies both,
 *         without a value guess and without a cleared check (a comment is not a property access).
 *         each line is marked at most once (idempotent), so a re-apply is a no-op.
 */
const withDevelopmentAxisReviewMarker = (input: {
  contents: string;
}): string => {
  // the start offset of every line that holds a real `Stage.DEVELOPMENT` property access
  const lineStarts = Array.from(
    new Set(
      getStageAccesses(input.contents)
        .filter((access) => access.member === 'DEVELOPMENT')
        .map(
          (access) => input.contents.lastIndexOf('\n', access.start - 1) + 1,
        ),
    ),
  ).sort((a, b) => b - a); // splice bottom-up so lower offsets stay valid

  // a pure fold over the bottom-up line starts — carries the text-so-far with no mutable
  // accumulator (rule.forbid.maintenance-hazards). each step splices the marker above its line, or
  // returns the text unchanged when the contiguous comment block just above already holds the
  // marker (idempotent).
  return lineStarts.reduce((out, lineStart) => {
    const indent = out.slice(lineStart).match(/^[ \t]*/)?.[0] ?? '';

    // idempotent guard: walk up the CONTIGUOUS `//` comment block directly above this line and skip
    // if any of its lines already holds the marker. a single-line check above would miss a marker
    // that a reformat pushed one line up (e.g. a blank-less comment now sits between it and the
    // reference), so it would double-insert. the block scan sees the whole comment run.
    const priorBlockHoldsMarker = (() => {
      const walk = (cursor: number): boolean => {
        if (cursor === 0) return false;
        const priorStart = out.lastIndexOf('\n', cursor - 2) + 1;
        const priorLine = out.slice(priorStart, cursor - 1);
        if (priorLine.includes('@declapract:review')) return true;
        // stop at the first non-comment line — the comment block ends there
        if (!priorLine.trimStart().startsWith('//')) return false;
        return walk(priorStart);
      };
      return walk(lineStart);
    })();
    if (priorBlockHoldsMarker) return out;

    return (
      out.slice(0, lineStart) +
      indent +
      REVIEW_MARKER +
      '\n' +
      out.slice(lineStart)
    );
  }, input.contents);
};

export const check: FileCheckFunction = (contents) => {
  if (!contents)
    throw new Error(
      'does not match bad practice: file has no contents to scan for a Stage.* enum reference',
    );

  // detect a `Stage.<member>` PROPERTY ACCESS in real code, via the parser. a comment/string/
  // regex/template-static mention is not a property-access node, so it never keeps the check red
  // after the fix (it would never clear). the check detects ALL three members — a DEVELOPMENT
  // reference must keep the check red so `plan` stays visibly unsettled.
  const accesses = getStageAccesses(contents);
  if (accesses.length > 0) return; // bad practice detected

  throw new Error(
    'does not match bad practice: no Stage.PRODUCTION|DEVELOPMENT|TEST property access found in real code (a comment/string/regex/template-static mention is ignored)',
  );
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  // migrate the unambiguous members, mark each axis-ambiguous `Stage.DEVELOPMENT` with a review
  // pointer, then drop the Stage import when no reference remains. `Stage.DEVELOPMENT` is left in
  // place (never guessed), so `check` still detects it and `plan` stays red until a human decides
  // the axis — now with a `// @declapract:review:` line naming where + what.
  const spliced = withUnambiguousStageRefsReplaced({ contents });
  const marked = withDevelopmentAxisReviewMarker({ contents: spliced });
  const fixed = withUnusedStageImportRemoved({ contents: marked });

  return { contents: fixed };
};
