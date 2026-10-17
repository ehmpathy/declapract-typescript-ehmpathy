import { readFileSync } from 'node:fs';

import { MalfunctionError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';
import { getModuleExportsFromTsSource } from './utils/getModuleExportsFromTsSource';

/**
 * .what = a cross-file round-trip clamp on the stage↔access bridge. the transition encodes ONE fact
 *         — that below prod `stage=dev ⟺ access=prep`, and at prod both axes read `prod` — in TWO
 *         unlinked places: the serverless `accessByStage` map (the deploy-side bridge) and the
 *         `sdkAwsLambdaEnvAccessAncient` helper (the call-side slug). this asserts they agree per
 *         deployed access, so a drift in one without the other reddens (#571).
 * .note = the ssm param names carry no `dev` cast: they take the config slug sdk-config derives
 *         (`/{org}/{project}/{config}/…`, #637), so the [t3] leg asserts the namespace source holds
 *         no prep→dev cast at all.
 * .why  = two sources for one fact is the exact ambiguity the north star exists to kill. if the map
 *         says `dev: prep` but the helper emits some other slug for `access=prep`, an outbound call
 *         addresses a fleet the deploy never published — the compiler-invisible 404 (D31) returns,
 *         now from a bridge half-edited rather than a two-axis split. one clamp over both files makes
 *         a half-edit red.
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads two template/declaration
 *         files off the filesystem. no credential, no network.
 * .teeth = drift the map's `dev:` target, or the helper's ancient branch, and the per-access
 *          round-trip assertion reddens — because the round-trip now EXECUTES the real helper source,
 *          not a hand-modeled ternary, so a semantically-live rewrite (ternary→if, operand swap) that
 *          preserved a pinned text fragment can no longer sail through green.
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
 *         return value per access — not a re-derived model tied to source only by a text pin (which a
 *         semantically-neutral reformat would break cosmetically while a logic bug sailed through).
 *         this reuses the environments practice's executed-helper pattern.
 */
const runAncientSlug = (
  input: { src: string; access: 'test' | 'prep' | 'prod' },
): string => {
  const requireStub = (id: string): unknown =>
    id.includes('environment') ? { envStatic: { access: input.access } } : {};
  const { sdkAwsLambdaEnvAccessAncient } = getModuleExportsFromTsSource<{
    sdkAwsLambdaEnvAccessAncient: (input: { access: null }) => string;
  }>({ source: input.src, requireStub });
  const targetOp =
    sdkAwsLambdaEnvAccessAncient ??
    MalfunctionError.throw('the ancient helper template no longer exports its op', {
      name: 'sdkAwsLambdaEnvAccessAncient',
    });
  return targetOp({ access: null });
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

    when('[t1] the ancient helper is transpiled + executed per access', () => {
      then('it emits `dev` below prod (the only slug a `-dev-`-only peer publishes)', () => {
        expect(runAncientSlug({ src: scene.helperSrc, access: 'prep' })).toEqual('dev');
        expect(runAncientSlug({ src: scene.helperSrc, access: 'test' })).toEqual('dev');
      });

      then('it emits `prod` at prod (both axes converge)', () => {
        expect(runAncientSlug({ src: scene.helperSrc, access: 'prod' })).toEqual('prod');
      });
    });

    when('[t2] the round-trip is composed per deployed access', () => {
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

    when('[t3] the ssm-namespace source is read', () => {
      then('it holds no prep→dev cast (the names take the config slug, #637)', () => {
        // teeth: re-add an `accessSlug` ternary or any `'dev'` literal and this reddens
        expect(scene.namespaceSrc).not.toContain('accessSlug');
        expect(scene.namespaceSrc).not.toContain("'dev'");
        expect(scene.namespaceSrc).toContain('input.choice ?? config');
      });
    });
  });
});
