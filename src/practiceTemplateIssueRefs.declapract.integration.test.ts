import { readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { given, then, when } from 'test-fns';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = clamps that no emitted best-practice template carries a bare issue ref (`#123`) or a
 *         `todo:` (#648).
 * .why  = a template is read in the consumer's tree. there a bare `#123` reads as the consumer's
 *         own issue 123, which is some other ticket or none; and a `todo:` is a chore this repo
 *         owes, handed to every adopter to puzzle over. a repo-qualified ref (`sdk-aws-lambda#42`)
 *         resolves from anywhere, so it stays allowed.
 * .teeth = add `// see #123` to any best-practice file and case1 goes red, with the file and line.
 * .note = `*.declapract.*` files (declarations, readmes, tests) are never emitted, so they may cite
 *         this repo's issues freely.
 */

const repoRoot = join(__dirname, '..');
const practicesDir = join(repoRoot, 'src/practices');

/**
 * .what = a bare issue ref: `#` + 2-4 digits, not preceded by a word, path, or repo name
 */
const BARE_ISSUE_REF = /(^|[^\w/.-])#[0-9]{2,4}\b/;

/**
 * .what = a todo marker
 */
const TODO_MARKER = /\btodo:/i;

/**
 * .what = every emitted best-practice template, as an absolute path
 * .note = a `src/.test/` dir INSIDE a best-practice tree is an emitted template (useKeyrack.ts),
 *         so this walk enters `.test`; the `/best-practice/` filter drops the fixture dirs
 */
const getAllEmittedTemplatePaths = (): string[] =>
  getAllPathsUnderDir({
    dir: practicesDir,
    skip: PRACTICE_TREE_SKIP_DIRS.filter((dir) => dir !== '.test'),
  })
    .filter((path) => path.includes('/best-practice/'))
    .filter((path) => !path.includes('/.test/assets/'))
    .filter((path) => !basename(path).includes('.declapract.'));

/**
 * .what = each `file:line` of an emitted template that carries a bare issue ref or a todo
 */
const getAllOffenses = (): string[] =>
  getAllEmittedTemplatePaths().flatMap((path) =>
    readFileSync(path, 'utf-8')
      .split('\n')
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => BARE_ISSUE_REF.test(line) || TODO_MARKER.test(line))
      .map(
        ({ line, index }) =>
          `${relative(repoRoot, path)}:${index + 1}: ${line.trim()}`,
      ),
  );

describe('practice templates carry no bare issue ref nor todo (#648)', () => {
  given('[case1] every emitted best-practice template under src/practices', () => {
    when('[t0] each line is read', () => {
      then('the walk found templates to read', () => {
        expect(getAllEmittedTemplatePaths().length).toBeGreaterThan(100);
      });

      then('no line holds a bare `#NNN` or a `todo:`', () => {
        expect(getAllOffenses()).toEqual([]);
      });
    });
  });

  given('[case3] every review marker a fix writes into a consumer file', () => {
    when('[t0] each marker line the snapshots record is read', () => {
      // the snapshots hold the bytes a fix emits; a test title (`exports[…`) is not emitted
      const markerLines = getAllPathsUnderDir({
        dir: join(repoRoot, 'src'),
        skip: ['node_modules'],
      })
        .filter((path) => path.endsWith('.snap'))
        .flatMap((path) =>
          readFileSync(path, 'utf-8')
            .split('\n')
            .filter((line) => line.includes('@declapract:review'))
            .filter((line) => !line.startsWith('exports['))
            .map((line) => `${relative(repoRoot, path)}: ${line.trim()}`),
        );

      then('the walk found markers to read', () => {
        expect(markerLines.length).toBeGreaterThan(10);
      });

      then('no marker holds a bare `#NNN`; a ref names this repo', () => {
        expect(markerLines.filter((line) => BARE_ISSUE_REF.test(line))).toEqual(
          [],
        );
      });
    });
  });

  given('[case2] the matchers themselves', () => {
    when('[t0] each shape is tested', () => {
      then('a bare ref matches, a repo-qualified ref does not', () => {
        expect(BARE_ISSUE_REF.test('// see #123')).toBe(true);
        expect(BARE_ISSUE_REF.test('(#585) the key')).toBe(true);
        expect(BARE_ISSUE_REF.test('# 123 title')).toBe(false);
        expect(BARE_ISSUE_REF.test('sdk-aws-lambda#42')).toBe(false);
        expect(BARE_ISSUE_REF.test('https://x.com/a#123')).toBe(false);
        expect(BARE_ISSUE_REF.test('color: #fff')).toBe(false);
      });

      then('a todo matches in any case', () => {
        expect(TODO_MARKER.test('// todo: fix it')).toBe(true);
        expect(TODO_MARKER.test('# TODO: fix it')).toBe(true);
        expect(TODO_MARKER.test('todos are fine')).toBe(false);
      });
    });
  });
});
