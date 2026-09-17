import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  RDS_JOBS_ANCHOR,
  withoutRdsJobs,
} from '../../../../best-practice/.github/workflows/provision.yml.declapract';

/**
 * .what = detect a non-rds service whose provision.yml still carries the 4 rds-coupled jobs
 *         (`sql-schema-{prep,prod}`, `aws-{prep,prod}-declastruct`), and strip them.
 * .why  = the D28 gate in the best-practice `contents` fn omits those 4 jobs for a non-rds usecase,
 *         but it is `CONTAINS`, so it is fix-forward for FRESH scaffolds only — a superset PASSES
 *         the contains check. a non-rds repo STAMPED BEFORE the gate already carries the full
 *         superset, so no best-practice fix fires and its provision workflow keeps failing (the 4
 *         jobs reference `persist-with-rds` files the repo does not ship) until a human hand-strips
 *         them. this bad-practice is the retroactive half: it DETECTS the superset in a non-rds repo
 *         and strips the rds tail, so a pre-stamped consumer converges without a hand edit.
 * .note = the strip reuses the best-practice's own `withoutRdsJobs` + `RDS_JOBS_ANCHOR`, so the
 *         truncation boundary is declared ONCE and cannot drift between the fresh-scaffold gate and
 *         this retroactive strip.
 */

/**
 * .what = the rds jobs' own callees — files a genuine rds consumer ships. `sql-schema-{prep,prod}`
 *         drive the `provision/schema/` tree; `aws-{prep,prod}-declastruct` drive the
 *         `provision/aws/resources.ts` wish (the generic `github` job's callee is
 *         `provision/github.repo/resources.ts`, a distinct path, so it is not listed).
 * .why  = presence of a callee on disk is a SCOPE-ROBUST rds signal, where
 *         `context.projectPractices` is NOT. declapract derives `projectPractices` AFTER the
 *         `--practice` filter (getScopedPractices), so a narrow `declapract fix --practice
 *         cicd-service` on a genuine rds repo shrinks it to `['cicd-service']` and
 *         `includes('persist-with-rds')` goes DARK — the exact scope-sensitivity hazard
 *         `rule.avoid.runtime-forks` names. a file on disk does not depend on the `--practice`
 *         filter, so it holds the rds truth under any invocation. a strip gated on
 *         caller-without-callee (fire only when the rds callees are genuinely absent) closes the
 *         destructive path where a dark practice flag alone would truncate a live rds repo's jobs.
 */
const RDS_CALLEE_PATHS = ['provision/schema', 'provision/aws/resources.ts'];

const shipsAnyRdsCallee = (context: {
  getProjectRootDirectory: () => string;
}): boolean =>
  RDS_CALLEE_PATHS.some((rel) =>
    existsSync(path.join(context.getProjectRootDirectory(), rel)),
  );

/**
 * .what = detected (return) when this is a non-rds service whose file still holds the rds jobs.
 *         not-detected (throw) when the repo IS an rds service, or the rds jobs are already gone.
 * .why  = an rds service LEGITIMATELY keeps those 4 jobs — a strip there is the destructive
 *         additive-EQUALS hazard the best-practice avoids. two signals mark a repo rds, and the
 *         strip fires only when NEITHER holds: `persist-with-rds` in the resolved usecase (the
 *         full-apply signal), OR an rds callee on disk (the scope-robust signal that survives a
 *         narrow `--practice cicd-service` apply). only a repo that is non-rds by BOTH is in the bad
 *         state this fix repairs.
 */
export const check: FileCheckFunction = (contents, context) => {
  // an rds service keeps its rds jobs — not a bad practice there. EITHER signal marks it rds; the
  // callee-on-disk one holds even when the `--practice` filter has darkened projectPractices.
  if (
    context.projectPractices.includes('persist-with-rds') ||
    shipsAnyRdsCallee(context)
  )
    throw new Error(
      'does not match bad practice: an rds signal is present (persist-with-rds in the usecase, or a provision/schema | provision/aws/resources.ts callee on disk), so the rds jobs belong',
    );

  // detected only when the rds-jobs tail is still present
  if (contents?.includes(RDS_JOBS_ANCHOR)) return;

  // otherwise the rds tail is already gone (or the file is a non-superset shape) — no tail to strip
  throw new Error(
    'does not match bad practice: no rds-jobs tail present to strip',
  );
};

/**
 * .what = strip the 4 rds-coupled jobs, keeping every generic job intact.
 * .why  = reuse the best-practice truncation so the boundary is defined in one place; on an anchor
 *         miss `withoutRdsJobs` throws LOUD rather than truncating to the whole superset
 *         (`rule.forbid.failhide`).
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  return { contents: withoutRdsJobs({ contents }) };
};
