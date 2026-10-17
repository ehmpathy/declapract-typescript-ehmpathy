// eslint-disable-next-line import/no-extraneous-dependencies
import type {
  FileCheckFunction,
  FileContentsFunction,
  FileFixFunction,
} from 'declapract';
import { readFile } from 'fs/promises';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'yaml';

import path from 'node:path';
import { isJsonObject } from '../../../utils/asJsonMergedDeep';

/**
 * .what = the seq keys of `.depcheckrc.yml` this practice declares and merges
 * .why  = each is a list of entries a repo may extend with its own; the practice only
 *         guarantees the presence of its declared entries, never their order or exclusivity
 */
const MERGED_SEQ_KEYS = ['ignores', 'ignorePatterns'] as const;
type MergedSeqKey = (typeof MERGED_SEQ_KEYS)[number];

/**
 * .what = the ignores an expo repo adds atop the base list
 * .why  = expo owns the bundled metro, so a consumer pins no `metro-config`; a require of it
 *         from `metro.config.js` reads to depcheck as an undeclared dep (#609). a union, so a
 *         narrow `--practice lint` apply (where the expo signal goes dark) strips no line
 */
const IGNORES_EXPO = ['metro-config'];

/**
 * .what = reads the declared seq entries for a key from a parsed `.depcheckrc.yml`
 * .why  = one shape for check + fix, so the gate and the repair agree
 */
const getSeqEntries = (input: {
  parsed: unknown;
  key: MergedSeqKey;
}): string[] => {
  const value = isJsonObject(input.parsed)
    ? input.parsed[input.key]
    : undefined;
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
};

/**
 * .what = the seq node a `.depcheckrc.yml` key holds; halts loud where the key holds no list
 * .why  = an entry can only be added to a list; a scalar or map under the key is a file the merge
 *         cannot repair, so it names the key rather than throw a bare TypeError on `.add`
 */
const asSeqNode = (input: { node: unknown; key: string }): yaml.YAMLSeq => {
  if (!yaml.isSeq(input.node))
    throw new ConstraintError(
      `.depcheckrc.yml \`${input.key}\` is not a list`,
      {
        key: input.key,
        hint: `make \`${input.key}\` a yaml list, then run \`declapract apply\` again`,
      },
    );
  return input.node;
};

/**
 * .what = the parsed declared `.depcheckrc.yml`; halts loud when declapract emitted none
 * .why  = an absent declared side parses to no entries, which would let the check approve any
 *         file; a declared template is always emitted for this best-practice, so its absence is a
 *         malfunction to name, never a silent pass
 */
const asDeclaredParsed = (input: {
  declaredFileContents: string | null;
  relativeFilePath: string;
}): unknown => {
  if (input.declaredFileContents === null)
    throw new MalfunctionError(
      'the lint practice emitted no declared .depcheckrc.yml',
      { relativeFilePath: input.relativeFilePath },
    );
  return yaml.parse(input.declaredFileContents);
};

/**
 * .what = the declared `.depcheckrc.yml`, usecase-aware for the expo runtime
 * .why  = an expo repo needs `metro-config` ignored; every other repo gets the base template
 */
export const contents: FileContentsFunction = async (context) => {
  const base = await readFile(path.join(__dirname, '.depcheckrc.yml'), 'utf-8');
  if (!context.projectPractices.includes('tests-expo')) return base;

  // union the expo ignores into the base, comments kept
  const doc = yaml.parseDocument(base);
  const ignoresNode = asSeqNode({ node: doc.get('ignores'), key: 'ignores' });
  IGNORES_EXPO.forEach((ignore) => ignoresNode.add(ignore)); // .note = deliberate mutation — yaml doc api
  return doc.toString();
};

/**
 * .what = the declared entries of one seq key that the found file lacks
 */
const getAllEntriesAbsent = (input: {
  declared: unknown;
  found: unknown;
  key: MergedSeqKey;
}): string[] => {
  const entriesFound = getSeqEntries({ parsed: input.found, key: input.key });
  return getSeqEntries({ parsed: input.declared, key: input.key }).filter(
    (entry) => !entriesFound.includes(entry),
  );
};

/**
 * .what = throws when a declared `ignores` or `ignorePatterns` entry is absent
 * .why  = a findsert gate: the repo may hold its own entries in any order, so the check
 *         mandates the PRESENCE of each declared entry, never textual equality — which
 *         also makes `check(fix(x))` pass (a plain-text CONTAINS never could, once a repo
 *         holds its own entries)
 * .note = best-practice semantics: throw = violated, return = followed
 */
export const check: FileCheckFunction = (contents, context) => {
  if (!contents)
    throw new ConstraintError('.depcheckrc.yml is absent', {
      relativeFilePath: context.relativeFilePath,
    });
  const found = yaml.parse(contents);
  const declared = asDeclaredParsed(context);
  const absent = MERGED_SEQ_KEYS.flatMap((key) =>
    getAllEntriesAbsent({ declared, found, key }).map(
      (entry) => `${key}: ${entry}`,
    ),
  );
  if (absent.length)
    throw new ConstraintError(
      '.depcheckrc.yml lacks declared entries; run `declapract apply` to merge them',
      { absent },
    );
};

/**
 * .what = merges each declared `ignores` + `ignorePatterns` entry into the extant file
 * .why  = a CONTAINS template alone never reaches an extant file (#639); the merge seeds a
 *         seq if absent, adds each absent entry, and keeps the repo's own entries + comments
 * .note = a fixed point: a present entry is never added twice, so fix(fix(x)) === fix(x)
 */
export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents: context.declaredFileContents };

  // parse both files (parseDocument keeps comments)
  const currentDoc = yaml.parseDocument(contents);
  const currentParsed = currentDoc.toJSON();
  const declaredParsed = asDeclaredParsed(context);

  // merge each seq key
  const changed = MERGED_SEQ_KEYS.map((key) => {
    const absentEntries = getAllEntriesAbsent({
      declared: declaredParsed,
      found: currentParsed,
      key,
    });
    if (!absentEntries.length) return false;

    // get the seq node; seed an empty seq onto the doc if absent
    if (!currentDoc.get(key)) currentDoc.set(key, currentDoc.createNode([]));
    const seqNode = asSeqNode({ node: currentDoc.get(key), key });

    // add each absent declared entry to the repo's own list
    // .note = deliberate mutation — the yaml document api mutates the seq node in
    // place to keep the comments around it; there is no immutable seq-add
    absentEntries.forEach((entry) => seqNode.add(entry));
    return true;
  });

  if (!changed.some(Boolean)) return { contents };
  return { contents: currentDoc.toString() };
};
