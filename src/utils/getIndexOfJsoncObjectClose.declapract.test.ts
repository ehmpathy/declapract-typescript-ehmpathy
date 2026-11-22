import { given, then } from 'test-fns';

import { getIndexOfJsoncObjectClose } from './getIndexOfJsoncObjectClose';

const TEST_CASES = [
  {
    description: 'a flat object closes at its own brace',
    given: { shape: '{ "a": 1 }', from: 1 },
    expect: 9,
  },
  {
    description: 'a nested object is passed over, to the outer close',
    given: { shape: '{ "n": { "a": 1 }, "b": 2 }', from: 1 },
    expect: 26,
  },
  {
    description: 'the inner object closes at the inner brace',
    given: { shape: '{ "n": { "a": 1 }, "b": 2 }', from: 8 },
    expect: 16,
  },
  {
    description: 'an unclosed object runs to the end of the text',
    given: { shape: '{ "a": { "b": 1 }', from: 1 },
    expect: 17,
  },
];

describe('getIndexOfJsoncObjectClose', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('it returns the offset of the close', () => {
        expect(getIndexOfJsoncObjectClose(thisCase.given)).toEqual(thisCase.expect);
      });
    }),
  );
});
