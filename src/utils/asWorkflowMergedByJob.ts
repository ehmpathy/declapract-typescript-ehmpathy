import {
  isMap,
  isNode,
  isScalar,
  isSeq,
  type Pair,
  parseDocument,
  type YAMLMap,
} from 'yaml';

import { asWorkflowParts, isPlainMap, isTriggerHeld } from './asWorkflowParts';
import { getAllWorkflowJobDrifts } from './getAllWorkflowJobDrifts';

/**
 * .what = the key of a yaml map pair, as text
 * .why  = names the read of a pair key, which the yaml api holds as a node or a raw value
 */
const asPairKey = (pair: Pair): string =>
  isScalar(pair.key) ? String(pair.key.value) : String(pair.key);

/**
 * .what = move each blank line the yaml parser parks on an empty value onto the key that
 *         follows it; returns whether the collection ends on such a parked blank line
 * .why  = the parser attaches a blank line after `workflow_dispatch:` (an empty value) to that
 *         empty value, not to the next key. once a merge swaps a value, the blank line moves
 *         with it — a doubled gap in one spot, no gap in another. parked on keys, every blank
 *         line stays where the reader saw it, whichever value the merge swaps.
 * .note = deliberate mutation of `node`, scoped to a document the caller parsed for this merge
 */
const asBlankLinesOnKeys = (node: unknown): boolean => {
  // a list: a parked blank line at the end of one item moves onto the next item
  if (isSeq(node))
    return node.items.reduce<boolean>((parked, item) => {
      if (parked && isNode(item)) item.spaceBefore = true;
      return asBlankLinesOnKeys(item); // parked at an item end moves to the next, or up
    }, false);

  // only a map carries keys to park blank lines on
  if (!isMap(node)) return false;
  return node.items.reduce<boolean>((parked, pair) => {
    if (parked && isScalar(pair.key)) pair.key.spaceBefore = true;
    const value = pair.value;
    const parkedOnEmpty =
      isScalar(value) && value.value === null && value.spaceBefore === true;
    if (parkedOnEmpty) value.spaceBefore = false;
    return parkedOnEmpty || asBlankLinesOnKeys(value); // moves to the next key, or up
  }, false);
};

/**
 * .what = put a declared pair into a found map: overwrite the value in place where the key
 *         exists, else insert the pair right after the last found key that precedes it in the
 *         declared order (or first, if none does)
 * .why  = an absent declared job lands beside its declared neighbors, never at the tail — so it
 *         never sits below a repo's own trailer jobs (e.g. an rds tail a peer strip truncates at)
 * .note = deliberate mutation of `map`, scoped to a document the caller parsed for this merge
 */
const findsertPairInDeclaredOrder = (input: {
  map: YAMLMap;
  pair: Pair;
  declaredKeys: string[];
  blankLineOnInsert: boolean;
}): void => {
  const key = asPairKey(input.pair);

  // overwrite in place; the found key keeps its own position, comments, and blank line
  const pairFound = input.map.items.find((item) => asPairKey(item) === key);
  if (pairFound) {
    pairFound.value = input.pair.value;
    return;
  }

  // insert after the last found key that the declared order places before this one
  const keysBefore = input.declaredKeys.slice(
    0,
    input.declaredKeys.indexOf(key),
  );
  const indexAnchor = input.map.items.reduce(
    (latest, item, index) =>
      keysBefore.includes(asPairKey(item)) ? index : latest,
    -1,
  );
  const indexInsert = indexAnchor + 1;
  if (isScalar(input.pair.key))
    input.pair.key.spaceBefore = input.blankLineOnInsert && indexInsert > 0; // apart from the pair above, where the map spaces its pairs
  const pairDisplaced = input.map.items[indexInsert];
  if (input.blankLineOnInsert && pairDisplaced && isScalar(pairDisplaced.key))
    pairDisplaced.key.spaceBefore = true; // the pair pushed down keeps a blank line above it
  input.map.items.splice(indexInsert, 0, input.pair);
};

/**
 * .what = merge the declared `on` triggers into the found ones, trigger by trigger; returns
 *         whether the merge applied (both sides hold a trigger map)
 * .why  = a repo adds its own triggers (a `schedule`, a dispatch with inputs, a branch filter on
 *         `push`); a whole overwrite of `on` would drop them on every apply. so each declared
 *         trigger that is not held is set to its declared shape, and every other trigger stays
 *         byte-for-byte
 * .note = deliberate mutation of `mapFound`, scoped to a document the caller parsed for this merge
 */
const mergeTriggersInPlace = (input: {
  mapFound: YAMLMap;
  mapDeclared: YAMLMap;
  triggersFoundData: unknown;
}): boolean => {
  // both sides must hold a trigger map, else `on` is overwritten whole by the caller
  const pairOnDeclared = input.mapDeclared.items.find(
    (pair) => asPairKey(pair) === 'on',
  );
  const pairOnFound = input.mapFound.items.find(
    (pair) => asPairKey(pair) === 'on',
  );
  const triggersFoundData = input.triggersFoundData;
  if (!pairOnDeclared || !isMap(pairOnDeclared.value)) return false;
  if (!pairOnFound || !isMap(pairOnFound.value)) return false;
  if (!isPlainMap(triggersFoundData)) return false;
  const triggersFound = pairOnFound.value;

  // set each declared trigger that is not held; a held one keeps its found bytes
  const namesDeclared = pairOnDeclared.value.items.map(asPairKey);
  pairOnDeclared.value.items
    .filter(
      (pair) =>
        !isTriggerHeld({
          triggersFound: triggersFoundData,
          name: asPairKey(pair),
          declared: isNode(pair.value) ? pair.value.toJSON() : pair.value,
        }),
    )
    .forEach((pair) =>
      findsertPairInDeclaredOrder({
        map: triggersFound,
        pair,
        declaredKeys: namesDeclared,
        blankLineOnInsert: false,
      }),
    );
  return true;
};

