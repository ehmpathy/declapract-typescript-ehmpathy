import { readFileSync } from 'node:fs';

import { given, then, useBeforeAll, when } from 'test-fns';
import ts from 'typescript';

/**
 * .what = exercises case=2's no-404 promise at the reachable grain: the fleet slug an
 *         `sdkAwsLambdaEnvAccess{Ancient,Contemp}` target op RETURNS, for any DEPLOYED access
 *         tier, must be a stage the serverless dual-publish scaffold actually deploys under —
 *         so a caller that builds `${service}-${slug}-${fn}` addresses a name a fleet answers
 *         to, never a 404.
 * .why  = case=2 (cross-service-call-never-404s) is a demoed critipath whose core promise is
 *         "a call to a peer mid-transition lands, it does not 404" (serverless.yml:14 —
 *         "one service answers to both the -dev and -prep fleets while callers migrate"). the
 *         LIVE half of that promise — a real invoke across two deployed services — cannot exist
 *         in a practice library (no fleet is deployed here). but the STRUCTURAL half is fully
 *         reachable and is where the silent 404 actually hides: the target-name a caller emits
 *         (via the target op) must be a name the scaffold publishes (a `--stage` slug it deploys
 *         under). those two facts are BOTH in-repo templates — the target-op source and the
 *         `accessByStage` block — so their agreement is a real, executable test of the no-404
 *         invariant, no live service required.
 * .the-invariant = for every deployed access (the distinct VALUES of `accessByStage`),
 *         each target op's emitted slug is a KEY of `accessByStage` (a stage the scaffold
 *         deploys). a caller's target = `${service}-${emittedSlug}-${fn}`; a published fleet =
 *         one per `--stage` key. so emittedSlug ∈ keys ⟺ the target names a published fleet ⟺
 *         no 404.
 * .teeth = rework the ancient branch to emit a slug the scaffold never deploys (drop it to
 *          `access`, so it emits `prep` where only `-dev-` is published, or emit a `legacy`
 *          value) and the membership assertion reddens. drop the `dev` key from `accessByStage`
 *          (stop dual-publish of the -dev- fleet) while the ancient target op still emits `dev`
 *          and it reddens — the exact silent 404 case=2 exists to forbid.
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads the filesystem (two
 *         shipped templates across two practices). no credential, no network — the boundary
 *         alone classifies it. this is a CROSS-practice consistency clamp, so it sits at the
 *         repo `src/` root, never under either practice's `best-practice/`.
 */

const ANCIENT_PATH = `${__dirname}/practices/environments/best-practice/src/access/sdks/sdkAwsLambdaEnvAccessAncient.ts`;
const CONTEMP_PATH = `${__dirname}/practices/environments/best-practice/src/access/sdks/sdkAwsLambdaEnvAccessContemp.ts`;
const SERVERLESS_PATH = `${__dirname}/practices/serverless/best-practice/serverless.yml`;

/**
 * .what = transpile one target-op template + execute its sole export with a stubbed
 *         `envStatic.access`, returning its emitted slug.
 * .why  = the template's `@src/utils/environment` import looks up in the CONSUMER's tree, so
 *         this repo cannot import it directly; transpile-to-CommonJS + a require-stub runs the
 *         real source here, so the slug is the op's actual return, not a text guess.
 */
const runTargetSlug = (input: {
  path: string;
  name: string;
  access: 'test' | 'prep' | 'prod';
}): string => {
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
  return moduleExports[input.name]();
};

/**
 * .what = the `accessByStage` map, read from the serverless template as { stage: access }.
 * .why  = its KEYS are the `--stage` slugs the scaffold deploys under (the published fleet
 *         slugs); its VALUES are the accesses those deploys reach (the deployed tiers).
 *         serverless.yml carries `@declapract{...}` vars elsewhere, so a full yaml parse would
 *         choke — the block is clean, so a scoped line-scan reads it exactly.
 */
