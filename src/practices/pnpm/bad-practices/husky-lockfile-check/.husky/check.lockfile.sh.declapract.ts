import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects a husky lockfile-change hook that watches the npm `package-lock.json`
 * .why  = a pnpm repo has no `package-lock.json` — its lockfile is `pnpm-lock.yaml`. a hook
 *         left on the npm name never fires, so a stale-lockfile reminder silently dies.
 */
export const check: FileCheckFunction = (contents) => {
  // detected (bad practice) when the hook still references the npm lockfile name
  if (contents?.includes('package-lock.json')) return;

  // not detected — already on pnpm-lock.yaml (or absent)
  throw new Error('does not match bad practice');
};

/**
 * .what = swaps the npm lockfile name + install command for their pnpm equivalents
 * .why  = the hook must watch `pnpm-lock.yaml` and point the human at `pnpm install`.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const fixed = contents
    .replace(/package-lock\.json/g, 'pnpm-lock.yaml')
    // `(?<!p)` guards the overlap: pnpm contains npm, so a naive swap of `npm install`
    // would nest inside its own `pnpm install` output and loop on a re-run
    .replace(/(?<!p)npm install/g, 'pnpm install');
  return { contents: fixed };
};
