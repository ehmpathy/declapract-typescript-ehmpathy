import { asObjectLiteralProps } from './asObjectLiteralProps';
import { withEachCallRewritten } from './withEachCallRewritten';
import { withReviewMarkerAbove } from './withReviewMarkerAbove';

/**
 * .what = the retired lib's import, and the sdk-aws-lambda name each of its exports maps to
 * .why  = simple-lambda-testing-methods is retired for sdk-aws-lambda's runLambdaEndpoint (#650).
 *         an export with no row here (e.g. `LambdaInvocationError`) has no 1:1 successor, so it
 *         stays on a residual import with a review marker, rather than vanish
 */
const RETIRED_LIB = 'simple-lambda-testing-methods';
const NAME_MAP: Record<string, string[]> = {
  invokeLambdaForTesting: ['runLambdaEndpoint'],
  invokeHandlerForTesting: ['runLambdaEndpoint', 'asLambdaEndpointOutput'],
  createExampleAPIGatewayEvent: ['asLambdaEvent'],
};

/**
 * .what = the marker above a residual import of an export with no 1:1 successor
 * .why  = the fix writes this text into an adopter file, and its idempotency guard matches the
 *         exact text; a reword re-stamps every file already marked, so reword only with a migration
 */
const MARKER_UNMAPPED = `// @declapract:review — ${RETIRED_LIB} is retired (declapract-typescript-ehmpathy#650): this import has no 1:1 successor in sdk-aws-lambda; move it by hand onto runLambdaEndpoint`;

/**
 * .what = the marker above a flat error read in a file that also makes an http call
 * .why  = a runLambdaEndpoint result answers the contemp body `{ error: { class, message } }` on
 *         sdk-aws-lambda >= 0.7.2, but a real http response still answers the flat body. a file
 *         that holds both cannot be told apart line by line, so the read is named, never guessed
 * .note = its idempotency guard matches the exact text; reword only with a migration
 */
const MARKER_FLAT_READ = `// @declapract:review: declapract-typescript-ehmpathy#650 — if this reads a runLambdaEndpoint result, it is now \`error.message\` / \`error.class\` on sdk-aws-lambda >= 0.7.2; an http response stays flat`;

/**
 * .what = a call to a real http client, or a read off an http response
 * .why  = a real api gateway answers the flat `{ errorMessage, errorType }`, a shipped wire that
 *         owes compat; a file that makes such a call keeps its flat reads
 */
