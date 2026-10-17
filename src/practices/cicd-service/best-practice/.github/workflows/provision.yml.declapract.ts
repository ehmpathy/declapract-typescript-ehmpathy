import type {
  FileCheckFunction,
  FileContentsFunction,
  FileFixFunction,
} from 'declapract';
import { MalfunctionError } from 'helpful-errors';

import { asWorkflowMergedByJob } from '../../../../../utils/asWorkflowMergedByJob';
import { getAllWorkflowJobDrifts } from '../../../../../utils/getAllWorkflowJobDrifts';
import { readFile } from '../../../../../utils/readFile';

/**
 * .what = declare the service provision workflow, with the 4 rds-coupled jobs
 *         (`sql-schema-{prep,prod}`, `aws-{prep,prod}-declastruct`) included only when the
 *         `persist-with-rds` practice is in play for the project.
 * .why  = those 4 jobs reference files `persist-with-rds` owns — its schema + daos (the
 *         `.sql-schema-control.yml` callee) and its `provision/aws/resources.ts` wish (the
 *         declastruct callee). a service WITHOUT rds (`lambda-service`,
 *         `lambda-service-with-dynamodb`) ships none of them, so those jobs fail its own
 *         provision workflow — D28/#573, live on 2 of 3 service usecases. a branch on
 *         `context.projectPractices` lets one practice serve all three usecases
 *         (`rule.avoid.runtime-forks`), and a merge-by-job check + fix (not EQUALS) keeps a
 *         narrow `--practice cicd-service` apply from a strip of an rds repo's own jobs — the
 *         additive usecase-delta EQUALS hazard named in that rule's caveat table.
 * .note = the 4 rds jobs are the contiguous tail after the generic `github` job, so a split on
 *         the first rds job header (`sql-schema-prep:`) truncates the whole rds block cleanly.
 */

// the header of the first rds-coupled job; the 4 rds jobs are the contiguous tail after it
export const RDS_JOBS_ANCHOR = '\n\n  sql-schema-prep:';

/**
 * .what = the text before the first rds-job header — the generic-jobs prefix.
 * .why  = names the positional truncation as one intent, so `withoutRdsJobs` reads what-not-how
 *         rather than an inline positional `split(...)[0]` a reader must mentally simulate
 *         (`rule.forbid.inline-decode-friction`).
 */
const asPrefixBeforeRdsJobs = (input: { contents: string }): string =>
  input.contents.split(RDS_JOBS_ANCHOR)[0]!;

/**
 * .what = drop the 4 rds-coupled jobs — the contiguous tail after the generic `github` job — by a
 *         truncation at the first rds job header. returns the generic-jobs prefix, newline-terminated.
 * .why  = names the strip as one intent so the orchestrator reads what-not-how, rather than an inline
 *         positional `split(...)[0]` a reader must mentally simulate (`rule.forbid.inline-decode-friction`).
 * .note = the anchor is a text boundary, not a structural parse. a miss (a re-indent, a comment added
 *         mid-block, a re-order of the rds block) throws loudly rather than fails OPEN — a bare
 *         `split(...)[0]` on a missed anchor returns the WHOLE superset, so a non-rds consumer would
 *         silently inherit all 4 rds jobs and CONTAINS would still pass (a superset holds the declared
 *         prefix). that silent re-ship is the exact D28 break this strip exists to close, so a load
 *         anchor miss must fail LOUD (`rule.forbid.failhide` / `rule.require.failfast`).
 */
export const withoutRdsJobs = (input: { contents: string }): string => {
  // fail loud if the anchor is absent — never truncate to the whole superset on a miss. this is a
  // server-side malfunction (this practice's own template shape changed, not a consumer input), so a
  // MalfunctionError (exit 1) carries the who-fixes semantic — a retried/automated caller can
  // machine-distinguish a transient malfunction from a caller constraint (exit 2), consistent with
  // the failures this same round converts to ConstraintError elsewhere
  // (`rule.require.failloud` / `rule.require.exit-code-semantics`)
  if (!input.contents.includes(RDS_JOBS_ANCHOR))
    throw new MalfunctionError(
      `could not find the rds-jobs anchor ('${RDS_JOBS_ANCHOR}') in provision.yml — the template shape changed; a non-rds strip cannot proceed without re-ship of the rds jobs`,
    );

  return `${asPrefixBeforeRdsJobs({ contents: input.contents })}\n`;
};

export const contents: FileContentsFunction = async (context) => {
  // grab the superset — the full workflow, rds jobs included
  const contentsSuperset = await readFile({
    filePath: `${__dirname}/provision.yml`,
  });

  // keep every job for an rds service; drop the rds tail for a non-rds one
  return context.projectPractices.includes('persist-with-rds')
    ? contentsSuperset
    : withoutRdsJobs({ contents: contentsSuperset });
};

/**
 * .what = the declared contents this check and fix read, or a loud failure where none arrived
 * .why  = the `contents` fn above always emits a body, so an absent one is a malfunction of the
 *         pipeline, never a consumer input
 */
const asDeclaredContents = (input: {
  declaredFileContents: string | null;
  relativeFilePath: string;
}): string => {
  if (input.declaredFileContents === null)
    throw new MalfunctionError(
      'the cicd-service practice emitted no declared provision.yml',
      { practice: 'cicd-service', relativeFilePath: input.relativeFilePath },
    );
  return input.declaredFileContents;
};

/**
 * .what = pass when every declared top-level key and every declared job holds its declared shape;
 *         the repo's own jobs never count as drift
 * .why  = a text-contains check with no fix left a pre-oidc caller in place after its callees went
 *         oidc-only, and github then rejected the workflow with `startup_failure` (#685). a
 *         merge-by-job check reads each declared job, so a stale one is flagged and repaired,
 *         while a repo may still add jobs of its own (the reason this was never EQUALS).
 * .note = scope-safe: under a narrow `--practice cicd-service` the `contents` fn emits the
 *         non-rds body, so the rds jobs go undeclared — and an undeclared job is kept, never
 *         stripped. `rds-jobs-in-non-rds-service` alone owns that strip, behind its callee guard.
 */
export const check: FileCheckFunction = (contents, context) => {
  if (!contents) throw new Error('provision.yml is absent');
  const drift = getAllWorkflowJobDrifts({
    found: contents,
    declared: asDeclaredContents(context),
    dropJobWhen: null,
  });
  if (drift.length > 0)
    throw new Error(
      `provision.yml drifts from its declaration:\n- ${drift.join('\n- ')}`,
    );
};

/**
 * .what = create the file where absent; else merge each declared job and top-level key into it
 * .why  = see `check`. the merge keeps the repo's own jobs and comments, and returns the found
 *         text untouched where no drift remains, so a second apply changes zero bytes.
 */
export const fix: FileFixFunction = (contents, context) => {
  const declared = asDeclaredContents(context);
  if (!contents) return { contents: declared };
  return {
    contents: asWorkflowMergedByJob({
      found: contents,
      declared,
      dropJobWhen: null,
    }),
  };
};
