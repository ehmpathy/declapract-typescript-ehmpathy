import { given, then, when } from 'test-fns';

import { stripVersionQualifier } from './stripVersionQualifier';

describe('stripVersionQualifier', () => {
  given('a version with caret qualifier', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({ version: '^1.2.3' });

      then('base is without qualifier', () => {
        expect(result.base).toEqual('1.2.3');
      });

      then('original is preserved', () => {
        expect(result.original).toEqual('^1.2.3');
      });
    });
  });

  given('a version with tilde qualifier', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({ version: '~1.2.3' });

      then('base is without qualifier', () => {
        expect(result.base).toEqual('1.2.3');
      });

      then('original is preserved', () => {
        expect(result.original).toEqual('~1.2.3');
      });
    });
  });

  given('a version with >= qualifier', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({ version: '>=1.2.3' });

      then('base is without qualifier', () => {
        expect(result.base).toEqual('1.2.3');
      });

      then('original is preserved', () => {
        expect(result.original).toEqual('>=1.2.3');
      });
    });
  });

  given('a version with <= qualifier', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({ version: '<=1.2.3' });

      then('base is without qualifier', () => {
        expect(result.base).toEqual('1.2.3');
      });

      then('original is preserved', () => {
        expect(result.original).toEqual('<=1.2.3');
      });
    });
  });

  given('a version with = qualifier', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({ version: '=1.2.3' });

      then('base is without qualifier', () => {
        expect(result.base).toEqual('1.2.3');
      });

      then('original is preserved', () => {
        expect(result.original).toEqual('=1.2.3');
      });
    });
  });

  given('a version without qualifier', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({ version: '1.2.3' });

      then('base is the same', () => {
        expect(result.base).toEqual('1.2.3');
      });

      then('original is the same', () => {
        expect(result.original).toEqual('1.2.3');
      });
    });
  });

  given('a non-semver version "latest"', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({ version: 'latest' });

      then('base passes through unchanged', () => {
        expect(result.base).toEqual('latest');
      });

      then('original passes through unchanged', () => {
        expect(result.original).toEqual('latest');
      });
    });
  });

  given('a file: protocol version', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({ version: 'file:../local' });

      then('base passes through unchanged', () => {
        expect(result.base).toEqual('file:../local');
      });

      then('original passes through unchanged', () => {
        expect(result.original).toEqual('file:../local');
      });
    });
  });

  given('a workspace: protocol version', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({ version: 'workspace:^' });

      then('base passes through unchanged', () => {
        expect(result.base).toEqual('workspace:^');
      });

      then('original passes through unchanged', () => {
        expect(result.original).toEqual('workspace:^');
      });
    });
  });

  given('a git+ protocol version', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({
        version: 'git+https://github.com/user/repo.git',
      });

      then('base passes through unchanged', () => {
        expect(result.base).toEqual('git+https://github.com/user/repo.git');
      });

      then('original passes through unchanged', () => {
        expect(result.original).toEqual(
          'git+https://github.com/user/repo.git',
        );
      });
    });
  });

  given('a * wildcard version', () => {
    when('stripped', () => {
      const result = stripVersionQualifier({ version: '*' });

      then('base passes through unchanged', () => {
        expect(result.base).toEqual('*');
      });

      then('original passes through unchanged', () => {
        expect(result.original).toEqual('*');
      });
    });
  });
});
