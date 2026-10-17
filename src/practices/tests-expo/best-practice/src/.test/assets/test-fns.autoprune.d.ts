/**
 * .what = types for the `test-fns/autoprune.setup.jest` subpath, which the `jest.*.prepare.ts` files
 *         import and reach via a triple-slash reference
 * .why = expo sdk < 54 resolves with `moduleResolution: node`, which ignores `exports`; test-fns ships
 *        the subpath only via `exports`, so the import is TS2307 there (jest loads it fine at runtime)
 * .note = a stand-in. it retires once test-fns ships `typesVersions` for its subpaths
 */
declare module 'test-fns/autoprune.setup.jest' {
  const autopruneSetup: (globalConfig: {
    globalTeardown?: string | null;
  }) => Promise<void>;
  // biome-ignore lint/style/noDefaultExport: mirrors the jest globalSetup default export
  export default autopruneSetup;
}
