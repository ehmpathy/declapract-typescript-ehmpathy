import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { ConstraintError } from 'helpful-errors';

/**
 * .what = the node major the node practice pins, as the lambda runtime it maps to
 * .why  = the default when a repo declares no `.nvmrc` — the node practice ships `v22.*`
 */
const RUNTIME_DEFAULT = 'nodejs22.x';

/**
 * .what = cast the contents of a `.nvmrc` into the lambda runtime of the same node major
 * .why  = the node major that BUILDS the artifact and the node major that SERVES it must match.
 *         `build:artifact` copies third-party files verbatim, never down-levelled, so a skew lets a
 *         dependency ship syntax the deploy runtime cannot parse — and every gate before prod stays
 *         green (#552). one source (`.nvmrc`), so the two cannot drift.
 * .note = an unreadable pin (`lts/*`, `node`, an empty file) fails loud: a guess here is the exact
 *         silent skew this transformer exists to prevent.
 */
export const asLambdaNodeRuntime = (input: { nvmrc: string }): string => {
  // read the major from `22`, `v22`, `22.21.0`, or `v22.21.0`
  const major = input.nvmrc.trim().match(/^v?(\d+)(?:\.\d+){0,2}$/)?.[1];
  if (!major)
    throw new ConstraintError(
      'serverless.yml runtime derives from .nvmrc, but .nvmrc names no node major',
      {
        nvmrc: input.nvmrc,
        hint: "pin .nvmrc to a numeric version, e.g. 'v22.21.0' (an alias like 'lts/*' names no major)",
      },
    );
  return `nodejs${major}.x`;
};

/**
 * .what = the lambda runtime for the project, read from its `.nvmrc`
 * .why  = serverless.yml's `provider.runtime` must follow the repo's node pin (#552)
 * .note = no project root (a bare unit call) or no `.nvmrc` → the node practice's pinned major
 */
export const getOneLambdaNodeRuntime = (input: {
  projectRoot: string | null;
}): string => {
  // locate the pin; absent → the node practice's default
  if (!input.projectRoot) return RUNTIME_DEFAULT;
  const nvmrcPath = path.join(input.projectRoot, '.nvmrc');
  if (!existsSync(nvmrcPath)) return RUNTIME_DEFAULT;

  // cast the pin into its runtime
  return asLambdaNodeRuntime({ nvmrc: readFileSync(nvmrcPath, 'utf-8') });
};
