import { readFileSync } from 'fs';
import { ConstraintError } from 'helpful-errors';
import yaml from 'yaml';

/**
 * .what = expands a usecase's FULL practice set, per `extends`, exactly as declapract's
 *         `readUseCaseDeclarations` does.
 * .why  = both the platform-baseline drift guard and the extends-refactor characterization
 *         test must reason about a usecase's RESOLVED practices, not its raw `.practices`
 *         list. declapract's `extends` is a NON-TRANSITIVE union: a usecase that extends X
 *         pulls X's OWN base `.practices` (never X's own resolved-with-extends set), then
 *         dedupes by name (readUseCaseDeclarations.js: `hydratedPractices.push(...extendedUseCase.practices)`
 *         + `uniqBy(..., name)`). this util is a HAND-MIRROR of that one algorithm — a
 *         duplicate, not an import, so it CAN drift if declapract changes its expansion.
 *         it is pinned to the installed declapract release (see `declapract` in package.json);
 *         re-check it against `readUseCaseDeclarations.js` on any declapract bump.
 * .note = non-transitive is the subtlety that carries the load: if A extends B and B extends
 *         C, then A does NOT inherit C through B — A must extend C directly. this is why
 *         `lambda-service-with-rds` carries a `# declapract#17` double-extends today.
 */

interface UsecaseDefinition {
  extends?: string[];
  practices: string[];
}

/**
 * .what = the deduped set of practice names, order preserved (first occurrence wins).
 * .why  = a named transformer so the orchestrator reads as narrative ("dedupe the names")
 *         rather than an inline `[...new Set(...)]` a reader must mentally simulate
 *         (rule.forbid.inline-decode-friction). mirrors declapract's own `uniqBy(..., name)`.
 */
const asDedupedPractices = (input: { names: string[] }): string[] => [
  ...new Set(input.names),
];

const readUsecases = (input: {
  usecasesYmlPath: string;
}): Record<string, UsecaseDefinition> =>
  yaml.parse(readFileSync(input.usecasesYmlPath, 'utf-8'))['use-cases'];

/**
 * .what = the resolved, deduped practice-name set for one usecase (extends applied)
 */
export const getAllPracticesForUsecase = (input: {
  usecasesYmlPath: string;
  usecase: string;
}): string[] => {
  const usecases = readUsecases({ usecasesYmlPath: input.usecasesYmlPath });
  const definition = usecases[input.usecase];
  if (!definition)
    throw new ConstraintError(`no usecase named '${input.usecase}'`, {
      usecase: input.usecase,
      usecasesYmlPath: input.usecasesYmlPath,
      available: Object.keys(usecases),
    });

  // each extended usecase contributes its OWN base practices (non-transitive), exactly
  // as declapract does — flatMap keeps this immutable (no push onto a const array)
  const extendedPractices = (definition.extends ?? []).flatMap((extendedName) => {
    const extended = usecases[extendedName];
    if (!extended)
      throw new ConstraintError(
        `usecase '${input.usecase}' extends a usecase that is absent: '${extendedName}'`,
        {
          usecase: input.usecase,
          extendedName,
          available: Object.keys(usecases),
        },
      );
    return extended.practices;
  });

  // the usecase's own base practices come first, then the extended ones; dedupe by name
  // (order-independent — callers compare as sorted sets)
  return asDedupedPractices({
    names: [...definition.practices, ...extendedPractices],
  });
};
