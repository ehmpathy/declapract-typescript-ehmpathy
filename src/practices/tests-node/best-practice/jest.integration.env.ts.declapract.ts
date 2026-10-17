import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { ConstraintError } from 'helpful-errors';

import {
  defineExpectedContentsWithUsecaseInserts,
  type UsecaseInsert,
} from '../../../utils/defineExpectedContentsWithUsecaseInserts';

/**
 * .what = the `jest.integration.env.ts` tests-node declares, usecase-aware for persist-with-dynamodb
 * .why  = tests-node is the one owner of this file (#630). a dynamodb service also needs its
 *         integration suite pointed at the local dynamodb container, so the dynamodb delta rides
 *         here as two inserts — a relative `access` import and the endpoint assignment — rather
 *         than as a second declaration of the same file (rule.avoid.runtime-forks).
 * .why  = a FINDSERT, never EQUALS: the base must still equal the template, but the dynamodb
 *         inserts, once present, are kept under every scope — so a narrow
 *         `declapract apply --practice tests-node`, where persist-with-dynamodb goes dark from
 *         `context.projectPractices`, never strips them.
 * .note = the import is RELATIVE: a jest env loads before moduleNameMapper settles the `@src` alias.
 */
export const DYNAMODB_INSERTS: UsecaseInsert[] = [
  {
    after: "import { useWakeOfTestdb } from './src/.test/useWakeOfTestdb';",
    text: "\nimport { access } from './src/utils/environment';",
  },
  {
    after: 'useWakeOfTestdb();',
    text: [
      '',
      '',
      '/**',
      ' * .what = point dynamodb at the local dynamodb container, under the test access',
      ' * .why = a dynamodb suite must never reach a live table',
      ' */',
      "if (access === 'test')",
      "  process.env.USE_CUSTOM_DYNAMODB_ENDPOINT = 'http://localhost:7337';",
    ].join('\n'),
  },
];

/**
 * .what = the contents this declaration expects, for the repo's extant file and usecase
 */
const defineExpectedContents = (input: {
  contents: string | null;
  declared: string;
  projectPractices: string[];
}): string =>
  defineExpectedContentsWithUsecaseInserts({
    contents: input.contents,
    declared: input.declared,
    inserts: DYNAMODB_INSERTS,
    usecaseInScope: input.projectPractices.includes('persist-with-dynamodb'),
  });

/**
 * .what = throws when the repo's env file differs from the declared base + its owed inserts
 */
export const check: FileCheckFunction = (contents, context) => {
  const expected = defineExpectedContents({
    contents,
    declared: context.declaredFileContents ?? '',
    projectPractices: context.projectPractices,
  });
  if (contents !== expected)
    throw new ConstraintError(
      'jest.integration.env.ts differs from the declared template (plus its usecase inserts)',
      { relativeFilePath: context.relativeFilePath },
    );
};

/**
 * .what = writes the declared base, plus the dynamodb inserts when owed or already present
 * .note = a fixed point: `fix(fix(x)) === fix(x)`, and `check` passes on its output.
 */
export const fix: FileFixFunction = (contents, context) => ({
  contents: defineExpectedContents({
    contents,
    declared: context.declaredFileContents ?? '',
    projectPractices: context.projectPractices,
  }),
});
