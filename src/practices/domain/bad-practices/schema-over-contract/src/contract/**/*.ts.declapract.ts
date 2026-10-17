import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = a value import from a `domain.objects` module: `import { A, B as C } from '…domain.objects…'`.
 * .why  = only a dobj class carries `.contract()`, so the rewrite is scoped to names this file
 *         imports from a domain.objects path; a zod schema or a sdk type that also has `.schema`
 *         is left alone. an `import type { … }` is skipped — a type-only name cannot be a value.
 */
const DOBJ_IMPORT_PATTERN =
  /import\s+(?!type\b)\{([^}]*)\}\s*from\s*['"][^'"]*domain\.objects[^'"]*['"]/g;

/**
 * .what = the local names a file imports as values from a `domain.objects` module.
 */
export const getDobjNamesImported = (input: { contents: string }): string[] =>
  [...input.contents.matchAll(DOBJ_IMPORT_PATTERN)]
    .flatMap((match) => (match[1] ?? '').split(','))
    .map((specifier) => specifier.trim())
    .filter((specifier) => specifier && !specifier.startsWith('type '))
    .map(
      (specifier) =>
        specifier
          .split(/\s+as\s+/)
          .pop()
          ?.trim() ?? '',
    )
    .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));

/**
 * .what = the two shapes a published contract must not carry for a dobj `X`.
 * .why  =
 *   - `X.schema` validates, but emits no dobj identity into the json-schema a consumer reads (#565)
 *   - `X.contract` with no call is a type error since domain-objects@0.34.0, where `contract`
 *     became a getter that returns a function to CALL on the class (#634, defect 1)
 * .note = `X.schema.parse(…)` (and its kin) is internal validation, never a published shape, so
 *         it is left alone; so is `typeof X.schema`, since `typeof X.contract()` is not a type query.
 */
const asOutdatedMemberPattern = (input: { name: string }): RegExp =>
  new RegExp(
    `(?<!typeof\\s+)(?<![\\w$.])${input.name.replace(/\$/g, '\\$')}\\.(?:schema\\b(?!\\s*\\.\\s*(?:parse|safeParse|parseAsync|safeParseAsync)\\b)|contract\\b(?!\\s*\\())`,
    'g',
  );

/**
 * .what = flags a published contract file that refers to a dobj via `X.schema` or a bare `X.contract`.
 */
export const check: FileCheckFunction = (contents) => {
  if (
    contents &&
    getDobjNamesImported({ contents }).some((name) =>
      asOutdatedMemberPattern({ name }).test(contents),
    )
  )
    return; // bad practice detected
  throw new Error(
    'does not match bad practice: each dobj in this contract is referred to via X.contract()',
  );
};

/**
 * .what = rewrites each `X.schema` / bare `X.contract` to `X.contract()`.
 * .why  = `X.contract()` is the same zod schema stamped with the dobj's identity, so it composes
 *         exactly as `X.schema` did (`z.array(X.contract())`, `X.contract().nullable()`).
 * .note = idempotent: `X.contract()` matches neither shape, so a second pass changes no byte.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  return {
    contents: getDobjNamesImported({ contents }).reduce(
      (rewritten, name) =>
        rewritten.replace(
          asOutdatedMemberPattern({ name }),
          `${name}.contract()`,
        ),
      contents,
    ),
  };
};
