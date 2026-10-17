import ts from 'typescript';

/**
 * .what = whether a module specifier names the retired `getDatabaseConnection` module, by any path
 *         (`./getDatabaseConnection`, `@src/utils/database/getDatabaseConnection`, …)
 * .why = the retired module is found by its file name; the path to it varies per importer
 */
const isRetiredModuleSpecifier = (input: { specifier: string }): boolean =>
  /(^|\/)getDatabaseConnection$/.test(input.specifier) &&
  input.specifier.includes('/');

/**
 * .what = the import declarations of a source that reach the retired module
 * .why = both the check and the fix key on these, via the parser, so a comment or a string that
 *        mentions the path is never mistaken for an import
 */
const getRetiredModuleImports = (input: {
  file: ts.SourceFile;
}): ts.ImportDeclaration[] =>
  input.file.statements.filter(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      isRetiredModuleSpecifier({ specifier: statement.moduleSpecifier.text }),
  );

const asSourceFile = (input: { source: string }): ts.SourceFile =>
  ts.createSourceFile(
    'repoint.ts',
    input.source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

/**
 * .what = whether a source imports from the retired `getDatabaseConnection` module
 * .why = the repoint fires only on a file that reaches the retired module
 */
export const isGetDatabaseConnectionImporter = (input: {
  source: string;
}): boolean =>
  getRetiredModuleImports({ file: asSourceFile(input) }).length > 0;

/**
 * .what = repoints a source from the retired `getDatabaseConnection` module onto
 *         `getOneDatabaseConnection`: the module specifier, and the factory's local name
 * .why = persist-with-rds renamed the factory, and the old file still reads a config shape the
 *        practice removed. both modules export `DatabaseConnection` and `DatabaseQueryError` by the
 *        same names, so only the specifier and the factory name move
 * .note = the factory name moves only where the retired import binds it unaliased; a
 *         `getDatabaseConnection` imported from some other module (as the property name of an
 *         aliased import) is never touched. a source that reaches no retired module is returned
 *         unchanged, and a second pass is a no-op
 */
export const withGetDatabaseConnectionRepointed = (input: {
  source: string;
}): string => {
  const file = asSourceFile(input);
  const retiredImports = getRetiredModuleImports({ file });
  if (retiredImports.length === 0) return input.source;

  // the factory is renamed only where a retired import binds it under its own name
  const bindsFactory = retiredImports.some((declaration) => {
    const bindings = declaration.importClause?.namedBindings;
    return (
      !!bindings &&
      ts.isNamedImports(bindings) &&
      bindings.elements.some(
        (element) =>
          element.name.text === 'getDatabaseConnection' &&
          !element.propertyName,
      )
    );
  });

  // collect each span to rewrite: the retired specifiers, then the factory's identifiers
  const spans: { start: number; end: number; text: string }[] = [];
  retiredImports.forEach((declaration) => {
    const specifier = declaration.moduleSpecifier as ts.StringLiteral;
    const start = specifier.getStart(file) + 1; // inside the quote
    const end = specifier.getEnd() - 1;
    spans.push({
      start,
      end,
      text: specifier.text.replace(
        /getDatabaseConnection$/,
        'getOneDatabaseConnection',
      ),
    });
  });

  // walk the tree for each factory identifier, skip the property name of an aliased import
  const visit = (node: ts.Node): void => {
    const isForeignPropertyName =
      ts.isImportSpecifier(node.parent ?? node) &&
      (node.parent as ts.ImportSpecifier).propertyName === node;
    if (
      bindsFactory &&
      ts.isIdentifier(node) &&
      node.text === 'getDatabaseConnection' &&
      !isForeignPropertyName
    )
      spans.push({
        start: node.getStart(file),
        end: node.getEnd(),
        text: 'getOneDatabaseConnection',
      });
    ts.forEachChild(node, visit);
  };
  visit(file);

  // splice bottom-up, so the earlier offsets stay valid
  return spans
    .sort((a, b) => b.start - a.start)
    .reduce(
      (text, span) =>
        `${text.slice(0, span.start)}${span.text}${text.slice(span.end)}`,
      input.source,
    );
};
