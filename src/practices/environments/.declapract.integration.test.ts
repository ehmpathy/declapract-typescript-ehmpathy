import { readFileSync } from 'node:fs';

import { given, then, useBeforeAll, when } from 'test-fns';
import ts from 'typescript';

/**
 * .what = holds the `sdkAwsLambdaEnvAccess{Ancient,Contemp}` helper templates — the
 *         north-star's first named primitive — to their exports, their honest return type,
 *         AND their actual runtime behavior.
 * .why  = each helper is a plain `.ts` template (no `.declapract.ts` companion), so it sits
 *         OUTSIDE this repo's own tsconfig (`include: src/**​/*.declapract.ts`) and is never
 *         type-checked here — by design, since its imports (`@src/utils/environment`) look up
 *         in the CONSUMER's tree, not this repo's. so a text pin alone cannot prove behavior:
 *         a logic bug that preserves the pinned text would sail through green. this test
 *         transpiles each template + executes its function with a stubbed `envStatic`, so it
 *         proves the RETURN VALUE per access, not merely the source shape.
 * .note = INTEGRATION by rule.forbid.unit.remote-boundaries: it reads the filesystem (the
 *         template files). no credential, no network — the boundary alone classifies it.
 *         the pair lives in two files per rule.require.single-responsibility (one exported
 *         procedure per file); the ancient file also carries the shared `LambdaEnvSlug` type.
 * .teeth = the behavioral assertions are the sharp ones: the ancient target MUST return `dev`
 *          below prod (the only slug a `-dev-`-only peer publishes), never `prep`. a rewrite of
 *          the ancient branch to `access` reddens `runHelperFile(...Ancient, 'prep')`. the
 *          honest-type pin (`LambdaEnvSlug`, no `as`-cast) reddens if the type-lie returns.
 */

const SDK_DIR = `${__dirname}/best-practice/src/access/sdks`;
const ANCIENT_PATH = `${SDK_DIR}/sdkAwsLambdaEnvAccessAncient.ts`;
const CONTEMP_PATH = `${SDK_DIR}/sdkAwsLambdaEnvAccessContemp.ts`;

/**
 * .what = transpile one helper template + execute its sole export with a stubbed
 *         `envStatic.access`, returning the named function.
 * .why  = the template's `@src/utils/environment` import looks up in the consumer's tree, so
 *         this repo cannot import it directly; transpile-to-CommonJS + a require-stub lets the
 *         real source run here, so the assertions prove behavior rather than source text.
 */
const runHelperFile = (input: {
  path: string;
  name: string;
  access: 'test' | 'prep' | 'prod';
}): (() => string) => {
  const source = readFileSync(input.path, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const moduleExports: Record<string, () => string> = {};
  const requireStub = (id: string): unknown =>
    id.includes('environment') ? { envStatic: { access: input.access } } : {};
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', transpiled)(moduleExports, requireStub);
  return moduleExports[input.name];
};

describe('environments practice — the EnvAccess helper primitive (north-star clamp)', () => {
  given('[case1] the shipped helper templates — their source shape', () => {
    // readFileSync throws if a template is absent — that throw IS the presence proof
    const scene = useBeforeAll(() => ({
      ancient: readFileSync(ANCIENT_PATH, 'utf8'),
      contemp: readFileSync(CONTEMP_PATH, 'utf8'),
    }));

    when('[t0] the contents are read', () => {
      then('the ancient file exports exactly the ancient target function', () => {
        expect(scene.ancient).toContain(
          'export const sdkAwsLambdaEnvAccessAncient',
        );
        expect(scene.ancient).not.toContain(
          'export const sdkAwsLambdaEnvAccessContemp',
        );
      });

      then('the contemp file exports exactly the contemp target function', () => {
        expect(scene.contemp).toContain(
          'export const sdkAwsLambdaEnvAccessContemp',
        );
        expect(scene.contemp).not.toContain(
          'export const sdkAwsLambdaEnvAccessAncient',
        );
      });

      then('the ancient target has the honest LambdaEnvSlug return type, not an as-cast', () => {
        expect(scene.ancient).toContain('LambdaEnvSlug');
        expect(scene.ancient).not.toContain('as EnvironmentAccessTier');
      });

      then('the ancient file source matches snapshot (a structural edit vibechecks in a review)', () => {
        // the toContain asserts above catch a named regression; the full-source snapshot catches an
        // UNnamed one — an added param, a changed import, a dropped comment — that trips no assert
        // yet a reviewer must eyeball (rule.require.snapshots)
        expect(scene.ancient).toMatchSnapshot(
          'sdkAwsLambdaEnvAccessAncient.ts source',
        );
      });

      then('the contemp file source matches snapshot', () => {
        expect(scene.contemp).toMatchSnapshot(
          'sdkAwsLambdaEnvAccessContemp.ts source',
        );
      });
    });
  });

  given('[case2] the transpiled + executed helper templates — their runtime behavior', () => {
    when('[t0] the ancient target runs under each access', () => {
      then('it returns the dev slug below prod, prod at prod (the D27 avoidance)', () => {
        const run = (access: 'test' | 'prep' | 'prod') =>
          runHelperFile({
            path: ANCIENT_PATH,
            name: 'sdkAwsLambdaEnvAccessAncient',
            access,
          })();
        expect(run('prod')).toBe('prod');
        expect(run('prep')).toBe('dev');
        expect(run('test')).toBe('dev');
      });
    });

    when('[t1] the contemp target runs under each access', () => {
      then('it returns the access direct', () => {
        const run = (access: 'test' | 'prep' | 'prod') =>
          runHelperFile({
            path: CONTEMP_PATH,
            name: 'sdkAwsLambdaEnvAccessContemp',
            access,
          })();
        expect(run('prod')).toBe('prod');
        expect(run('prep')).toBe('prep');
        expect(run('test')).toBe('test');
      });
    });
  });
});
