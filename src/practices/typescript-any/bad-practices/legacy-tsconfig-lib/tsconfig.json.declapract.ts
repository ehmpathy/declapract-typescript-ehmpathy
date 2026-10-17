import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = the `"lib": [ … ]` array of a tsconfig, read as text.
 * .why  = a tsconfig is jsonc (comments, a final comma), so a JSON.parse round-trip would drop
 *         the comments an adopter wrote; the fix edits the array text in place instead.
 */
const LIB_ARRAY_PATTERN = /("lib"\s*:\s*\[)([^\]]*)(\])/;

/**
 * .what = a lib entry that carries the ES2022 `ErrorOptions` type (`es2022`+ or `esnext`).
 */
const ES2022_CAPABLE_LIB_PATTERN =
  /^(?:es202[2-9]|es20[3-9]\d|esnext)(?:\.|$)/i;

/**
 * .what = the lib entry the fix appends.
 * .why  = matches the `@tsconfig/node20` default lib, which a repo with no `lib` override inherits.
 */
const LIB_ENTRY_APPENDED = 'ES2023';

/**
 * .what = the string entries of a lib array's inner text.
 */
const asLibEntries = (input: { inner: string }): string[] =>
  [...input.inner.matchAll(/"([^"]*)"/g)].map((match) => match[1] ?? '');

/**
 * .what = flags a tsconfig whose `lib` override lacks an es2022-capable entry.
 * .why  = a `lib` override REPLACES the `@tsconfig/node20` default, so a legacy `lib: ["DOM"]`
 *         drops `ErrorOptions`, and the shipped `new Error(msg, { cause })` templates fail
 *         `test:types` with TS2554 (#517).
 */
export const check: FileCheckFunction = (contents) => {
  const inner = contents?.match(LIB_ARRAY_PATTERN)?.[2];
  if (
    inner !== undefined &&
    !asLibEntries({ inner }).some((entry) =>
      ES2022_CAPABLE_LIB_PATTERN.test(entry),
    )
  )
    return; // bad practice detected
  throw new Error(
    'does not match bad practice: no lib override, or the lib override is es2022-capable',
  );
};

/**
 * .what = appends `"ES2023"` after the last lib entry, in the array's own layout.
 * .why  = keeps each entry the adopter chose (e.g. `DOM`) and every comment around them; it adds
 *         only the one entry the shipped templates need.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const match = contents.match(LIB_ARRAY_PATTERN);
  if (!match) return { contents };
  const whole = match[0];
  const open = match[1] ?? '';
  const inner = match[2] ?? '';
  const close = match[3] ?? '';

  // append the entry in the array's own layout
  const innerAfter = asLibInnerWithEntryAppended({
    inner,
    entry: LIB_ENTRY_APPENDED,
  });
  return { contents: contents.replace(whole, `${open}${innerAfter}${close}`) };
};

/**
 * .what = the inner text of a lib array with one more `"<entry>"` after its last entry.
 * .why  = keeps the array's own layout: an empty array takes the entry bare, a one-line array takes
 *         it after `, `, and a multi-line array takes it on its own line at the last entry's indent.
 */
const asLibInnerWithEntryAppended = (input: {
  inner: string;
  entry: string;
}): string => {
  // an empty array takes the entry bare
  const lastEntry = [...input.inner.matchAll(/"[^"]*"/g)].pop();
  if (!lastEntry || lastEntry.index === undefined) return `"${input.entry}"`;

  // otherwise the entry lands right after the last entry, with the separator its layout uses
  const insertAt = lastEntry.index + lastEntry[0].length;
  const separator = asLibEntrySeparator({
    inner: input.inner,
    entryAt: lastEntry.index,
  });
  return `${input.inner.slice(0, insertAt)}${separator}"${input.entry}"${input.inner.slice(insertAt)}`;
};

/**
 * .what = the separator a new lib entry takes: `, ` on a one-line array, or a newline plus the
 *         last entry's indent on a multi-line array.
 */
const asLibEntrySeparator = (input: {
  inner: string;
  entryAt: number;
}): string => {
  const lineStart = input.inner.lastIndexOf('\n', input.entryAt);
  if (lineStart === -1) return ', ';
  const indent =
    input.inner.slice(lineStart + 1, input.entryAt).match(/^\s*/)?.[0] ?? '';
  return `,\n${indent}`;
};
