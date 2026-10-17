import { getAllVersionsByPackageFromLockfile } from './getAllVersionsByPackageFromLockfile';

/**
 * .what = the packages with more than one version in a pnpm lockfile's graph
 * .why  = under `node-linker=hoisted` one copy of each package wins the root slot, so a
 *         package with two versions becomes decisive rather than latent (#610). this set
 *         names the candidates before the first red check, where the runtime symptom
 *         (a crashed hook, a blank page) names none of them
 */
export const getOneContentionSetFromLockfile = (input: {
  lockfile: string;
}): { name: string; versions: string[] }[] =>
  [...getAllVersionsByPackageFromLockfile(input).entries()]
    .filter(([, versions]) => versions.length > 1)
    .map(([name, versions]) => ({ name, versions }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
