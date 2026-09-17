import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = the clamp on the four-github-environment set the provision-github practice declares.
 * .why  = each env NAME is an aws oidc trust `sub` anchor that selects which role a ci job may
 *         assume (see define.invariant.github-environment-set). a collapse of the apply/plan pair,
 *         or a drop of any of the four, is a silent security regression — the collapsed set
 *         type-checks, deploys, and passes every other gate. this asserts the source text of the
 *         declaration so a future drop or merge reddens here.
 * .note = a source-text clamp, not a getResources() invocation. the declaration imports declastruct
 *         providers and carries `@declapract{variable.*}` literals, so an invoke of it is fragile;
 *         the env names are stable strings, so the text is the reliable oracle.
 */

// anchor on __dirname (a nested jest run has a different cwd); the declaration is under best-practice/.
const RESOURCES = readFileSync(
  join(__dirname, 'best-practice/provision/github.repo/resources.ts'),
  'utf8',
);

// the four env names that MUST be declared — no fewer, and the apply/plan pair never merged.
const REQUIRED_ENV_NAMES = [
  'preparation',
  'production-on-main',
  'production-on-else-apply',
  'production-on-else-plan',
] as const;

// the four `Declared*` binds that MUST each appear in the returned resource set.
const REQUIRED_ENV_BINDS = [
  'envPreparation',
  'envProductionOnMain',
  'envProductionOnElseApply',
  'envProductionOnElsePlan',
] as const;

describe('github-environment-set (provision-github)', () => {
  given('the shipped provision/github.repo/resources.ts', () => {
    when('we read its declared github environments', () => {
      then('it declares all four required env names', () => {
        for (const name of REQUIRED_ENV_NAMES)
          expect(RESOURCES).toContain(`name: '${name}'`);
      });

      then('the production-on-else pair is two distinct envs, never merged', () => {
        // both names must be present; a merge would drop one of the two.
        expect(RESOURCES).toContain(`name: 'production-on-else-apply'`);
        expect(RESOURCES).toContain(`name: 'production-on-else-plan'`);
        expect(RESOURCES).not.toContain(`name: 'production-on-else'`); // the merged name is forbidden
      });

      then('all four env binds are in the returned resource set', () => {
        for (const bind of REQUIRED_ENV_BINDS)
          expect(RESOURCES).toContain(bind);
      });
    });
  });
});
