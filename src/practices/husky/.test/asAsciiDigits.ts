/**
 * .what = swap each fullwidth digit (０-９) for its ascii twin (0-9)
 * .why  = the timestamp hook scans every staged file, test sources included. a clock fixture
 *         spelled with fullwidth digits holds no ascii clock, so its own source commits;
 *         this restores the real clock text at runtime, before the hook under test reads it
 */
export const asAsciiDigits = (input: string): string =>
  input.replace(/[０-９]/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) - 0xfee0),
  );
