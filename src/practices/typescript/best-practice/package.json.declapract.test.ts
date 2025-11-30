import { contents } from './package.json.declapract';

describe('package.json', () => {
  it('should include build:artifact when project uses artifact practice', async () => {
    const declaredBestPracticeContents = await contents({
      projectPractices: ['artifact'],
    } as any);
    expect(declaredBestPracticeContents).toContain('build:artifact');
  });
  it('should include not include build:artifact when project does not use artifact practice', async () => {
    const declaredBestPracticeContents = await contents({
      projectPractices: [],
    } as any);
    expect(declaredBestPracticeContents).not.toContain('build:artifact');
  });
});
