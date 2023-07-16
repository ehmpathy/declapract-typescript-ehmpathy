import { contents } from './jest.unit.env.ts.declapract';

describe('jest.unit.env.ts', () => {
  it('should include config mock when project uses config practice', async () => {
    const declaredBestPracticeContents = await contents({
      projectPractices: ['config'],
    } as any);
    expect(declaredBestPracticeContents).toContain(
      "jest.mock('./src/utils/config/getConfig', ",
    );
    expect(declaredBestPracticeContents).toMatchSnapshot();
  });
  it('should not include config mock when project does not use config practice', async () => {
    const declaredBestPracticeContents = await contents({
      projectPractices: [],
    } as any);
    expect(declaredBestPracticeContents).not.toContain(
      "jest.mock('./src/utils/config/getConfig', ",
    );
    expect(declaredBestPracticeContents).toMatchSnapshot();
  });
});
