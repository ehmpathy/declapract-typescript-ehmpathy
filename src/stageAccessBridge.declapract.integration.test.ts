import { readFileSync } from 'node:fs';

import { given, then, useBeforeAll, when } from 'test-fns';
import ts from 'typescript';

/**
 * .what = a cross-file round-trip clamp on the stage↔access bridge. the transition encodes ONE fact
 *         — that below prod `stage=dev ⟺ access=prep`, and at prod both axes read `prod` — in THREE
 *         unlinked places: the serverless `accessByStage` map (the deploy-side bridge), the
 *         `sdkAwsLambdaEnvAccessAncient` helper (the call-side slug), and the `resources.parameters.ts`
 *         `accessSlug` ternary (the SSM-namespace cast). this asserts they agree per deployed tier, so
 *         a drift in one without the others reddens (r11 nitpick, #571 north star).
 * .note = the third restatement is a DELIBERATELY narrower cast: it casts a literal legacy SSM param
 *         string, so `prep → dev` and `prod → prod` (agrees with the other two), but `test → test`
 *         (the fleet-slug helper collapses test → dev). the leg asserts accessSlug's OWN documented
 *         cast + cross-checks the map/helper only on the tiers all three share (prep, prod).
 * .why  = two sources for one fact is the exact ambiguity the north star exists to kill. if the map
 *         says `dev: prep` but the helper emits some other slug for `access=prep`, an outbound call
 *         addresses a fleet the deploy never published — the compiler-invisible 404 (D31) returns,
 *         now from a bridge half-edited rather than a two-axis split. one clamp over both files makes
 *         a half-edit red.
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads two template/declaration
 *         files off the filesystem. no credential, no network.
 * .teeth = drift the map's `dev:` target, or the helper's ancient branch, and the per-tier
 *          round-trip assertion reddens — because the round-trip now EXECUTES the real helper source,
 *          not a hand-modeled ternary, so a semantically-live rewrite (ternary→if, operand swap) that
 *          preserved a pinned text fragment can no longer sail through green (r008 nitpick.1).
 */

const ACCESS_BY_STAGE_SRC = `${__dirname}/practices/serverless/best-practice/serverless.yml.declapract.ts`;
const HELPER_SRC = `${__dirname}/practices/environments/best-practice/src/access/sdks/sdkAwsLambdaEnvAccessAncient.ts`;
const NAMESPACE_SRC = `${__dirname}/practices/persist-with-rds/best-practice/provision/aws/resources.parameters.ts`;

/**
 * .what = parse the `accessByStage` yaml map out of the serverless declaration source.
 * .why  = the map is a private const in the declaration, not exported, so the value is read from the
 *         file text — the same boundary the ratchet kin cross.
 */
const parseAccessByStage = (src: string): Record<string, string> => {
  const block = src.match(/accessByStage:\n([\s\S]*?)\n\n/)?.[1] ?? '';
  const map: Record<string, string> = {};
  for (const line of block.split('\n')) {
    // named captures so the composer reads `key`/`value`, not positional `hit[1]`/`hit[2]`
    const hit = line.match(/^\s+(?<key>\w+):\s+(?<value>\w+)/);
    if (hit?.groups) map[hit.groups.key!] = hit.groups.value!;
  }
  return map;
};

/**
 * .what = transpile the ancient helper template + execute it with a stubbed `envStatic.access`, and
 *         return the slug it actually emits for that access.
 * .why  = the helper is a plain `.ts` template whose `@src/utils/environment` import looks up in the
 *         CONSUMER's tree, so this repo cannot import it directly. transpile-to-CommonJS + a
 *         require-stub runs the real source here, so the round-trip asserts the helper's ACTUAL
 *         return value per tier — not a re-derived model tied to source only by a text pin (which a
 *         semantically-neutral reformat would break cosmetically while a logic bug sailed through).
 *         this reuses the environments practice's executed-helper pattern (r008 nitpick.1).
 */
