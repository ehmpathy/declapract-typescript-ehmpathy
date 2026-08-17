import { given, then, when } from 'test-fns';

import { check, fix } from './check.lockfile.sh.declapract';

// this check/fix reads only `contents`, never the context arg; `{}` is an empty
// placeholder for the unused second arg. the cast is the sanctioned test-context idiom
// (howto.add-bad-practice.md); removal path: drop it if declapract exports a context stub.
const ctx = {} as any;

const npmHook = `#!/bin/bash

changed () {
  git diff --name-only HEAD@{1} HEAD | grep "^$1"
}

if changed 'package-lock.json'; then
  echo "📦 package-lock.json changed. Run 'npm install' to update your locally installed dependencies."
fi
`;

describe('pnpm husky-lockfile-check bad-practice', () => {
  given('[case1] a husky hook that watches package-lock.json', () => {
    when('[t0] checked', () => {
      then('it is detected (check returns)', () => {
        expect(() => check(npmHook, ctx)).not.toThrow();
      });
    });

    when('[t1] fixed', () => {
      then('the lockfile name + install command become pnpm', async () => {
        const { contents: fixed } = await fix(npmHook, ctx);
        expect(fixed).toContain('pnpm-lock.yaml');
        expect(fixed).toContain('pnpm install');
        expect(fixed).not.toContain('package-lock.json');
        expect(fixed).not.toMatch(/(?<!p)npm install/); // no BARE npm install (pnpm install is fine)
      });
    });
  });

  given('[case2] a hook already on pnpm-lock.yaml', () => {
    const pnpmHook = npmHook
      .replace(/package-lock\.json/g, 'pnpm-lock.yaml')
      .replace(/npm install/g, 'pnpm install');

    when('[t0] checked', () => {
      then('it is NOT detected (check throws)', () => {
        expect(() => check(pnpmHook, ctx)).toThrow('does not match bad practice');
      });
    });
  });

  given('[case3] idempotency — the fixed output is a fixed point', () => {
    when('[t0] fix is applied twice', () => {
      then('the second pass equals the first', async () => {
        const once = (await fix(npmHook, ctx)).contents!;
        const twice = (await fix(once, ctx)).contents!;
        expect(twice).toEqual(once);
      });

      then('and check throws on the fixed output', async () => {
        const once = (await fix(npmHook, ctx)).contents!;
        expect(() => check(once, ctx)).toThrow('does not match bad practice');
      });
    });
  });
});