const HTTP_CALL_PATTERN =
  /\b(axios|fetch|got|supertest|request)\s*[.(]|\.response\.data\b/;

/**
 * .what = a code line (never a comment) that reads a flat error field
 */
const FLAT_READ_LINE =
  /^(?!\s*(\/\/|\/?\*)).*(\.error(Message|Type)\b|['"]error(Message|Type)['"]|\{\s*error(Message|Type)\b)/;

/**
 * .what = a destructure of the flat fields off a parsed body, cast to the flat shape
 * .why  = consumer suites read a 400 as `const { errorMessage } = JSON.parse(result.body) as {
 *         errorMessage: string }`; a rename of the field alone would leave a cast that lies
 */
const DESTRUCTURE_FLAT_PATTERN =
  /const\s*\{\s*(error(?:Message|Type)(?:\s*,\s*error(?:Message|Type))*)\s*,?\s*\}\s*=\s*JSON\.parse\(([^()]*)\)\s*as\s*\{(?:\s*error(?:Message|Type)\s*:\s*string\s*[;,]?)+\s*\}/g;

const IMPORT_PATTERN = new RegExp(
  `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${RETIRED_LIB}['"];?`,
);
const SDK_IMPORT_PATTERN =
  /import\s*\{([^}]*)\}\s*from\s*['"]sdk-aws-lambda['"];?/;

/**
 * .what = the names in an import clause, `type` and `as` aliases set aside
 */
const asImportNames = (input: { clause: string }): string[] =>
  input.clause
    .split(',')
    .map(
      (name) =>
        name
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]!,
    )
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

/**
 * .what = whether a source still imports a mapped export of the retired lib
 * .why  = the bad-practice check fires on this alone; a file whose import holds only unmapped
 *         names (already marked) has no move left that a codemod can make
 */
export const isOnRetiredLambdaTestLib = (input: {
  contents: string;
}): boolean => {
  const found = IMPORT_PATTERN.exec(input.contents);
  if (!found) return false;
  return asImportNames({ clause: found[1]! }).some((name) => name in NAME_MAP);
};

/**
 * .what = whether a source already imports a given name, from any module
 * .why  = the caller-context imports are added only where absent, so a rerun adds none twice
 */
const isNameImported = (input: { contents: string; name: string }): boolean =>
  new RegExp(`import\\s*\\{[^}]*\\b${input.name}\\b[^}]*\\}\\s*from`).test(
    input.contents,
  );

/**
 * .what = `invokeLambdaForTesting({ service, function, stage, locally, event })` →
 *         `runLambdaEndpoint.onSerialized({ which, event, at, struct? }, { log, env })`
 * .why  = `stage` is gone (the access rides in context.env, via the contemp helper); the
 *         `locally` boolean becomes the named locus `at`. every call takes the contemp default,
 *         an api gateway one included: sdk-aws-lambda >= 0.7.2 frames a contemp api gateway call
 *         right (sdk-aws-lambda#51), so no call pins `struct: { payload: 'ancient' }`
 */
const asOnSerializedCall = (input: { argsText: string }): string => {
  // a non-literal argument cannot be read field by field; rename the callee, and tsc names the move
  const objectText = input.argsText.trim();
  if (!objectText.startsWith('{') || !objectText.endsWith('}'))
    return `runLambdaEndpoint.onSerialized(${input.argsText})`;

  // the props, each read by key; a shorthand prop reads its own name
  const props = asObjectLiteralProps({ body: objectText.slice(1, -1) });
  const valueOf = (key: string): string | null => {
    const prop = props.find((each) => each.key === key);
    if (!prop) return null;
    return prop.value ?? key;
  };
  // a prop moves from depth 1 (2 spaces) to depth 2 (4 spaces); its later lines move with it
  const asShifted = (text: string) => text.replace(/\n/g, '\n  ');
  const event = asShifted(valueOf('event') ?? 'undefined');
  const locally = valueOf('locally');

  // any field the successor has no slot for rides along, so tsc names it
  const extras = props
    .filter(
      (prop) =>
        !['service', 'function', 'event', 'locally', 'stage'].includes(
          prop.key ?? '',
        ),
    )
    .map((prop) => `    ${asShifted(prop.raw)},`);

  return [
    'runLambdaEndpoint.onSerialized<unknown, Record<string, any>>(',
    '  {',
    `    which: { service: ${valueOf('service')}, function: ${valueOf('function')} },`,
    `    event: ${event},`,
    `    at: ${locally ? `${locally} ? 'local' : 'cloud'` : `'cloud'`},`,
    ...extras,
    '  },',
    '  { log, env: { access: sdkAwsLambdaEnvAccessContemp() } },',
    ')',
  ].join('\n');
};

/**
 * .what = the import lines the rewritten file needs, merged into one sdk-aws-lambda import
 * .why  = an extant sdk-aws-lambda import absorbs the new names, so the file never holds two
 */
const withImportsMoved = (input: {
  contents: string;
  namesFound: string[];
  needsCallerContext: boolean;
}): string => {
  const found = IMPORT_PATTERN.exec(input.contents)!;
  const mapped = [
    ...new Set(
      input.namesFound
        .filter((name) => name in NAME_MAP)
        .flatMap((name) => NAME_MAP[name]!),
    ),
  ];
  const unmapped = input.namesFound.filter((name) => !(name in NAME_MAP));

  // the sdk import: merge into an extant one, else put one where the retired import sat
  const sdkImport = SDK_IMPORT_PATTERN.exec(input.contents);
  const sdkNames = [
    ...new Set([
      ...(sdkImport ? asImportNames({ clause: sdkImport[1]! }) : []),
      ...mapped,
    ]),
  ].sort();
  const sdkLine = `import { ${sdkNames.join(', ')} } from 'sdk-aws-lambda';`;

  // the caller context the serialized boundary needs: a logger and the ambient access
  const contextLines = input.needsCallerContext
    ? [
        ...(isNameImported({
          contents: input.contents,
          name: 'sdkAwsLambdaEnvAccessContemp',
        })
          ? []
          : [
              "import { sdkAwsLambdaEnvAccessContemp } from '@src/access/sdks/sdkAwsLambdaEnvAccessContemp';",
            ]),
        ...(isNameImported({ contents: input.contents, name: 'log' })
          ? []
          : ["import { log } from '@src/utils/logger';"]),
      ]
    : [];

  // the residual import keeps each unmapped name, behind a review marker
  const residualLines = unmapped.length
    ? [
        MARKER_UNMAPPED,
        `import { ${unmapped.join(', ')} } from '${RETIRED_LIB}';`,
      ]
    : [];

  // swap the retired import, then the extant sdk import (if any) for the merged one
  const replacement = [
    ...(sdkImport ? [] : [sdkLine]),
    ...residualLines,
    ...contextLines,
  ].join('\n');
  const swapped = input.contents.replace(found[0], replacement);
  return sdkImport ? swapped.replace(sdkImport[0], sdkLine) : swapped;
};

/**
 * .what = the indent of the line that holds a given offset
 */
const asIndentAt = (input: { contents: string; offset: number }): string => {
  const lineStart = input.contents.lastIndexOf('\n', input.offset - 1) + 1;
  return input.contents.slice(lineStart).match(/^[ \t]*/)?.[0] ?? '';
};

/**
 * .what = moves each flat error read onto the contemp body `{ error: { class, message } }`
 * .why  = a runLambdaEndpoint result on sdk-aws-lambda >= 0.7.2 answers a caller fault with the
 *         contemp body, so a flat `errorMessage` / `errorType` read finds naught (#650)
 * .note = only for a file whose every run is a runLambdaEndpoint one; a comment line is left as is
 */
const withFlatErrorReadsNested = (input: { contents: string }): string => {
  // a destructure off a parsed body: read the nested fields, under a cast that tells the truth
  const destructured = input.contents.replace(
    DESTRUCTURE_FLAT_PATTERN,
    (_found, names: string, parsed: string, offset: number) => {
      const fields = names
        .split(',')
        .map((name) => name.trim())
        .map((name) =>
          name === 'errorType' ? 'class: errorType' : 'message: errorMessage',
        );
      const indent = asIndentAt({ contents: input.contents, offset });
      return [
        `const { error: { ${fields.join(', ')} } } = JSON.parse(${parsed}) as {`,
        `${indent}  error: { class: string; message: string };`,
        `${indent}}`,
      ].join('\n');
    },
  );

  // a property read and a property-path assertion, on each code line
  return destructured
    .split('\n')
    .map((line) => {
      if (/^\s*(\/\/|\/?\*)/.test(line)) return line;
      return line
        .replace(/\.errorMessage\b/g, '.error.message')
        .replace(/\.errorType\b/g, '.error.class')
        .replace(/(['"])errorMessage\1/g, '$1error.message$1')
        .replace(/(['"])errorType\1/g, '$1error.class$1');
    })
    .join('\n');
};

/**
 * .what = the flat error reads moved, or named where the file also speaks real http
 * .why  = a real api gateway still answers the flat body, so a read off an http response keeps it;
 *         in a file with both, no line can be told apart, so each read gets the marker instead
 */
const withFlatErrorReadsMoved = (input: { contents: string }): string => {
  if (!HTTP_CALL_PATTERN.test(input.contents))
    return withFlatErrorReadsNested({ contents: input.contents });
  return withReviewMarkerAbove({
    contents: input.contents,
    lineMatcher: FLAT_READ_LINE,
    marker: MARKER_FLAT_READ,
  });
};

/**
 * .what = drops `stage` from an import once no other read of it remains
 * .why  = `stage` fed only the retired `invokeLambdaForTesting({ stage })`; the access now rides in
 *         the caller context. an unread import fails a lint for unused imports, and the stage
 *         axis is retired (rule.forbid.stage-term), so a live read elsewhere keeps it untouched
 */
const withUnreadStageImportDropped = (input: { contents: string }): string => {
  const found = /import\s*\{([^}]*)\}\s*from\s*(['"][^'"]+['"]);?/g;
  const stageImport = [...input.contents.matchAll(found)].find((each) =>
    asImportNames({ clause: each[1]! }).includes('stage'),
  );
  if (!stageImport) return input.contents;
  const withoutImport = input.contents.replace(stageImport[0], '');
  if (/\bstage\b/.test(withoutImport)) return input.contents; // still read; leave it be
  const namesKept = asImportNames({ clause: stageImport[1]! }).filter(
    (name) => name !== 'stage',
  );
  if (!namesKept.length)
    return input.contents.replace(`${stageImport[0]}\n`, '');
  return input.contents.replace(
    stageImport[0],
    `import { ${namesKept.join(', ')} } from ${stageImport[2]};`,
  );
};

/**
 * .what = moves a test source off simple-lambda-testing-methods onto sdk-aws-lambda (#650)
 * .why  = the human retired the lib; its successor is `runLambdaEndpoint` — `.onSerialized` for
 *         a slug run (acceptance), `.onReferenced` for a handler run (integration)
 * .note = idempotent: every rewrite keys on a retired name, and none survive the first pass; a
 *         residual import of only unmapped names no longer trips `isOnRetiredLambdaTestLib`
 */
export const asSourceOnRunLambdaEndpoint = (input: {
  contents: string;
}): string => {
  // a file with no mapped retired import has no move left
  if (!isOnRetiredLambdaTestLib({ contents: input.contents }))
    return input.contents;
  const namesFound = asImportNames({
    clause: IMPORT_PATTERN.exec(input.contents)![1]!,
  });
  const usesSerialized = namesFound.includes('invokeLambdaForTesting');

  // the imports first, so a later call rewrite never reads the retired import line
  const imported = withImportsMoved({
    contents: input.contents,
    namesFound,
    needsCallerContext: usesSerialized,
  });

  // each call, onto its successor
  const serializedMoved = withEachCallRewritten({
    contents: imported,
    callee: 'invokeLambdaForTesting',
    rewrite: ({ argsText }) => asOnSerializedCall({ argsText }),
  });
  // the referenced run narrows through asLambdaEndpointOutput, which throws on a caller-fault
  // envelope — the same stance invokeHandlerForTesting held, so a getError assertion still holds
  const referencedMoved = withEachCallRewritten({
    contents: usesSerialized
      ? withUnreadStageImportDropped({ contents: serializedMoved })
      : serializedMoved,
    callee: 'invokeHandlerForTesting',
    rewrite: ({ argsText }) =>
      `runLambdaEndpoint.onReferenced(${argsText}).then(asLambdaEndpointOutput)`,
  });
  const exampleEventsMoved = referencedMoved.replace(
    /\bcreateExampleAPIGatewayEvent(\s*\()/g,
    'asLambdaEvent.fromApiGateway$1',
  );

  // each flat error read moves to the contemp body, or is named where real http shares the file
  return withFlatErrorReadsMoved({ contents: exampleEventsMoved });
};
