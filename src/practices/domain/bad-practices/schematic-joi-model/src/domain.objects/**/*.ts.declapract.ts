import type { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (contents?.includes('SchematicJoiModel')) return; // if it includes that, then this file matches a bad practice
  if (contents?.includes('schematic-joi-model')) return; // if it includes that, then this file matches a bad practice
  // otherwise, does not match the bad practice: no SchematicJoiModel import or schematic-joi-model reference found
  throw new Error(
    'does not match bad practice: no SchematicJoiModel or schematic-joi-model reference found',
  );
};
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // shouldnt be called if file does not exist, but handle it in case anyway
  return {
    contents: contents
      .replace('import SchematicJoiModel ', 'import { DomainObject } ')
      .replace("from 'schematic-joi-model'", "from 'domain-objects'")
      .replace(/SchematicJoiModel/g, 'DomainObject'), // default to a generic domain object, since we dont know if it should be a value object or domain entity
  };
};
