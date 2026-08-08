import { given, then, when } from 'test-fns';

import { parsePackageJson } from './parsePackageJson';

describe('parsePackageJson', () => {
  given('valid json content', () => {
    when('parsed', () => {
      const result = parsePackageJson({
        content: '{"name": "test-pkg", "version": "1.0.0"}',
        branch: 'ours',
      });

      then('returns parsed object', () => {
        expect(result).toEqual({ name: 'test-pkg', version: '1.0.0' });
      });
    });
  });

  given('valid json with dependencies', () => {
    when('parsed', () => {
      const content = JSON.stringify(
        {
          name: 'test-pkg',
          dependencies: {
            lodash: '^4.17.21',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        },
        null,
        2,
      );
      const result = parsePackageJson({ content, branch: 'theirs' });

      then('returns parsed object with dependencies', () => {
        expect(result).toEqual({
          name: 'test-pkg',
          dependencies: { lodash: '^4.17.21' },
          devDependencies: { jest: '^29.0.0' },
        });
      });
    });
  });

  given('invalid json in ours branch', () => {
    when('parsed', () => {
      then('throws error with branch identifier', () => {
        expect(() =>
          parsePackageJson({
            content: '{ invalid json }',
            branch: 'ours',
          }),
        ).toThrow("invalid json in 'ours' branch");
      });
    });
  });

  given('invalid json in theirs branch', () => {
    when('parsed', () => {
      then('throws error with branch identifier', () => {
        expect(() =>
          parsePackageJson({
            content: '{"name": "test", "bad": }',
            branch: 'theirs',
          }),
        ).toThrow("invalid json in 'theirs' branch");
      });
    });
  });

  given('invalid json in base branch', () => {
    when('parsed', () => {
      then('throws error with branch identifier', () => {
        expect(() =>
          parsePackageJson({
            content: 'not json at all',
            branch: 'base',
          }),
        ).toThrow("invalid json in 'base' branch");
      });
    });
  });

  given('empty string content', () => {
    when('parsed', () => {
      then('throws error about empty content', () => {
        expect(() =>
          parsePackageJson({
            content: '',
            branch: 'ours',
          }),
        ).toThrow("empty content in 'ours' branch");
      });
    });
  });

  given('whitespace-only content', () => {
    when('parsed', () => {
      then('throws error about empty content', () => {
        expect(() =>
          parsePackageJson({
            content: '   \n\t  ',
            branch: 'theirs',
          }),
        ).toThrow("empty content in 'theirs' branch");
      });
    });
  });
});
