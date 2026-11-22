import { given, then } from 'test-fns';

import { asJsoncView } from './asJsoncView';
import { getJsoncCompilerOptionsSpan } from './getJsoncCompilerOptionsSpan';

const TEST_CASES = [
  {
    description: 'the top-level compilerOptions yields its body',
    given: { contents: '{ "compilerOptions": { "strict": true } }' },
    expect: ' "strict": true ',
  },
  {
    description: 'a compilerOptions under ts-node is skipped for the top-level one',
    given: {
      contents: '{ "ts-node": { "compilerOptions": { "module": "x" } }, "compilerOptions": { "strict": true } }',
    },
    expect: ' "strict": true ',
  },
  {
    description: 'a tsconfig with only a ts-node compilerOptions declares none tsc reads',
    given: { contents: '{ "ts-node": { "compilerOptions": { "module": "x" } } }' },
    expect: null,
  },
  {
    description: 'a text with no object declares none',
    given: { contents: '' },
    expect: null,
  },
];

describe('getJsoncCompilerOptionsSpan', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('it returns the body of the top-level compilerOptions, or null', () => {
        const view = asJsoncView({ contents: thisCase.given.contents });
        const span = getJsoncCompilerOptionsSpan({ view });
        expect(span === null ? null : view.text.slice(span.from, span.until)).toEqual(thisCase.expect);
      });
    }),
  );
});
