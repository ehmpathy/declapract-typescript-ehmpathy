import { given, then } from 'test-fns';

import { asJsoncView } from './asJsoncView';
import { getOneJsoncObjectSpan } from './getOneJsoncObjectSpan';

const TEST_CASES = [
  {
    description: 'a direct child object yields its body span',
    given: { contents: '{ "o": { "a": 1 } }', key: 'o' },
    expect: ' "a": 1 ',
  },
  {
    description: 'a child under another object is not direct, so none is found',
    given: { contents: '{ "n": { "o": { "a": 1 } } }', key: 'o' },
    expect: null,
  },
  {
    description: 'a key named only in a comment is not seen',
    given: { contents: '{ // "o": {\n "a": 1 }', key: 'o' },
    expect: null,
  },
];

describe('getOneJsoncObjectSpan', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('it returns the body of the object, or null', () => {
        const view = asJsoncView({ contents: thisCase.given.contents });
        const span = getOneJsoncObjectSpan({
          view,
          key: thisCase.given.key,
          within: { from: 1, until: view.shape.length },
        });
        expect(span === null ? null : view.text.slice(span.from, span.until)).toEqual(thisCase.expect);
      });
    }),
  );
});
