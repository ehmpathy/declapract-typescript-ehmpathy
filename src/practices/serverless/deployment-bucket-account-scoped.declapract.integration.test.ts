import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps that the serverless template keys the deployment bucket by stage
 *         (`custom.deploymentBucketByStage`), with prod on a `-prod` (prod-account) bucket and
 *         dev+prep on the shared `-dev` (prep-account) bucket, referenced from `provider`.
 * .why  = the deployment bucket is ACCOUNT-scoped: it must live in the account the deploy role
 *         assumes. a single hardcoded `-dev` bucket lives in the prep account, so a prod deploy —
 *         which assumes the prod-account oidc role — cannot reach it and fails at bucket lookup
 *         (`s3:GetBucketLocation ... not authorized`), a real prod-deploy break found on svc-gateway
 *         (#596). the map puts each deploy's bucket in its own account.
 * .teeth = revert the provider line to a bare `serverless-deployment-<ns>-${self:provider.stage}`
 *          (drop the map) and the reference case + the prod-account case redden.
 * .note = `.declapract.test.ts` = this repo's UNIT-test marker; at the practice ROOT (not under
 *         best-practice/), so it is neither loaded as a declaration nor copied to a consumer.
 */

// anchor on __dirname, not process.cwd(): a nested `jest src/practices/...` run has a different
// cwd, and a repo-root-relative path under process.cwd() would then miss the tree (vacuous green).
const templatePath = join(__dirname, 'best-practice/serverless.yml');

const NS = '@declapract{variable.infrastructureNamespaceId}';

describe('serverless deployment bucket is account-scoped by stage (#596)', () => {
  const source = readFileSync(templatePath, 'utf8');

  given('[case1] the custom.deploymentBucketByStage map', () => {
    when('[t0] serverless.yml is read', () => {
      then('it declares a deploymentBucketByStage map', () => {
        expect(source).toContain('deploymentBucketByStage:');
      });

      then('prod points at a prod-account -prod bucket', () => {
        expect(source).toContain(`prod: serverless-deployment-${NS}-prod`);
      });

      then('dev + prep share the prep-account -dev bucket', () => {
        expect(source).toContain(`dev: serverless-deployment-${NS}-dev`);
        expect(source).toContain(`prep: serverless-deployment-${NS}-dev`);
      });
    });
  });

  given('[case2] the provider.deploymentBucket reference', () => {
    when('[t0] serverless.yml is read', () => {
      then('it references the stage-keyed map, not a single hardcoded bucket', () => {
        expect(source).toContain(
          'deploymentBucket: ${self:custom.deploymentBucketByStage.${opt:stage}',
        );
      });

      then('no bare stage-suffixed bucket name survives on the provider line', () => {
        // the old shape `deploymentBucket: serverless-deployment-<ns>-${self:provider.stage}`
        // put a prep-account name on a prod deploy — the exact #596 break
        expect(source).not.toContain(
          `deploymentBucket: serverless-deployment-${NS}-\${self:provider.stage}`,
        );
      });

      then('the emitted deploymentBucketByStage map matches snapshot', () => {
        // snapshot the governed map block itself, so a reshaped map that keeps the pinned
        // per-tier tokens green (a reordered key, a rephrased bucket name) reddens a vibecheck
        // in review (rule.require.contract-snapshot-exhaustiveness). match the header line plus
        // its indented dev/prep/prod entry lines — robust to a comment on any entry and to the
        // entry order.
        const mapBlock =
          source.match(
            /[ \t]*deploymentBucketByStage:[^\n]*\n(?:[ \t]+(?:dev|prep|prod):[^\n]*\n)+/,
          )?.[0] ?? '';
        expect(mapBlock.length).toBeGreaterThan(0);
        expect(mapBlock).toMatchSnapshot('serverless deploymentBucketByStage map');
      });
    });
  });
});