const readAccessByStage = (): Record<string, string> => {
  const lines = readFileSync(SERVERLESS_PATH, 'utf8').split('\n');
  const startIdx = lines.findIndex((line) => /^ {2}accessByStage:/.test(line));
  if (startIdx < 0)
    throw new Error('accessByStage block absent from serverless.yml');
  const map: Record<string, string> = {};
  for (const line of lines.slice(startIdx + 1)) {
    // a child of accessByStage is indented deeper than its 2-space parent; a dedent ends the block
    if (!/^ {4}\S/.test(line)) break;
    const match = /^ {4}(\w+):\s*(\w+)/.exec(line);
    if (match) map[match[1]!] = match[2]!;
  }
  return map;
};

describe('the EnvAccess target op emits only slugs the dual-publish scaffold publishes (case=2 no-404)', () => {
  given('the ancient/contemp target ops and the serverless accessByStage scaffold', () => {
    const state = useBeforeAll(() => {
      const accessByStage = readAccessByStage();
      const publishedStages = Object.keys(accessByStage); // the --stage slugs a deploy publishes
      const deployedTiers = [...new Set(Object.values(accessByStage))]; // accesses that reach a fleet
      return { accessByStage, publishedStages, deployedTiers };
    });

    when('the scaffold is read', () => {
      then('it dual-publishes: below prod both a -dev- and a -prep- fleet, so a caller can migrate', () => {
        // the core of case=2: the -dev- fleet is published so an ancient caller never 404s; the
        // -prep- fleet is published so a contemp caller finds it — both live at once mid-transition
        expect(state.accessByStage.dev).toBe('prep');
        expect(state.accessByStage.prep).toBe('prep');
        expect(state.accessByStage.prod).toBe('prod');
      });

      then('the derived scaffold shape matches snapshot', () => {
        expect({
          accessByStage: state.accessByStage,
          publishedStages: [...state.publishedStages].sort(),
          deployedTiers: [...state.deployedTiers].sort(),
        }).toMatchSnapshot('dual-publish scaffold shape');
      });
    });

    when('each deployed access is walked through the ancient target op', () => {
      then('the emitted slug is a stage the scaffold publishes (no 404 by construction)', () => {
        for (const tier of state.deployedTiers) {
          const slug = runTargetSlug({
            path: ANCIENT_PATH,
            name: 'sdkAwsLambdaEnvAccessAncient',
            access: tier as 'test' | 'prep' | 'prod',
          });
          // slug ∈ publishedStages ⟺ the caller's target `${service}-${slug}-${fn}` names a
          // fleet the scaffold actually deploys ⟺ the invoke lands, never a 404
          expect(state.publishedStages).toContain(slug);
        }
      });
    });

    when('each deployed access is walked through the contemp target op', () => {
      then('the emitted slug is a stage the scaffold publishes (no 404 by construction)', () => {
        for (const tier of state.deployedTiers) {
          const slug = runTargetSlug({
            path: CONTEMP_PATH,
            name: 'sdkAwsLambdaEnvAccessContemp',
            access: tier as 'test' | 'prep' | 'prod',
          });
          expect(state.publishedStages).toContain(slug);
        }
      });
    });

    when('the per-tier emitted slugs are derived for both target ops', () => {
      // the caller-faced contract of the no-404 invariant: which slug each op emits per deployed
      // tier, and the published set it must land within. snapshot so a reword that keeps the
      // membership green (a re-mapped tier, a re-shaped scaffold) reddens a vibecheck.
      then('the target-slug shape matches snapshot', () => {
        const perTier = state.deployedTiers
          .slice()
          .sort()
          .map((tier) => ({
            access: tier,
            ancient: runTargetSlug({
              path: ANCIENT_PATH,
              name: 'sdkAwsLambdaEnvAccessAncient',
              access: tier as 'test' | 'prep' | 'prod',
            }),
            contemp: runTargetSlug({
              path: CONTEMP_PATH,
              name: 'sdkAwsLambdaEnvAccessContemp',
              access: tier as 'test' | 'prep' | 'prod',
            }),
          }));
        expect({
          perTier,
          publishedStages: [...state.publishedStages].sort(),
        }).toMatchSnapshot('per-tier target slug vs published stages');
      });
    });
  });
});
