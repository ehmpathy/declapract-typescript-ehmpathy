import type { FileCheckContext, FileFixContext } from 'declapract';
import { getError, given, then, when } from 'test-fns';

import { check, fix } from './package.json.declapract';

/**
 * .what = the backfill of an explicit `private` into package.json
 * .why = provision-github fails closed on visibility; the key must always be an explicit boolean,
 *        so an absent or non-boolean value backfills to `true`, and an explicit one is never touched
 * .teeth = let the fix overwrite an explicit `false` and the [case5] rows redden
 */
const checkContext = {} as FileCheckContext; // .note = check reads only contents
const fixContext = {} as FileFixContext; // .note = fix reads only contents

const asJson = (pkg: Record<string, unknown>) => `${JSON.stringify(pkg, null, 2)}\n`;
const runFix = async (contents: string) =>
  (await fix(contents, fixContext)).contents ?? null;

const TEST_CASES = [
  {
    description: '[case1] no private key, with a version',
    input: { name: 'svc-x', description: 'x', version: '1.0.0', scripts: {} },
    output: {
      name: 'svc-x',
      description: 'x',
      private: true,
      version: '1.0.0',
      scripts: {},
    },
  },
  {
    description: '[case2] no private key, no version',
    input: { name: 'svc-x', author: 'ehmpathy', scripts: {} },
    output: { name: 'svc-x', author: 'ehmpathy', private: true, scripts: {} },
  },
  {
    description: '[case3] no private key, no lead keys',
    input: { scripts: {} },
    output: { private: true, scripts: {} },
  },
  {
    description: '[case4.1] private as the string "false"',
    input: { name: 'svc-x', private: 'false', version: '1.0.0' },
    output: { name: 'svc-x', private: true, version: '1.0.0' },
  },
  {
    description: '[case4.2] private as null',
    input: { name: 'svc-x', private: null },
    output: { name: 'svc-x', private: true },
  },
  {
    description: '[case4.3] private as 0',
    input: { name: 'svc-x', private: 0 },
    output: { name: 'svc-x', private: true },
  },
  {
    description: '[case5.1] private: true, explicit',
    input: { name: 'svc-x', private: true },
    output: null,
  },
  {
    description: '[case5.2] private: false, explicit',
    input: { name: 'pkg-x', private: false, version: '1.0.0' },
    output: null,
  },
];

describe('implicit-package-privacy', () => {
  TEST_CASES.forEach((thisCase) =>
    given(thisCase.description, () => {
      const contents = asJson(thisCase.input);

      if (!thisCase.output)
        then('the check does not detect it, and the fix leaves it as is', async () => {
          const error = await getError(async () => check(contents, checkContext));
          expect(error.message).toContain('declares private explicitly');
          expect(await runFix(contents)).toEqual(contents);
        });

      if (thisCase.output)
        when('the fix runs', () => {
          then('the check detects it', async () => {
            await expect(
              (async () => check(contents, checkContext))(),
            ).resolves.toBeUndefined();
          });

          then('private is backfilled to true, and no other key moves', async () => {
            const fixed = await runFix(contents);
            expect(fixed).toEqual(asJson(thisCase.output));
            expect(Object.keys(JSON.parse(fixed!))).toEqual(
              Object.keys(thisCase.output),
            );
          });

          then('the fix is a fixed point, and the check skips its output', async () => {
            const once = (await runFix(contents))!;
            expect(await runFix(once)).toEqual(once);
            const error = await getError(async () => check(once, checkContext));
            expect(error.message).toContain('declares private explicitly');
          });
        });
    }),
  );

  given('[case6] no package.json', () => {
    then('the check does not detect it', async () => {
      const error = await getError(async () => check(null, checkContext));
      expect(error.message).toContain('no package.json');
    });
  });
});
