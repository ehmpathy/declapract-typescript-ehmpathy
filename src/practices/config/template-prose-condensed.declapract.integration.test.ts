import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps that the `src/utils/config/*` templates carry short comments: no run of comment
 *         lines longer than four, and no `.name` defense (#690).
 * .why  = every adopter inherits these files, and every reader pays for their prose. the long
 *         rationale lives in each practice's `.declapract.readme.md`, with a pointer left behind.
 * .teeth = restore an 8-line as-cast note into getConfig.ts and its case reddens with the run.
 */

const REPO_ROOT = join(__dirname, '../../..');
const TEMPLATES = [
  'src/practices/config/best-practice/src/utils/config/getConfig.ts',
  'src/practices/persist-with-rds/best-practice/src/utils/config/config.schema.ts',
];
const MAX_COMMENT_RUN = 4;

/**
 * .what = the longest run of consecutive comment lines in a source, with the line it starts at
 */
const getOneLongestCommentRun = (input: {
  source: string;
}): { length: number; startLine: number } =>
  input.source.split('\n').reduce(
    (acc, line, index) => {
      const isComment = /^\s*(\/\/|\/\*\*|\*)/.test(line);
      const current = isComment ? acc.current + 1 : 0;
      const start = isComment && acc.current === 0 ? index + 1 : acc.start;
      return current > acc.longest.length
        ? { current, start, longest: { length: current, startLine: start } }
        : { current, start, longest: acc.longest };
    },
    { current: 0, start: 0, longest: { length: 0, startLine: 0 } },
  ).longest;

describe('config templates carry condensed prose (#690)', () => {
  TEMPLATES.forEach((relPath) =>
    given(`[case] ${relPath}`, () => {
      const source = readFileSync(join(REPO_ROOT, relPath), 'utf8');

      when('[t0] its comments are read', () => {
        then(`no run of comment lines exceeds ${MAX_COMMENT_RUN}`, () => {
          const run = getOneLongestCommentRun({ source });
          expect({ relPath, ...run, overMax: run.length > MAX_COMMENT_RUN }).toEqual({
            relPath,
            ...run,
            overMax: false,
          });
        });

        then('no `.name` defense block', () => {
          expect(source).not.toContain('.name =');
        });
      });
    }),
  );
});
