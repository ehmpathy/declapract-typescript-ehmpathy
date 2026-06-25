import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects joi imports in source files
 * .why = joi should be replaced with zod for better typescript integration
 */
export const check: FileCheckFunction = (contents) => {
  // match if file imports from joi
  if (contents?.includes("from 'joi'")) return;
  if (contents?.includes('from "joi"')) return;

  // no match
  throw new Error('does not import from joi');
};

/**
 * .what = transforms joi imports and basic schema patterns to zod
 * .why = automated migration reduces manual toil
 *
 * .note = basic transforms only; complex patterns require manual fix
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};

  const updated = contents
    // transform imports: import Joi from 'joi' → import { z } from 'zod'
    .replace(/import\s+Joi\s+from\s+['"]joi['"]/g, "import { z } from 'zod'")
    // transform imports: import * as Joi from 'joi' → import { z } from 'zod'
    .replace(
      /import\s+\*\s+as\s+Joi\s+from\s+['"]joi['"]/g,
      "import { z } from 'zod'",
    )
    // transform imports: import { ... } from 'joi' → import { z } from 'zod'
    .replace(
      /import\s+\{[^}]*\}\s+from\s+['"]joi['"]/g,
      "import { z } from 'zod'",
    )
    // transform basic schema patterns: Joi.* → z.*
    .replace(/Joi\.object/g, 'z.object')
    .replace(/Joi\.string/g, 'z.string')
    .replace(/Joi\.number/g, 'z.number')
    .replace(/Joi\.boolean/g, 'z.boolean')
    .replace(/Joi\.array/g, 'z.array')
    .replace(/Joi\.date/g, 'z.date')
    .replace(/Joi\.any/g, 'z.any')
    // transform .required() → remove (zod is required by default)
    .replace(/\.required\(\)/g, '');

  return { contents: updated };
};
