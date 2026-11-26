import { asTsconfigWithTs7OptionsRemoved } from './asTsconfigWithTs7OptionsRemoved';
import { isTsconfigWithTs7OptionsKept } from './isTsconfigWithTs7OptionsKept';

const TEST_CASES = [
  {
    description: 'removes baseUrl with the paths it anchored',
    given: {
      contents:
        '{ "compilerOptions": { "baseUrl": ".", "paths": { "@src/*": ["src/*"] }, "outDir": "dist" } }',
    },
    expect: { kept: true, compilerOptions: { outDir: 'dist' } },
  },
  {
    description: 'removes importsNotUsedAsValues at "remove"',
    given: {
      contents: '{ "compilerOptions": { "importsNotUsedAsValues": "remove", "outDir": "dist" } }',
    },
    expect: { kept: true, compilerOptions: { outDir: 'dist' } },
  },
  {
    description: 'removes importsNotUsedAsValues at "preserve", as at any value',
    given: {
      contents: '{ "compilerOptions": { "importsNotUsedAsValues": "preserve" } }',
    },
    expect: { kept: true, compilerOptions: {} },
  },
  {
    description: 'keeps paths when no baseUrl anchored them',
    given: {
      contents:
        '{ "compilerOptions": { "importsNotUsedAsValues": "error", "paths": { "@src/*": ["./src/*"] } } }',
    },
    expect: { kept: true, compilerOptions: { paths: { '@src/*': ['./src/*'] } } },
  },
  {
    description: 'reads past comments and a trailed comma',
    given: {
      contents: '{\n  // a note\n  "compilerOptions": {\n    "baseUrl": "./src", // bare imports\n    "outDir": "dist",\n  },\n}',
    },
    expect: { kept: true, compilerOptions: { outDir: 'dist' } },
  },
];

describe('asTsconfigWithTs7OptionsRemoved', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isTsconfigWithTs7OptionsKept({ contents: thisCase.given.contents })).toEqual(
        thisCase.expect.kept,
      );
      const once = asTsconfigWithTs7OptionsRemoved({ contents: thisCase.given.contents });
      expect(JSON.parse(once).compilerOptions).toEqual(thisCase.expect.compilerOptions);
      expect(isTsconfigWithTs7OptionsKept({ contents: once })).toEqual(false);
      expect(asTsconfigWithTs7OptionsRemoved({ contents: once })).toEqual(once);
    }),
  );

  test('leaves a tsconfig with neither option byte for byte, comments and all', () => {
    const contents = '{\n  "compilerOptions": { "outDir": "dist" } // kept as written\n}\n';
    expect(isTsconfigWithTs7OptionsKept({ contents })).toEqual(false);
    expect(asTsconfigWithTs7OptionsRemoved({ contents })).toEqual(contents);
  });
});
