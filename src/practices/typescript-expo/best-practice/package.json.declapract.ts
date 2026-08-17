import { FileCheckType } from 'declapract';

/**
 * .what = the expo half of the typescript triad: the `build` command that metro/EAS
 *         use instead of tsc.
 * .why  = an expo app never builds with tsc — metro bundles the native build and
 *         `npx expo export --platform web` produces the web `dist/`. `build` aliases
 *         `build:web` so the shared cicd-common `.test.yml` (which runs `npm run build`)
 *         works on an expo repo, and `.deploy-expo.yml` (which runs `npm run build:web`)
 *         works too. CONTAINS, so a repo may add its own build variants around these.
 */
export const check = FileCheckType.CONTAINS;
