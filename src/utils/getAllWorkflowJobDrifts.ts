import { isDeepStrictEqual } from 'node:util';

import { asWorkflowParts, isPlainMap, isTriggerHeld } from './asWorkflowParts';

/**
 * .what = every way the found `on` triggers depart from the declared ones
 * .why  = `on` merges per trigger, so each declared trigger is read alone, and an undeclared
 *         trigger is the repo's own
 */
const getTriggerDrift = (input: {
  triggersFound: unknown;
  triggersDeclared: unknown;
}): string[] => {
  // a declared `on` that is not a map is compared whole, with the other top-level keys
  const triggersDeclared = input.triggersDeclared;
  if (!isPlainMap(triggersDeclared)) return [];

  // a found `on` that is not a map (e.g. `on: push`) cannot hold a declared trigger map
  const triggersFound = input.triggersFound;
  if (!isPlainMap(triggersFound))
    return ["top-level key 'on' is not a map of triggers"];

  // each declared trigger must be held
  return Object.entries(triggersDeclared)
    .filter(
      ([name, value]) =>
        !isTriggerHeld({ triggersFound, name, declared: value }),
    )
    .map(([name]) =>
      name in triggersFound
        ? `trigger '${name}' differs from its declared shape`
        : `trigger '${name}' is absent`,
    );
};

/**
 * .what = every way a found workflow departs from a declared one, under the merge-by-job contract
 * .why  = one source for both `check` and `fix`, so the gate and the repair cannot disagree.
 *         the contract:
 *         - each declared trigger under `on` must be held (see `isTriggerHeld`); a repo's own
 *           triggers (a `schedule`, a dispatch with inputs) are never drift
 *         - each other declared top-level key (other than `jobs`) must equal its declared value
 *         - each declared job must exist and equal its declared shape
 *         - an undeclared job is the repo's own, and is never drift — unless `dropJobWhen`
 *           marks it obsolete (e.g. a job that still points at a dir a migration deleted)
 * .note = equality is semantic (parsed data), so a comment or a quote style never counts as drift
 */
export const getAllWorkflowJobDrifts = (input: {
  found: string;
  declared: string;
  dropJobWhen: ((input: { job: unknown }) => boolean) | null;
}): string[] => {
  const found = asWorkflowParts({ contents: input.found });
  const declared = asWorkflowParts({ contents: input.declared });

  // each declared top-level key must hold its declared value; `on` is read per trigger below
  const triggersDeclared = declared.topLevel.on;
  const isOnPerTrigger = isPlainMap(triggersDeclared);
  const driftTopLevel = Object.keys(declared.topLevel)
    .filter((key) => key !== 'jobs')
    .filter((key) => !(key === 'on' && isOnPerTrigger))
    .filter(
      (key) => !isDeepStrictEqual(found.topLevel[key], declared.topLevel[key]),
    )
    .map((key) => `top-level key '${key}' differs from its declared value`);

  // each declared trigger must be held; an undeclared trigger is the repo's own, never drift
  const driftTriggers = getTriggerDrift({
    triggersFound: found.topLevel.on,
    triggersDeclared,
  });

  // each declared job must exist with its declared shape
  const driftJobsDeclared = Object.keys(declared.jobs)
    .filter((name) => !isDeepStrictEqual(found.jobs[name], declared.jobs[name]))
    .map((name) =>
      name in found.jobs
        ? `job '${name}' differs from its declared shape`
        : `job '${name}' is absent`,
    );

  // an undeclared job is kept, unless the declaration marks it obsolete
  const dropJobWhen = input.dropJobWhen;
  const driftJobsObsolete = dropJobWhen
    ? Object.keys(found.jobs)
        .filter((name) => !(name in declared.jobs))
        .filter((name) => dropJobWhen({ job: found.jobs[name] }))
        .map((name) => `job '${name}' is obsolete and must be dropped`)
    : [];

  return [
    ...driftTopLevel,
    ...driftTriggers,
    ...driftJobsDeclared,
    ...driftJobsObsolete,
  ];
};
