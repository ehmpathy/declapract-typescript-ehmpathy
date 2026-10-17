import { readFile } from 'fs/promises';
import { given, then, when } from 'test-fns';

import path from 'node:path';

import { check, contents } from './best-practice/.depcheckrc.yml.declapract';

/**
 * .what = proves this repo's own `.depcheckrc.yml` holds every entry the lint practice declares
 * .why  = this repo consumes its own practices; a declared ignore that never lands at the root
 *         lets `test:lint:deps` fail on a host-local `.agent/.actors` file the practice already
 *         excludes for every adopter
 */
describe('lint .depcheckrc.yml self-application', () => {
  given('[case1] this repo root', () => {
    when('[t0] the practice check runs over the root file', () => {
      then('every declared ignore + ignorePattern is present', async () => {
        const context = {
          relativeFilePath: '.depcheckrc.yml',
          projectPractices: ['lint'],
        } as unknown as Parameters<typeof check>[1]; // .note = only the read fields are set
        const declaredFileContents = await contents(context as never);
        const rootContents = await readFile(
          path.join(__dirname, '../../../.depcheckrc.yml'),
          'utf-8',
        );
        expect(() =>
          check(rootContents, { ...context, declaredFileContents }),
        ).not.toThrow();
      });
    });
  });
});
