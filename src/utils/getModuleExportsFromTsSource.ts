import ts from 'typescript';

/**
 * .what = transpile a typescript source to commonjs and run it, with each require answered by a stub
 * .why  = a test proves an emitted template's real branches by execution, with no install of the
 *         template's own deps — the stub names exactly which modules the template may reach
 * .note = test-only: it evaluates source via `new Function`, so it is never called on untrusted input
 * .note = the caller's `requireStub` answers every require the module body makes. a stub that returns
 *         `{}` for an id it does not know lets a member read off it fail at eval as a bare TypeError;
 *         to name the gap instead, a stub throws on any id it does not answer
 */
export const getModuleExportsFromTsSource = <
  TExports extends Record<string, unknown> = Record<string, unknown>,
>(input: {
  source: string;
  requireStub: (id: string) => unknown;
}): Partial<TExports> => {
  // transpile to commonjs, so `exports` and `require` are the two seams the stub fills
  const transpiled = ts.transpileModule(input.source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  // run the module body against a fresh exports record
  const moduleExports: Record<string, unknown> = {};
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', transpiled)(moduleExports, input.requireStub);

  // a module evaluated at runtime carries no static types; the caller names the shape it expects,
  // and every export is Partial so an absent one reads as undefined, never as present
  return moduleExports as Partial<TExports>;
};
