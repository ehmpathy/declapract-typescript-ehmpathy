import type { FileContentsContext } from 'declapract';

import { contents } from './best-practice/jest.unit.env.ts.declapract';

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
  it('should import access from the environments module when project uses environments practice', async () => {
    const declaredBestPracticeContents = await contents(
      asContext(['environments']),
    );
    expect(declaredBestPracticeContents).toContain(
      "import { access } from './src/utils/environment';",
    );
    expect(declaredBestPracticeContents).not.toContain('process.env.ACCESS');
  });
  it('should derive access from the envars when project does not use environments practice', async () => {
    // .why = the environments practice alone emits src/utils/environment; without it the import is TS2307 (F88)
    const declaredBestPracticeContents = await contents(asContext([]));
    expect(declaredBestPracticeContents).not.toContain(
      './src/utils/environment',
    );
    expect(declaredBestPracticeContents).toContain(
      'const access = process.env.ACCESS ?? process.env.NODE_ENV;',
    );
    expect(declaredBestPracticeContents).toContain("if (access !== 'test'");
  });
  it('should match snapshot per usecase shape', async () => {
    expect(await contents(asContext([]))).toMatchSnapshot(
      'jest.unit.env.ts — no config, no environments',
    );
    expect(
      await contents(asContext(['config', 'environments'])),
    ).toMatchSnapshot('jest.unit.env.ts — config + environments');
  });
});
