import type { FileCheckContext } from 'declapract';
import { given, then } from 'test-fns';

import { check } from './*.ts.declapract';

const NOT_DETECTED = 'does not match bad practice';
const context = { getProjectRootDirectory: () => '/repo-cases' } as FileCheckContext; // the root keys its notice

// a flag prints its notice to stderr once per root; mute it, so the run log stays legible
beforeAll(() => jest.spyOn(process.stderr, 'write').mockImplementation(() => true));
afterAll(() => jest.restoreAllMocks());

const DETECTED_CASES = [
  { description: 'a namespace import', source: `import * as ts from 'typescript';` },
  { description: 'a default import', source: `import ts from "typescript";` },
  { description: 'a type-only import', source: `import type { Node } from 'typescript';` },
  { description: 'a re-export', source: `export { SyntaxKind } from 'typescript';` },
  { description: 'an import-equals', source: `import ts = require('typescript');` },
  {
    description: 'a require deep in a function',
    source: `export const f = () => { const ts = require('typescript'); return ts; };`,
  },
  { description: 'a dynamic import', source: `export const g = async () => import('typescript');` },
  {
    description: 'a type-position import',
    source: `export const h = (node: import('typescript').Node) => node;`,
  },
];

const SKIPPED_CASES = [
  { description: 'the compat package', source: `import * as ts from '@typescript/typescript6';` },
  { description: 'a typescript subpath', source: `import x from 'typescript/lib/tsserverlibrary';` },
  {
    description: 'a type-position import of the compat package',
    source: `export const h = (node: import('@typescript/typescript6').Node) => node;`,
  },
  {
    description: 'a mention in a comment and a string',
    source: `// import ts from 'typescript';\nexport const name = "from 'typescript'";`,
  },
];

describe('typescript-node compiler-api-from-typescript', () => {
  given('[case1] a source that loads the typescript module', () => {
    DETECTED_CASES.map((thisCase) =>
      then(`the check flags ${thisCase.description}`, () => {
        expect(() => check(thisCase.source, context)).not.toThrow();
      }),
    );
  });

  given('[case2] a source that does not load the typescript module', () => {
    SKIPPED_CASES.map((thisCase) =>
      then(`the check skips ${thisCase.description}`, () => {
        expect(() => check(thisCase.source, context)).toThrow(NOT_DETECTED);
      }),
    );
  });

  given('[case3] two flagged files in one repo', () => {
    then('stderr names the two-step swap once, and points at the readme', () => {
      const writes: string[] = [];
      jest.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
        writes.push(String(chunk));
        return true;
      });
      const contextOnce = { getProjectRootDirectory: () => '/repo-notice' } as FileCheckContext;
      check(DETECTED_CASES[0]!.source, contextOnce);
      check(DETECTED_CASES[1]!.source, contextOnce);
      const notice = writes.join('');
      expect(notice.split('compiler api read from `typescript`').length - 1).toEqual(1);
      expect(notice).toContain('pnpm add @typescript/typescript6@6.0.2');
      expect(notice).toContain('compiler-api-from-typescript/.declapract.readme.md');
      // no snapshot here: a `__snapshots__` file in a declaration dir is read as a declared file, so the
      // integration plan test snaps the notice instead
    });
  });
});
