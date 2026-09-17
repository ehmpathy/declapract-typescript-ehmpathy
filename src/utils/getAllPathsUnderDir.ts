import { readdirSync } from 'node:fs';

/**
 * .what = every file path under a directory, walked recursively with node's own readdir.
 * .why  = ONE source for the practice-tree walks the declaration clamps share — the `domain`
 *         layout clamp (D51) and the `errors` catch-all-glob clamp (D48) each recursed the
 *         same way in their own copy, which is the "one source, no drift" convention this repo
 *         holds elsewhere (`defineExpectedGitignoreContents` / `isDeferredToDeprecatedDirMove`).
 *         each caller applies its OWN filter over the returned paths — the walk is shared, the
 *         per-clamp policy (all files vs declarations-only) stays local, where it legitimately
 *         differs.
 * .note = `skip` names directories NOT to descend into (a TRAVERSAL decision, not a selection).
 *         it is required and nullable per rule.forbid.undefined-inputs — a caller that wants the
 *         whole tree passes `skip: null`, never an omitted arg. the actionPins pin clamp passes
 *         its fixture dirs here so the walk itself never enters them — one util, one contract,
 *         no same-name/different-shape twin.
 */
export const getAllPathsUnderDir = (input: {
  dir: string;
  skip: string[] | null;
}): string[] =>
  readdirSync(input.dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${input.dir}/${entry.name}`;
    if (!entry.isDirectory()) return [path];
    return (input.skip ?? []).includes(entry.name)
      ? []
      : getAllPathsUnderDir({ dir: path, skip: input.skip });
  });

/**
 * .what = the canonical dirs a practice-tree walk (`src/practices/**`) never descends into.
 * .why  = three root-level clamps each walk the practice tree and each must skip the same
 *         non-template dirs: a fixture (`.test`) or a jest snapshot (`__snapshots__`) is an INPUT
 *         to a test, not a template a consumer receives, so a walk that reached one would red on a
 *         non-defect; `node_modules` a symlinked test tree can expose. named ONCE here — the same
 *         "one source, no drift" convention the walker itself embodies — so the three callers
 *         cannot drift into inconsistent shapes (they held two: `['.test','__snapshots__','node_modules']`
 *         vs `['__snapshots__','.test']`).
 * .note = this is NOT `actionPins`'s `FIXTURE_DIRS`. that names the fixture-dir CLASS a pin clamp
 *         must exclude AND assert holds at least one unpinned ref — a distinct domain concept with
 *         its own glossary cluster. to merge the two would conflate a traversal-skip set with a
 *         fixture-dir class (rule.forbid.domain-term-ambiguity); the walk-skip set legitimately
 *         also carries `node_modules`, which the fixture-dir class does not.
 */
export const PRACTICE_TREE_SKIP_DIRS = ['.test', '__snapshots__', 'node_modules'];
