import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = the names a config schema must hold to stay a superset of the base template
 * .why  = every service extends the base with its own keys, and `persist-with-rds` ships a superset
 *         of it; what each must keep is the base keys and the two exports getConfig reads
 */
const BASE_KEYS = [
  'organization',
  'project',
  'environment',
  'access',
  'aws',
  'account',
  'namespace',
] as const;
const BASE_EXPORTS = [
  { name: 'schema', pattern: /\bexport\s+const\s+schema\b/ },
  { name: 'Config', pattern: /\bexport\s+type\s+Config\b/ },
] as const;

/**
 * .what = the token that marks a schema a human must reconcile with the base by hand
 */
const REVIEW_MARKER_TOKEN = '@declapract:review: config.schema.ts lacks';

/**
 * .what = the base names a schema file lacks: each key absent as `key:`, each export absent
 * .note = a regex over names, not a parse of the ts object literal: a key renamed or nested
 *         elsewhere still reads as present, which only loosens the check (never a false red)
 */
export const getAllBaseNamesAbsent = (input: {
  contents: string;
}): string[] => [
  ...BASE_KEYS.filter(
    (key) => !new RegExp(`\\b${key}\\s*:`).test(input.contents),
  ),
  ...BASE_EXPORTS.filter(({ pattern }) => !pattern.test(input.contents)).map(
    ({ name }) => name,
  ),
];

/**
 * .what = checks that `src/utils/config/config.schema.ts` holds a superset of the base schema (#630,
 *         #658): every base key and both exports present, whatever keys it adds.
 * .why  = an EQUALS check here would fail on every extended schema, rewrite it to the base on each
 *         apply, and fight `persist-with-rds` in a 2-cycle that never converges. a superset check
 *         lets the one owner (persist-with-rds, where in play) hold the file, and still catches a
 *         schema that dropped a key getConfig reads.
 * .note = a file that carries the review marker passes: the fix has handed the merge to a human,
 *         and a check that still failed would make core mark the file manual.
 */
export const check: FileCheckFunction = (contents) => {
  if (contents === null)
    throw new Error('src/utils/config/config.schema.ts is absent');
  if (contents.includes(REVIEW_MARKER_TOKEN)) return;
  const absent = getAllBaseNamesAbsent({ contents });
  if (absent.length)
    throw new Error(
      `src/utils/config/config.schema.ts lacks the base name(s): ${absent.join(', ')}`,
    );
};

/**
 * .what = writes the base schema where the file is absent; where a present file lacks base names,
 *         stamps one review marker at the top that names them; else leaves the file unchanged.
 * .why  = a ts schema cannot be merged by text without a risk to the service's own keys, so the
 *         merge of a drifted file is a human's call; the marker names exactly what to add.
 * .note = idempotent: the marker is stamped once, and a marked file passes the check.
 */
export const fix: FileFixFunction = (contents, context) => {
  if (contents === null) return { contents: context.declaredFileContents };
  if (contents.includes(REVIEW_MARKER_TOKEN)) return { contents };
  const absent = getAllBaseNamesAbsent({ contents });
  if (!absent.length) return { contents };
  const marker = `// ${REVIEW_MARKER_TOKEN} the base name(s) ${absent.join(', ')} that getConfig and the config files expect — add them, as the config practice's base template declares them; then delete this marker`;
  return { contents: `${marker}\n${contents}` };
};
