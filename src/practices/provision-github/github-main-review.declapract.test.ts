import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = the clamp on main's review rule in the provision-github practice.
 * .why  = a main that requires status checks but no review merges a green pr unread
 *         (ehmpathy/sdk-aws-lambda#79). a drop back to `requiredPullRequestReviews: null`
 *         type-checks and passes every other gate, so this asserts the declaration's text.
 * .note = a source-text clamp, like github-environment-set: the declaration imports
 *         declastruct providers and carries `@declapract{variable.*}` literals, so an invoke
 *         of getResources() is fragile; the field text is the reliable oracle.
 */

// anchor on __dirname (a nested jest run has a different cwd); the declaration is under best-practice/.
const RESOURCES = readFileSync(
  join(__dirname, 'best-practice/provision/github.repo/resources.ts'),
  'utf8',
);

// isolate the main branch protection block, so a match elsewhere cannot satisfy the clamp
const PROTECTION_BLOCK = (() => {
  const start = RESOURCES.indexOf(
    'const branchMainProtection = DeclaredGithubBranchProtection.as({',
  );
  const end = RESOURCES.indexOf('\n  });', start);
  if (start < 0 || end < 0)
    throw new Error('branchMainProtection block not found in resources.ts');
  return RESOURCES.slice(start, end);
})();

describe('github-main-review (provision-github)', () => {
  given('the shipped provision/github.repo/resources.ts', () => {
    when('we read main branch protection', () => {
      then('it requires one approval before a merge', () => {
        expect(PROTECTION_BLOCK).toContain('requiredPullRequestReviews: {');
        expect(PROTECTION_BLOCK).toContain('requiredApprovingReviewCount: 1,');
      });

      then('it never declares the review rule absent', () => {
        expect(PROTECTION_BLOCK).not.toContain(
          'requiredPullRequestReviews: null',
        );
      });

      then('a push after approval drops the approval', () => {
        expect(PROTECTION_BLOCK).toContain('dismissStaleReviews: true,');
      });

      then('admins are held to the rule too', () => {
        expect(PROTECTION_BLOCK).toContain('enforceAdmins: true,');
      });
    });
  });
});
