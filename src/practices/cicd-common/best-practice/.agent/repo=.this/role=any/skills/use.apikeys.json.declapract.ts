import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * .what = check that use.apikeys.json exists
 * .why = enables projects to declare which api keys are required for integration tests
 */
export const check = FileCheckType.EXISTS;

/**
 * .what = creates default use.apikeys.json structure if file doesn't exist
 * .why = ensures all projects have the config file with proper schema
 */
export const fix: FileFixFunction = (contents) => {
  // if file already exists, preserve its content
  if (contents) {
    return { contents };
  }

  // create default structure
  return {
    contents:
      JSON.stringify(
        {
          apikeys: {
            required: [],
          },
        },
        null,
        2,
      ) + '\n',
  };
};
