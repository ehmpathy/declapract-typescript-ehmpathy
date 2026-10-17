import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { MalfunctionError } from 'helpful-errors';

import { asWorkflowMergedByJob } from '../../../../../utils/asWorkflowMergedByJob';
import { getAllWorkflowJobDrifts } from '../../../../../utils/getAllWorkflowJobDrifts';

/**
 * .what = whether a found workflow job still points at the `provision/github/` terraform dir
 * .why  = `provision-github`'s migration deletes that dir; a job that still reads it fails
 *         `terraform validate` on every branch, so it is obsolete and must leave with the dir.
 *         `provision/github.repo/` (the declastruct wish) is a distinct path and never matches.
 */
const isJobOnTerraformGithubDir = (input: { job: unknown }): boolean =>
  JSON.stringify(input.job ?? null).includes('provision/github/');

/**
 * .what = the declared contents this check and fix read, or a loud failure where none arrived
 * .why  = this declaration ships a template beside it, so an absent body is a pipeline
 *         malfunction, never a consumer input
 */
const asDeclaredContents = (input: {
  declaredFileContents: string | null;
  relativeFilePath: string;
}): string => {
  if (input.declaredFileContents === null)
    throw new MalfunctionError(
      'the cicd-app-react-native-expo practice emitted no declared provision.yml',
      {
        practice: 'cicd-app-react-native-expo',
        relativeFilePath: input.relativeFilePath,
      },
    );
  return input.declaredFileContents;
};

/**
 * .what = pass when the declared `github` job (and each declared top-level key) holds its
 *         declared shape, and no job still points at the deleted `provision/github/` dir
 * .why  = the expo usecase composes `provision-github`, whose migration deletes
 *         `provision/github/**` and leaves no caller for its declastruct replacement (#608). an
 *         EQUALS template would reach the expo repo and delete any other provision job it holds
 *         (e.g. an aws job), so this declaration merges by job: the `github` job is the
 *         practice's; every other job is the repo's, kept as found — except a job that still
 *         reads the deleted terraform dir.
 */
export const check: FileCheckFunction = (contents, context) => {
  if (!contents) throw new Error('provision.yml is absent');
  const drift = getAllWorkflowJobDrifts({
    found: contents,
    declared: asDeclaredContents(context),
    dropJobWhen: isJobOnTerraformGithubDir,
  });
  if (drift.length > 0)
    throw new Error(
      `provision.yml drifts from its declaration:\n- ${drift.join('\n- ')}`,
    );
};

/**
 * .what = create the file where absent; else replace the `github` job, drop each job on the
 *         deleted terraform dir, and keep every other job as it stands
 * .why  = see `check`. the merge returns the found text untouched where no drift remains, so a
 *         second apply changes zero bytes.
 */
export const fix: FileFixFunction = (contents, context) => {
  const declared = asDeclaredContents(context);
  if (!contents) return { contents: declared };
  return {
    contents: asWorkflowMergedByJob({
      found: contents,
      declared,
      dropJobWhen: isJobOnTerraformGithubDir,
    }),
  };
};
