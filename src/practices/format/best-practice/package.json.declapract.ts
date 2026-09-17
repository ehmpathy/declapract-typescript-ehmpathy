import { FileCheckType, type FileContentsFunction } from 'declapract';
import { isPresent } from 'type-fns';

/**
 * .what = the active formatter set for a repo — `biome` always, `terraform` only when a terraform
 *         practice is in use.
 * .why  = names the set derivation as one intent, so `contents` reads what-not-how rather than an
 *         inline conditional-null-in-array + filter pipeline a reader must mentally simulate
 *         (`rule.forbid.inline-decode-friction`).
 */
const asActiveFormatters = (input: { usesTerraform: boolean }): string[] =>
  ['biome', input.usesTerraform ? 'terraform' : null].filter(isPresent);

/**
 * .what = build the `fix:format` / `test:format` npm commands from the active formatter list — each
 *         a ` && `-joined chain of per-formatter sub-commands.
 * .why  = names the derivation as one intent, so `contents` reads what-not-how rather than an
 *         inline filter/map/join pipeline a reader must mentally simulate (`rule.require.named-transformers`).
 */
const asFormatScripts = (input: {
  formatters: string[];
}): Record<string, string> => ({
  'fix:format': input.formatters
    .map((formatter) => `npm run fix:format:${formatter}`)
    .join(' && '),
  'test:format': input.formatters
    .map((formatter) => `npm run test:format:${formatter}`)
    .join(' && '),
});

/**
 * declare the expected contents
 */
export const contents: FileContentsFunction = (context) => {
  // only include the terraform formatter if a terraform practice is in use.
  // the practices are named `terraform-common` / `terraform-aws` (see useCases.yml) —
  // a check for the bare `terraform` matches NO practice, so the formatter would never run.
  const usesTerraform =
    context.projectPractices.includes('terraform-common') ||
    context.projectPractices.includes('terraform-aws');

  const formatters = asActiveFormatters({ usesTerraform });

  return JSON.stringify({ scripts: asFormatScripts({ formatters }) }, null, 2);
};

/**
 * check that they're contained in the file
 */
export const check: FileCheckType = FileCheckType.CONTAINS;