/**
 * .what = merge a declared github workflow into a found one, job by job
 * .why  = a workflow caller is a superset by design — a repo adds its own jobs — so a whole-file
 *         overwrite would strip them, and a text-contains check with no fix never repairs a stale
 *         declared job (#685: a pre-oidc caller survives the callee upgrade). this merge:
 *         - merges `on` per trigger: each declared trigger set to its declared shape, the repo's
 *           own triggers kept as found
 *         - overwrites each other declared top-level key (`name`, `permissions`, `concurrency`)
 *           with its declared value
 *         - overwrites each declared job with its declared shape, in place
 *         - inserts each absent declared job beside its declared neighbors
 *         - drops an undeclared job only where `dropJobWhen` marks it obsolete
 *         - keeps every other job, comment, and key of the repo as found
 * .note = a fixed point: where `getAllWorkflowJobDrifts` finds no drift the found text returns
 *         byte-for-byte, so a second apply changes no byte
 */
export const asWorkflowMergedByJob = (input: {
  found: string;
  declared: string;
  dropJobWhen: ((input: { job: unknown }) => boolean) | null;
}): string => {
  // a workflow with no drift is already merged; return it untouched
  const drift = getAllWorkflowJobDrifts(input);
  if (drift.length === 0) return input.found;

  // parse both sides as documents, so comments and key order survive the round trip
  const docFound = parseDocument(input.found);
  const docDeclared = parseDocument(input.declared);
  asBlankLinesOnKeys(docFound.contents);
  asBlankLinesOnKeys(docDeclared.contents);
  const mapDeclared = docDeclared.contents;
  if (!isMap(mapDeclared)) return input.declared; // a declared non-map is not a workflow merge
  const mapFound = docFound.contents;
  if (!isMap(mapFound)) return input.declared; // a found non-map holds no repo job to keep

  // merge `on` per trigger, where both sides hold a trigger map
  const keysDeclaredTopLevel = mapDeclared.items.map(asPairKey);
  const isOnMergedPerTrigger = mergeTriggersInPlace({
    mapFound,
    mapDeclared,
    triggersFoundData: asWorkflowParts({ contents: input.found }).topLevel.on,
  });

  // overwrite each other declared top-level key whole. `name` is a scalar, so a merge makes no
  // sense. `permissions` and `concurrency` keep the declared shape on purpose: the declared
  // permissions are the security floor every declared job was written against, and the
  // declared concurrency group is what keeps two applies from a race on one stack
  mapDeclared.items
    .filter((pair) => asPairKey(pair) !== 'jobs' || !isMap(pair.value))
    .filter((pair) => !(asPairKey(pair) === 'on' && isOnMergedPerTrigger))
    .forEach((pair) =>
      findsertPairInDeclaredOrder({
        map: mapFound,
        pair,
        declaredKeys: keysDeclaredTopLevel,
        blankLineOnInsert: true,
      }),
    );

  // grab the declared jobs map; a declaration with none leaves the found jobs as they stand
  const pairJobsDeclared = mapDeclared.items.find(
    (pair) => asPairKey(pair) === 'jobs' && isMap(pair.value),
  );
  if (!pairJobsDeclared || !isMap(pairJobsDeclared.value))
    return docFound.toString({ lineWidth: 0 });
  const jobsDeclared = pairJobsDeclared.value;

  // a found file with no jobs map takes the declared one whole
  const pairJobsFound = mapFound.items.find(
    (pair) => asPairKey(pair) === 'jobs',
  );
  if (!pairJobsFound || !isMap(pairJobsFound.value)) {
    findsertPairInDeclaredOrder({
      map: mapFound,
      pair: pairJobsDeclared,
      declaredKeys: keysDeclaredTopLevel,
      blankLineOnInsert: true,
    });
    return docFound.toString({ lineWidth: 0 });
  }
  const jobsFound = pairJobsFound.value;

  // drop each undeclared job the declaration marks obsolete
  const namesDeclared = jobsDeclared.items.map(asPairKey);
  const jobsFoundData = asWorkflowParts({ contents: input.found }).jobs;
  const dropJobWhen = input.dropJobWhen;
  jobsFound.items = jobsFound.items.filter((pair) => {
    const name = asPairKey(pair);
    if (namesDeclared.includes(name)) return true;
    if (!dropJobWhen) return true;
    return !dropJobWhen({ job: jobsFoundData[name] });
  });

  // overwrite or insert each declared job, in declared order
  jobsDeclared.items.forEach((pair) =>
    findsertPairInDeclaredOrder({
      map: jobsFound,
      pair,
      declaredKeys: namesDeclared,
      blankLineOnInsert: true,
    }),
  );

  return docFound.toString({ lineWidth: 0 });
};
