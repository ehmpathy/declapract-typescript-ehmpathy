import { contents } from './package.json.declapract';

describe('package.json', () => {
  it('it should include terraform formatting when terraform practice is in use', async () => {
    const declaredBestPracticeContents = await contents({
      projectPractices: ['terraform'],
    } as any);
    expect(declaredBestPracticeContents).toContain('fix:format:terraform');
    expect(declaredBestPracticeContents).toMatchSnapshot();
  });
  it('should include not config mock when project does not use config practice', async () => {
    const declaredBestPracticeContents = await contents({
      projectPractices: [],
    } as any);
    expect(declaredBestPracticeContents).not.toContain('fix:format:terraform');
    expect(declaredBestPracticeContents).toMatchSnapshot();
  });
});
