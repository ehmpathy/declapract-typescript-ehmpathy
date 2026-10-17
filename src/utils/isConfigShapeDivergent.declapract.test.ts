import { isConfigShapeDivergent } from './isConfigShapeDivergent';

const TEST_CASES = [
  {
    description: 'same keys, different values: not divergent',
    given: {
      expected: { db: { host: 'localhost', port: 7821 } },
      found: { db: { host: 'tunnel.prep', port: 15432 } },
    },
    expect: { output: false },
  },
  {
    description: 'a key absent from the found config: divergent',
    given: {
      expected: { db: { host: 'localhost', port: 7821 } },
      found: { db: { host: 'tunnel.prep' } },
    },
    expect: { output: true },
  },
  {
    description: 'an extra key in the found config: divergent',
    given: {
      expected: { db: { host: 'localhost' } },
      found: { db: { host: 'tunnel.prep', port: 15432 } },
    },
    expect: { output: true },
  },
  {
    description:
      'a null leaf in expected beside a subtree in found (the rds tunnel.lambda): not divergent',
    given: {
      expected: { tunnel: { lambda: null } },
      found: { tunnel: { lambda: { host: 'cluster.prep', port: 5432 } } },
    },
    expect: { output: false },
  },
  {
    description: 'a subtree in expected beside a null leaf in found: not divergent',
    given: {
      expected: { tunnel: { lambda: { host: 'cluster.prep', port: 5432 } } },
      found: { tunnel: { lambda: null } },
    },
    expect: { output: false },
  },
  {
    description: 'a null leaf absent from the found config: divergent',
    given: {
      expected: { tunnel: { lambda: null, local: { port: 7821 } } },
      found: { tunnel: { local: { port: 15432 } } },
    },
    expect: { output: true },
  },
  {
    description: 'a string leaf in expected beside a subtree in found: divergent',
    given: {
      expected: { tunnel: { bastion: 'vpc-main-bastion' } },
      found: { tunnel: { bastion: { exid: 'vpc-main-bastion' } } },
    },
    expect: { output: true },
  },
];

describe('isConfigShapeDivergent', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const output = isConfigShapeDivergent(thisCase.given);
      expect(output).toEqual(thisCase.expect.output);
    }),
  );
});
