import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps the empty-template invariant the case=7 (stateful-store-alias-not-copy) safety
 *         rests on: the persist-with-rds declastruct wish declares ZERO rds clusters — `getResources`
 *         returns only SSM params, and the provision tree imports no cluster/rds/aurora/database
 *         resource-declaration type.
 * .why  = case=7's fail-safe is "a lambda under two names is two copies of code; a database under two
 *         names must be one store with two pointers" — and its load-bearer is that the template holds
 *         NO cluster for a `fix` to duplicate. a second cluster is the operator's to hand-author,
 *         against the runbook, never a state the template produces. this is the demoed critipath's
 *         real test (per `rule.require.experience-catalog-evolution`, a demoed critipath owes a test
 *         by verification): if a future edit ever declares a cluster in the go-forward wish, the
 *         "zero clusters to duplicate" premise silently breaks, and this reddens.
 * .teeth = a cluster resource cannot enter `getResources` without an import of a `DeclaredAws*Cluster`
 *          / `*Rds` / `*Aurora` / `*Database` type plus its addition to the returned array — so the
 *          "declares only SSM params" + "imports no cluster type" cases redden the moment one lands.
 * .note = `.integration.test.ts` because it reads the filesystem (a remote boundary); at the practice
 *         ROOT (not under best-practice/), so it is neither loaded as a declaration nor copied to a
 *         consumer. mirrors the source-text clamp in `ssm-cicd-param-names.declapract.integration.test.ts`.
 */

// anchor on __dirname, not process.cwd(): a nested `jest src/practices/...` run has a different cwd.
const resourcesPath = join(__dirname, 'best-practice/provision/aws/resources.ts');
const paramsPath = join(
  __dirname,
  'best-practice/provision/aws/resources.parameters.ts',
);

// any declastruct-aws resource-declaration type that would name an rds/aurora cluster or database.
// a cluster resource cannot be declared without one of these, so the negation is the teeth.
const CLUSTER_TYPE_PATTERN = /Declared\w*(Rds|Cluster|Aurora|Database)/;

describe('persist-with-rds wish declares zero rds clusters (empty-template invariant)', () => {
  const resources = readFileSync(resourcesPath, 'utf8');
  const params = readFileSync(paramsPath, 'utf8');

  given('[case1] the wish entrypoint resources.ts', () => {
    when('[t0] resources.ts is read', () => {
      then('getResources yields only the ssm parameters', () => {
        expect(resources).toContain('getAllParameters({ accessSlug: null })');
      });

      then('the wish imports no cluster/rds/aurora/database resource type', () => {
        expect(resources).not.toMatch(CLUSTER_TYPE_PATTERN);
      });

      then('the sole declared aws resource declaration is the ssm parameter secure', () => {
        // the one resource-declaration import from declastruct-aws is DeclaredAwsSsmParameterSecure
        // (via resources.parameters.ts). resources.ts itself declares no resource type directly.
        expect(resources).not.toContain('DeclaredAwsRds');
        expect(resources).not.toContain('DeclaredAwsAurora');
      });
    });
  });

  given('[case2] the resource set resources.parameters.ts', () => {
    when('[t0] resources.parameters.ts is read', () => {
      then('getAllParameters yields a DeclaredAwsSsmParameterSecure array (ssm params only)', () => {
        expect(params).toContain('DeclaredAwsSsmParameterSecure[]');
      });

      then('the resource set declares no cluster/rds/aurora/database type', () => {
        expect(params).not.toMatch(CLUSTER_TYPE_PATTERN);
      });
    });
  });
});
