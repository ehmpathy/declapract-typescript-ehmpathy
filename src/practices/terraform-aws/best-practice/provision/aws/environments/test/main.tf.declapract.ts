import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { ConstraintError } from 'helpful-errors';

import {
  defineExpectedContentsWithUsecaseInserts,
  type UsecaseInsert,
} from '../../../../../../../utils/defineExpectedContentsWithUsecaseInserts';

/**
 * .what = the test-environment `main.tf` terraform-aws declares, usecase-aware for persist-with-dynamodb
 * .why  = terraform-aws is the one owner of this file (#630). a dynamodb service provisions the
 *         tables of its test environment into the local dynamodb container, so its aws provider
 *         gets an `endpoints` block — an insert on this owner, never a second declaration of the
 *         same file (rule.avoid.runtime-forks).
 * .why  = a FINDSERT, never EQUALS: the base must still equal the template, but the endpoints
 *         block, once present, is kept under every scope — a narrow
 *         `declapract apply --practice terraform-aws` never strips it.
 */
export const DYNAMODB_INSERTS: UsecaseInsert[] = [
  {
    after: 'provider "aws" {',
    text: [
      '',
      '  endpoints {',
      '    dynamodb = "http://localhost:7337/" # the test environment tables live in the local dynamodb',
      '  }',
      '',
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
 * .what = throws when the repo's test main.tf differs from the declared base + its owed inserts
 */
export const check: FileCheckFunction = (contents, context) => {
  const expected = defineExpectedContents({
    contents,
    declared: context.declaredFileContents ?? '',
    projectPractices: context.projectPractices,
  });
  if (contents !== expected)
    throw new ConstraintError(
      'provision/aws/environments/test/main.tf differs from the declared template (plus its usecase inserts)',
      { relativeFilePath: context.relativeFilePath },
    );
};

/**
 * .what = writes the declared base, plus the dynamodb endpoints block when owed or already present
 * .note = a fixed point: `fix(fix(x)) === fix(x)`, and `check` passes on its output.
 */
export const fix: FileFixFunction = (contents, context) => ({
  contents: defineExpectedContents({
    contents,
    declared: context.declaredFileContents ?? '',
    projectPractices: context.projectPractices,
  }),
});
