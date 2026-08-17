import type { FileContentsContext } from 'declapract';

import { contents } from './package.json.declapract';

/**
 * .what = builds the minimal FileContentsContext the `contents` fn actually reads
 * .why  = declapract's FileContentsContext carries many fields the package.json `contents`
 *         fn never touches — it reads only `projectPractices` (the artifact-usecase signal).
 *         the single documented cast here is the sanctioned test-context idiom
 *         (howto.add-bad-practice.md); it is confined to this helper so no call site casts.
 *         removal path: drop the cast the day declapract exports a partial-context builder.
 */
const asContext = (projectPractices: string[]): FileContentsContext =>
  ({ projectPractices }) as unknown as FileContentsContext;

describe('package.json', () => {
  it('should include build:artifact when project uses artifact practice', async () => {
    const declaredBestPracticeContents = await contents(asContext(['artifact']));
    expect(declaredBestPracticeContents).toContain('build:artifact');
  });
  it('should include not include build:artifact when project does not use artifact practice', async () => {
    const declaredBestPracticeContents = await contents(asContext([]));
    expect(declaredBestPracticeContents).not.toContain('build:artifact');
  });
});
