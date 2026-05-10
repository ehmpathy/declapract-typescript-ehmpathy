import type { FileCheckContext } from 'declapract';

import { check, fix } from './*.json.declapract';

describe('old-param-placeholder', () => {
  describe('check', () => {
    it('should match files with __PARAM__ placeholder', () => {
      const contents = JSON.stringify(
        {
          database: {
            role: {
              cicd: { password: '__PARAM__' },
            },
          },
        },
        null,
        2,
      );

      expect(() => check(contents, {} as FileCheckContext)).not.toThrow();
    });

    it('should not match files without __PARAM__ placeholder', () => {
      const contents = JSON.stringify(
        {
          database: {
            role: {
              cicd: { password: '$.at(aws::param)' },
            },
          },
        },
        null,
        2,
      );

      expect(() => check(contents, {} as FileCheckContext)).toThrow(
        'does not match bad practice',
      );
    });
  });

  describe('fix', () => {
    it('should replace __PARAM__ with $.at(aws::param)', async () => {
      const contents = JSON.stringify(
        {
          database: {
            role: {
              cicd: { password: '__PARAM__' },
              crud: { password: '__PARAM__' },
            },
          },
        },
        null,
        2,
      );

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).toContain('$.at(aws::param)');
      expect(result.contents).not.toContain('__PARAM__');
    });
  });
});
