import { getOneContentionSetFromLockfile } from './getOneContentionSetFromLockfile';

/**
 * .what = unit test for the lockfile contention set (#610)
 * .why  = the hoist flip notice lists exactly the packages with two or more versions;
 *         this proves the parse across lockfile v9, v6, and v5 key shapes
 */
const TEST_CASES = [
  {
    description: 'v9: lists each package with two or more versions, sorted',
    given: {
      lockfile: [
        "lockfileVersion: '9.0'",
        '',
        'importers:',
        '  .:',
        '    dependencies: {}',
        '',
        'packages:',
        '',
        "  '@commitlint/cli@17.8.1':",
        '    resolution: {integrity: sha512-a}',
        '',
        "  '@commitlint/cli@19.5.0':",
        '    resolution: {integrity: sha512-b}',
        '',
        '  type-fns@1.21.3:',
        '    resolution: {integrity: sha512-c}',
        '',
        '  type-fns@0.8.1:',
        '    resolution: {integrity: sha512-d}',
        '',
        '  yaml@2.8.2:',
        '    resolution: {integrity: sha512-e}',
        '',
        'snapshots:',
        '',
        '  yaml@1.0.0: {}',
        '',
      ].join('\n'),
    },
    expect: {
      output: [
        { name: '@commitlint/cli', versions: ['17.8.1', '19.5.0'] },
        { name: 'type-fns', versions: ['0.8.1', '1.21.3'] },
      ],
    },
  },
  {
    description: 'v6: strips the lead slash and the peer suffix',
    given: {
      lockfile: [
        "lockfileVersion: '6.0'",
        'packages:',
        '  /react-dom@18.2.0(react@18.2.0):',
        '    dev: false',
        '  /react-dom@18.3.1(react@18.3.1):',
        '    dev: false',
        '  /react@18.2.0:',
        '    dev: false',
      ].join('\n'),
    },
    expect: {
      output: [{ name: 'react-dom', versions: ['18.2.0', '18.3.1'] }],
    },
  },
  {
    description: 'v5: splits name/version and strips the peer suffix',
    given: {
      lockfile: [
        'lockfileVersion: 5.4',
        'packages:',
        '  /@types/node/18.0.0:',
        '    dev: true',
        '  /@types/node/20.1.0:',
        '    dev: true',
        '  /jest/29.0.0_ts-node@10.9.1:',
        '    dev: true',
      ].join('\n'),
    },
    expect: {
      output: [{ name: '@types/node', versions: ['18.0.0', '20.1.0'] }],
    },
  },
  {
    description: 'no contention: returns an empty set',
    given: {
      lockfile: ['packages:', '  a@1.0.0:', '    x: y', '  b@2.0.0:', '    x: y'].join(
        '\n',
      ),
    },
    expect: { output: [] },
  },
  {
    description: 'no packages section: returns an empty set',
    given: { lockfile: "lockfileVersion: '9.0'\n" },
    expect: { output: [] },
  },
];

describe('getOneContentionSetFromLockfile', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(getOneContentionSetFromLockfile(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
