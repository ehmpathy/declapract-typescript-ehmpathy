import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { UnexpectedCodePathError } from 'helpful-errors';

import { buildWorkflowSecretsBlock } from '../../../../../utils/buildWorkflowSecretsBlock';

/**
 * .what = ensures publish.yml matches expected content with apikey secrets block
 * .why = enables the reusable workflow to access github secrets during publish
 */
export const check: FileCheckFunction = async (contents, context) => {
  // fail fast if template not found
  if (!context.declaredFileContents)
    throw new UnexpectedCodePathError('declaredFileContents not found', {
      relativeFilePath: context.relativeFilePath,
    });

  const expected = await buildWorkflowSecretsBlock(
    { template: context.declaredFileContents },
    context,
  );

  // if contents don't match expected, best practice is violated
  if (contents !== expected)
    throw new Error('file does not match expected content with apikey secrets');

  // return = file matches expected (best practice followed)
};

/**
 * .what = fixes publish.yml to include apikey secrets block
 * .why = ensures the reusable workflow receives required api keys during publish
 */
export const fix: FileFixFunction = async (_contents, context) => {
  // fail fast if template not found
  if (!context.declaredFileContents)
    throw new UnexpectedCodePathError('declaredFileContents not found', {
      relativeFilePath: context.relativeFilePath,
    });

  const expected = await buildWorkflowSecretsBlock(
    { template: context.declaredFileContents },
    context,
  );
  return { contents: expected };
};
