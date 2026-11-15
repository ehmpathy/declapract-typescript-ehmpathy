import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { UnexpectedCodePathError } from 'helpful-errors';
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

// anchor on __dirname (a nested jest run has a different cwd); the clamped template sits beside this file
const RESOURCES = readFileSync(join(__dirname, 'resources.ts'), 'utf8');

/**
 * .what = cut the main branch protection block out of a resources.ts, line comments removed
 * .why  = a match elsewhere in the file, or a field that sits only in a comment, must not
 *         satisfy the clamp
 */
const asProtectionBlock = (input: { source: string }): string => {
  const start = input.source.indexOf(
    'const branchMainProtection = DeclaredGithubBranchProtection.as({',
  );
  const end = input.source.indexOf('\n  });', start);
  if (start < 0 || end < 0)
    UnexpectedCodePathError.throw(
      'branchMainProtection block not found in resources.ts',
      { start, end, hint: 'the declaration was renamed or reshaped; re-anchor the slice' },
    );
  return input.source.slice(start, end).replace(/\s*\/\/.*$/gm, '');
};

const PROTECTION_BLOCK = asProtectionBlock({ source: RESOURCES });

describe('github-main-review (provision-github)', () => {
  given('[case1] the shipped provision/github.repo/resources.ts', () => {
    when('[t0] we read main branch protection', () => {
      then('it requires one approval before a merge', () => {
        expect(PROTECTION_BLOCK).toMatch(/requiredPullRequestReviews:\s*\{/);
        expect(PROTECTION_BLOCK).toMatch(/requiredApprovingReviewCount:\s*1\b/);
      });

      then('it never declares the review rule absent', () => {
        expect(PROTECTION_BLOCK).not.toMatch(/requiredPullRequestReviews:\s*null/);
      });

      then('a push after approval drops the approval', () => {
        expect(PROTECTION_BLOCK).toMatch(/dismissStaleReviews:\s*true\b/);
      });

      then('admins are held to the rule too', () => {
        expect(PROTECTION_BLOCK).toMatch(/enforceAdmins:\s*true\b/);
      });

      then('the branch must be up to date before a merge (the premise of F2)', () => {
        expect(PROTECTION_BLOCK).toMatch(/strict:\s*true\b/);
      });

      then('any write collaborator may approve; no code owner review (F5)', () => {
        expect(PROTECTION_BLOCK).toMatch(/requireCodeOwnerReviews:\s*false\b/);
      });

      then('the block, as the clamp reads it, matches snapshot', () => {
        expect(PROTECTION_BLOCK).toMatchSnapshot();
      });
    });
  });

  given('[case2] a resources.ts whose review rule sits only in a comment', () => {
    // the shipped file, with the review block turned back to null and the field left in a comment
    const source = RESOURCES.replace(
      /requiredPullRequestReviews:\s*\{[\s\S]*?\n {4}\},/,
      '// requiredApprovingReviewCount: 1,\n    requiredPullRequestReviews: null,',
    );

    when('[t0] the clamp cuts its protection block', () => {
      then('the commented field is gone, so it cannot satisfy the clamp', () => {
        expect(source).toContain('// requiredApprovingReviewCount: 1,');
        const block = asProtectionBlock({ source });
        expect(block).not.toMatch(/requiredApprovingReviewCount/);
        expect(block).toMatch(/requiredPullRequestReviews:\s*null/);
      });
    });
  });
});
