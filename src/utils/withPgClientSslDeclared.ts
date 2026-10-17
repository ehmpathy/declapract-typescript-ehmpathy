import ts from 'typescript';

/**
 * .what = the review pointer stamped above a file whose pg client cannot be given tls safely
 * .why = the fix can only name a cluster endpoint where the file already reads the app config;
 *        elsewhere a human must choose it, so the file is flagged and `plan` stays red
 */
export const PG_CLIENT_SSL_REVIEW_MARKER =
  '// @declapract:review: a pg Client here connects with no tls. pass `ssl: asDatabaseClientSsl({ clusterEndpoint })` from @src/utils/database/asDatabaseClientSsl';

const SSL_PROPERTY =
  'ssl: asDatabaseClientSsl({ clusterEndpoint: config.database.tunnel.lambda?.host ?? null }),';
const SSL_IMPORT =
  "import { asDatabaseClientSsl } from '@src/utils/database/asDatabaseClientSsl';";

const asSourceFile = (input: { source: string }): ts.SourceFile =>
  ts.createSourceFile(
    'client.ts',
    input.source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

/**
 * .what = the local names a source binds to the `pg` module: the name(s) its `Client` class goes
 *         by, and the name(s) of the module itself
 * .why = only a client constructed through a `pg` import is a pg client; an elasticsearch or
 *        opensearch `Client` must never get a postgres tls option or a review pointer
 */
const getPgBindings = (input: {
  file: ts.SourceFile;
}): { clientNames: string[]; moduleNames: string[] } => {
  const pgImports = input.file.statements
    .filter(ts.isImportDeclaration)
    .filter(
      (statement) =>
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === 'pg',
    )
    .map((statement) => statement.importClause)
    .filter((clause): clause is ts.ImportClause => !!clause);
  const clientNames = pgImports.flatMap((clause) => {
    const bindings = clause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) return [];
    return bindings.elements
      .filter((element) => (element.propertyName ?? element.name).text === 'Client')
      .map((element) => element.name.text);
  });
  const moduleNames = pgImports.flatMap((clause) => [
    ...(clause.name ? [clause.name.text] : []),
    ...(clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)
      ? [clause.namedBindings.name.text]
      : []),
  ]);
  return { clientNames, moduleNames };
};

/**
 * .what = whether a `new X(...)` expression constructs a pg Client, through a `pg` import:
 *         `new Client` (named import) or `new pg.Client` (default or namespace import)
 */
const isPgClientConstruction = (input: {
  node: ts.NewExpression;
  pg: { clientNames: string[]; moduleNames: string[] };
}): boolean =>
  (ts.isIdentifier(input.node.expression) &&
    input.pg.clientNames.includes(input.node.expression.text)) ||
  (ts.isPropertyAccessExpression(input.node.expression) &&
    input.node.expression.name.text === 'Client' &&
    ts.isIdentifier(input.node.expression.expression) &&
    input.pg.moduleNames.includes(input.node.expression.expression.text));

/**
 * .what = whether an options object declares an explicit `ssl` property
 */
const hasSslProperty = (input: {
  options: ts.ObjectLiteralExpression;
}): boolean =>
  input.options.properties.some(
    (property) =>
      !!property.name &&
      ts.isIdentifier(property.name) &&
      property.name.text === 'ssl',
  );

/**
 * .what = the options object of each pg Client the source constructs with no explicit `ssl`
 * .why = both the check and the fix key on these, via the parser, so a comment or a string that
 *        mentions `new Client` is never mistaken for a construction
 */
const getAllPgClientOptionsWithoutSsl = (input: {
  file: ts.SourceFile;
}): ts.ObjectLiteralExpression[] => {
  const pg = getPgBindings({ file: input.file });
  const found: ts.ObjectLiteralExpression[] = [];
  const visit = (node: ts.Node): void => {
    const options = ts.isNewExpression(node) ? node.arguments?.[0] : undefined;
    if (
      ts.isNewExpression(node) &&
      isPgClientConstruction({ node, pg }) &&
      options &&
      ts.isObjectLiteralExpression(options) &&
      !hasSslProperty({ options })
    )
      found.push(options);
    ts.forEachChild(node, visit);
  };
  visit(input.file);
  return found;
};

/**
 * .what = whether a source constructs a pg Client with no explicit tls options
 */
export const isPgClientWithoutSsl = (input: { source: string }): boolean =>
  getAllPgClientOptionsWithoutSsl({ file: asSourceFile(input) }).length > 0;

/**
 * .what = where and what to insert so one options object declares the ssl property
 * .why = the property lands after the last one, at its indent, with the comma it needs
 * .note = three shapes: an empty object takes the property inline; a comma already after the last
 *         property takes it after that comma; else a comma is added before it
 */
const asSslPropertyInsert = (input: {
  source: string;
  file: ts.SourceFile;
  options: ts.ObjectLiteralExpression;
}): { at: number; text: string } => {
  const last = input.options.properties[input.options.properties.length - 1];
  if (!last)
    return {
      at: input.options.getStart(input.file) + 1,
      text: ` ${SSL_PROPERTY} `,
    };
  const lineStart = input.source.lastIndexOf('\n', last.getStart(input.file));
  const indent = /^[ \t]*/.exec(input.source.slice(lineStart + 1))?.[0] ?? '  ';
  const commaAt = input.options.properties.hasTrailingComma
    ? input.source.indexOf(',', last.getEnd())
    : -1;
  if (commaAt >= 0)
    return { at: commaAt + 1, text: `\n${indent}${SSL_PROPERTY}` };
  return { at: last.getEnd(), text: `,\n${indent}${SSL_PROPERTY}` };
};

/**
 * .what = gives every pg Client in a source the verified tls options of asDatabaseClientSsl
 * .why = a client with no `ssl` connects in plaintext, and fails outright on a cluster that
 *        forces ssl (the postgres 17 default)
 * .note = the fix names the endpoint as `config.database.tunnel.lambda?.host`, so it applies only
 *         where the source already reads `config.database.tunnel`. any other source gets the review
 *         pointer once instead. a second pass is a no-op
 */
export const withPgClientSslDeclared = (input: { source: string }): string => {
  const file = asSourceFile(input);
  const optionsAll = getAllPgClientOptionsWithoutSsl({ file });
  if (optionsAll.length === 0) return input.source;

  // stamp the review pointer once where the endpoint cannot be named safely
  if (!input.source.includes('config.database.tunnel'))
    return input.source.includes(PG_CLIENT_SSL_REVIEW_MARKER)
      ? input.source
      : `${PG_CLIENT_SSL_REVIEW_MARKER}\n${input.source}`;

  // insert the ssl property into each options object
  const spans = optionsAll.map((options) =>
    asSslPropertyInsert({ source: input.source, file, options }),
  );

  // add the import after the last import, unless the source already imports it
  const imports = file.statements.filter(ts.isImportDeclaration);
  const importAt = imports[imports.length - 1]?.getEnd() ?? 0;
  const importSpans = input.source.includes('asDatabaseClientSsl')
    ? []
    : [
        {
          at: importAt,
          text: importAt ? `\n${SSL_IMPORT}` : `${SSL_IMPORT}\n`,
        },
      ];

  // splice bottom-up, so the earlier offsets stay valid
  return [...spans, ...importSpans]
    .sort((a, b) => b.at - a.at)
    .reduce(
      (text, span) =>
        `${text.slice(0, span.at)}${span.text}${text.slice(span.at)}`,
      input.source,
    );
};
