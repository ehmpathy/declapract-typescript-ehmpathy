import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects and fixes uuidv4 imports to use uuid-fns instead
 * .why = uuidv4 package is deprecated, uuid-fns provides same functionality with different export name
 */

// pattern to detect uuidv4 imports
const UUIDV4_IMPORT_PATTERN = /from\s+['"]uuidv4['"]/;

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('no contents');

  // check if file imports from uuidv4
  if (UUIDV4_IMPORT_PATTERN.test(contents)) return; // matches bad practice

  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  // replace uuidv4 import with uuid-fns, alias getUuid as uuid to minimize code changes
  const fixed = contents
    // handle: import { uuid } from 'uuidv4' → import { getUuid as uuid } from 'uuid-fns'
    .replace(
      /import\s*\{\s*uuid\s*\}\s*from\s*['"]uuidv4['"]/g,
      "import { getUuid as uuid } from 'uuid-fns'",
    )
    // handle: import { uuid as X } from 'uuidv4' → import { getUuid as X } from 'uuid-fns'
    .replace(
      /import\s*\{\s*uuid\s+as\s+(\w+)\s*\}\s*from\s*['"]uuidv4['"]/g,
      "import { getUuid as $1 } from 'uuid-fns'",
    )
    // handle other uuidv4 imports (e.g., default import)
    .replace(/from\s*['"]uuidv4['"]/g, "from 'uuid-fns'");

  return { contents: fixed };
};
