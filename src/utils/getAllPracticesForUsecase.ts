import { readFileSync } from 'fs';
import yaml from 'yaml';

/**
 * .what = expands a usecase's FULL practice set, per `extends`, exactly as declapract's
 *         `readUseCaseDeclarations` does.
 * .why  = both the platform-baseline drift guard and the extends-refactor characterization
 *         test must reason about a usecase's RESOLVED practices, not its raw `.practices`
 *         list. declapract's `extends` is a NON-TRANSITIVE union: a usecase that extends X
 *         pulls X's OWN base `.practices` (never X's own resolved-with-extends set), then
 *         dedupes by name (readUseCaseDeclarations.js: `hydratedPractices.push(...extendedUseCase.practices)`
 *         + `uniqBy(..., name)`). this util mirrors that one algorithm so a test can never
 *         drift from the tool's real expansion.
 * .note = non-transitive is the subtlety that carries the load: if A extends B and B extends
 *         C, then A does NOT inherit C through B — A must extend C directly. this is why
 *         `lambda-service-with-rds` carries a `# declapract#17` double-extends today.
 */

interface UsecaseDefinition {
  extends?: string[];
  practices: string[];
}

const readUsecases = (usecasesYmlPath: string): Record<string, UsecaseDefinition> =>
  yaml.parse(readFileSync(usecasesYmlPath, 'utf-8'))['use-cases'];

/**
 * .what = the resolved, deduped practice-name set for one usecase (extends applied)
 */
export const getAllPracticesForUsecase = (input: {
  usecasesYmlPath: string;
  usecase: string;
}): string[] => {
  const usecases = readUsecases(input.usecasesYmlPath);
  const definition = usecases[input.usecase];
  if (!definition)
    throw new Error(`no usecase named '${input.usecase}' in ${input.usecasesYmlPath}`);

  // each extended usecase contributes its OWN base practices (non-transitive), exactly
  // as declapract does — flatMap keeps this immutable (no push onto a const array)
  const extendedPractices = (definition.extends ?? []).flatMap((extendedName) => {
    const extended = usecases[extendedName];
    if (!extended)
      throw new Error(
        `usecase '${input.usecase}' extends non-existent usecase '${extendedName}'`,
      );
    return extended.practices;
  });

  // the usecase's own base practices come first, then the extended ones; dedupe by name
  // (order-independent — callers compare as sorted sets)
  return [...new Set([...definition.practices, ...extendedPractices])];
};
