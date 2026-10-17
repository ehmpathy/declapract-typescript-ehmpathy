import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { getOneSourceScanEnd } from '../../../../../../utils/getOneSourceScanEnd';
import { withReviewMarkerAbove } from '../../../../../../utils/withReviewMarkerAbove';

/**
 * .what = the review marker stamped above an sqs handler built on `extractTaskParcelFromSqsEvent`
 * .why  = the move to `genLambdaEndpoint.forSqs.perRecord` needs a `z.custom` payload schema for
 *         the task parcel and a `batchSize: 1` event source — a design call, never a regex. so the
 *         fix flags it and leaves the body alone (#646).
 */
const SQS_REVIEW_MARKER =
  '// @declapract:review — sdk-aws-lambda@0.7.1: move this sqs handler onto genLambdaEndpoint.forSqs.perRecord, with a z.custom task-parcel payload schema and a batchSize: 1 event source';

/**
 * .what = whether a file imports from sdk-aws-lambda
 * .why  = every rewrite below targets the sdk's own call forms; a file that does not import the
 *         sdk holds a same-named symbol of its own, which must stay untouched
 */
const isSdkAwsLambdaImported = (input: { contents: string }): boolean =>
  /from\s+['"]sdk-aws-lambda['"]/.test(input.contents);

/**
 * .what = whether a file holds a call form that sdk-aws-lambda@0.7 removed
 * .why  = 0.7 has no bare `genLambdaEndpoint(` (→ `.forAsk(`) and no `.for.apiGateway(`
 *         (→ `.forApiGateway(`). the rewrite of `({ event })` is gated on these forms, so a
 *         handler already on 0.7 is never touched
 */
const hasPreSevenCallForm = (input: { contents: string }): boolean =>
  /\bgenLambdaEndpoint\s*\(/.test(input.contents) ||
  /\bgenLambdaEndpoint\.for\.apiGateway\s*\(/.test(input.contents);

/**
 * .what = whether a file holds an sqs handler on `extractTaskParcelFromSqsEvent` with no marker
 * .why  = the marker is the whole fix for that shape, so its presence is what retires the flag
 */
const hasUnmarkedSqsTaskParcel = (input: { contents: string }): boolean =>
  /\bextractTaskParcelFromSqsEvent\s*\(/.test(input.contents) &&
  /\bgenLambdaEndpoint\b/.test(input.contents) &&
  !input.contents.includes(SQS_REVIEW_MARKER);

/**
 * .what = detects a source file still on the sdk-aws-lambda handler contract below 0.7
 * .why  = the node-service floor is 0.7.1 (#646); a handler on a removed call form fails tsc
 *         the moment the floor lands, so the practice must move it in the same apply
 */
export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('does not match bad practice');
  if (!isSdkAwsLambdaImported({ contents }))
    throw new Error('does not match bad practice');
  if (hasPreSevenCallForm({ contents })) return; // bad practice detected
  if (hasUnmarkedSqsTaskParcel({ contents })) return; // bad practice detected
  throw new Error('does not match bad practice');
};

/**
 * .what = the invoke-input keys 0.7 renamed: the validated input, and the raw wire event
 * .why  = pre-0.7 handed `{ event, rawEvent }`; 0.7 hands `{ headers, payload, event }`. so the
 *         old `event` is now `payload`, and the old `rawEvent` is now `event`
 */
const INVOKE_KEYS_RENAMED: [string, string][] = [
  ['event', 'payload'],
  ['rawEvent', 'event'],
];

/**
 * .what = rename one identifier within one arrow body
 * .why  = a body read of a renamed key must follow its param. a property key (`event:`), a member
 *         (`x.event`), or a string is left alone; a shorthand property (`{ event }`) keeps its key,
 *         as `{ event: payload }`, so the object it builds keeps its shape
 */
const asBodyWithRename = (input: {
  body: string;
  from: string;
  into: string;
}): string =>
  input.body
    // a shorthand property keeps its key, so the object it builds keeps its shape
    .replace(
      new RegExp(`([{,]\\s*)${input.from}(\\s*[,}])`, 'g'),
      (_match, before: string, after: string) =>
        `${before}${input.from}: ${input.into}${after}`,
    )
    // every other identifier read of the old name
    .replace(
      new RegExp(`(?<![.\\w$'"\`])${input.from}(?![\\w$'"\`]|\\s*:)`, 'g'),
      input.into,
    );

/**
 * .what = the destructure list with each renamed key moved, plus the body renames it implies
 * .why  = an aliased key (`event: input`) moves its key alone, since the body reads the alias;
 *         a shorthand key moves its key and every body read of it
 */
const asInvokeKeysRenamed = (input: {
  list: string;
}): { list: string; bodyRenames: { from: string; into: string }[] } => {
  const elements = input.list
    .split(',')
    .map((element) => element.trim())
    .filter((element) => element.length > 0);
  const moved = elements.map((element) => {
    const key = element.match(/^[\w$]+/)?.[0] ?? '';
    const into = INVOKE_KEYS_RENAMED.find(([from]) => from === key)?.[1];
    if (!into) return { element, rename: null };
    const isShorthand = !/^[\w$]+\s*:/.test(element);
    return {
      element: `${into}${element.slice(key.length)}`,
      rename: isShorthand ? { from: key, into } : null,
    };
  });
  return {
    list: `{ ${moved.map(({ element }) => element).join(', ')} }`,
    // in key order, never list order: `event` must move before `rawEvent` takes its name
    bodyRenames: INVOKE_KEYS_RENAMED.flatMap(([from]) =>
      moved.flatMap(({ rename }) => (rename?.from === from ? [rename] : [])),
    ),
  };
};

/**
 * .what = rewrite each pre-0.7 `invoke: async ({ event, rawEvent? }) => …` onto 0.7's
 *         `({ payload, event? })`, body included
 * .why  = 0.7 renamed the invoke input; the param rename alone leaves every body read of `event`
 *         on the raw wire event, which still exists, so the bug would be quiet (#640). a list
 *         with `rawEvent` beside it must move too, or tsc fails on a key 0.7 never hands (#646)
 * .note = idempotent: a list already on `payload` is skipped, so the loop ends once no pre-0.7
 *         list remains, and a second fix over the output finds no param to rewrite. the renames
 *         run in key order (`event` first), so the `event` that `rawEvent` becomes is never renamed
 */
const asInvokeWithPayload = (input: { contents: string }): string => {
  const paramPattern =
    /(invoke\s*:\s*(?:async\s*)?)\(\s*\{(?![^{}]*\bpayload\b)([^{}]*\bevent\b[^{}]*)\}/;
  const found = paramPattern.exec(input.contents);
  if (!found) return input.contents;

  // locate the param list, the arrow, and the body that follows it
  const paramsOpen = found.index + found[1]!.length;
  const paramsClose = getOneSourceScanEnd({
    contents: input.contents,
    from: paramsOpen,
    mode: 'close',
  });
  const arrowAt = input.contents.indexOf('=>', paramsClose);
  if (arrowAt === -1) return input.contents; // not an arrow fn; leave it be
  const bodyStart = arrowAt + 2;
  const bodyEnd = getOneSourceScanEnd({
    contents: input.contents,
    from: bodyStart,
    mode: 'expression',
  });

  // rebuild: params with each renamed key moved, body with each shorthand read renamed
  const renamed = asInvokeKeysRenamed({ list: found[2]! });
  const params = input.contents
    .slice(paramsOpen, paramsClose + 1)
    .replace(/\{[^{}]*\}/, renamed.list);
  const body = renamed.bodyRenames.reduce(
    (bodyNow, rename) => asBodyWithRename({ body: bodyNow, ...rename }),
    input.contents.slice(bodyStart, bodyEnd),
  );
  const rewritten =
    input.contents.slice(0, paramsOpen) +
    params +
    input.contents.slice(paramsClose + 1, bodyStart) +
    body +
    input.contents.slice(bodyEnd);
  return asInvokeWithPayload({ contents: rewritten });
};

/**
 * .what = moves a source file onto the sdk-aws-lambda@0.7.1 handler contract
 * .why  = `genLambdaEndpoint(` → `.forAsk(`, `.for.apiGateway(` → `.forApiGateway(`, and the
 *         invoke input `{ event }` → `{ payload }` (#646). an sqs handler on
 *         `extractTaskParcelFromSqsEvent` is flagged, never rewritten.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};

  // the call forms 0.7 removed, and the invoke input it renamed — only where a removed form sat
  const callsMoved = hasPreSevenCallForm({ contents })
    ? asInvokeWithPayload({
        contents: contents
          .replace(
            /\bgenLambdaEndpoint\.for\.apiGateway(\s*\()/g,
            'genLambdaEndpoint.forApiGateway$1',
          )
          .replace(/\bgenLambdaEndpoint(\s*\()/g, 'genLambdaEndpoint.forAsk$1'),
      })
    : contents;

  // the sqs task-parcel shape gets a marker, since its move is a design call
  const marked = /\bgenLambdaEndpoint\b/.test(callsMoved)
    ? withReviewMarkerAbove({
        contents: callsMoved,
        lineMatcher: /\bextractTaskParcelFromSqsEvent\s*\(/,
        marker: SQS_REVIEW_MARKER,
      })
    : callsMoved;

  return { contents: marked };
};
