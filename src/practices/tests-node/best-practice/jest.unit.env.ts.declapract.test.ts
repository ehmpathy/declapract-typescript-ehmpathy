import type { FileContentsContext } from 'declapract';

import { contents } from './jest.unit.env.ts.declapract';

/**
 * .what = builds the minimal FileContentsContext the `contents` fn actually reads
 * .why  = declapract's FileContentsContext carries many fields the jest.unit.env `contents`
 *         fn never touches — it reads only `projectPractices` (the config-usecase signal).
 *         the single documented cast here is the sanctioned test-context idiom
 *         (howto.add-bad-practice.md); it is confined to this helper so no call site casts.
 *         removal path: drop the cast the day declapract exports a partial-context builder.
 */
const asContext = (projectPractices: string[]): FileContentsContext =>
  ({ projectPractices }) as unknown as FileContentsContext;

describe('jest.unit.env.ts', () => {
  it('should include config mock when project uses config practice', async () => {
    const declaredBestPracticeContents = await contents(asContext(['config']));
    expect(declaredBestPracticeContents).toContain(
      "jest.mock('./src/utils/config/getConfig', ",
    );
  });
  it('should not include config mock when project does not use config practice', async () => {
    const declaredBestPracticeContents = await contents(asContext([]));
    expect(declaredBestPracticeContents).not.toContain(
      "jest.mock('./src/utils/config/getConfig', ",
    );
  });
});
