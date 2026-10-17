import { isDeepStrictEqual } from 'node:util';

import { parse } from 'yaml';

/**
 * .what = whether a parsed yaml value is a plain map (not a list, not a scalar, not null)
 * .why  = names the narrow so the parts read below needs no cast
 */
export const isPlainMap = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * .what = whether a found trigger satisfies a declared one
 * .why  = a declared trigger with no config (e.g. `workflow_dispatch:`) only asks that the
 *         workflow be triggerable that way, so a repo's own config on it (dispatch inputs, a
 *         schedule list) holds; a declared trigger with config (e.g. `pull_request.paths`)
 *         must hold that config exactly
 */
export const isTriggerHeld = (input: {
  triggersFound: Record<string, unknown>;
  name: string;
  declared: unknown;
}): boolean => {
  if (!(input.name in input.triggersFound)) return false;
  if (input.declared === null) return true;
  return isDeepStrictEqual(input.triggersFound[input.name], input.declared);
};

/**
 * .what = a github workflow read as plain data: its top-level keys, and its `jobs` map apart
 * .why  = the merge contract treats `jobs` per job, `on` per trigger, and every other top-level
 *         key whole, so both the drift read and the merge read the workflow through this one shape
 */
export const asWorkflowParts = (input: {
  contents: string;
}): { topLevel: Record<string, unknown>; jobs: Record<string, unknown> } => {
  const parsed: unknown = parse(input.contents);
  const topLevel = isPlainMap(parsed) ? parsed : {};
  const jobs = isPlainMap(topLevel.jobs) ? topLevel.jobs : {};
  return { topLevel, jobs };
};
