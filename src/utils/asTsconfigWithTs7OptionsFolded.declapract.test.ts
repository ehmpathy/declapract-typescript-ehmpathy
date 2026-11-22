import { given, then } from 'test-fns';

import { asTsconfigWithTs7OptionsFolded } from './asTsconfigWithTs7OptionsFolded';

/**
 * .what = the fold's pure paths: a `baseUrl` of the tsconfig dir, or none, reads no disk
 * .note = a nested `baseUrl` reads its dir's entries off disk; those cases sit at integration grain,
 *         in `typescript-node/tsconfig-options-removed-in-ts7.fold.declapract.integration.test.ts`
 */
const ROOT = '/repo-with-no-nested-baseurl';

const TEST_CASES = [
  {
    description: 'a baseUrl of the tsconfig dir leaves, and each path value gains a ./ lead',
    given: { contents: '{ "compilerOptions": { "baseUrl": ".", "paths": { "@src/*": ["src/*"] } } }' },
    expect: '{ "compilerOptions": { "paths": { "@src/*": ["./src/*"] } } }',
  },
  {
    description: 'importsNotUsedAsValues remove leaves, with its comma',
    given: { contents: '{ "compilerOptions": { "importsNotUsedAsValues": "remove", "strict": true } }' },
    expect: '{ "compilerOptions": { "strict": true } }',
  },
  {
    description: 'importsNotUsedAsValues preserve stays, since its drop would change emit',
    given: { contents: '{ "compilerOptions": { "importsNotUsedAsValues": "preserve" } }' },
    expect: '{ "compilerOptions": { "importsNotUsedAsValues": "preserve" } }',
  },
  {
    description: 'a comment beside a removed option is kept',
    given: { contents: '{\n  "compilerOptions": {\n    "baseUrl": ".",\n    "strict": true // keep me\n  }\n}\n' },
    expect: '{\n  "compilerOptions": {\n    "strict": true // keep me\n  }\n}\n',
  },
  {
    description: 'a tsconfig with neither option comes back byte for byte',
    given: { contents: '{ "compilerOptions": { "strict": true } } // trail\n' },
    expect: '{ "compilerOptions": { "strict": true } } // trail\n',
  },
];

describe('asTsconfigWithTs7OptionsFolded', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('the fold returns the expected tsconfig, and a second fold is a no-op', () => {
        const once = asTsconfigWithTs7OptionsFolded({ contents: thisCase.given.contents, root: ROOT });
        expect(once).toEqual(thisCase.expect);
        expect(asTsconfigWithTs7OptionsFolded({ contents: once, root: ROOT })).toEqual(once);
      });
    }),
  );
});
