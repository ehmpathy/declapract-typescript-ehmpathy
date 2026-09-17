import { ConstraintError } from 'helpful-errors';

/**
 * .what = parse a consumer `package.json`, or throw a context-rich error on malformed json.
 * .why  = a raw `JSON.parse(contents)` throws a context-free engine `SyntaxError`
 *         (`Unexpected token ... in JSON at position N`) that names no practice, no
 *         dependency, no file, and no remediation. a declapract consumer mid-edit — or
 *         a declaration ever handed non-json contents — gets zero signal about which
 *         declaration failed or how to recover. this wraps the parse and rethrows with
 *         the practice + a concrete fix hint, so a leaked failure is self-explanatory.
 *         ONE source for every declaration that reads a `package.json`, so the
 *         diagnostic cannot drift between them (mirrors `defineExpectedGitignoreContents`
 *         / `isDeferredToDeprecatedDirMove`).
 */
export const asPackageJSON = (
  input: { contents: string },
  context: { practice: string },
): Record<string, any> => {
  // parse in its own scope, so the catch wraps ONLY the parse — a ConstraintError from the
  // shape guard below must not be caught and re-labelled as a parse failure.
  const parsed = (() => {
    try {
      return JSON.parse(input.contents);
    } catch (error) {
      // allowlist the ONLY error JSON.parse can throw — a SyntaxError on malformed json. any other
      // error is not a parse failure, so rethrow it unwrapped rather than relabel it a parse failure
      // (rule.forbid.failhide: a catch allowlists its expected errors and surfaces the rest).
      if (!(error instanceof SyntaxError)) throw error;
      const reason = error.message;
      // a malformed consumer package.json is CALLER-must-fix (exit 2), not a server malfunction —
      // ConstraintError carries that semantic + the practice/reason context (rule.require.failloud).
      throw new ConstraintError(
        `[${context.practice}] could not parse package.json: ${reason}. ` +
          `fix: ensure the package.json holds valid json (a stray comma or character is the usual cause).`,
        { practice: context.practice, reason },
      );
    }
  })();

  // valid json, but a top-level scalar / array / null is not a package.json OBJECT. the callers
  // deref `.dependencies` / `.devDependencies` on it, which would throw a context-free
  // `TypeError: Cannot read properties of null` — the exact context-free failure this util exists
  // to replace. so guard the SHAPE too, and throw the same caller-must-fix ConstraintError.
  const shape = Array.isArray(parsed)
    ? 'an array'
    : parsed === null
      ? 'null'
      : typeof parsed;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new ConstraintError(
      `[${context.practice}] package.json is not a json object (got ${shape}). ` +
        `fix: ensure the package.json holds a top-level json object (a {...}, not a scalar or array).`,
      { practice: context.practice, shape },
    );

  return parsed;
};
