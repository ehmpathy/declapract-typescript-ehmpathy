import { fix } from './.depcheckrc.yml.declapract';

describe('.depcheckrc.yml', () => {
  it('should append missing ignores from declared contents', async () => {
    const currentContents = `
ignores:
  - rhachet
  - declapract
    `.trim();

    const declaredContents = `
ignores:
  - rhachet
  - declapract
  - husky
  - tsx
    `.trim();

    const { contents: fixed } = await fix(currentContents, {
      declaredFileContents: declaredContents,
    } as any);

    expect(fixed).toContain('- husky');
    expect(fixed).toContain('- tsx');
  });

  it('should not duplicate ignores that already exist', async () => {
    const currentContents = `
ignores:
  - rhachet
  - declapract
  - husky
    `.trim();

    const declaredContents = `
ignores:
  - rhachet
  - declapract
  - husky
    `.trim();

    const { contents: fixed } = await fix(currentContents, {
      declaredFileContents: declaredContents,
    } as any);

    const matches = (fixed?.match(/- husky/g) || []).length;
    expect(matches).toBe(1);
  });

  it('should return declared contents if no current contents', async () => {
    const declaredContents = `
ignores:
  - rhachet
  - declapract
    `.trim();

    const { contents: fixed } = await fix(
      undefined as any,
      {
        declaredFileContents: declaredContents,
      } as any,
    );

    expect(fixed).toBe(declaredContents);
  });

  it('should preserve comments when adding ignores', async () => {
    const currentContents = `
# This is a comment
ignores:
  - rhachet # inline comment
  - declapract
    `.trim();

    const declaredContents = `
ignores:
  - rhachet
  - declapract
  - husky
    `.trim();

    const { contents: fixed } = await fix(currentContents, {
      declaredFileContents: declaredContents,
    } as any);

    expect(fixed).toContain('# This is a comment');
    expect(fixed).toContain('# inline comment');
    expect(fixed).toContain('- husky');
  });

  it('should preserve other sections when adding ignores', async () => {
    const currentContents = `
ignores:
  - rhachet
  - declapract
skip-missing: true
    `.trim();

    const declaredContents = `
ignores:
  - rhachet
  - declapract
  - husky
    `.trim();

    const { contents: fixed } = await fix(currentContents, {
      declaredFileContents: declaredContents,
    } as any);

    expect(fixed).toContain('skip-missing: true');
    expect(fixed).toContain('- husky');
  });
});
