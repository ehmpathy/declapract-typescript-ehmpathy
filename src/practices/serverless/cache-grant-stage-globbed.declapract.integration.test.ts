import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps that the serverless template grants the shared domain-driven cache table with the
 *         stage segment GLOBBED (`infrastructure-*-table-domain-driven-cache`), never templated on
 *         `provider.stage` or `custom.access`.
 * .why  = the cache is one SHARED dynamodb table addressed by a single name (below prod that name is
 *         `-dev-`), while a dual-publish service runs two fleets whose roles key on different stages
 *         (ancient stage=dev, contemp stage=prep). a stage-templated grant covers only the deployed
 *         fleet's own slug, so the contemp `-prep-` fleet's `-dev-` cache read AccessDenies and a
 *         with-simple-cache read-back throws a 500 instead of a null — a real break found live on
 *         svc-gateway `prep / assure` (3 chat endpoints 500'd on the contemp fleet only; cloudwatch
 *         named the AccessDeny on `infrastructure-dev-table-domain-driven-cache`) (#597). the glob
 *         covers `-dev-`, `-prep-`, and `-prod-` in one line, still account- and name-scoped.
 * .teeth = re-template the cache grant to `infrastructure-${self:provider.stage}-...` (or
 *          `${self:custom.access}`) and the globbed-form case reddens.
 * .note = same class as #596 (deploymentBucket account-scope): a resource addressed by one axis
 *         while a grant templates it on another. `.declapract.test.ts` = this repo's UNIT-test
 *         marker; at the practice ROOT (not under best-practice/), so it is neither loaded as a
 *         declaration nor copied to a consumer.
 */

// anchor on __dirname, not process.cwd(): a nested `jest src/practices/...` run has a different
// cwd, and a repo-root-relative path under process.cwd() would then miss the tree (vacuous green).
const templatePath = join(__dirname, 'best-practice/serverless.yml');

const CACHE_FAMILY = 'table/infrastructure-';
const CACHE_SUFFIX = '-table-domain-driven-cache';

describe('serverless shared-cache IAM grant globs the stage segment (#597)', () => {
  const source = readFileSync(templatePath, 'utf8');

  given('[case1] the shared domain-driven cache grant', () => {
    when('[t0] serverless.yml is read', () => {
      then('it grants the cache family with the stage segment globbed', () => {
        expect(source).toContain(`${CACHE_FAMILY}*${CACHE_SUFFIX}`);
      });

      then('no stage-templated cache grant survives', () => {
        // `infrastructure-${self:provider.stage}-...` covers only one fleet's own slug — the exact
        // #597 break for the contemp -prep- fleet that reads the shared -dev- cache
        expect(source).not.toContain(
          `${CACHE_FAMILY}\${self:provider.stage}${CACHE_SUFFIX}`,
        );
      });

      then('no access-templated cache grant survives', () => {
        // the earlier D27 two-line workaround templated a second grant on custom.access; the glob
        // supersedes both, so neither templated form should remain
        expect(source).not.toContain(
          `${CACHE_FAMILY}\${self:custom.access}${CACHE_SUFFIX}`,
        );
      });

      then('the emitted cache grant line matches snapshot', () => {
        // snapshot the governed grant line itself, so a reshaped grant that keeps the globbed
        // token green (a reordered arn, a rephrased resource entry) reddens a vibecheck in
        // review (rule.require.contract-snapshot-exhaustiveness)
        const grantLine = source
          .split('\n')
          .find((line) => line.includes(`${CACHE_FAMILY}*${CACHE_SUFFIX}`));
        expect(grantLine?.trim()).toMatchSnapshot('serverless cache IAM grant');
      });
    });
  });
});
