import yaml from 'yaml';

import {
  check,
  contents,
  fix,
} from './best-practice/.depcheckrc.yml.declapract';

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

  /**
   * .what = the fix merges `ignorePatterns` the same way it merges `ignores` (#639, #512)
   * .why  = a template edit alone reaches only fresh repos; an extant `.depcheckrc.yml`
   *         gains `.agent/.actors` (and the vendored-role pattern pair) only via the merge
   */
  describe('ignorePatterns merge (#639, #512)', () => {
    const declaredWithPatterns = `
ignores:
  - rhachet
ignorePatterns:
  - .agent/.actors
  - .agent/repo=*
  - "!.agent/repo=.this"
    `.trim();

    const extantWithoutPatterns = `
# repo-own comment
ignores:
  - rhachet
  - my-own-dep # why: repo-own reason
    `.trim();

    it('seeds ignorePatterns onto an extant file that lacks it, and keeps its own ignores + comments', async () => {
      const { contents: fixed } = await fix(extantWithoutPatterns, {
        declaredFileContents: declaredWithPatterns,
      } as any);
      const parsed = yaml.parse(fixed!) as {
        ignores: string[];
        ignorePatterns: string[];
      };
      expect(parsed.ignorePatterns).toEqual([
        '.agent/.actors',
        '.agent/repo=*',
        '!.agent/repo=.this',
      ]);
      expect(parsed.ignores).toEqual(['rhachet', 'my-own-dep']);
      expect(fixed).toContain('# repo-own comment');
      expect(fixed).toContain('# why: repo-own reason');
      expect(fixed).toMatchSnapshot();
    });

    it('adds no duplicate where an entry already exists, and keeps a repo-own pattern', async () => {
      const extant = `
ignores:
  - rhachet
ignorePatterns:
  - dist
  - .agent/.actors
      `.trim();
      const { contents: fixed } = await fix(extant, {
        declaredFileContents: declaredWithPatterns,
      } as any);
      const parsed = yaml.parse(fixed!) as { ignorePatterns: string[] };
      expect(parsed.ignorePatterns).toEqual([
        'dist',
        '.agent/.actors',
        '.agent/repo=*',
        '!.agent/repo=.this',
      ]);
    });

    it('is a fixed point, and check passes on its output', async () => {
      const context = {
        declaredFileContents: declaredWithPatterns,
        relativeFilePath: '.depcheckrc.yml',
      } as any;
      const { contents: once } = await fix(extantWithoutPatterns, context);
      const { contents: twice } = await fix(once, context);
      expect(twice).toEqual(once);
      expect(() => check(once, context)).not.toThrow();
    });

    it('check throws where a declared ignorePattern is absent', () => {
      expect(() =>
        check(extantWithoutPatterns, {
          declaredFileContents: declaredWithPatterns,
          relativeFilePath: '.depcheckrc.yml',
        } as any),
      ).toThrow();
    });

    it('check passes on a file with every declared entry plus its own, in any order', () => {
      const extant = `
ignorePatterns:
  - "!.agent/repo=.this"
  - dist
  - .agent/repo=*
  - .agent/.actors
ignores:
  - my-own-dep
  - rhachet
      `.trim();
      expect(() =>
        check(extant, {
          declaredFileContents: declaredWithPatterns,
          relativeFilePath: '.depcheckrc.yml',
        } as any),
      ).not.toThrow();
    });
  });

  /**
   * .what = an absent declared side halts loud, never parses to an empty list that approves all
   */
  describe('absent declared contents', () => {
    it('the check halts with a malfunction that names the file', () => {
      expect(() =>
        check('ignores:\n  - jest\n', {
          declaredFileContents: null,
          relativeFilePath: '.depcheckrc.yml',
        } as any),
      ).toThrow('the lint practice emitted no declared .depcheckrc.yml');
    });

    it('the fix names a key that holds a scalar, not a list, never a bare TypeError', async () => {
      await expect(
        (async () =>
          fix('ignores: jest\n', {
            declaredFileContents: 'ignores:\n  - jest\n  - prettier\n',
            relativeFilePath: '.depcheckrc.yml',
          } as any))(),
      ).rejects.toThrow('.depcheckrc.yml `ignores` is not a list');
    });

    it('the fix halts with the same malfunction', () => {
      expect(() =>
        fix('ignores:\n  - jest\n', {
          declaredFileContents: null,
          relativeFilePath: '.depcheckrc.yml',
        } as any),
      ).toThrow('the lint practice emitted no declared .depcheckrc.yml');
    });
  });

  /**
   * .what = the declared contents are usecase-aware: an expo repo ignores metro-config (#609)
   * .why  = expo owns the bundled metro, so a consumer pins no metro-config; a require of it
   *         from metro.config.js reads to depcheck as an undeclared dep
   */
  describe('usecase-aware contents (#609)', () => {
    it('adds metro-config to ignores where tests-expo is in play', async () => {
      const declared = await contents({
        projectPractices: ['lint', 'tests-expo'],
      } as any);
      const parsed = yaml.parse(declared) as { ignores: string[] };
      expect(parsed.ignores).toContain('metro-config');
    });

    it('omits metro-config where no expo practice is in play', async () => {
      const declared = await contents({
        projectPractices: ['lint', 'tests-node'],
      } as any);
      const parsed = yaml.parse(declared) as { ignores: string[] };
      expect(parsed.ignores).not.toContain('metro-config');
    });

    it('declares ignorePatterns for the actor dir, its `.claude` link, and vendored roles, in both runtimes', async () => {
      const declared = await contents({ projectPractices: ['lint'] } as any);
      const parsed = yaml.parse(declared) as { ignorePatterns: string[] };
      expect(parsed.ignorePatterns).toEqual([
        '.agent/.actors',
        '.claude',
        '.agent/repo=*',
        '!.agent/repo=.this',
      ]);
    });
  });
});
