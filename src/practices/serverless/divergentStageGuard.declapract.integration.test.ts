import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = the divergent-stage guard. it clamps the shipped serverless template so a future edit
 *         cannot re-split the stage/access axes the north star collapsed (#571). four invariants:
 *         (1) the `accessByStage` map holds ONLY the sanctioned entries, and the sole key whose
 *         value differs from itself is the `dev` ancient bridge; (2) every stage-keyed resource arn
 *         is paired with an access-keyed twin; (3) the deploy commands derive `SLS_STAGE` via the one
 *         sanctioned `dev`↔`prep` bridge, never another stage literal; (4) `deploy:release` fans out
 *         to BOTH the ancient (-dev-) and contemp (-prep-) publishes, and the contemp arm soft-skips
 *         with a loud echo below prep — so no cross-service call 404s while the org migrates.
 * .why  = two words for one fact (stage ≠ access below prod) is the exact ambiguity that spawns the
 *         compiler-invisible 404 class (D27/D31). the `stageAccessBridge` clamp pins the two live
 *         sources to AGREE today; this clamp FORBIDS a new divergence tomorrow. absent it, a re-added
 *         `accessByStage` remap or a fresh stage-keyed arn reddens no template test, so the axis
 *         quietly re-splits and the silent fault class returns — the north star's own edge-case table
 *         names this guard as the durable fix-forward for the whole tier.
 * .teeth = add a divergent `accessByStage` entry (a key whose value differs from itself, other than
 *          `dev`), OR a stage-keyed resource arn with no access-keyed twin, OR a divergent `SLS_STAGE`
 *          derivation in a deploy command — and the matched case reddens.
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads two shipped template files
 *         off the filesystem. no credential, no network. it lives at the serverless practice ROOT
 *         (never under best-practice/, which the #583 guard forbids for test artifacts) and anchors
 *         its reads on __dirname/best-practice, so a nested `jest src/...` run finds the templates
 *         wherever it is invoked from.
 * .boundary = this guards the SHIPPED TEMPLATES against a re-split. a consumer-plan-time check (a
 *          bad-practice that reddens a consumer's own `declapract plan`) is the fuller durable guard,
 *          but it needs the could-not-fire plan signal (ehmpathy/declapract#107) to avoid a silent
 *          green, so it is a tracked upstream follow-on, not permitted-to-close in this repo.
 */

const SERVERLESS_YML = join(__dirname, 'best-practice/serverless.yml');
const SERVERLESS_PKG = join(__dirname, 'best-practice/package.json');

// the one sanctioned map: only `dev` diverges (the ancient bridge to prep); every other key
// names its own access verbatim
const SANCTIONED_ACCESS_BY_STAGE: Record<string, string> = {
  dev: 'prep',
  prep: 'prep',
  prod: 'prod',
};

// the one sanctioned SLS_STAGE derivation: below prep it emits the ancient `dev` slug, else the
// access direct — the sole legal stage/access bridge on the deploy side
const SANCTIONED_SLS_STAGE_DERIVATION =
  `SLS_STAGE=$([ "${'${ACCESS:-}'}" = 'prep' ] && echo 'dev' || echo "${'${ACCESS:-}'}")`;

/**
 * .what = read the `accessByStage` yaml map out of the shipped serverless template.
 * .why  = the map is the deploy-side bridge; a divergent entry here re-splits the axis.
 */
const parseAccessByStage = (src: string): Record<string, string> => {
  const block = src.match(/accessByStage:\n([\s\S]*?)\n  access:/)?.[1] ?? '';
  const map: Record<string, string> = {};
  for (const line of block.split('\n')) {
    // named captures so the composer reads `key`/`value`, not positional `hit[1]`/`hit[2]`
    const hit = line.match(/^\s+(?<key>\w+):\s+(?<value>\w+)/);
    if (hit?.groups) map[hit.groups.key!] = hit.groups.value!;
  }
  return map;
};

// the arn body, stripped of any trailing yaml comment, so a twin match compares arns not prose
const asArnBody = (line: string): string => line.split('#')[0]!.trim();

// a resource arn line keyed by the deploy stage — the axis a future edit must not diverge
const getStageKeyedArnLines = (src: string): string[] =>
  src
    .split('\n')
    .filter(
      (line) =>
        line.includes('arn:aws:') && line.includes('${self:provider.stage}'),
    );

/**
 * .what = does this stage-keyed arn line have an access-keyed twin elsewhere in the template?
 * .why  = the transition keeps a stage-keyed arn ONLY when paired with its access-keyed grant
 *         (the serverless comment: "drop the stage-keyed line once every deploy names by access
 *         alone"). a NEW stage-keyed arn with no twin is a fresh divergence.
 */
const hasAccessKeyedTwin = (input: {
  stageLine: string;
  src: string;
}): boolean => {
  const twin = asArnBody(
    input.stageLine.replace(
      /\$\{self:provider\.stage\}/g,
      '${self:custom.access}',
    ),
  );
  return input.src.split('\n').some((line) => asArnBody(line) === twin);
};

/**
 * .what = the `accessByStage` keys whose value diverges from the key itself.
 * .why  = a divergent key IS the stage/access split this guard forbids; one named transformer reads
 *         what-not-how rather than an inline entries→filter→map chain (rule.require.named-transformers).
 */
const getDivergentStageKeys = (input: {
  accessByStage: Record<string, string>;
}): string[] =>
  Object.entries(input.accessByStage)
    .filter(([key, value]) => key !== value)
    .map(([key]) => key);

// the deploy commands that derive SLS_STAGE — the deploy-side stage/access bridge
const getSlsStageCommands = (pkg: {
  scripts: Record<string, string>;
}): [string, string][] =>
  Object.entries(pkg.scripts).filter(([, body]) => body.includes('SLS_STAGE='));

// the loud fall-through a deploy command emits when ACCESS is neither prep nor prod. without it a
// command derives an EMPTY `SLS_STAGE` and passes `--stage ''` to serverless — a silent bad default
// (`rule.require.safe-by-default`). the guard mirrors the top-level `deploy` command's own message.
const SANCTIONED_ACCESS_GUARD = '🛑 invalid ACCESS, must be prod or prep';

// the dual-publish chain: `deploy:release` fans out to BOTH the ancient (-dev- slug) and the
// contemp (-prep- slug) publishes, so no cross-service call 404s while the org migrates (#571).
const SANCTIONED_DUAL_PUBLISH_CHAIN =
  'npm run deploy:release:ancient && npm run deploy:release:contemp';

// the contemp arm publishes the -prep- fleet ONLY, so below prep it soft-skips with a loud echo
// rather than a hard exit — a prod/ancient-only deploy must not fail on an absent contemp target.
const SANCTIONED_CONTEMP_PUBLISH = 'sls deploy --verbose --stage prep';
const SANCTIONED_CONTEMP_SKIP =
  "echo '🛑 skip contemp dual-publish: ACCESS is not prep (contemp publishes the -prep- fleet only)'";

/**
 * .what = read a `stackName:` override out of the shipped serverless template, or null when absent.
 * .why  = serverless names each CloudFormation stack `${service}-${stage}` by default, so two
 *         distinct `--stage` slugs (dev + prep) deploy as TWO stacks — the vision's core
 *         "keep the two slugs as two stacks" constraint (§3), which holds each stack near ~75
 *         resources, well under the 500/stack cap. a `stackName:` override that DROPS the
 *         `${stage}` token would collapse both slugs onto one stack name — one ~150-resource stack
 *         near the cap. so this reads any override to assert it still carries the stage token.
 */
const getStackNameOverride = (src: string): string | null =>
  src.match(/^\s*stackName:\s*(?<name>.+)$/m)?.groups?.name?.trim() ?? null;

describe('divergent-stage guard — the shipped templates cannot re-split the stage/access axis', () => {
  const scene = useBeforeAll(() => ({
    yml: readFileSync(SERVERLESS_YML, 'utf8'),
    pkg: JSON.parse(readFileSync(SERVERLESS_PKG, 'utf8')) as {
      scripts: Record<string, string>;
    },
  }));

  given('[case1] the accessByStage map', () => {
    when('[t0] the map is parsed from the shipped serverless template', () => {
      then('it holds ONLY the sanctioned entries (a new remap reddens)', () => {
        expect(parseAccessByStage(scene.yml)).toEqual(
          SANCTIONED_ACCESS_BY_STAGE,
        );
      });

      then('the sole key whose value diverges from itself is the `dev` ancient bridge', () => {
        const divergent = getDivergentStageKeys({
          accessByStage: parseAccessByStage(scene.yml),
        });
        // teeth: change `prep: prep` to `prep: dev`, or add `qa: dev`, and this set grows past `dev`
        expect(divergent).toEqual(['dev']);
      });
    });
  });

  given('[case2] the stage-keyed resource arns', () => {
    when('[t0] the serverless iam arns are inspected', () => {
      then('every stage-keyed arn has an access-keyed twin (an unpaired one reddens)', () => {
        const unpaired = getStageKeyedArnLines(scene.yml).filter(
          (stageLine) => !hasAccessKeyedTwin({ stageLine, src: scene.yml }),
        );
        expect(unpaired).toEqual([]);
      });

      then('at least one paired stage-keyed arn exists (guards the above from vacuity)', () => {
        // else a template that dropped every stage-keyed arn would pass case2 without exercising it
        expect(getStageKeyedArnLines(scene.yml).length).toBeGreaterThan(0);
      });
    });
  });

  given('[case3] the deploy-command SLS_STAGE derivation', () => {
    when('[t0] every deploy command that derives SLS_STAGE is read', () => {
      then('each derives SLS_STAGE via the one sanctioned dev↔prep bridge', () => {
        for (const [, body] of getSlsStageCommands(scene.pkg))
          // teeth: swap `echo 'dev'` for another literal and the sanctioned substring drops out
          expect(body).toContain(SANCTIONED_SLS_STAGE_DERIVATION);
      });

      then('at least one command derives SLS_STAGE (guards the above from vacuity)', () => {
        expect(getSlsStageCommands(scene.pkg).length).toBeGreaterThan(0);
      });
    });
  });

  given('[case4] the deploy-command ACCESS fall-through', () => {
    when('[t0] every deploy command that derives SLS_STAGE is read', () => {
      then('each fails loud on an unset ACCESS (never emits an empty `--stage`)', () => {
        for (const [, body] of getSlsStageCommands(scene.pkg))
          // teeth: drop the guard and a command derives an empty SLS_STAGE for an unset ACCESS,
          // then passes `--stage ''` to serverless — the silent bad default this forbids
          expect(body).toContain(SANCTIONED_ACCESS_GUARD);
      });

      then('the shipped deploy commands match snapshot (a reworded message reddens)', () => {
        // the deploy messages are user-faced output; snapshot them so a reword vibechecks in a
        // review rather than slips past the toContain asserts above (rule.require.snapshots)
        expect(scene.pkg.scripts).toMatchSnapshot('serverless deploy commands');
      });
    });
  });

  given('[case5] the dual-publish deploy chain', () => {
    when('[t0] the deploy:release command is read', () => {
      then('it fans out to BOTH the ancient and contemp publishes (a dropped arm reddens)', () => {
        // teeth: drop `&& npm run deploy:release:contemp` and the -prep- fleet never publishes,
        // so a contemp peer 404s — the exact break dual-publish exists to foreclose (#571)
        expect(scene.pkg.scripts['deploy:release']).toContain(
          SANCTIONED_DUAL_PUBLISH_CHAIN,
        );
      });
    });

    when('[t1] the deploy:release:contemp command is read', () => {
      then('it publishes the -prep- fleet when ACCESS is prep', () => {
        expect(scene.pkg.scripts['deploy:release:contemp']).toContain(
          SANCTIONED_CONTEMP_PUBLISH,
        );
      });

      then('it soft-skips with a loud echo when ACCESS is not prep (never a hard exit)', () => {
        // teeth: a hard `exit 2` here would fail every prod/ancient-only deploy, since contemp
        // has no target below prep; the loud echo keeps the chain green while it names the skip
        expect(scene.pkg.scripts['deploy:release:contemp']).toContain(
          SANCTIONED_CONTEMP_SKIP,
        );
      });
    });
  });

  given('[case6] the two-stack constraint — dual-publish must not collapse into one CF stack', () => {
    when('[t0] the shipped serverless template is inspected for a stack-name override', () => {
      then('any stackName override still carries the ${stage} token (each slug is its own stack)', () => {
        // serverless defaults the stack to `${service}-${stage}`, so two slugs = two stacks with
        // no override at all. IF a stackName is ever set, it MUST keep the stage token, else both
        // slugs share one stack name — one ~150-resource stack near the 500 cap the vision forbids.
        // teeth: add `stackName: ${self:service}` (no stage token) and this reddens.
        const override = getStackNameOverride(scene.yml);
        if (override !== null) expect(override).toContain('stage');
      });

      then('no split-stacks plugin is declared (it signals a single stack outgrew the cap)', () => {
        // `serverless-plugin-split-stacks` nests ONE oversized stack into children to dodge the
        // 500 cap — its presence means a single stack already outgrew the cap, the exact collapse
        // dual-publish (two ~75-resource stacks) is designed to avoid. teeth: name the plugin here
        // and this reddens (the vision: "no serverless-plugin-split-stacks needed by this design").
        expect(scene.yml).not.toContain('serverless-plugin-split-stacks');
      });
    });

    when('[t1] the dual-publish deploy commands are read', () => {
      then('the two publishes name two DISTINCT --stage slugs (a collapse to one reddens)', () => {
        // two distinct slugs ⟹ two distinct CF stacks. the contemp arm names `--stage prep`; the
        // ancient arm derives `SLS_STAGE` (dev below prep). collapse them to one slug and BOTH the
        // 404-safety AND the two-stack split are lost in one edit — so this clamps the slug split
        // that the stack split rests on. teeth: point contemp at `--stage "${SLS_STAGE:-}"` (the
        // same slug the ancient arm resolves) and the two publishes stop naming distinct stages.
        expect(scene.pkg.scripts['deploy:release:contemp']).toContain(
          '--stage prep',
        );
        expect(scene.pkg.scripts['deploy:release:ancient'] ?? '').toContain(
          'SLS_STAGE=',
        );
      });
    });
  });
});
