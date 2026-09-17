import { contents } from './best-practice/package.json.declapract';

describe('package.json', () => {
  it('should include the terraform formatter when terraform-common is in use', async () => {
    const declaredBestPracticeContents = await contents({
      projectPractices: ['terraform-common'],
    } as any);
    expect(declaredBestPracticeContents).toContain('fix:format:terraform');
    expect(declaredBestPracticeContents).toMatchSnapshot();
  });
  it('should include the terraform formatter when terraform-aws is in use', async () => {
    const declaredBestPracticeContents = await contents({
      projectPractices: ['terraform-aws'],
    } as any);
    expect(declaredBestPracticeContents).toContain('fix:format:terraform');
  });
  it('should NOT include the terraform formatter for the bare `terraform` name (no such practice)', async () => {
    // teeth: the real practices are `terraform-common` / `terraform-aws`. the old check
    // read `includes('terraform')`, so this fake name falsely triggered the formatter and
    // masked the fact that a real terraform repo never ran it. under the fix this is absent.
    const declaredBestPracticeContents = await contents({
      projectPractices: ['terraform'],
    } as any);
    expect(declaredBestPracticeContents).not.toContain('fix:format:terraform');
  });
  it('should not include the terraform formatter when no terraform practice is in use', async () => {
    const declaredBestPracticeContents = await contents({
      projectPractices: [],
    } as any);
    expect(declaredBestPracticeContents).not.toContain('fix:format:terraform');
    expect(declaredBestPracticeContents).toMatchSnapshot();
  });
});
