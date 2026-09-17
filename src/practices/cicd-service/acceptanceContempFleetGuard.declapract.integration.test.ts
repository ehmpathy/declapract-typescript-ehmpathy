import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = the contemp-only acceptance guard. it clamps the shipped `.deploy-sls.yml` template so a
 *         future edit cannot re-introduce the D31 dual-fleet acceptance fan-out. two invariants:
 *         (1) the acceptance step is a single ACCESS-keyed `npm run test:acceptance` run; (2) no
 *         `ACCEPTANCE_FLEET` selector (ancient or contemp) survives in the acceptance block.
 * .why  = the assure job deploys the contemp fleet (the service's own access-tier slug, -prep- at
 *         prep, -prod- at prod). dual-publish ships the SAME artifact under the ancient (-dev-) slug
 *         too, so a run against contemp proves the deployed code — the ancient slug is an inbound
 *         alias, never a second target for the self-acceptance gate. a fan-out that also runs an
 *         ancient arm, or soft-skips a contemp arm off `access == 'prep'`, is dead weight at best and
 *         an all-404 run at worst. absent this clamp, a future edit that re-splits the step reddens
 *         no template test — the exact silent-regression class the wish exists to remove.
 * .teeth = split the acceptance step back into an ancient arm and a contemp arm, or key it off any
 *          `ACCEPTANCE_FLEET` value — and the matched case reddens.
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads a shipped template file off
 *         the filesystem. no credential, no network. it lives at the cicd-service practice ROOT
 *         (never under best-practice/, which the #583 guard forbids for test artifacts) and anchors
 *         its read on __dirname/best-practice, so a nested `jest src/...` run finds the template
 *         wherever it is invoked from.
 * .boundary = this guards the SHIPPED TEMPLATE against a re-split. a consumer-plan-time check is the
 *          fuller durable guard, but it needs the could-not-fire plan signal
 *          (ehmpathy/declapract#107), so it is a tracked upstream follow-on, not permitted-to-close
 *          in this repo.
 */

const DEPLOY_SLS_YML = join(
  __dirname,
  'best-practice/.github/workflows/.deploy-sls.yml',
);

// the acceptance-job block: from the contemp-fleet comment through the single test:acceptance run. a
// re-split into two fleet arms changes what this block holds. the `[ \t]*` prefix captures the
// comment line's own indent, so the snapshotted block reads as uniformly-indented yaml (the first
// line aligns with its continuations) rather than a fragment with a dedented head line.
const getAcceptanceBlock = (src: string): string =>
  src.match(
    /[ \t]*# acceptance targets the contemp fleet[\s\S]*?npm run test:acceptance\n/,
  )?.[0] ?? '';

describe('contemp-only acceptance guard — the shipped deploy template cannot re-split into a dual fleet fan-out', () => {
  const scene = useBeforeAll(() => ({
    yml: readFileSync(DEPLOY_SLS_YML, 'utf8'),
  }));

  given('[case1] the acceptance-job block', () => {
    when('[t0] the block is read from the shipped deploy template', () => {
      then('the acceptance step is one ACCESS-keyed test:acceptance run', () => {
        // teeth: the single contemp run is keyed on the access alone
        expect(getAcceptanceBlock(scene.yml)).toContain(
          'ACCESS=${{ inputs.access }} npm run test:acceptance',
        );
      });

      then('no ancient fleet arm survives (a re-split reddens)', () => {
        // teeth: re-add an ancient arm and this literal reappears in the block
        expect(getAcceptanceBlock(scene.yml)).not.toContain(
          'ACCEPTANCE_FLEET=ancient',
        );
      });

      then('no ACCEPTANCE_FLEET selector survives (a re-split reddens)', () => {
        // teeth: any fleet selector — ancient or contemp — signals the fan-out is back
        expect(getAcceptanceBlock(scene.yml)).not.toContain('ACCEPTANCE_FLEET');
      });
    });
  });

  given('[case2] the acceptance-job block as a whole', () => {
    when('[t0] the block is read from the shipped deploy template', () => {
      then('a non-empty block was matched (guards the above from vacuity)', () => {
        // else a template that renamed the comment would pass case1 with no real block to assert on
        expect(getAcceptanceBlock(scene.yml).length).toBeGreaterThan(0);
      });

      then('the acceptance-job block matches snapshot (a reworded step reddens)', () => {
        // the acceptance block is CI-faced output; snapshot it so a reword vibechecks in a review
        // rather than slips past the toContain asserts above (rule.require.snapshots)
        expect(getAcceptanceBlock(scene.yml)).toMatchSnapshot(
          'deploy-sls acceptance-job block',
        );
      });
    });
  });
});
