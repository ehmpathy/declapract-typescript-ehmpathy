import type { FileCheckContext } from 'declapract';
import { given, then, useThen } from 'test-fns';

import { fix as fixRemovedOptions } from './bad-practices/tsconfig-options-removed-in-ts7/tsconfig.json.declapract';
// this test clamps the fix declarations, not a template, so it sits at the practice root, beside the unit test
import { fix } from './best-practice/tsconfig.json.declapract';

const DECLARED = `{
  "extends": ["@tsconfig/strictest/tsconfig.json", "@tsconfig/node20/tsconfig.json"],
  "compilerOptions": {
    "paths": { "@/*": ["./*"] },
    "types": ["node", "jest"],
    "outDir": "dist",
  },
  "include": ["**/*.ts"],
  "exclude": ["dist",],
}
`;

// note: declapract's FileCheckContext carries members these fixes never read; only the two below are supplied
const context = {
  declaredFileContents: DECLARED,
  getProjectRootDirectory: () => __dirname,
} as FileCheckContext;

describe('typescript-node tsconfig.json fix, with the ts7 bad-practice fix', () => {
  given('[case1] a tsconfig with a nested baseUrl, fixed by both declarations in either order', () => {
    const found = `{ "compilerOptions": { "baseUrl": "./src", "paths": { "logic/*": ["logic/*"], "@vendor/*": ["../vendor/*"] }, "importsNotUsedAsValues": "preserve" } }`;

    // the best-practice fix alone, read once
    const bestAlone = useThen('the best-practice fix runs', async () => fix(found, context));

    then('both orders land the same tsconfig, with only the template alias', async () => {
      // declapract sorts bad-practice before best-practice; the clamp proves the result never leans on it
      const badFirst = (await fix((await fixRemovedOptions(found, context)).contents, context)).contents;
      const bestFirst = (await fixRemovedOptions(bestAlone.contents, context)).contents;
      expect(bestFirst).toEqual(badFirst);
      const tsconfig = JSON.parse(bestFirst!);
      expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
      expect(tsconfig.compilerOptions.importsNotUsedAsValues).toBeUndefined();
      expect(tsconfig.compilerOptions.paths).toEqual({ '@/*': ['./*'] });
    });

    then('the best-practice fix alone clears the removed options', () => {
      const tsconfig = JSON.parse(bestAlone.contents!);
      expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
      expect(tsconfig.compilerOptions.importsNotUsedAsValues).toBeUndefined();
      expect(tsconfig.compilerOptions.paths).toEqual({ '@/*': ['./*'] });
    });
  });
});
