import { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

/**
 * define the relative key order of keys we care about
 *
 * relative meaning: things can be between them or more keys can be defined that we wont reorder - but these ones must have the correct relative order
 */
export const desiredRelativeKeyOrder = {
  root: [
    'name',
    'author',
    'description',
    'private',
    'version',
    'main',
    'module',
    'scripts',
    'dependencies',
    'devDependencies',
    'config',
  ],
  scripts: [
    'commit:with-cli',
    'fix:format:prettier',
    'fix:format:terraform',
    'fix:format',
    'fix:deps',
    'fix:eslint',
    'fix:lint',
    'fix',
    'generate:schema',
    'generate:types-from-sql',
    'generate:dao',
    'build:artifact',
    'build:clean',
    'build:compile',
    'build',
    'provision:docker:clear',
    'provision:docker:prepare',
    'provision:docker:up',
    'provision:docker:await',
    'provision:docker:down',
    'provision:schema:plan',
    'provision:schema:apply',
    'provision:schema:sync',
    'provision:integration-test-db',
    'test:commits',
    'test:types',
    'test:format:prettier',
    'test:format:terraform',
    'test:format',
    'test:lint:deps',
    'test:lint:eslint',
    'test:lint',
    'test:unit',
    'test:integration',
    'test:acceptance:locally',
    'test',
    'test:acceptance',
    'prepush',
    'prepublish',
    'preversion',
    'postversion',
    'postinstall',
    'deploy:prune',
    'deploy:release',
    'deploy:send-notification',
    'deploy:dev',
    'deploy:prod',
    'deploy',
  ],
};

/**
 * function which sorts keys in an object based on relative sort order given
 *
 * when a key is not in the array, its relative position in the array is not changed
 *
 * note: we're forced to write our own sorting function because `.sort()` assumes that `if a > b` and `b > c` then `a > c`, which does not hold in our case (because some relative ranks are not defined)
 */
const sortObjectByRelativeKeyOrder = ({
  object,
  order,
}: {
  object: Record<string, any>;
  order: string[];
}) => {
  const objectKeys = Object.keys(object);
  const objectKeysWithRelativePositionDefined = objectKeys.filter((key) =>
    order.includes(key),
  );
  const objectKeysWithoutRelativePositionDefined = objectKeys.filter(
    (key) => !order.includes(key),
  );

  // sort the keys that have relative order to eachother
  const sortedRelativeOrderOnesOnly =
    objectKeysWithRelativePositionDefined.sort((a, b) =>
      order.indexOf(a) < order.indexOf(b) ? -1 : 1,
    );

  // then stick the ones that did not have relative order defined into the order (after the ones we relatively defined, when more than one option of position)
  const sortedKeys = [
    ...sortedRelativeOrderOnesOnly,
    ...objectKeysWithoutRelativePositionDefined,
  ].sort((a, b) => {
    // lookup the relative orders
    const relativeOrderIndexOfKeyA = order.indexOf(a);
    const relativeOrderIndexOfKeyB = order.indexOf(b);

    // if the relative order of both are defined, then  we can use that to sort
    if (relativeOrderIndexOfKeyA > -1 && relativeOrderIndexOfKeyB > -1)
      return relativeOrderIndexOfKeyA < relativeOrderIndexOfKeyB ? -1 : 1;

    // lookup the index of each in original array
    const originalOrderIndexOfKeyA = objectKeys.indexOf(a);
    const originalOrderIndexOfKeyB = objectKeys.indexOf(b);

    // otherwise keep the original order
    return originalOrderIndexOfKeyA < originalOrderIndexOfKeyB ? -1 : 1;
  });

  // create a new object with the sorted keys
  const newObject: Record<string, any> = {};
  for (const key of sortedKeys) {
    newObject[key] = object[key];
  }

  // return it
  return newObject;
};

const sortPackageJSONObjectKeys = (packageJSONObject: Record<string, any>) => {
  // sort the scripts
  const sortedScripts = sortObjectByRelativeKeyOrder({
    object: packageJSONObject.scripts ?? {},
    order: desiredRelativeKeyOrder.scripts,
  });

  // sort the dependencies (alphabetical)
  const sortedDeps = sortObjectByRelativeKeyOrder({
    object: packageJSONObject.dependencies ?? {},
    order: Object.keys(packageJSONObject.dependencies ?? {}).sort(), // alphabetical order
  });
  const sortedDevDeps = sortObjectByRelativeKeyOrder({
    object: packageJSONObject.devDependencies ?? {},
    order: Object.keys(packageJSONObject.devDependencies ?? {}).sort(), // alphabetical order
  });

  // sort the root
  const sortedPackageJSONObject = sortObjectByRelativeKeyOrder({
    object: {
      ...packageJSONObject,
      scripts: sortedScripts,
      dependencies: sortedDeps,
      devDependencies: sortedDevDeps,
    },
    order: desiredRelativeKeyOrder.root,
  });

  // return it
  return sortedPackageJSONObject;
};

// define fix and check
export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('file not defined');
  const packageJSONObject = JSON.parse(contents);
  const sortedPackageJSONObject = sortPackageJSONObjectKeys(packageJSONObject);
  expect(JSON.stringify(packageJSONObject, null, 2)).toEqual(
    JSON.stringify(sortedPackageJSONObject, null, 2),
  );
};
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // cant do anything if not defined
  const packageJSONObject = JSON.parse(contents);
  const sortedPackageJSONObject = sortPackageJSONObjectKeys(packageJSONObject);
  return { contents: JSON.stringify(sortedPackageJSONObject, null, 2) };
};
