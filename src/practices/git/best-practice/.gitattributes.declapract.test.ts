import { FileCheckType } from 'declapract';

import { check, fix } from './.gitattributes.declapract';

describe('.gitattributes best practice', () => {
  describe('check', () => {
    it('should be FileCheckType.CONTAINS', () => {
      expect(check).toBe(FileCheckType.CONTAINS);
    });
  });

  describe('fix', () => {
    it('should create file with header and entries when contents is null', async () => {
      const result = await fix(null, {} as any);

      expect(result.contents).toBe(
        `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.json -diff
package-lock.json -diff
`,
      );
    });

    it('should append section when header is not found', async () => {
      const contents = `# some other gitattributes
*.png binary
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(
        `# some other gitattributes
*.png binary

# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.json -diff
package-lock.json -diff
`,
      );
    });

    it('should insert missing pnpm-lock.json entry after header', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(
        `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.json -diff
package-lock.json -diff
`,
      );
    });

    it('should insert missing package-lock.json entry after header', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.json -diff
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(
        `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff
pnpm-lock.json -diff
`,
      );
    });

    it('should return contents unchanged when all entries are present', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.json -diff
package-lock.json -diff
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(contents);
    });

    it('should handle header with only comment and no entries', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(
        `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.json -diff
package-lock.json -diff
`,
      );
    });
  });
});
