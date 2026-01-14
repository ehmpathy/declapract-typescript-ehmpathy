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
  });
});
