import {
  FileCheckType,
  type FileContentsFunction,
} from 'declapract/dist/domain';
import { isPresent } from 'type-fns';

/**
 * declare the expected contents
 */
export const contents: FileContentsFunction = (context) => {
  const formatters = [
    'biome',
    context.projectPractices.includes('terraform') ? 'terraform' : null, // only include the terraform formatter if terraform practice is used
  ].filter(isPresent);

  return JSON.stringify(
    {
      scripts: {
        'fix:format': formatters
          .map((formatter) => `npm run fix:format:${formatter}`)
          .join(' && '),
        'test:format': formatters
          .map((formatter) => `npm run test:format:${formatter}`)
          .join(' && '),
      },
    },
    null,
    2,
  );
};

/**
 * check that they're contained in the file
 */
export const check: FileCheckType = FileCheckType.CONTAINS;
