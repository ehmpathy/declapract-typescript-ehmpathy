/**
 * .what = the one `// @declapract:review:` line that names the `(input)` → `(input, context)` move.
 * .why  = two retired wrappers fail the same way: `withDatabaseConnection` took `dbConnection` in
 *         the INPUT (#626), and the vendored `withLogTrail` fork took a variadic arg list with a
 *         module-singleton log (#635). both move to the `(input, context)` shape, often at the same
 *         call sites, so one marker text names the move once and an adopter pays one rewrite.
 *         the shape change touches each op body and each caller, which a regex cannot rewrite
 *         safely, so the fix names the move and never half-migrates it.
 */
export const asInputToContextReviewMarker = (input: {
  from: string;
  into: string;
}): string =>
  `// @declapract:review: ${input.from} is retired — move to ${input.into}, the (input, context) shape: each op becomes \`(input, context) => …\`, a dependency (dbConnection, log) moves out of the input into the context arg, and each caller passes it as the 2nd arg. then delete this marker`;
