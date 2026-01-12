import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { UnexpectedCodePathError } from 'helpful-errors';

import { buildWorkflowSecretsBlock } from '../../../../../utils/buildWorkflowSecretsBlock';

/**
 * .what = ensures deploy.yml matches expected content with apikey secrets block
 * .why = enables the reusable workflow to access github secrets during deploy
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
  if (contents === expected) throw new Error('file matches expected content');
};

/**
 * .what = fixes deploy.yml to include apikey secrets block
 * .why = enables the reusable workflow receives required api keys during deploy
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
