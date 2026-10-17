import { join } from 'node:path';

import { given, then, when } from 'test-fns';

import { getAllPracticesForUsecase } from './utils/getAllPracticesForUsecase';

/**
 * .what = clamps the `rhachet-roles-package` usecase (#558)
 * .why  = a role repo is an npm package first, so its resolved practice set must hold every
 *         practice npm-package resolves to (extends is non-transitive; a lost core extend would
 *         drop the baseline in silence), plus the rhachet practice that carries the #520 build order
 * .note = reads src/useCases.yml from disk, hence the integration grain
 */
describe('useCases.yml — rhachet-roles-package', () => {
  const usecasesYmlPath = join(__dirname, 'useCases.yml');

  given('[case1] the declared usecases', () => {
    when('[t0] rhachet-roles-package is resolved', () => {
      const rolesPackage = getAllPracticesForUsecase({
        usecasesYmlPath,
        usecase: 'rhachet-roles-package',
      });
      const npmPackage = getAllPracticesForUsecase({
        usecasesYmlPath,
        usecase: 'npm-package',
      });

      then('it holds every practice npm-package resolves to', () => {
        expect(rolesPackage).toEqual(expect.arrayContaining(npmPackage));
      });

      then('it holds the rhachet practice', () => {
        expect(rolesPackage).toContain('rhachet');
      });

      then('its resolved set matches snapshot', () => {
        expect([...rolesPackage].sort()).toMatchSnapshot(
          'rhachet-roles-package practices',
        );
      });
    });
  });
});
