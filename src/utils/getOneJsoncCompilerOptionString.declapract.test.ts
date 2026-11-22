import { given, then } from 'test-fns';

import { asJsoncView } from './asJsoncView';
import { getOneJsoncCompilerOptionString } from './getOneJsoncCompilerOptionString';

const TEST_CASES = [
  {
    description: 'a direct string option yields its entry and value',
    given: { contents: '{ "compilerOptions": { "baseUrl": "./src" } }', key: 'baseUrl' },
    expect: { entry: '"baseUrl": "./src"', value: './src' },
  },
  {
    description: 'an escaped quote stays inside the value',
    given: { contents: '{ "compilerOptions": { "baseUrl": "a\\"b" } }', key: 'baseUrl' },
    expect: { entry: '"baseUrl": "a\\"b"', value: 'a\\"b' },
  },
  {
    description: 'a key named only in a comment is absent',
    given: { contents: '{ "compilerOptions": { /* "baseUrl": "." */ } }', key: 'baseUrl' },
    expect: null,
  },
  {
    description: 'a key under ts-node is no tsc option, so it is absent',
    given: { contents: '{ "ts-node": { "compilerOptions": { "baseUrl": "." } }, "compilerOptions": {} }', key: 'baseUrl' },
    expect: null,
  },
  {
    description: 'a key whose value is not a string is not read',
    given: { contents: '{ "compilerOptions": { "baseUrl": null } }', key: 'baseUrl' },
    expect: null,
  },
];

describe('getOneJsoncCompilerOptionString', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('it returns the entry span and its value, or null', () => {
        const view = asJsoncView({ contents: thisCase.given.contents });
        const found = getOneJsoncCompilerOptionString({ view, key: thisCase.given.key });
        expect(
          found === null ? null : { entry: view.text.slice(found.start, found.end), value: found.value },
        ).toEqual(thisCase.expect);
      });
    }),
  );
});
