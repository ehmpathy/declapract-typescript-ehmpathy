import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects joi imports in source files
 * .why = joi should be replaced with zod for better typescript integration
 */
// the review marker's stable phrase: a file that holds it was rewritten by this fix
const REVIEW_MARKER_PHRASE = 'auto-migrated to zod';

// the narrowed uuid shape a prior run of this fix emitted for a bare joi `.uuid()` (#629)
const NARROWED_UUID_PATTERN = /z\.string\(\)\.uuid\(\s*\)/;

export const check: FileCheckFunction = (contents) => {
  // match if file imports from joi
  if (contents?.includes("from 'joi'")) return;
  if (contents?.includes('from "joi"')) return;

  // match a file this fix already rewrote, which still holds the narrowed uuid map (#629 backfill)
  if (
    contents?.includes(REVIEW_MARKER_PHRASE) &&
    NARROWED_UUID_PATTERN.test(contents)
  )
    return;

  // no match
  throw new Error('does not import from joi');
};

/**
 * .what = the zod call that carries a joi string-uuid's semantics, from its option text.
 * .why  = joi's bare `.uuid()` checks the 8-4-4-4-12 layout only, so its faithful zod map is
 *         `z.guid()`; `z.uuid()` adds the version + variant nibbles and rejects ids joi accepted
 *         (#629). only a version option earns the strict form: a sole `uuidv4` maps to
 *         `z.uuidv4()`, a sole other version to `z.uuid({ version })`, a set to `z.uuid()`.
 */
const asZodUuidCall = (input: { options: string | null }): string => {
  const versions = Array.from(new Set(input.options?.match(/uuidv\d/g) ?? []));
  if (versions.length === 0) return 'z.guid()';
  if (versions.length > 1) return 'z.uuid()';
  if (versions[0] === 'uuidv4') return 'z.uuidv4()';
  return `z.uuid({ version: '${versions[0]!.replace('uuid', '')}' })`;
};

/**
 * .what = rewrite each `z.string().uuid(…)` / `z.string().guid(…)` to the call that keeps joi's
 *         semantics.
 * .why  = applied after the `Joi.*` → `z.*` map, and on a backfill pass over a file this fix
 *         already rewrote; a deliberate `z.uuid()` an author wrote by hand is never touched.
 */
const withUuidSemanticsKept = (input: { contents: string }): string =>
  input.contents.replace(
    /z\.string\(\)\.(?:uuid|guid)\(\s*(\{[^}]*\})?\s*\)/g,
    (_match, options: string | undefined) =>
      asZodUuidCall({ options: options ?? null }),
  );

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
 * @declapract:review — auto-migrated to zod; VERIFY these semantics by hand:
 *  - optionality: a source field with no explicit required marker was OPTIONAL, but the zod field
 *    is now REQUIRED by default. re-mark any truly-optional field \`.optional()\`.
 *  - unknown keys: the prior \`.object()\` rejected unknown keys; \`z.object()\` strips them silently.
 *    use \`z.looseObject()\` only where the shape must pass unknown keys through.
 *  - date coercion: the prior \`.date()\` coerced strings to Date; \`z.date()\` rejects a string.
 *    use \`z.coerce.date()\` where the input arrives as a string.
 *  - number coercion: the prior \`.number()\` coerced numeric strings; \`z.number()\` rejects a
 *    string. use \`z.coerce.number()\` where the input arrives as a string (e.g. a db-hydrated
 *    numeric or bigint column).
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

  // keep joi's uuid semantics: a bare `.uuid()` is a layout check, so `z.guid()` (#629). this also
  // backfills the narrowed `z.string().uuid()` a prior run of this fix left in a marker file
  const withUuids = withUuidSemanticsKept({ contents: transformed });

  // prepend the review marker once, so the silent semantic guesses are loud (idempotent: the
  // check no longer fires post-rewrite, and a second pass would find the marker already present)
  const updated = withUuids.includes('@declapract:review')
    ? withUuids
    : reviewMarker + withUuids;

  return { contents: updated };
};
