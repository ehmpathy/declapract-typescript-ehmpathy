import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = proves through the real apply pipeline that an adopter whose main protection declares
 *         `requiredPullRequestReviews: null` gains one required approval, and that a second apply
 *         is a no-op
 * .why = the review gate reaches an adopter only via `declapract apply`; the source-text clamp
 *        beside the template proves the template, this proves the template lands
 * .teeth = revert the template's review block to null and [t1] stays at null
 */
jest.setTimeout(5 * 60 * 1000);

/**
 * .what = cut the branchMainProtection declaration out of a resources.ts
 * .why = the block snapshot states the intent at a glance; a whole-file snapshot beside it
 *        catches a change anywhere else
 */
const asMainProtectionBlock = (input: { source: string }): string => {
  const begin = input.source.indexOf('const branchMainProtection');
  const end = input.source.indexOf('});', begin);
  if (begin < 0 || end < 0)
    throw new Error('branchMainProtection block not found in resources.ts');
  return input.source.slice(begin, end + 3);
};

describe('provision-github main-review', () => {
  given('[case1] a repo whose main protection requires no review', () => {
    const tempDir = genTempDir({
      slug: 'declapract-provision-github-main-review',
      clone:
        './src/practices/provision-github/.test/assets/demo-repo-main-review',
      symlink: [{ at: 'declarations', to: 'src' }],
    });
    const read = () =>
      fs.readFile(
        path.join(tempDir, 'provision/github.repo/resources.ts'),
        'utf-8',
      );
    const apply = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'provision-github',
        file: 'provision/github.repo/resources.ts',
      });

    when('[t0] the input, before any fix', () => {
      const before = useThen('read resources.ts', async () => ({ source: await read() }));

      then('main protection declares no review', () => {
        const block = asMainProtectionBlock({ source: before.source });
        expect(block).toMatch(/requiredPullRequestReviews:\s*null/);
        expect(block).toMatchSnapshot('main protection — before');
      });

      then('the whole file matches snapshot', () => {
        expect(before.source).toMatchSnapshot('resources.ts — before');
      });
    });

    when('[t1] apply runs', () => {
      const after = useThen('apply the declarations, then read resources.ts', async () => {
        await apply();
        return { source: await read() };
      });

      then('main protection requires one approval', () => {
        const block = asMainProtectionBlock({ source: after.source });
        expect(block).not.toMatch(/requiredPullRequestReviews:\s*null/);
        expect(block).toMatch(/requiredApprovingReviewCount:\s*1\b/);
        expect(block).toMatch(/dismissStaleReviews:\s*true/);
        expect(block).toMatch(/requireCodeOwnerReviews:\s*false/);
        expect(block).toMatchSnapshot('main protection — after');
      });

      then('the variables stay filled for this repo', () => {
        expect(after.source).toContain("owner: 'test-org'");
        expect(after.source).toContain("name: 'test-project'");
        expect(after.source).not.toContain('@declapract{');
      });

      then('the whole file matches snapshot, so a change outside the block shows too', () => {
        expect(after.source).toMatchSnapshot('resources.ts — after');
      });
    });

    when('[t2] apply runs a second time', () => {
      const scene = useThen('apply again', async () => {
        const before = await read();
        await apply();
        const after = await read();
        return { before, after };
      });

      then('resources.ts is a fixed point', () => {
        expect(scene.after).toEqual(scene.before);
      });
    });
  });
});
