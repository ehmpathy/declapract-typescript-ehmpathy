import { FileCheckType } from 'declapract';

import { check, fix } from './.gitattributes.declapract';

const EXPECTED_FULL_CONTENT = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

describe('.gitattributes best practice', () => {
  describe('check', () => {
    it('should be FileCheckType.CONTAINS', () => {
      expect(check).toBe(FileCheckType.CONTAINS);
    });
  });

  describe('fix', () => {
    it('should create file with both sections when contents is null', async () => {
      const result = await fix(null, {} as any);

      expect(result.contents).toBe(EXPECTED_FULL_CONTENT);
    });

    it('should append both sections when neither header is found', async () => {
      const contents = `# some other gitattributes
*.png binary
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(
        `# some other gitattributes
*.png binary

# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`,
      );
    });

    it('should insert missing pnpm-lock.yaml -diff entry after header', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(
        `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`,
      );
    });

    it('should insert missing package-lock.json -diff entry after header', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(
        `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff
pnpm-lock.yaml -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`,
      );
    });

    it('should add merge section when only diff section exists', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(EXPECTED_FULL_CONTENT);
    });

    it('should insert missing merge=theirs entries after header', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(
        `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
package-lock.json merge=theirs
pnpm-lock.yaml merge=theirs
`,
      );
    });

    it('should return contents unchanged when all entries are present', async () => {
      const result = await fix(EXPECTED_FULL_CONTENT, {} as any);

      expect(result.contents).toBe(EXPECTED_FULL_CONTENT);
    });

    it('should handle headers with no entries', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233

# auto-resolve lock file conflicts by taking theirs; run install after merge
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toContain('pnpm-lock.yaml -diff');
      expect(result.contents).toContain('package-lock.json -diff');
      expect(result.contents).toContain('pnpm-lock.yaml merge=theirs');
      expect(result.contents).toContain('package-lock.json merge=theirs');
    });

    it('should remove legacy header and deduplicate entries from borked file', async () => {
      // this is the exact borked input scenario that prompted the fix
      const borkedContents = `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff

# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
pnpm-lock.json -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

      const result = await fix(borkedContents, {} as any);

      // should have removed the legacy header
      expect(result.contents).not.toContain(
        '# exclude package-lock from git diff',
      );

      // should have the correct header
      expect(result.contents).toContain(
        '# exclude package locks from git diff',
      );

      // should not have duplicate package-lock.json -diff
      const diffMatches = result.contents!.match(/package-lock\.json -diff/g);
      expect(diffMatches).toHaveLength(1);

      // should still have all required entries
      expect(result.contents).toContain('pnpm-lock.yaml -diff');
      expect(result.contents).toContain('package-lock.json -diff');
      expect(result.contents).toContain('pnpm-lock.yaml merge=theirs');
      expect(result.contents).toContain('package-lock.json merge=theirs');
    });

    it('should deduplicate entries that appear multiple times', async () => {
      const contentsWithDuplicates = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
pnpm-lock.yaml merge=theirs
`;

      const result = await fix(contentsWithDuplicates, {} as any);

      // each entry should appear exactly once
      const pnpmDiffMatches = result.contents!.match(/pnpm-lock\.yaml -diff/g);
      const pkgDiffMatches = result.contents!.match(/package-lock\.json -diff/g);
      const pnpmMergeMatches = result.contents!.match(
        /pnpm-lock\.yaml merge=theirs/g,
      );
      const pkgMergeMatches = result.contents!.match(
        /package-lock\.json merge=theirs/g,
      );

      expect(pnpmDiffMatches).toHaveLength(1);
      expect(pkgDiffMatches).toHaveLength(1);
      expect(pnpmMergeMatches).toHaveLength(1);
      expect(pkgMergeMatches).toHaveLength(1);
    });

    it('should replace legacy header with correct header when only legacy exists', async () => {
      const contentsWithLegacyOnly = `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff
`;

      const result = await fix(contentsWithLegacyOnly, {} as any);

      // should have removed the legacy header
      expect(result.contents).not.toContain(
        '# exclude package-lock from git diff',
      );

      // should have the correct header with all entries
      expect(result.contents).toContain(
        '# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233',
      );
      expect(result.contents).toContain('pnpm-lock.yaml -diff');
      expect(result.contents).toContain('package-lock.json -diff');

      // should have the merge section too
      expect(result.contents).toContain(
        '# auto-resolve lock file conflicts by taking theirs; run install after merge',
      );
      expect(result.contents).toContain('pnpm-lock.yaml merge=theirs');
      expect(result.contents).toContain('package-lock.json merge=theirs');
    });

    it('should collapse multiple consecutive empty lines', async () => {
      const contentsWithExtraLines = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff



# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

      const result = await fix(contentsWithExtraLines, {} as any);

      // should not have more than one consecutive empty line
      expect(result.contents).not.toContain('\n\n\n');
    });

    it('should fix exact borked input from user report', async () => {
      // exact input from user report
      const borkedInput = `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff

# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.json -diff
package-lock.json -diff
`;

      const result = await fix(borkedInput, {} as any);

      // should have removed the prior header
      expect(result.contents).not.toContain(
        '# exclude package-lock from git diff',
      );

      // should have deduplicated package-lock.json -diff
      const pkgDiffMatches = result.contents!.match(/package-lock\.json -diff/g);
      expect(pkgDiffMatches).toHaveLength(1);

      // should have removed pnpm-lock.json -diff (prior entry, typo)
      expect(result.contents).not.toContain('pnpm-lock.json -diff');

      // should have the latest pnpm-lock.yaml -diff
      expect(result.contents).toContain('pnpm-lock.yaml -diff');

      // should have added merge section
      expect(result.contents).toContain('pnpm-lock.yaml merge=theirs');
      expect(result.contents).toContain('package-lock.json merge=theirs');
    });

    it('should not duplicate entry when legacy header removed but entry remains', async () => {
      // scenario: legacy header removed, but its entry (package-lock.json -diff)
      // stays because it's a valid latest entry. ensureSection must not duplicate it.
      const legacyOnlyInput = `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff
`;

      const result = await fix(legacyOnlyInput, {} as any);

      // should have exactly one package-lock.json -diff
      const pkgDiffMatches = result.contents!.match(/package-lock\.json -diff/g);
      expect(pkgDiffMatches).toHaveLength(1);

      // should have the latest header
      expect(result.contents).toContain(
        '# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233',
      );

      // should not have the legacy header
      expect(result.contents).not.toContain(
        '# exclude package-lock from git diff',
      );

      // should have added the absent pnpm-lock.yaml -diff
      expect(result.contents).toContain('pnpm-lock.yaml -diff');

      // should have the merge section
      expect(result.contents).toContain('pnpm-lock.yaml merge=theirs');
      expect(result.contents).toContain('package-lock.json merge=theirs');
    });
  });
});
