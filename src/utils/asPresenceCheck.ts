/**
 * .what = a best-practice check that passes when the declared path (or glob) found a file, and
 *         otherwise names the file a human must author.
 * .why  = a bare `FileCheckType.EXISTS` reports only "Expected file to exist" on a plan's
 *         `FIX_MANUAL` line, so an adopter on a fresh repo must guess what the practice wants and
 *         why. the check has no fix either way; the message is the whole of the guidance.
 * .how  = declapract hands the check each file the declared glob found; with zero matches it
 *         hands one `null`. any found file means the practice is satisfied.
 */
export const asPresenceCheck =
  (input: { expected: string; hint: string }) =>
  (contents: string | null): void => {
    // a file matched the declared path
    if (contents !== null) return;

    // else, name what to author
    throw new Error(`expected ${input.expected}; ${input.hint}`);
  };
