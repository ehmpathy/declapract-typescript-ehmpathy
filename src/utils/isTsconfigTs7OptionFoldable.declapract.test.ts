import { given, then } from 'test-fns';

import { asJsoncView } from './asJsoncView';
import { isTsconfigImportsOptionDroppable } from './isTsconfigImportsOptionDroppable';
import { isTsconfigTs7OptionFoldable } from './isTsconfigTs7OptionFoldable';

const TEST_CASES = [
  {
    description: 'a baseUrl is foldable',
    given: { contents: '{ "compilerOptions": { "baseUrl": "." } }' },
    expect: { foldable: true, droppable: false },
  },
  {
    description: 'importsNotUsedAsValues remove is foldable and droppable',
    given: { contents: '{ "compilerOptions": { "importsNotUsedAsValues": "remove" } }' },
    expect: { foldable: true, droppable: true },
  },
  {
    description: 'importsNotUsedAsValues preserve changes emit, so it is neither',
    given: { contents: '{ "compilerOptions": { "importsNotUsedAsValues": "preserve" } }' },
    expect: { foldable: false, droppable: false },
  },
  {
    description: 'a removed option named only in a comment is neither',
    given: { contents: '{ "compilerOptions": { // "baseUrl": "."\n } }' },
    expect: { foldable: false, droppable: false },
  },
  {
    description: 'a conformant tsconfig is neither',
    given: { contents: '{ "compilerOptions": { "strict": true } }' },
    expect: { foldable: false, droppable: false },
  },
];

describe('isTsconfigTs7OptionFoldable · isTsconfigImportsOptionDroppable', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('each predicate reads it as expected', () => {
        expect({
          foldable: isTsconfigTs7OptionFoldable({ contents: thisCase.given.contents }),
          droppable: isTsconfigImportsOptionDroppable({ view: asJsoncView({ contents: thisCase.given.contents }) }),
        }).toEqual(thisCase.expect);
      });
    }),
  );
});
