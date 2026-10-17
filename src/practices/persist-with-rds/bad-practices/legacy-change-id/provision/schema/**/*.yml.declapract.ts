import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { isMap, isScalar, parseDocument, visit } from 'yaml';

/**
 * .what = the `id` key of each sql-schema-control change entry that still uses the legacy key
 * .why = sql-schema-control@1.8.0 renamed a change's natural key from `id:` to `exid:`. the
 *        tool still reads `id:`, but nudges on every plan and apply. only the key on a
 *        `type: change` entry moves; an `id` key anywhere else in the yml is not the tool's.
 * .note = an entry that already declares `exid` is never a target — whether it also holds an
 *         `id` (the tool rejects that pair) or not. a rename there would leave two `exid` keys.
 */
const getLegacyChangeIdKeyRanges = (input: {
  contents: string;
}): { start: number; end: number }[] => {
  const document = parseDocument(input.contents);
  const ranges: { start: number; end: number }[] = [];
  visit(document, {
    Map: (_key, map) => {
      if (!isMap(map)) return;
      const isChange = map.get('type') === 'change';
      if (!isChange) return;
      if (map.has('exid')) return;
      const pair = map.items.find(
        (item) => isScalar(item.key) && item.key.value === 'id',
      );
      if (!pair || !isScalar(pair.key) || !pair.key.range) return;
      ranges.push({ start: pair.key.range[0], end: pair.key.range[1] });
    },
  });
  return ranges;
};

/**
 * .what = the contents with `exid` spliced over each given key range
 * .why = a splice keeps every other byte — comments, blank lines, quotes — exactly as the repo
 *        wrote them
 * .note = applied bottom-up, so the earlier offsets stay valid
 */
const withExidOverRanges = (input: {
  contents: string;
  ranges: { start: number; end: number }[];
}): string =>
  [...input.ranges]
    .sort((a, b) => b.start - a.start)
    .reduce(
      (text, range) =>
        `${text.slice(0, range.start)}exid${text.slice(range.end)}`,
      input.contents,
    );

export const check: FileCheckFunction = (contents) => {
  if (contents && getLegacyChangeIdKeyRanges({ contents }).length > 0) return; // bad practice detected
  throw new Error(
    'does not match bad practice: no sql-schema-control change entry uses the legacy `id:` key',
  );
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  // splice `exid` over each legacy key
  return {
    contents: withExidOverRanges({
      contents,
      ranges: getLegacyChangeIdKeyRanges({ contents }),
    }),
  };
};
