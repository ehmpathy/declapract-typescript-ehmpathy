import type { FileCheckContext } from 'declapract';

import { check, fix } from './package.json.declapract';

// .what = a stand-in declapract context for the unit clamps below.
// .why  = `check`/`fix` here ignore the context entirely (they read only `contents`), so
//         the tests pass an empty one. the `as unknown as` is confined to this single
//         documented helper per rule.forbid.as-cast — removable the moment declapract
//         exports a first-class context test-factory.
const asContext = (): FileCheckContext => ({}) as unknown as FileCheckContext;

/**
 * .what = unit clamp for the inline-jest-config bad-practice (detect + drop).
 * .why  = proves the check DETECTS an inline `jest` key, SKIPS a package.json without one,
 *         the fix DROPS only the `jest` key (keeps every peer key intact), and a second
 *         pass is a fixed point (idempotent, per rule.require.idempotent-fixes).
 */
describe('tests-expo inline-jest-config package.json', () => {
  const withInlineJest = JSON.stringify(
    {
      name: 'app-protools-shaped',
      version: '1.0.0',
      scripts: { start: 'expo start' },
      jest: { preset: 'jest-expo', testEnvironment: 'jsdom' },
      devDependencies: { expo: '54.0.0' },
    },
    null,
    2,
  );

  const withoutInlineJest = JSON.stringify(
    {
      name: 'app-protools-shaped',
      version: '1.0.0',
      scripts: { start: 'expo start' },
      devDependencies: { expo: '54.0.0' },
    },
    null,
    2,
  );

  it('detects a package.json that carries an inline jest key', () => {
    expect(() => check(withInlineJest, asContext())).not.toThrow();
  });

  it('skips a package.json with no inline jest key', () => {
    expect(() => check(withoutInlineJest, asContext())).toThrow(
      'does not match bad practice',
    );
  });

  it('skips when the file is absent', () => {
    expect(() => check(null, asContext())).toThrow('does not match bad practice');
  });

  it('drops only the jest key, keeps every peer key intact', async () => {
    const { contents } = await fix(withInlineJest, asContext());
    const parsed = JSON.parse(contents!);

    expect(parsed.jest).toBeUndefined();
    expect(parsed.name).toEqual('app-protools-shaped');
    expect(parsed.version).toEqual('1.0.0');
    expect(parsed.scripts).toEqual({ start: 'expo start' });
    expect(parsed.devDependencies).toEqual({ expo: '54.0.0' });
  });

  it('reaches a fixed point — a second fix changes zero, and check then skips', async () => {
    const once = (await fix(withInlineJest, asContext())).contents;
    const twice = (await fix(once, asContext())).contents;
    expect(twice).toEqual(once);

    // after the fix the bad pattern is gone, so check throws-to-skip (no re-flag loop)
    expect(() => check(once, asContext())).toThrow('does not match bad practice');
  });
});
