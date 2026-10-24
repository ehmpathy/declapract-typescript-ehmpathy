import { asPatchTarget, getAllStalePatchKeys } from './getAllStalePatchKeys';

/**
 * .what = unit test for the stale patch verdict (#680)
 * .why  = the verdict keys off the lockfile-resolved version; this proves each edge
 */
const LOCKFILE = [
  "lockfileVersion: '9.0'",
  '',
  'packages:',
  '',
  '  rhachet-roles-ehmpathy@1.40.0:',
  '    resolution: {integrity: sha512-a}',
  '',
  "  '@scope/pkg@2.0.0':",
  '    resolution: {integrity: sha512-b}',
  '',
  '  type-fns@1.21.3:',
  '    resolution: {integrity: sha512-c}',
  '',
  '  pg-pool@3.14.1:',
  '    resolution: {integrity: sha512-d}',
  '',
].join('\n');

const TEST_CASES = [
  {
    description: 'a pin the lockfile moved past is stale',
    given: { patchedDependencies: { 'rhachet-roles-ehmpathy@1.39.1': 'p' } },
    expect: { output: ['rhachet-roles-ehmpathy@1.39.1'] },
  },
  {
    description: 'a pin the lockfile still resolves is kept',
    given: { patchedDependencies: { 'type-fns@1.21.3': 'p' } },
    expect: { output: [] },
  },
  {
    description: 'a scoped pin is parsed past its lead @',
    given: {
      patchedDependencies: { '@scope/pkg@1.0.0': 'p', '@scope/pkg@2.0.0': 'p' },
    },
    expect: { output: ['@scope/pkg@1.0.0'] },
  },
  {
    description: 'a pin for a package the lockfile dropped is stale',
    given: { patchedDependencies: { 'gone@1.0.0': 'p' } },
    expect: { output: ['gone@1.0.0'] },
  },
  {
    description: 'a range key and a bare name key are never stale',
    given: { patchedDependencies: { 'type-fns@^1.0.0': 'p', 'gone': 'p' } },
    expect: { output: [] },
  },
  {
    description:
      'a hand pin beside the shipped bare-name key: the re-lock retires the hand pin, the bare key stays',
    given: {
      patchedDependencies: {
        'pg-pool@3.14.0': 'patches/pg-pool@3.14.0.patch',
        'pg-pool': 'patches/pg-pool.patch',
      },
    },
    expect: { output: ['pg-pool@3.14.0'] },
  },
];

describe('getAllStalePatchKeys', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        getAllStalePatchKeys({
          patchedDependencies: thisCase.given.patchedDependencies,
          lockfile: LOCKFILE,
        }),
      ).toEqual(thisCase.expect.output);
    }),
  );

  test('no lockfile gives no verdict', () => {
    expect(
      getAllStalePatchKeys({
        patchedDependencies: { 'rhachet-roles-ehmpathy@1.39.1': 'p' },
        lockfile: null,
      }),
    ).toEqual([]);
  });

  test('asPatchTarget splits a scoped key', () => {
    expect(asPatchTarget({ key: '@scope/pkg@1.0.0' })).toEqual({
      name: '@scope/pkg',
      version: '1.0.0',
    });
  });
});
