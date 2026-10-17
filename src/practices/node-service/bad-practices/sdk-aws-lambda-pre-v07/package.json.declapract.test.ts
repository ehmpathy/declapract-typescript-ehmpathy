import type { FileCheckContext } from 'declapract';
import { given, then, when } from 'test-fns';

import { check, fix } from './package.json.declapract';

const context = {} as FileCheckContext; // .note = these declarations read no context

const asJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

describe('sdk-aws-lambda-pre-v07 package.json', () => {
  given('[case1] a 0.7.0 patch, the only patch', () => {
    const before = asJson({
      name: 'svc',
      dependencies: { 'sdk-aws-lambda': '0.7.2' },
      pnpm: {
        patchedDependencies: {
          'sdk-aws-lambda@0.7.0': 'patches/sdk-aws-lambda@0.7.0.patch',
        },
      },
    });

    when('[t0] check + fix', () => {
      const fixed = fix(before, context) as { contents: string };

      then('check detects it', () => {
        expect(() => check(before, context)).not.toThrow();
      });

      then('the key, the empty map, and the empty pnpm block are dropped', () => {
        const parsed = JSON.parse(fixed.contents);
        expect(parsed.pnpm).toBeUndefined();
        expect(parsed.dependencies['sdk-aws-lambda']).toEqual('0.7.2');
      });

      then('check skips its output, and a second fix is a no-op', () => {
        expect(() => check(fixed.contents, context)).toThrow();
        expect(
          (fix(fixed.contents, context) as { contents: string }).contents,
        ).toEqual(fixed.contents);
      });
    });
  });

  given('[case2] a 0.6.2 patch beside another package patch and a pnpm override', () => {
    const before = asJson({
      pnpm: {
        overrides: { foo: '1.0.0' },
        patchedDependencies: {
          'sdk-aws-lambda@0.6.2': 'patches/sdk-aws-lambda@0.6.2.patch',
          'other@1.0.0': 'patches/other@1.0.0.patch',
        },
      },
    });

    then('only the stale sdk key goes', () => {
      const parsed = JSON.parse(
        (fix(before, context) as { contents: string }).contents,
      );
      expect(parsed.pnpm).toEqual({
        overrides: { foo: '1.0.0' },
        patchedDependencies: { 'other@1.0.0': 'patches/other@1.0.0.patch' },
      });
    });
  });

  given('[case3] a patch at or above the floor', () => {
    then('check skips it — the consumer chose it', () => {
      expect(() =>
        check(
          asJson({
            pnpm: {
              patchedDependencies: {
                'sdk-aws-lambda@0.7.2': 'patches/sdk-aws-lambda@0.7.2.patch',
              },
            },
          }),
          context,
        ),
      ).toThrow();
    });
  });
});
