import type { FileCheckContext } from 'declapract';
import { getError, given, then, useThen } from 'test-fns';

// this test clamps the fix declaration, not a template, so it sits at the practice root: inside
// best-practice/ the loader reads it as a template (only compile strips it), and a walk off src/
// emits it beside no declaration to import, so the emitted tree fails tsc with TS2307
import { fix } from './best-practice/tsconfig.json.declapract';

const DECLARED = `{
  "extends": ["@tsconfig/strictest/tsconfig.json", "@tsconfig/node20/tsconfig.json"],
  "compilerOptions": {
    "paths": { "@/*": ["./*"] },
    "types": ["node", "jest"], // typescript 6+ loads no @types by default
    "outDir": "dist",
  },
  "include": ["**/*.ts"],
  "exclude": ["dist",],
}
`;
// no case here holds a nested baseUrl, so the fold never reads the root; the disk cases sit in the .integration.test.ts
const context = {
  declaredFileContents: DECLARED,
  getProjectRootDirectory: () => '/repo-with-no-nested-baseurl',
} as FileCheckContext;

describe('typescript-node tsconfig.json fix', () => {
  given('[case1] an adopter tsconfig with its own types entry', () => {
    then('the template types lead, and the adopter entry stays after them', async () => {
      const { contents } = await fix(
        `{ "compilerOptions": { "types": ["vitest/globals", "jest"], "strict": true } }`,
        context,
      );
      expect(JSON.parse(contents!).compilerOptions.types).toEqual(['node', 'jest', 'vitest/globals']);
    });
  });

  given('[case2] an adopter tsconfig that extends include, exclude, an alias, and extends', () => {
    const found = `{
  "extends": ["@tsconfig/node18/tsconfig.json", "./tsconfig.shared.json"],
  "compilerOptions": { "paths": { "@/*": ["./*", "./generated/*"] }, "strict": true },
  "include": ["**/*.ts", "scripts/**/*.mts"],
  "exclude": ["dist", "tmp", "fixtures"]
}`;
    const fixed = useThen('the fix runs', async () => fix(found, context));

    then('include, exclude, and each alias target union, the declared entries first', () => {
      const tsconfig = JSON.parse(fixed.contents!);
      expect(tsconfig.include).toEqual(['**/*.ts', 'scripts/**/*.mts']);
      expect(tsconfig.exclude).toEqual(['dist', 'tmp', 'fixtures']);
      expect(tsconfig.compilerOptions.paths).toEqual({ '@/*': ['./*', './generated/*'] });
      expect(tsconfig.compilerOptions.strict).toEqual(true);
    });

    then('extends is swapped whole, so no prior base overrides the template', () => {
      const tsconfig = JSON.parse(fixed.contents!);
      expect(tsconfig.extends).toEqual([
        '@tsconfig/strictest/tsconfig.json',
        '@tsconfig/node20/tsconfig.json',
      ]);
    });
  });

  given('[case3] no tsconfig yet', () => {
    const fixed = useThen('the fix writes the file', async () => fix(null, context));

    then('the template lands verbatim, its comments kept, as the default contains-fix writes it', () => {
      expect(fixed.contents).toEqual(DECLARED);
    });

    then('a second fix leaves the template as written, comments kept', async () => {
      const { contents: twice } = await fix(fixed.contents!, context);
      expect(twice).toEqual(DECLARED);
    });
  });

  given('[case4] the fix output, fixed again', () => {
    then('the second fix is a no-op', async () => {
      const { contents: once } = await fix(
        `{ "compilerOptions": { "types": ["vitest/globals"] }, "exclude": ["tmp"] }`,
        context,
      );
      const { contents: twice } = await fix(once!, context);
      expect(twice).toEqual(once);
    });
  });

  given('[case5] a fix context with no declared template', () => {
    then('the fix fails loud, never a silent no-op', async () => {
      const error = await getError(async () =>
        fix(`{ "compilerOptions": {} }`, {} as FileCheckContext),
      );
      expect(error.message).toContain('no declared template');
    });
  });
});
