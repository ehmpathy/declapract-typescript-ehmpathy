import { readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { given, then, when } from 'test-fns';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = clamps that every emitted best-practice template ends with a newline (#689)
 * .why  = a template lands byte for byte in the consumer's tree. one with no final newline makes
 *         the consumer's editor or formatter append one, and the next apply strips it again, so
 *         the file flips on every upgrade and every save.
 * .teeth = drop the final newline from any best-practice template and this goes red, by path.
 * .note = `*.declapract.*` files are never emitted, so they are not read here. an empty file
 *         holds no line to end, so it passes.
 */

const repoRoot = join(__dirname, '..');
const practicesDir = join(repoRoot, 'src/practices');

/**
 * .what = every emitted best-practice template, as an absolute path
 * .note = a `src/.test/` dir inside a best-practice tree is emitted, so this walk enters `.test`;
 *         the `/best-practice/` filter drops the fixture dirs
 */
const getAllEmittedTemplatePaths = (): string[] =>
  getAllPathsUnderDir({
    dir: practicesDir,
    skip: PRACTICE_TREE_SKIP_DIRS.filter((dir) => dir !== '.test'),
  })
    .filter((path) => path.includes('/best-practice/'))
    .filter((path) => !path.includes('/.test/assets/'))
    .filter((path) => !basename(path).includes('.declapract.'));

describe('practice templates end with a newline (#689)', () => {
  given('[case1] every emitted best-practice template under src/practices', () => {
    when('[t0] the last byte of each is read', () => {
      const templates = getAllEmittedTemplatePaths();

      then('the walk found templates to read', () => {
        expect(templates.length).toBeGreaterThan(100);
      });

      then('each non-empty template ends with `\\n`', () => {
        const offenses = templates
          .filter((path) => {
            const contents = readFileSync(path, 'utf-8');
            return contents.length > 0 && !contents.endsWith('\n');
          })
          .map((path) => relative(repoRoot, path));
        expect(offenses).toEqual([]);
      });
    });
  });
});
