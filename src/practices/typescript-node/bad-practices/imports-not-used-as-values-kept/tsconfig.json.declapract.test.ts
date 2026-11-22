import type { FileCheckContext } from 'declapract';
import { given, then } from 'test-fns';

import { check as checkRemoved } from '../tsconfig-options-removed-in-ts7/tsconfig.json.declapract';
import { check } from './tsconfig.json.declapract';

const NOT_DETECTED = 'does not match bad practice';

/**
 * .what = a check context rooted at a named dir; the check reads the contents, and the root keys its notice
 */
const asContextAt = (input: { root: string }) =>
  ({ getProjectRootDirectory: () => input.root }) as FileCheckContext;
const context = asContextAt({ root: '/repo-cases' });

// the cases below each print a notice to stderr; mute it, so the run log stays legible
beforeAll(() => jest.spyOn(process.stderr, 'write').mockImplementation(() => true));
afterAll(() => jest.restoreAllMocks());

const asTsconfig = (input: { options: string }): string =>
  `{\n  "compilerOptions": {\n    "strict": true,\n${input.options}\n  }\n}\n`;

const DETECTED_CASES = [
  {
    description: '"preserve"',
    contents: asTsconfig({ options: `    "importsNotUsedAsValues": "preserve"` }),
  },
  {
    description: '"error", after a comment',
    contents: asTsconfig({ options: `    // fail on type-only imports\n    "importsNotUsedAsValues": "error"` }),
  },
];

const SKIPPED_CASES = [
  {
    description: '"remove", the default the automatic fix drops',
    contents: asTsconfig({ options: `    "importsNotUsedAsValues": "remove"` }),
  },
  {
    description: 'no importsNotUsedAsValues',
    contents: asTsconfig({ options: `    "noEmit": true` }),
  },
  {
    description: 'a "preserve" in a comment alone',
    contents: asTsconfig({ options: `    // "importsNotUsedAsValues": "preserve"\n    "noEmit": true` }),
  },
  { description: 'an absent file', contents: null },
];

describe('typescript-node imports-not-used-as-values-kept', () => {
  given('[case1] a tsconfig whose importsNotUsedAsValues asks for more than the default', () => {
    DETECTED_CASES.map((thisCase) =>
      then(`the check flags ${thisCase.description}`, () => {
        expect(() => check(thisCase.contents, context)).not.toThrow();
      }),
    );
    DETECTED_CASES.map((thisCase) =>
      then(`the automatic removed-in-ts7 check leaves ${thisCase.description} to a human`, () => {
        expect(() => checkRemoved(thisCase.contents, context)).toThrow(NOT_DETECTED);
      }),
    );
  });

  given('[case2] a tsconfig whose importsNotUsedAsValues drops with no change, or is absent', () => {
    SKIPPED_CASES.map((thisCase) =>
      then(`the check skips ${thisCase.description}`, () => {
        expect(() => check(thisCase.contents, context)).toThrow(NOT_DETECTED);
      }),
    );
  });

  given('[case3] a flagged tsconfig, checked twice in one repo', () => {
    then('stderr names the move once, and points at the readme', () => {
      const writes: string[] = [];
      jest.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
        writes.push(String(chunk));
        return true;
      });
      const contextOnce = asContextAt({ root: '/repo-notice' });
      check(DETECTED_CASES[0]!.contents, contextOnce);
      check(DETECTED_CASES[0]!.contents, contextOnce);
      const notice = writes.join('');
      expect(notice.split('importsNotUsedAsValues "preserve" kept').length - 1).toEqual(1);
      expect(notice).toContain('TS5023');
      expect(notice).toContain('verbatimModuleSyntax');
      expect(notice).toContain('imports-not-used-as-values-kept/.declapract.readme.md');
      // no snapshot here: a `__snapshots__` file in a declaration dir is read as a declared file, so the
      // integration plan test snaps the notice instead
    });
  });
});
