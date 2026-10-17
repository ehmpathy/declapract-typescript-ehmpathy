import { getOneSourceScanEnd } from './getOneSourceScanEnd';

/**
 * .what = split the body of an object literal (the text between its braces) into its top-level
 *         properties, each with its key (null for a spread or a computed key) and its raw text
 * .why  = a codemod that moves one call shape onto another (`{ service, function, event }` →
 *         `{ which: { service, function }, event }`) must read the properties one by one, with a
 *         nested object or a string that holds a comma left whole
 * .note = a shorthand property (`locally`) yields `{ key: 'locally', value: null }`; a keyed one
 *         (`event: { … }`) yields its value text, trimmed
 * .note = deliberate mutation: the scan holds a local cursor (`from`) and a local segment list,
 *         scoped to this call, as `getOneSourceScanEnd` does; no input or shared value is mutated
 */
export const asObjectLiteralProps = (input: {
  body: string;
}): { key: string | null; value: string | null; raw: string }[] => {
  const segments: string[] = [];
  let from = 0;
  while (from < input.body.length) {
    const end = getOneSourceScanEnd({
      contents: input.body,
      from,
      mode: 'expression',
    });
    segments.push(input.body.slice(from, end));
    from = end + 1;
  }
  return segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((raw) => {
      // a lead `//` comment line rides with its property, but never names its key
      const code = raw.replace(/^(?:\/\/[^\n]*\n\s*)+/, '');
      const shorthand = code.match(/^([A-Za-z_$][\w$]*)$/);
      if (shorthand) return { key: shorthand[1]!, value: null, raw };
      const keyed = code.match(/^([A-Za-z_$][\w$]*|'[^']*'|"[^"]*")\s*:\s*/);
      if (!keyed) return { key: null, value: null, raw };
      return {
        key: keyed[1]!.replace(/^['"]|['"]$/g, ''),
        value: code.slice(keyed[0].length).trim(),
        raw,
      };
    });
};
