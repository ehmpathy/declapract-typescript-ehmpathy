import { readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { given, then, when } from 'test-fns';
import * as ts from 'typescript';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = clamps that every `.ts`/`.tsx` TEMPLATE a practice ships parses as valid typescript,
 *         and that no multi-line jsdoc inside one closes itself mid-line.
 * .why  = a template is copied verbatim into a consumer repo, where it is real source that the
 *         consumer's biome parses on every `pnpm fix`. a template that does not parse breaks
 *         `pnpm fix` in EVERY adopter at once, and no adopter can repair it for itself —
 *         `declapract apply` restores the shipped bytes (#613). this repo's own biome cannot
 *         catch it: `biome.jsonc` excludes the practice provision tree because templates carry
 *         `@declapract{}` syntax, so the templates are the one tree with no parse gate on it.
 *         this clamp is that gate.
 * .note = the hazard class is wider than any one line: ANY template may carry a glob or an arn
 *         inside a block comment, and a `*` immediately before a `/` there terminates the comment
 *         mid-prose. every character after it is read as code. that is how #613 shipped:
 *         `persist-with-rds`'s `resources.parameters.ts` emitted 17 parse errors in every
 *         adopter. so this clamps the CLASS (all templates), never the instance.
 * .teeth = write an iam arn or a glob into any template's jsdoc with a literal `*` immediately
 *          before a `/` — the shape #613 shipped in
 *          `persist-with-rds/best-practice/provision/aws/resources.parameters.ts` — and BOTH
 *          cases redden, with the offending path in the diff.
 * .note = the two cases are separate nets over one defect class, deliberately. case1 (parse)
 *         reads the property an adopter actually suffers. case2 (jsdoc shape) catches the
 *         silent variant case1 cannot see: a comment that self-closes and whose prose tail
 *         happens to parse as valid code, so the file is green and the note is corrupted.
 * .note = scope excludes `*.declapract.*` basenames — those are declapract MACHINERY (check
 *         declarations, unit clamps), never templates, and this repo's biome already parses
 *         the `*.declapract.ts` declarations. `bad-practices/` is excluded by construction:
 *         only `best-practice/` holds what ships.
 * .note = this is an INTEGRATION test (`readdirSync` + `readFileSync` cross the filesystem
 *         boundary, per `rule.forbid.unit.remote-boundaries`), and it lives at `src/` — not
 *         under any practice — so declapract never walks it for emission (#583).
 */

// anchored on `__dirname` (this file sits at `src/`) rather than cwd, so a nested-scope jest run
// cannot silently walk the wrong tree and assert on zero files (a vacuous green).
const repoRoot = join(__dirname, '..');
const practicesDir = join(repoRoot, 'src/practices');

const isShippedTsTemplate = (path: string): boolean =>
  /\.tsx?$/.test(path) &&
  path.includes('/best-practice/') &&
  !basename(path).includes('.declapract.');

const asDiagnosticSite = (diagnostic: ts.Diagnostic): string => {
  if (!diagnostic.file) return '';
  if (diagnostic.start === undefined) return '';
  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
    diagnostic.start,
  );
  return `:${line + 1}:${character + 1}`;
};

const asParseErrorLabel = (input: {
  path: string;
  diagnostic: ts.Diagnostic;
}): string =>
  [
    relative(repoRoot, input.path),
    asDiagnosticSite(input.diagnostic),
    ' ',
    ts.flattenDiagnosticMessageText(input.diagnostic.messageText, ' '),
  ].join('');

/**
 * .what = every syntactic error typescript reports for one template's source.
 * .why  = `transpileModule` runs the PARSER only — no type check, no module resolution — so a
 *         template that references packages the consumer installs (but this repo does not) is
 *         not a false red. the `@declapract{…}` placeholders sit inside string and template
 *         literals in every ts template, so they parse as ordinary string content.
 */
const getAllParseErrors = (input: { path: string; source: string }): string[] =>
  (
    ts.transpileModule(input.source, {
      fileName: input.path,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.Preserve,
      },
    }).diagnostics ?? []
  )
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => asParseErrorLabel({ path: input.path, diagnostic }));

const asLineNumber = (input: { source: string; at: number }): number =>
  input.source.slice(0, input.at).split('\n').length;

/**
 * .what = every multi-line jsdoc in one template whose closing delimiter lands mid-line instead
 *         of on a line of its own.
 * .why  = the house jsdoc shape closes on its own line, always. a close anywhere else on a
 *         multi-line block means the comment ended somewhere its author did not intend — which is
 *         exactly what a glob or an arn in the prose does.
 * .note = only a jsdoc that OPENS a line counts. the same opener sequence mid-line is almost
 *         always a glob inside a string literal, and to read that as a comment would red on a
 *         non-defect. a single-line jsdoc is left to the parse case, which sees its tail as code.
 */
const getAllJsdocSelfCloses = (input: {
  path: string;
  source: string;
}): string[] =>
  [...input.source.matchAll(/^[ \t]*\/\*\*/gm)].flatMap((opener) => {
    const openAt = opener.index ?? 0;
    // search from the final asterisk of the opener, so an empty block closes where it really does
    const closeAt = input.source.indexOf('*/', openAt + opener[0].length - 1);
    if (closeAt === -1) return []; // unterminated — the parse case owns that
    const openLine = asLineNumber({ source: input.source, at: openAt });
    const closeLine = asLineNumber({ source: input.source, at: closeAt });
    if (openLine === closeLine) return []; // single-line jsdoc — the parse case owns it
    const prefix = input.source.slice(
      input.source.lastIndexOf('\n', closeAt) + 1,
      closeAt,
    );
    if (/^[ \t]*$/.test(prefix)) return []; // the house shape: the delimiter alone on its line
    return [
      `${relative(repoRoot, input.path)}:${closeLine} jsdoc opened at line ${openLine} closes mid-line after «${prefix.trimStart()}»`,
    ];
  });

describe('every shipped ts template parses as valid typescript (#613)', () => {
  const templates = getAllPathsUnderDir({
    dir: practicesDir,
    skip: PRACTICE_TREE_SKIP_DIRS,
  })
    .filter(isShippedTsTemplate)
    .sort();

  const sources = templates.map((path) => ({
    path,
    source: readFileSync(path, 'utf8'),
  }));

  given('[case0] the src/practices best-practice tree', () => {
    when('[t0] the ts templates are walked', () => {
      // guards against a vacuous green: a walk that found zero files would pass both cases below
      then('at least one shipped ts template is found', () => {
        expect(templates.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case1] every shipped ts template', () => {
    when('[t0] each is handed to the typescript parser', () => {
      then('none reports a syntactic error', () => {
        const offenders = sources.flatMap(getAllParseErrors);
        expect(offenders).toEqual([]);
      });
    });
  });

  given('[case2] every multi-line jsdoc inside a shipped ts template', () => {
    when('[t0] each block comment is located', () => {
      then('none closes itself mid-line', () => {
        const offenders = sources.flatMap(getAllJsdocSelfCloses);
        expect(offenders).toEqual([]);
      });
    });
  });
});
