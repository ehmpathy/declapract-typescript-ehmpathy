import type { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('does not match bad practice');
  const packageJSONObject = JSON.parse(contents);
  if (Object.keys(packageJSONObject.scripts).includes('postinstall')) return; // matches
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // should not occur
  const packageJSONObject = JSON.parse(contents);
  const fixedPackageJSONObject = {
    ...packageJSONObject,
    scripts: { ...packageJSONObject.scripts, postinstall: undefined }, // drop postinstall
  };
  return { contents: JSON.stringify(fixedPackageJSONObject, null, 2) };
};
