import { given, then } from 'test-fns';

import { getOneJsoncDirectMatch } from './getOneJsoncDirectMatch';

const TEST_CASES = [
  {
    description: 'a match at the top of the body is direct',
    given: { shape: '{ "a": 1 }', pattern: /"a"/, within: { from: 1, until: 9 } },
    expect: { start: 2 },
  },
  {
    description: 'a match inside a nested object is skipped for the direct one after it',
    given: { shape: '{ "n": { "a": 1 }, "a": 2 }', pattern: /"a"/, within: { from: 1, until: 26 } },
    expect: { start: 19 },
  },
  {
    description: 'a match only inside a nested object finds none',
    given: { shape: '{ "n": { "a": 1 } }', pattern: /"a"/, within: { from: 1, until: 18 } },
    expect: null,
  },
  {
    description: 'a match outside the within span is not seen',
    given: { shape: '{ "a": 1 } "a"', pattern: /"a"/, within: { from: 10, until: 11 } },
    expect: null,
  },
];

describe('getOneJsoncDirectMatch', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('it returns the offset of the direct match, or null', () => {
        const found = getOneJsoncDirectMatch(thisCase.given);
        expect(found === null ? null : { start: found.start }).toEqual(thisCase.expect);
      });
    }),
  );
});
