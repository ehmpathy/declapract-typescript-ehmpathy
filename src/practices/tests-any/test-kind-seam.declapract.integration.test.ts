import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FileCheckContext, FileCheckFunction } from 'declapract';
import { genTempDir, getError, given, then } from 'test-fns';

import { check as checkServiceAcceptance } from '../tests-service/best-practice/blackbox/**/*.acceptance.test.ts.declapract';
import { check as checkServiceLambdaAcceptance } from '../tests-service/best-practice/blackbox/lambdas/*.acceptance.test.ts.declapract';
import { check as checkServiceIntegration } from '../tests-service/best-practice/src/**/*.integration.test.ts.declapract';
import { check as checkAnyIntegration } from './best-practice/src/**/*.integration.test.ts.declapract';

/**
 * .what = clamps #679 on every name-keyed test-presence declaration: a repo whose tests carry only
 *         the `._.` kind seam (`._.intg`, `._.acpt`) passes, as one with the old suffix does; a repo
 *         with neither form still fails.
 * .why  = the jest configs match both suffix forms; a declaration that still demanded the old
 *         suffix would flag a repo that runs that suite just fine.
 * .teeth = revert any declaration to `FileCheckType.EXISTS` (or to a throw on absent contents) and
 *          its seam case reddens (an enum is no function; a bare throw rejects the seam repo).
 * .note = sits at the practice root, so declapract never reads it as a declaration.
 */

// the single documented cast: these checks read only getProjectRootDirectory() + relativeFilePath.
const genContextForRoot = (root: string): FileCheckContext =>
  ({
    getProjectRootDirectory: () => root,
    relativeFilePath: 'absent',
  }) as unknown as FileCheckContext;

const DECLARATIONS: Array<{
  name: string;
  check: unknown;
  dir: string;
  seamFile: string;
}> = [
  {
    name: 'tests-any integration',
    check: checkAnyIntegration,
    dir: 'src',
    seamFile: 'a._.intg.test.ts',
  },
  {
    name: 'tests-service integration',
    check: checkServiceIntegration,
    dir: 'src',
    seamFile: 'a._.intg.test.ts',
  },
  {
    name: 'tests-service blackbox acceptance',
    check: checkServiceAcceptance,
    dir: 'blackbox',
    seamFile: 'a._.acpt.test.ts',
  },
  {
    name: 'tests-service lambda acceptance',
    check: checkServiceLambdaAcceptance,
    dir: 'blackbox/lambdas',
    seamFile: 'getWidget._.acpt.test.ts',
  },
];

describe('#679 test-kind presence accepts the `._.` seam', () => {
  for (const declaration of DECLARATIONS) {
    given(`[case] the ${declaration.name} declaration, on a repo with only ${declaration.seamFile}`, () => {
      then('the check is a function that passes', async () => {
        expect(typeof declaration.check).toEqual('function');
        const root = genTempDir({ slug: `seam-${declaration.name.replaceAll(' ', '-')}` });
        mkdirSync(join(root, declaration.dir), { recursive: true });
        writeFileSync(join(root, declaration.dir, declaration.seamFile), '// test');
        await (declaration.check as FileCheckFunction)(null, genContextForRoot(root));
      });
    });

    given(`[case] the ${declaration.name} declaration, on a repo with no test of either form`, () => {
      then('the check still fails', async () => {
        const root = genTempDir({ slug: `seamless-${declaration.name.replaceAll(' ', '-')}` });
        mkdirSync(join(root, declaration.dir), { recursive: true });
        const error = await getError(
          async () =>
            (declaration.check as FileCheckFunction)(null, genContextForRoot(root)),
        );
        expect(error.message).toContain(declaration.dir);
        expect(error.message).toMatchSnapshot();
      });
    });
  }
});
