import path from 'node:path';

import type { FileCheckContext } from 'declapract';
import { given, then, useThen } from 'test-fns';

import { fix as fixRemovedOptions } from './bad-practices/tsconfig-options-removed-in-ts7/tsconfig.json.declapract';
// this test clamps the fix declarations, not a template, so it sits at the practice root, beside the unit test
import { fix } from './best-practice/tsconfig.json.declapract';

const DECLARED = `{
  "extends": ["@tsconfig/strictest/tsconfig.json", "@tsconfig/node20/tsconfig.json"],
  "compilerOptions": {
    "paths": { "@src/*": ["./src/*"] },
    "types": ["node", "jest"],
    "outDir": "dist",
  },
  "include": ["**/*.ts"],
  "exclude": ["dist",],
}
`;

// a repo whose ./src holds the dirs contract/ and logic/; the fold reads that dir, so this is integration grain
const REPO_BASEURL_NESTED = path.join(
  __dirname,
  '..',
  '..',
  '.test',
  'assets',
  'tsconfig-options-removed-in-ts7',
  'repo-baseurl-nested',
);
const context = {
  declaredFileContents: DECLARED,
  getProjectRootDirectory: () => REPO_BASEURL_NESTED,
} as FileCheckContext;

describe('typescript-node tsconfig.json fix, over a nested baseUrl dir', () => {
  given('[case1] a tsconfig with a nested baseUrl, fixed by both declarations in either order', () => {
    const found = `{ "compilerOptions": { "baseUrl": "./src", "paths": { "@src/*": ["*"] }, "importsNotUsedAsValues": "remove" } }`;

    // the best-practice fix alone, read once: it reads the nested baseUrl dir off disk
    const bestAlone = useThen('the best-practice fix runs', async () => fix(found, context));

    then('both orders land the same tsconfig, and no value is rebased twice', async () => {
      // declapract sorts bad-practice before best-practice; the clamp proves the result never leans on it
      const badFirst = (await fix((await fixRemovedOptions(found, context)).contents, context)).contents;
      const bestFirst = (await fixRemovedOptions(bestAlone.contents, context)).contents;
      expect(bestFirst).toEqual(badFirst);
      const tsconfig = JSON.parse(bestFirst!);
      expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
      expect(tsconfig.compilerOptions.importsNotUsedAsValues).toBeUndefined();
      expect(tsconfig.compilerOptions.paths).toEqual({
        'contract/*': ['./src/contract/*'],
        'logic/*': ['./src/logic/*'],
        '@src/*': ['./src/*'],
      });
    });

    then('the best-practice fix alone clears the removed options', () => {
      const tsconfig = JSON.parse(bestAlone.contents!);
      expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
      expect(tsconfig.compilerOptions.paths['@src/*']).toEqual(['./src/*']);
    });
  });
});
