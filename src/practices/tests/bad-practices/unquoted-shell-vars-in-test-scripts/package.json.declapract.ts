import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects unsafe shell variable references in test scripts
 *
 * .why = unsafe shell variables cause bugs:
 *        - unquoted `[ -n $VAR ]` becomes `[ -n ]` when VAR is unset → returns TRUE
 *        - quoted `[ -n "$VAR" ]` fails with `set -u` (unbound variable error)
 *        - both caused CI issues: snapshots silently passed or workflows failed
 *
 * .pattern:
 *   - bad:  `$([ -n $RESNAP ] && ...)`        (unquoted)
 *   - bad:  `$([ -n "$RESNAP" ] && ...)`      (quoted without default)
 *   - good: `$([ -n "${RESNAP:-}" ] && ...)`  (quoted with default)
 */

const VARS = ['RESNAP', 'THOROUGH', 'CI', 'ECHO'];

const UNSAFE_VAR_PATTERNS = VARS.flatMap((v) => [
  // unquoted: [ -n $VAR ] or [ -z $VAR ]
  new RegExp(`\\[ -n \\$${v} \\]`, 'g'),
  new RegExp(`\\[ -z \\$${v} \\]`, 'g'),
  // quoted without default: [ -n "$VAR" ] or [ -z "$VAR" ]
  // in JSON this appears as: [ -n \"$VAR\" ] or [ -z \"$VAR\" ]
  // but NOT [ -n "${VAR:-}" ] (the safe form)
  new RegExp(`\\[ -n \\\\"\\$${v}\\\\" \\]`, 'g'),
  new RegExp(`\\[ -z \\\\"\\$${v}\\\\" \\]`, 'g'),
]);

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('no contents');

  // check if any unsafe patterns exist
  const hasUnsafeVars = UNSAFE_VAR_PATTERNS.some((pattern) =>
    pattern.test(contents),
  );

  if (hasUnsafeVars) return; // bad practice detected
  throw new Error('no unsafe shell variables found');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  let fixed = contents;

  // fix all unsafe patterns to use ${VAR:-} syntax
  for (const v of VARS) {
    // unquoted → quoted with default
    fixed = fixed.replace(
      new RegExp(`\\[ -n \\$${v} \\]`, 'g'),
      `[ -n "\${${v}:-}" ]`,
    );
    fixed = fixed.replace(
      new RegExp(`\\[ -z \\$${v} \\]`, 'g'),
      `[ -z "\${${v}:-}" ]`,
    );
    // quoted without default → quoted with default (JSON-escaped quotes)
    fixed = fixed.replace(
      new RegExp(`\\[ -n \\\\"\\$${v}\\\\" \\]`, 'g'),
      `[ -n \\"\${${v}:-}\\" ]`,
    );
    fixed = fixed.replace(
      new RegExp(`\\[ -z \\\\"\\$${v}\\\\" \\]`, 'g'),
      `[ -z \\"\${${v}:-}\\" ]`,
    );
  }

  return { contents: fixed };
};
