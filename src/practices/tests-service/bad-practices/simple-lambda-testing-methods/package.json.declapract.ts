import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';
import { isPackageImportedInRepo } from '../../../../utils/isPackageImportedInRepo';

const RETIRED_LIB = 'simple-lambda-testing-methods';
const SUCCESSOR_LIB = 'sdk-aws-lambda';
const SUCCESSOR_FLOOR = '0.7.2'; // the node-service floor (#646)

/**
 * .what = detects the retired test lib in package.json, once no source imports it
 * .why  = the lib is retired for sdk-aws-lambda's runLambdaEndpoint (#650). the dep goes only
 *         after the last import does — a residual import (an export with no 1:1 successor) keeps
 *         it, so the tree always builds (#642). so a repo converges over two applies: the first
 *         moves the sources, the second drops the dep.
 */
export const check: FileCheckFunction = (contents, context) => {
  if (!contents) throw new Error('does not match bad practice');
  const pkg = asPackageJSON({ contents }, { practice: 'tests-service' });
  const declared =
    !!pkg.dependencies?.[RETIRED_LIB] || !!pkg.devDependencies?.[RETIRED_LIB];
  if (!declared) throw new Error('does not match bad practice');
  const stillImported = isPackageImportedInRepo({
    projectRoot: context.getProjectRootDirectory(),
    packageName: RETIRED_LIB,
    dirs: ['src', 'blackbox', 'accept.blackbox'],
  });
  if (stillImported) throw new Error('does not match bad practice');
  return; // bad practice detected
};

/**
 * .what = drops the retired lib, and adds sdk-aws-lambda as a devDependency where absent
 * .why  = the rewritten tests import `runLambdaEndpoint` from sdk-aws-lambda; a service repo
 *         most often declares it already (node-service), so it is added only where absent
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};
  const pkg = asPackageJSON({ contents }, { practice: 'tests-service' });
  const hasSuccessor =
    !!pkg.dependencies?.[SUCCESSOR_LIB] ||
    !!pkg.devDependencies?.[SUCCESSOR_LIB];
  const asWithout = (deps: Record<string, string> | undefined) =>
    deps
      ? Object.fromEntries(
          Object.entries(deps).filter(([name]) => name !== RETIRED_LIB),
        )
      : undefined;
  const devDependencies = {
    ...asWithout(pkg.devDependencies),
    ...(hasSuccessor ? {} : { [SUCCESSOR_LIB]: SUCCESSOR_FLOOR }),
  };
  return {
    contents: `${JSON.stringify(
      {
        ...pkg,
        dependencies: asWithout(pkg.dependencies),
        devDependencies: Object.keys(devDependencies).length
          ? devDependencies
          : undefined,
      },
      null,
      2,
    )}\n`,
  };
};
