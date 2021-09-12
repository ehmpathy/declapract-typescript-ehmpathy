import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

/**
 * adds a key-value pair to an object, ensuring that the key is added to the object at a certain order, specified by index
 *
 * for example:
 * ```
 * const object = { x: true, y: true, z: true }
 * const newObject = addKeyToObjectAtKeyIndex({ object, index: 1, key: 'a', value: true });
 * // newObject = { x: true, a: true, y: true, z: true }
 * ```
 */
const addKeyToObjectAtKeyIndex = ({
  object,
  index: requestedNewKeyIndex,
  key,
  value,
}: {
  object: Record<string, any>;
  index: number;
  key: string;
  value: any;
}) => {
  return Object.keys(object).reduce((newObject, thisKey, thisKeyIndex) => {
    if (thisKeyIndex === requestedNewKeyIndex) newObject[key] = value; // add the new key if its the index that was requested
    newObject[thisKey] = object[thisKey]; // now add the key that used to be at this index
    return newObject; // and continue
  }, {} as Record<string, any>);
};

export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents }; // do nothing if no contents

  // parse the json
  const packageJSON = JSON.parse(contents);

  // update the scripts
  let newScripts = packageJSON.scripts;
  newScripts = addKeyToObjectAtKeyIndex({
    object: newScripts,
    index: 0,
    key: 'format',
    value: `prettier --write '**/*.ts' --config ./prettier.config.js`,
  });
  newScripts = addKeyToObjectAtKeyIndex({
    object: newScripts,
    index: Object.keys(newScripts).indexOf('test:types') + 1,
    key: 'test:format',
    value: `prettier --parser typescript --check 'src/**/*.ts' --config ./prettier.config.js`,
  });

  // update the json
  const updatedPackageJSON = {
    ...packageJSON,
    scripts: newScripts,
  };

  // return the contents
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
