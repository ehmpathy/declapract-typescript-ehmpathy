import { asTsconfigWithSrcAliasRemoved } from './asTsconfigWithSrcAliasRemoved';
import { isTsconfigWithSrcAliasKept } from './isTsconfigWithSrcAliasKept';

const TEST_CASES = [
  {
    description: 'drops @src/* beside the template @/*',
    given: {
      contents: '{ "compilerOptions": { "paths": { "@/*": ["./*"], "@src/*": ["./src/*"] }, "outDir": "dist" } }',
    },
    expect: { kept: true, compilerOptions: { paths: { '@/*': ['./*'] }, outDir: 'dist' } },
  },
  {
    description: 'keeps every other alias the adopter declared',
    given: {
      contents: '{ "compilerOptions": { "paths": { "@src/*": ["./src/*"], "@vendor/*": ["./vendor/*"] } } }',
    },
    expect: { kept: true, compilerOptions: { paths: { '@vendor/*': ['./vendor/*'] } } },
  },
  {
    description: 'reads past comments and a trailed comma',
    given: {
      contents: '{\n  // the alias\n  "compilerOptions": {\n    "paths": { "@src/*": ["./src/*"], }, // retired\n  },\n}',
    },
    expect: { kept: true, compilerOptions: { paths: {} } },
  },
];

describe('asTsconfigWithSrcAliasRemoved', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isTsconfigWithSrcAliasKept({ contents: thisCase.given.contents })).toEqual(
        thisCase.expect.kept,
      );
      const once = asTsconfigWithSrcAliasRemoved({ contents: thisCase.given.contents });
      expect(JSON.parse(once).compilerOptions).toEqual(thisCase.expect.compilerOptions);
      expect(isTsconfigWithSrcAliasKept({ contents: once })).toEqual(false);
      expect(asTsconfigWithSrcAliasRemoved({ contents: once })).toEqual(once);
    }),
  );

  test('leaves a tsconfig with no @src/* key byte for byte, comments and all', () => {
    const contents = '{\n  "compilerOptions": { "paths": { "@/*": ["./*"] } } // kept as written\n}\n';
    expect(isTsconfigWithSrcAliasKept({ contents })).toEqual(false);
    expect(asTsconfigWithSrcAliasRemoved({ contents })).toEqual(contents);
  });
});
