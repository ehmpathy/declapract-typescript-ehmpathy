import fs from 'node:fs/promises';
import path from 'node:path';

import type { FileCheckContext } from 'declapract';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { check, fix } from './bad-practices/tsconfig-options-removed-in-ts7/tsconfig.json.declapract';

const NOT_DETECTED = 'does not match bad practice';

/**
 * .what = a fix context rooted at a project dir.
 * .why  = the fix lists a nested `baseUrl` dir to name one lookup key per entry, so each case roots
 *         the context at a real dir; the check reads only the contents.
 */
const asContextAt = (input: { root: string }) =>
  ({ getProjectRootDirectory: () => input.root }) as FileCheckContext;

// a repo whose ./src holds the dirs contract/ and logic/
const context = asContextAt({
  root: path.join(process.cwd(), 'src/.test/assets/tsconfig-options-removed-in-ts7/repo-baseurl-nested'),
});

describe('typescript-node tsconfig-options-removed-in-ts7', () => {
  given('[case1] the prior typescript-node template: baseUrl ".", bare paths, importsNotUsedAsValues', () => {
    const before = `{
  "extends": ["@tsconfig/strictest/tsconfig.json", "@tsconfig/node20/tsconfig.json"],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["*"],
      "@src/*": ["src/*"]
    },
    "importsNotUsedAsValues": "remove",
    "noUnusedLocals": false, // a linter warns on this, not the compiler
    "outDir": "dist"
  }
}
`;

    then('the check flags it', () => {
      expect(() => check(before, context)).not.toThrow();
    });

    when('[t0] the fix runs', () => {
      const fixed = useThen('the fix returns', async () => fix(before, context));

      then('baseUrl and importsNotUsedAsValues leave, paths gain a ./ lead, this fix keeps comments', () => {
        const after = fixed.contents;
        expect(after).not.toContain('baseUrl');
        expect(after).not.toContain('importsNotUsedAsValues');
        expect(after).toContain('"@/*": ["./*"]');
        expect(after).toContain('"@src/*": ["./src/*"]');
        expect(after).toContain('"noUnusedLocals": false, // a linter warns on this, not the compiler');
        expect(after).toMatchSnapshot('template — after');
      });

      then('the check passes on the fixed output, and a second fix is a no-op', async () => {
        const once = fixed.contents;
        expect(() => check(once!, context)).toThrow(NOT_DETECTED);
        const { contents: twice } = await fix(once!, context);
        expect(twice).toEqual(once);
      });
    });
  });

  given('[case2] a nested baseUrl with its own paths', () => {
    then('each paths value is rebased onto the tsconfig dir, and each dir of ./src gains a lookup key', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "baseUrl": "./src", "paths": { "~/*": ["*", "../vendor/*"] }, "strict": true } }`,
        context,
      );
      expect(after).toEqual(
        `{ "compilerOptions": { "paths": { "contract/*": ["./src/contract/*"], "logic/*": ["./src/logic/*"], "~/*": ["./src/*", "./vendor/*"] }, "strict": true } }`,
      );
    });

    then('a lookup key the repo already declares keeps its own targets, never doubled', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "baseUrl": "./src", "paths": { "logic/*": ["logic/*", "shared/*"] } } }`,
        context,
      );
      expect(after).toEqual(
        `{ "compilerOptions": { "paths": { "contract/*": ["./src/contract/*"], "logic/*": ["./src/logic/*", "./src/shared/*"] } } }`,
      );
    });

    then('a "*" catch-all the repo already declares is rebased, and no lookup key is added', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "baseUrl": "./src", "paths": { "*": ["*", "types/*"] } } }`,
        context,
      );
      expect(after).toEqual(
        `{ "compilerOptions": { "paths": { "*": ["./src/*", "./src/types/*"] } } }`,
      );
    });
  });

  given('[case3] a baseUrl with no paths', () => {
    then('baseUrl becomes a paths block with one lookup key per dir of ./src', async () => {
      const { contents: after } = await fix(
        `{
  "compilerOptions": {
    "baseUrl": "./src", // bare imports look up here first
    "strict": true
  }
}
`,
        context,
      );
      expect(after).toContain(
        '"paths": { "contract/*": ["./src/contract/*"], "logic/*": ["./src/logic/*"] }, // bare imports look up here first',
      );
      expect(() => check(after!, context)).toThrow(NOT_DETECTED);
    });
  });

  given('[case4] the removed options as the last entries of compilerOptions', () => {
    then('the comma before the last removed entry leaves too, and a root baseUrl owes no paths', async () => {
      const { contents: after } = await fix(
        `{
  "compilerOptions": {
    "strict": true,
    "importsNotUsedAsValues": "remove",
    "baseUrl": "."
  }
}
`,
        context,
      );
      expect(after).toEqual(`{
  "compilerOptions": {
    "strict": true
  }
}
`);
    });

    then('a comment that trails the prior entry stays, when the last entry leaves', async () => {
      const { contents: after } = await fix(
        `{
  "compilerOptions": {
    "strict": true, // keep me
    "importsNotUsedAsValues": "remove"
  }
}
`,
        context,
      );
      expect(after).toEqual(`{
  "compilerOptions": {
    "strict": true // keep me
  }
}
`);
    });

    then('an inline last entry gives up the comma before it', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "strict": true, "importsNotUsedAsValues": "remove" } }`,
        context,
      );
      expect(after).toEqual(`{ "compilerOptions": { "strict": true } }`);
    });
  });

  given('[case5] a tsconfig with no removed option, or one only in a comment', () => {
    then('the check skips each', () => {
      expect(() =>
        check(`{ "compilerOptions": { "paths": { "@src/*": ["./src/*"] } } }`, context),
      ).toThrow(NOT_DETECTED);
      expect(() =>
        check(
          `{
  "compilerOptions": {
    // "baseUrl": ".", retired for typescript 7
    /* "importsNotUsedAsValues": "remove" */
    "strict": true
  }
}
`,
          context,
        ),
      ).toThrow(NOT_DETECTED);
    });

    then('the fix leaves a commented-out key in place', async () => {
      const before = `{
  "compilerOptions": {
    // "baseUrl": ".",
    "baseUrl": ".",
    "paths": { "@src/*": ["src/*"] }
  }
}
`;
      const { contents: after } = await fix(before, context);
      expect(after).toEqual(`{
  "compilerOptions": {
    // "baseUrl": ".",
    "paths": { "@src/*": ["./src/*"] }
  }
}
`);
    });
  });

  given('[case6] a paths value that is already absolute', () => {
    then('it is kept as written, since baseUrl never applied to it', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "baseUrl": "./src", "paths": { "~/*": ["*", "/opt/shared/*"] } } }`,
        context,
      );
      expect(after).toEqual(
        `{ "compilerOptions": { "paths": { "contract/*": ["./src/contract/*"], "logic/*": ["./src/logic/*"], "~/*": ["./src/*", "/opt/shared/*"] } } }`,
      );
    });
  });

  given('[case7] comments that hold emoji, before and between the edited entries', () => {
    const before = `{
  // 🐢 a header comment, emoji 🌊 and all
  "compilerOptions": {
    "baseUrl": ".", // 🌴 root lookups
    "paths": { "@src/*": ["src/*"] }, /* 🐚 aliases */
    "importsNotUsedAsValues": "remove"
  }
}
`;

    then('every splice lands on its own entry, and each emoji comment stays whole', async () => {
      const { contents: after } = await fix(before, context);
      expect(after).toEqual(`{
  // 🐢 a header comment, emoji 🌊 and all
  "compilerOptions": {
    "paths": { "@src/*": ["./src/*"] } /* 🐚 aliases */
  }
}
`);
      expect(() => check(after!, context)).toThrow(NOT_DETECTED);
    });
  });

  given('[case8] a paths value that holds brackets or braces', () => {
    then('the whole array is rebased, past the bracket inside the string', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "baseUrl": ".", "paths": { "@app/*": ["app/[id]/*", "app/{x}/*"], "@src/*": ["src/*"] } } }`,
        context,
      );
      expect(after).toEqual(
        `{ "compilerOptions": { "paths": { "@app/*": ["./app/[id]/*", "./app/{x}/*"], "@src/*": ["./src/*"] } } }`,
      );
    });
  });

  given('[case9] a nested baseUrl dir with module files beside dirs and files no import names', () => {
    const tempDir = genTempDir({ slug: 'declapract-ts7-baseurl-entries' });
    useBeforeAll(async () => {
      for (const dir of ['utils', '.cache', 'node_modules', '__snapshots__'])
        await fs.mkdir(path.join(tempDir, 'lib', dir), { recursive: true });
      for (const file of [
        'config.ts',
        'env.js',
        'globals.d.ts',
        'readme.md',
        'index.ts',
        'config.test.ts',
        'env.spec.js',
      ])
        await fs.writeFile(path.join(tempDir, 'lib', file), '');
      return { tempDir };
    });

    then('each dir and module file gains a key, sorted; the rest are skipped', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "baseUrl": "lib" } }`,
        asContextAt({ root: tempDir }),
      );
      expect(after).toEqual(
        `{ "compilerOptions": { "paths": { "config": ["./lib/config"], "env": ["./lib/env"], "globals": ["./lib/globals"], "utils/*": ["./lib/utils/*"] } } }`,
      );
    });

    then('a baseUrl dir that is absent owes no key, so baseUrl just leaves', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "baseUrl": "./absent", "strict": true } }`,
        asContextAt({ root: tempDir }),
      );
      expect(after).toEqual(`{ "compilerOptions": { "strict": true } }`);
    });
  });

  given('[case10] a baseUrl outside compilerOptions, which tsc never reads', () => {
    const before = `{
  "ts-node": { "compilerOptions": { "baseUrl": "." } },
  "compilerOptions": { "strict": true }
}
`;

    then('the check skips it, so the check and the fix agree', () => {
      expect(() => check(before, context)).toThrow(NOT_DETECTED);
    });
  });

  given('[case11] an importsNotUsedAsValues that asks for more than the default', () => {
    then('"preserve" alone is not flagged here; the manual practice owns it', () => {
      expect(() =>
        check(`{ "compilerOptions": { "importsNotUsedAsValues": "preserve" } }`, context),
      ).toThrow(NOT_DETECTED);
    });

    then('beside a baseUrl, the fix folds baseUrl and keeps "error" as written', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "baseUrl": ".", "paths": { "@src/*": ["src/*"] }, "importsNotUsedAsValues": "error" } }`,
        context,
      );
      expect(after).toEqual(
        `{ "compilerOptions": { "paths": { "@src/*": ["./src/*"] }, "importsNotUsedAsValues": "error" } }`,
      );
      expect(() => check(after!, context)).toThrow(NOT_DETECTED);
    });
  });

  given('[case12] a baseUrl that leads with ${configDir}', () => {
    then('a root ${configDir} owes no lookup key, and each paths value keeps its ${configDir} lead', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "baseUrl": "\${configDir}", "paths": { "@src/*": ["src/*"] } } }`,
        context,
      );
      expect(after).toEqual(
        `{ "compilerOptions": { "paths": { "@src/*": ["\${configDir}/src/*"] } } }`,
      );
    });

    then('a nested ${configDir}/src lists the tsconfig dir\'s ./src for its lookup keys', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "baseUrl": "\${configDir}/src", "strict": true } }`,
        context,
      );
      expect(after).toEqual(
        `{ "compilerOptions": { "paths": { "contract/*": ["\${configDir}/src/contract/*"], "logic/*": ["\${configDir}/src/logic/*"] }, "strict": true } }`,
      );
    });
  });
});
