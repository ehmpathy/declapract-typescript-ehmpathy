import * as ts from 'typescript';

/**
 * .what = the name of each enum a source declares
 */
export const getAllEnumNames = (input: { source: string }): string[] =>
  ts
    .createSourceFile('x.ts', input.source, ts.ScriptTarget.Latest)
    .statements.filter(ts.isEnumDeclaration)
    .map((statement) => statement.name.text);
