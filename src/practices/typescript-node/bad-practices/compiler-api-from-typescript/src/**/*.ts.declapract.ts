import * as ts from '@typescript/typescript6';
import type { FileCheckFunction } from 'declapract';

import { emitManualFixNoticeOnce } from '../../../../../../utils/emitManualFixNoticeOnce';

/**
 * .what = true when a node loads a module by the exact specifier `typescript`: an `import … from`,
 *         an `export … from`, an `import x = require()`, a `require()`, a dynamic `import()`, or a
 *         type-position `import('typescript').Node`.
 * .why  = each of these reads the compiler api from the repo's own `typescript`, which at typescript 7
 *         exports only `{ version, versionMajorMinor }`; a `typescript/…` subpath or another package
 *         is a different specifier and stays out.
 */
const isTypescriptModuleLoad = (input: { node: ts.Node }): boolean => {
  const isSpecifier = (expression: ts.Node | undefined): boolean =>
    !!expression &&
    ts.isStringLiteralLike(expression) &&
    expression.text === 'typescript';
  const node = input.node;
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
    return isSpecifier(node.moduleSpecifier);
  if (
    ts.isImportEqualsDeclaration(node) &&
    ts.isExternalModuleReference(node.moduleReference)
  )
    return isSpecifier(node.moduleReference.expression);
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
    return isSpecifier(node.argument.literal);
  if (ts.isCallExpression(node)) {
    const isRequire =
      ts.isIdentifier(node.expression) && node.expression.text === 'require';
    const isDynamicImport =
      node.expression.kind === ts.SyntaxKind.ImportKeyword;
    return (isRequire || isDynamicImport) && isSpecifier(node.arguments[0]);
  }
  return false;
};

/**
 * .what = true when any node in the tree loads the `typescript` module.
 * .why  = a `require('typescript')` may sit deep in a function body, so the walk visits every node;
 *         the parser classifies each token, so a mention in a comment or a string never counts.
 */
const hasTypescriptModuleLoad = (input: { node: ts.Node }): boolean =>
  isTypescriptModuleLoad({ node: input.node }) ||
  (ts.forEachChild(input.node, (child) =>
    hasTypescriptModuleLoad({ node: child }) ? true : undefined,
  ) ??
    false);

/**
 * .what = the treestruct notice that names the two-step swap
 */
const NOTICE = [
  '🟡 compiler api read from `typescript` — typescript 7 exports only { version, versionMajorMinor }',
  '   ├─ no automatic fix: the swap also edits package.json, which a src file fix cannot reach',
  '   └─ remedy',
  '      ├─ pnpm add @typescript/typescript6@6.0.2',
  "      ├─ in each flagged file, `from 'typescript'` → `from '@typescript/typescript6'`",
  '      └─ see typescript-node/bad-practices/compiler-api-from-typescript/.declapract.readme.md (declapract-typescript-ehmpathy)',
  '',
  '',
].join('\n');

/**
 * .what = flags a source file that reads the compiler api from the `typescript` package.
 * .why  = the typescript-node floor is typescript 7, whose `typescript` package carries no compiler
 *         api, so each such import fails to typecheck or throws at runtime. the classic api lives on
 *         in `@typescript/typescript6`; the swap also adds that package to the repo's own deps, which
 *         a src file check cannot do, so this flags for a human, names the swap on stderr once per
 *         repo, and declares no fix.
 */
export const check: FileCheckFunction = (contents, context) => {
  // a file that never names `typescript` cannot load it, so it skips the parse
  if (!contents?.includes('typescript'))
    throw new Error(
      'does not match bad practice: no compiler api read from the typescript package',
    );

  const source = ts.createSourceFile(
    'compiler-api-scan.ts',
    contents ?? '',
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (hasTypescriptModuleLoad({ node: source })) {
    emitManualFixNoticeOnce({
      root: context.getProjectRootDirectory(),
      practice: 'compiler-api-from-typescript',
      notice: NOTICE,
    });
    return; // bad practice detected
  }
  throw new Error(
    'does not match bad practice: no compiler api read from the typescript package',
  );
};