const runAncientSlug = (
  input: { src: string; access: 'test' | 'prep' | 'prod' },
): string => {
  const transpiled = ts.transpileModule(input.src, {
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
  return (
    moduleExports as {
      sdkAwsLambdaEnvAccessAncient: (input: { access: null }) => string;
    }
  ).sdkAwsLambdaEnvAccessAncient({ access: null });
};

/**
 * .what = extract the `accessSlug` ternary from the ssm-namespace declaration source + evaluate it for
 *         one access, so the assertion reads the ACTUAL slug the third restatement yields.
 * .why  = `accessSlug` is a private module const (`access === 'prep' ? 'dev' : access`), not exported,
 *         so this repo cannot import it. an eval of the extracted expression executes the real logic
 *         per tier — an operand swap (`'dev'` → `'stg'`) or a logic inversion reddens, where a pinned
 *         text fragment would not. reuses the executed-source spirit of `runAncientSlug` (r011 B.1).
 */
const runAccessSlug = (input: {
  src: string;
  access: 'test' | 'prep' | 'prod';
}): string => {
  const rhs = input.src.match(/const accessSlug = ([^;]+);/)?.[1] ?? '';
  // eslint-disable-next-line no-new-func
  return new Function('access', `return (${rhs});`)(input.access) as string;
};

describe('stage↔access bridge — the two unlinked sources agree (round-trip clamp)', () => {
  const scene = useBeforeAll(() => ({
    accessByStage: parseAccessByStage(readFileSync(ACCESS_BY_STAGE_SRC, 'utf8')),
    helperSrc: readFileSync(HELPER_SRC, 'utf8'),
    namespaceSrc: readFileSync(NAMESPACE_SRC, 'utf8'),
  }));

  given('[case1] the deploy-side map and the call-side helper', () => {
    when('[t0] the serverless accessByStage map is parsed', () => {
      then('it bridges the ancient stage `dev` to access `prep`', () => {
        expect(scene.accessByStage.dev).toEqual('prep');
      });

      then('it holds `prod` on both axes', () => {
        expect(scene.accessByStage.prod).toEqual('prod');
      });
    });

    when('[t1] the ancient helper is transpiled + executed per tier', () => {
      then('it emits `dev` below prod (the only slug a `-dev-`-only peer publishes)', () => {
        expect(runAncientSlug({ src: scene.helperSrc, access: 'prep' })).toEqual('dev');
        expect(runAncientSlug({ src: scene.helperSrc, access: 'test' })).toEqual('dev');
      });

      then('it emits `prod` at prod (both axes converge)', () => {
        expect(runAncientSlug({ src: scene.helperSrc, access: 'prod' })).toEqual('prod');
      });
    });

    when('[t2] the round-trip is composed per deployed tier', () => {
      // teeth: for each deployed access, the ancient slug the REAL helper emits must map BACK
      // to that same access through accessByStage. a drift in either file breaks the identity.
      then('access=prep round-trips through the ancient slug back to prep', () => {
        const slug = runAncientSlug({ src: scene.helperSrc, access: 'prep' });
        expect(scene.accessByStage[slug]).toEqual('prep');
      });

      then('access=prod round-trips through the ancient slug back to prod', () => {
        const slug = runAncientSlug({ src: scene.helperSrc, access: 'prod' });
        expect(scene.accessByStage[slug]).toEqual('prod');
      });
    });

    when('[t3] the ssm-namespace ternary is evaluated per tier (the third restatement)', () => {
      then('it holds its own documented cast: prep→dev, test→test, prod→prod', () => {
        // the narrower cast: prep+prod agree with the map/helper, test keeps its own name (the
        // fleet-slug helper collapses test→dev; this literal-string cast does not). the test→test
        // leg guards a "tidy-up" that would force it to match the helper.
        expect(runAccessSlug({ src: scene.namespaceSrc, access: 'prep' })).toEqual('dev');
        expect(runAccessSlug({ src: scene.namespaceSrc, access: 'test' })).toEqual('test');
        expect(runAccessSlug({ src: scene.namespaceSrc, access: 'prod' })).toEqual('prod');
      });

      then('it agrees with the deploy-side map + call-side helper on the shared tiers (prep, prod)', () => {
        // prep: map bridges dev→prep, the ancient helper emits dev, and the namespace casts prep→dev
        const prepSlug = runAccessSlug({ src: scene.namespaceSrc, access: 'prep' });
        expect(prepSlug).toEqual(runAncientSlug({ src: scene.helperSrc, access: 'prep' }));
        expect(scene.accessByStage[prepSlug]).toEqual('prep');
        // prod: all three converge on the single slug
        const prodSlug = runAccessSlug({ src: scene.namespaceSrc, access: 'prod' });
        expect(prodSlug).toEqual(runAncientSlug({ src: scene.helperSrc, access: 'prod' }));
        expect(scene.accessByStage[prodSlug]).toEqual('prod');
      });
    });
  });
});
