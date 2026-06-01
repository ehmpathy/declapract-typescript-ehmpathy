import type { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('does not match bad practice');

  // check for Stage enum usage
  if (
    contents.includes('Stage.PRODUCTION') ||
    contents.includes('Stage.DEVELOPMENT') ||
    contents.includes('Stage.TEST')
  )
    return; // bad practice detected

  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const fixed = contents
    // replace enum values with string literals
    .replace(/Stage\.PRODUCTION/g, "'prod'")
    .replace(/Stage\.DEVELOPMENT/g, "'prep'")
    .replace(/Stage\.TEST/g, "'test'")
    // remove Stage import if no longer used
    .replace(/import\s*\{\s*Stage\s*\}\s*from\s*['"][^'"]+['"];\n?/g, '')
    .replace(
      /import\s*\{\s*([^}]*),\s*Stage\s*\}\s*from/g,
      'import { $1 } from',
    )
    .replace(
      /import\s*\{\s*Stage\s*,\s*([^}]*)\}\s*from/g,
      'import { $1 } from',
    );

  return { contents: fixed };
};
