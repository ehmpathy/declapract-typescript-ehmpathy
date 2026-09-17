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
 * .what = a loud marker prepended to every rewritten file, so the three SILENT semantic
 *         changes this mechanical rewrite makes become visible to the consumer.
 * .why = the rewrite is a regex, and a regex cannot know a field's intended optionality, its
 *        unknown-key policy, or whether a date arrives as a string. it therefore GUESSES, and each
 *        guess typechecks. per the value-rewrite guard, a rewrite that must guess emits a review
 *        marker rather than a silent, possibly-wrong result (#594). the consumer deletes the marker
 *        once each point is verified by hand.
 */
const reviewMarker = `/**
 * @declapract:review — auto-migrated to zod; VERIFY these three semantics by hand:
 *  - optionality: a source field with no explicit required marker was OPTIONAL, but the zod field
 *    is now REQUIRED by default. re-mark any truly-optional field \`.optional()\`.
 *  - unknown keys: the prior \`.object()\` rejected unknown keys; \`z.object()\` strips them silently.
 *    use \`z.looseObject()\` only where the shape must pass unknown keys through.
 *  - date coercion: the prior \`.date()\` coerced strings to Date; \`z.date()\` rejects a string.
 *    use \`z.coerce.date()\` where the input arrives as a string.
 * delete this marker once each point is verified.
 */
`;

/**
 * .what = transforms joi imports and basic schema patterns to zod, with a review marker
 * .why = automated migration reduces manual toil, but the shape-for-shape rewrite makes three
 *        silent semantic changes a regex cannot get right — so it prepends a @declapract:review
 *        marker that flags them, rather than ship a silent guess (#594).
 *
 * .note = basic transforms only; complex patterns require manual fix
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};

  const transformed = contents
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

  // prepend the review marker once, so the silent semantic guesses are loud (idempotent: the
  // check no longer fires post-rewrite, and a second pass would find the marker already present)
  const updated = transformed.includes('@declapract:review')
    ? transformed
    : reviewMarker + transformed;

  return { contents: updated };
};
