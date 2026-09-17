import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects simple-lambda-handlers imports in source files
 * .why = simple-lambda-handlers should be replaced with sdk-aws-lambda
 */
export const check: FileCheckFunction = (contents) => {
  // match if file imports from simple-lambda-handlers
  if (contents?.includes("from 'simple-lambda-handlers'")) return;
  if (contents?.includes('from "simple-lambda-handlers"')) return;

  // no match
  throw new Error('does not import from simple-lambda-handlers');
};

/**
 * .what = a loud marker for an api-gateway handler call, whose schema+invoke CONTRACT differs
 *         between the two frameworks and cannot be mechanically rewritten.
 * .why = the prior framework's schema described the WHOLE event and the handler received the whole
 *        event; the sdk's input schema describes the request BODY and the handler receives the
 *        parsed body plus a separate rawEvent. a rename-only rewrite leaves a handler that answers
 *        400 to every request, yet typechecks (#594). the marker flags the two manual edits rather
 *        than let a regex guess the contract.
 */
const apiGatewayReviewMarker = `/**
 * @declapract:review — auto-migrated to sdk-aws-lambda; the api-gateway handler CONTRACT differs
 * and MUST be restructured by hand (a rename-only migration answers 400 to every request):
 *  - schema: the prior single schema described the WHOLE event; the sdk input schema describes the
 *    request BODY only. split into \`schema: { input, output }\` and unwrap the \`body\` key.
 *  - invoke: \`logic: (event) => O\` becomes \`invoke: async ({ event, rawEvent }) => O\`. \`event\` is
 *    the parsed body; thread headers through \`rawEvent.headers\`.
 * delete this marker once restructured.
 */
`;

/**
 * .what = a loud marker for a standard handler call, whose schema+invoke shape also differs.
 * .why = the rename does not restructure the args; the sdk splits the schema and passes log in the
 *        invoke context. the marker flags the manual edits (#594).
 */
const standardReviewMarker = `/**
 * @declapract:review — auto-migrated to sdk-aws-lambda; the handler CONTRACT differs and MUST be
 * restructured by hand:
 *  - schema: the prior single schema splits into \`schema: { input, output }\`.
 *  - invoke: \`logic: (event) => O\` becomes \`invoke: async ({ event }, { log }) => O\`; \`log\` is now
 *    received in the invoke context, not only at creation.
 * delete this marker once restructured.
 */
`;

/**
 * .what = parse a comma-separated import clause into its trimmed import names
 * .why = names the split/trim parse, so the fix orchestrator reads as narrative rather than
 *        an inline array-manipulation chain (rule.forbid.inline-decode-friction)
 */
const asImportNames = (input: { clause: string }): string[] =>
  input.clause.split(',').map((name) => name.trim());

/**
 * .what = map one simple-lambda-handlers import name to its sdk-aws-lambda equivalent
 * .why = both handler-factory names collapse onto `genLambdaEndpoint`; the named map keeps the
 *        fix orchestrator narrative rather than an inline conditional (rule.forbid.inline-decode-friction)
 */
const asTransformedImportName = (input: { name: string }): string => {
  if (input.name === 'createStandardHandler') return 'genLambdaEndpoint';
  if (input.name === 'createApiGatewayHandler') return 'genLambdaEndpoint';
  return input.name;
};

/**
 * .what = dedupe import names, first-seen order retained
 * .why = the two handler factories both map to `genLambdaEndpoint`, so a clause that imports both
 *        would emit a duplicate; the named dedupe hides the Set semantics from the orchestrator
 */
const asDedupedImportNames = (input: { names: string[] }): string[] => [
  ...new Set(input.names),
];

/**
 * .what = transforms simple-lambda-handlers imports to sdk-aws-lambda, with a review marker
 * .why = automated migration reduces manual toil, but the schema+invoke contract cannot be
 *        mechanically rewritten — so a handler CALL gets a @declapract:review marker that names the
 *        manual edits, rather than a silent rename that answers 400 to every request (#594).
 *
 * .note = basic transforms only; complex patterns require manual fix
 *
 * API map:
 * - createStandardHandler → genLambdaEndpoint
 * - createApiGatewayHandler → genLambdaEndpoint.for.apiGateway
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};

  // detect a handler CALL (name + paren) on the ORIGINAL contents, before the rename
  const hasApiGatewayCall = /createApiGatewayHandler\s*\(/.test(contents);
  const hasStandardCall = /createStandardHandler\s*\(/.test(contents);

  const transformed = contents
    // transform imports (dedupe to avoid duplicate genLambdaEndpoint)
    .replace(
      /import\s+\{([^}]*)\}\s+from\s+['"]simple-lambda-handlers['"]/g,
      (match, imports) => {
        // split, replace, dedupe, join
        const importNames = asImportNames({ clause: imports });
        const mapped = importNames.map((name) =>
          asTransformedImportName({ name }),
        );
        const deduped = asDedupedImportNames({ names: mapped });
        return `import { ${deduped.join(', ')} } from 'sdk-aws-lambda'`;
      },
    )
    // transform function calls
    .replace(/createStandardHandler/g, 'genLambdaEndpoint')
    .replace(/createApiGatewayHandler/g, 'genLambdaEndpoint.for.apiGateway');

  // prepend the review marker for a handler CALL (api-gateway takes precedence), so the
  // un-rewritable schema+invoke contract is loud. idempotent: the check no longer fires
  // post-rewrite, and a second pass would find the marker already present.
  const marker = hasApiGatewayCall
    ? apiGatewayReviewMarker
    : hasStandardCall
      ? standardReviewMarker
      : '';
  const updated =
    marker && !transformed.includes('@declapract:review')
      ? marker + transformed
      : transformed;

  return { contents: updated };
};
