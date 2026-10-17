import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';
import yaml from 'yaml';

import { getAllPracticesForUsecase } from './utils/getAllPracticesForUsecase';

/**
 * .what = clamps #608 across every usecase: where a usecase holds `provision-github`, some
 *         practice in that usecase declares `.github/workflows/provision.yml`, and its `github`
 *         job points `wish-path` at the declastruct wish `provision/github.repo/resources.ts`.
 * .why  = provision-github ships the declastruct wish; with no caller job a repo never applies it,
 *         and a caller on the retired `provision/github/` terraform path applies naught. the expo
 *         usecase once held provision-github with no caller at all — this holds the class.
 * .teeth = drop the expo `provision.yml` template, or point any `github` job's wish-path elsewhere,
 *          and case1 reddens with the usecase named.
 */

const repoRoot = join(__dirname, '..');
const practicesDir = join(repoRoot, 'src/practices');
const usecasesYmlPath = join(repoRoot, 'src/useCases.yml');
const WISH_PATH_EXPECTED = 'provision/github.repo/resources.ts';

/**
 * .what = the github job's wish-path of each provision.yml template the usecase's practices declare
 */
const getAllGithubWishPaths = (input: {
  practices: string[];
}): { practice: string; wishPath: string | null }[] =>
  input.practices
    .map((practice) => ({
      practice,
      path: join(
        practicesDir,
        practice,
        'best-practice/.github/workflows/provision.yml',
      ),
    }))
    .filter(({ path }) => existsSync(path))
    .map(({ practice, path }) => {
      const workflow = yaml.parse(readFileSync(path, 'utf8'));
      return {
        practice,
        wishPath: workflow?.jobs?.github?.with?.['wish-path'] ?? null,
      };
    });

describe('provisionGithubWishPath', () => {
  const usecases = Object.keys(
    yaml.parse(readFileSync(usecasesYmlPath, 'utf8'))['use-cases'],
  );
  const usecasesWithProvisionGithub = usecases.filter((usecase) =>
    getAllPracticesForUsecase({ usecasesYmlPath, usecase }).includes(
      'provision-github',
    ),
  );

  given('[case0] the usecases that hold provision-github', () => {
    then('at least the node service, package, and expo usecases', () => {
      expect(usecasesWithProvisionGithub.length).toBeGreaterThanOrEqual(3);
    });
  });

  given('[case1] each usecase that holds provision-github', () => {
    when('[t0] its provision.yml templates are read', () => {
      then(
        'some practice declares one, and every github job calls the declastruct wish',
        () => {
          const offenses = usecasesWithProvisionGithub.flatMap((usecase) => {
            const found = getAllGithubWishPaths({
              practices: getAllPracticesForUsecase({ usecasesYmlPath, usecase }),
            });
            if (!found.length)
              return [`${usecase}: no practice declares provision.yml`];
            if (!found.some(({ wishPath }) => wishPath !== null))
              return [`${usecase}: no provision.yml declares a github job`];
            return found
              .filter(
                ({ wishPath }) =>
                  wishPath !== null && wishPath !== WISH_PATH_EXPECTED,
              )
              .map(
                ({ practice, wishPath }) =>
                  `${usecase}: ${practice} github job wish-path is ${wishPath}`,
              );
          });
          expect(offenses).toEqual([]);
        },
      );
    });
  });
});
