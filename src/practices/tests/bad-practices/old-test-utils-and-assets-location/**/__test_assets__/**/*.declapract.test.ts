import { FileCheckType } from 'declapract';

import { check, fix } from './*.declapract';

describe('old-test-utils-and-assets-location **/__test_assets__/**/* bad practice', () => {
  describe('check', () => {
    it('should be FileCheckType.EXISTS', () => {
      expect(check).toBe(FileCheckType.EXISTS);
    });
  });

  describe('fix', () => {
    it('should move file from __test_assets__ to .test.assets', async () => {
      const contents = 'some file contents';
      const context = {
        relativeFilePath: 'src/domain/__test_assets__/fixture.json',
      };

      const result = await fix(contents, context as any);

      expect(result).toEqual({
        contents: 'some file contents',
        relativeFilePath: 'src/domain/.test.assets/fixture.json',
      });
    });

    it('should handle nested __test_assets__ paths', async () => {
      const contents = 'nested file contents';
      const context = {
        relativeFilePath: 'src/logic/__test_assets__/nested/deep/fixture.json',
      };

      const result = await fix(contents, context as any);

      expect(result).toEqual({
        contents: 'nested file contents',
        relativeFilePath: 'src/logic/.test.assets/nested/deep/fixture.json',
      });
    });

    it('should handle null contents', async () => {
      const context = {
        relativeFilePath: 'src/__test_assets__/file.json',
      };

      const result = await fix(null, context as any);

      expect(result).toEqual({
        contents: null,
        relativeFilePath: 'src/.test.assets/file.json',
      });
    });

    it('should retain exact json file contents when moving', async () => {
      const originalContents = JSON.stringify(
        {
          testData: {
            users: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' },
            ],
            config: { enabled: true, timeout: 5000 },
          },
        },
        null,
        2,
      );
      const context = {
        relativeFilePath: 'src/__test_assets__/fixtures/users.json',
      };

      const result = await fix(originalContents, context as any);

      expect(result.contents).toBe(originalContents);
      expect(JSON.parse(result.contents!)).toEqual(
        JSON.parse(originalContents),
      );
    });

    it('should retain exact ts file contents when moving', async () => {
      const originalContents = `import { User } from '../domain/User';

export const exampleUsers: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

export const getExampleUser = (id: number): User | undefined =>
  exampleUsers.find((user) => user.id === id);
`;
      const context = {
        relativeFilePath: 'src/domain/__test_assets__/exampleUsers.ts',
      };

      const result = await fix(originalContents, context as any);

      expect(result.contents).toBe(originalContents);
      expect(result.relativeFilePath).toBe(
        'src/domain/.test.assets/exampleUsers.ts',
      );
    });
  });
});
