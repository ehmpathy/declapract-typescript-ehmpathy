import type { FileCheckContext, FileFixContext } from 'declapract';
import { getError, given, then, when } from 'test-fns';

import {
  MARKER_BEGIN,
  MARKER_END,
  check,
  fix,
} from './best-practice/metro.config.js.declapract';

/**
 * .what = a declared template in the shape the real one holds: a base, then one marked block
 * .why  = the unit grain reads no file; the integration test reads the shipped template
 */
const declared = [
  "const { getDefaultConfig } = require('expo/metro-config');",
  'module.exports = getDefaultConfig(__dirname);',
  '',
  MARKER_BEGIN,
  '{ module.exports.cacheVersion = `access=${process.env.ACCESS}`; }',
  MARKER_END,
  '',
].join('\n');

/**
 * .what = the minimal context the check and fix read
 * .why  = both read only `declaredFileContents`; the one documented cast is the sanctioned
 *         test-context idiom (howto.add-bad-practice.md), confined to this helper
 */
const asContext = (): FileCheckContext & FileFixContext =>
  ({ declaredFileContents: declared }) as unknown as FileCheckContext &
    FileFixContext;

/**
 * .what = the contents a fix emits for the given found contents
 * .why  = names the read so each case states what it fixes
 */
const asFixed = async (input: { found: string | null }): Promise<string> => {
  const result = await fix(input.found, asContext());
  return result.contents ?? '';
};

const repoOwn = [
  "const { getDefaultConfig } = require('expo/metro-config');",
  'const config = getDefaultConfig(__dirname);',
  'config.resolver.blockList = [/\\.play\\.test\\.tsx?$/]; // the repo own line',
  'module.exports = config;',
  '',
].join('\n');

describe('metro.config.js — access-keyed cache findsert (#618, #676)', () => {
  given('[case1] the file is absent', () => {
    when('[t0] fix runs', () => {
      then('it writes the full template', async () => {
        expect(await asFixed({ found: null })).toEqual(declared);
      });
    });
  });

  given("[case2] the repo's own metro.config.js, with no block", () => {
    when('[t0] check runs', () => {
      then('it fails', async () => {
        const error = await getError(async () => check(repoOwn, asContext()));
        expect(error.message).toContain('lacks the declared');
      });
    });

    when('[t1] fix runs', () => {
      then("the repo's own lines stay, and the block lands after them", async () => {
        const fixed = await asFixed({ found: repoOwn });
        expect(fixed.startsWith(repoOwn.trimEnd())).toEqual(true);
        expect(fixed).toContain('the repo own line');
        expect(fixed.indexOf('module.exports = config;')).toBeLessThan(
          fixed.indexOf(MARKER_BEGIN),
        );
        expect(fixed).toMatchSnapshot('repo own + block');
      });

      then('the output is a fixed point, and check passes on it', async () => {
        const once = await asFixed({ found: repoOwn });
        const twice = await asFixed({ found: once });
        expect(twice).toEqual(once);
        expect(() => check(once, asContext())).not.toThrow();
        expect(once.split(MARKER_BEGIN).length - 1).toEqual(1);
      });
    });
  });

  given('[case3] a file whose block drifted from the declaration', () => {
    const drifted = `${repoOwn}\n${MARKER_BEGIN}\n{ /* stale */ }\n${MARKER_END}\n// a trailer line\n`;

    when('[t0] fix runs', () => {
      then('it swaps the span in place, and leaves the lines around it', async () => {
        const fixed = await asFixed({ found: drifted });
        expect(fixed).not.toContain('stale');
        expect(fixed).toContain('access=${process.env.ACCESS}');
        expect(fixed).toContain('// a trailer line');
        expect(fixed.split(MARKER_BEGIN).length - 1).toEqual(1);
        expect(() => check(fixed, asContext())).not.toThrow();
      });
    });
  });

  given('[case4] a file that holds one marker without its pair', () => {
    when('[t0] fix runs', () => {
      then('it fails loud with a hint, and never guesses', async () => {
        const error = await getError(async () =>
          asFixed({ found: `${repoOwn}\n${MARKER_BEGIN}\n` }),
        );
        expect(error.message).toContain('without its pair');
      });
    });
  });
});
