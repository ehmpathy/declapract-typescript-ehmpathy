import { given, then, when } from 'test-fns';

import { check, fix } from './pnpm-workspace.yaml.declapract';

const context = {} as any;

describe('sdk-aws-lambda-pre-v07 pnpm-workspace.yaml', () => {
  given('[case1] a 0.7.0 patch beside another package patch, with comments', () => {
    const before = [
      '# the repo own workspace notes',
      'onlyBuiltDependencies:',
      '  - esbuild',
      'patchedDependencies:',
      '  sdk-aws-lambda@0.7.0: patches/sdk-aws-lambda@0.7.0.patch',
      '  # keep this one',
      '  left-pad@1.3.0: patches/left-pad@1.3.0.patch',
      '',
    ].join('\n');

    when('[t0] check + fix', () => {
      const fixed = fix(before, context) as { contents: string };

      then('check detects it', () => {
        expect(() => check(before, context)).not.toThrow();
      });

      then('only the below-floor key is dropped; other keys and comments survive', () => {
        expect(fixed.contents).not.toContain('sdk-aws-lambda@0.7.0');
        expect(fixed.contents).toContain('left-pad@1.3.0: patches/left-pad@1.3.0.patch');
        expect(fixed.contents).toContain('# the repo own workspace notes');
        expect(fixed.contents).toContain('# keep this one');
        expect(fixed.contents).toContain('  - esbuild');
        expect(fixed.contents).toMatchSnapshot();
      });

      then('check skips its output, and a second fix is a no-op', () => {
        expect(() => check(fixed.contents, context)).toThrow();
        expect(
          (fix(fixed.contents, context) as { contents: string }).contents,
        ).toEqual(fixed.contents);
      });
    });
  });

  given('[case2] a 0.7.0 patch, the only patch', () => {
    const before = [
      'patchedDependencies:',
      '  sdk-aws-lambda@0.7.0: patches/sdk-aws-lambda@0.7.0.patch',
      'onlyBuiltDependencies:',
      '  - esbuild',
      '',
    ].join('\n');

    when('[t0] fix', () => {
      const fixed = fix(before, context) as { contents: string };

      then('the empty map is dropped and the rest stays', () => {
        expect(fixed.contents).not.toContain('patchedDependencies');
        expect(fixed.contents).toContain('onlyBuiltDependencies:');
        expect(() => check(fixed.contents, context)).toThrow();
      });
    });
  });

  given('[case3] a patch at or above the floor', () => {
    const before = [
      'patchedDependencies:',
      '  sdk-aws-lambda@0.7.2: patches/sdk-aws-lambda@0.7.2.patch',
      '',
    ].join('\n');

    when('[t0] check', () => {
      then('it is the repo own choice, so check skips it', () => {
        expect(() => check(before, context)).toThrow();
      });
    });
  });

  given('[case4] no workspace file, or one with no patches', () => {
    when('[t0] check', () => {
      then('check skips both', () => {
        expect(() => check(null, context)).toThrow();
        expect(() =>
          check('onlyBuiltDependencies:\n  - esbuild\n', context),
        ).toThrow();
      });
    });
  });
});
