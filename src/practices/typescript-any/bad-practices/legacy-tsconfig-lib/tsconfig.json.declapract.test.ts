import { given, then, when } from 'test-fns';

import { check, fix } from './tsconfig.json.declapract';

describe('typescript-any legacy-tsconfig-lib (#517)', () => {
  given('[case1] a single-line legacy lib override', () => {
    const before = `{
  "compilerOptions": {
    "lib": ["DOM"], // the browser types this repo needs
    "target": "es2020"
  }
}
`;

    then('the check flags it', () => {
      expect(() => check(before, {} as any)).not.toThrow();
    });

    when('[t0] the fix runs', () => {
      then('ES2023 is appended, DOM and the comment stay', async () => {
        const { contents: after } = await fix(before, {} as any);
        expect(after).toContain(
          '"lib": ["DOM", "ES2023"], // the browser types this repo needs',
        );
        expect(after).toMatchSnapshot('single-line — after');
      });

      then('the check passes on the fixed output, and a second pass is a no-op', async () => {
        const { contents: once } = await fix(before, {} as any);
        expect(() => check(once!, {} as any)).toThrow(
          'does not match bad practice',
        );
        // the fix only runs where the check flags; it never re-flags its own output
        expect(once).toEqual(
          before.replace('["DOM"]', '["DOM", "ES2023"]'),
        );
      });
    });
  });

  given('[case2] a multi-line lib override with a final comma', () => {
    const before = `{
  "compilerOptions": {
    "lib": [
      "DOM",
      "DOM.Iterable",
    ],
  },
}
`;

    then('ES2023 lands on its own line at the entry indent', async () => {
      const { contents: after } = await fix(before, {} as any);
      expect(after).toContain(`"DOM.Iterable",
      "ES2023",
    ]`);
      expect(() => check(after!, {} as any)).toThrow(
        'does not match bad practice',
      );
      expect(after).toMatchSnapshot('multi-line — after');
    });
  });

  given('[case3] an empty lib override', () => {
    then('ES2023 becomes its one entry', async () => {
      const { contents: after } = await fix(
        `{ "compilerOptions": { "lib": [] } }`,
        {} as any,
      );
      expect(after).toEqual(`{ "compilerOptions": { "lib": ["ES2023"] } }`);
    });
  });

  given('[case4] a tsconfig with no lib, or an es2022-capable lib', () => {
    then('the check skips each', () => {
      expect(() =>
        check(`{ "compilerOptions": { "target": "es2020" } }`, {} as any),
      ).toThrow('does not match bad practice');
      expect(() =>
        check(`{ "compilerOptions": { "lib": ["ES2022", "DOM"] } }`, {} as any),
      ).toThrow('does not match bad practice');
      expect(() =>
        check(`{ "compilerOptions": { "lib": ["esnext"] } }`, {} as any),
      ).toThrow('does not match bad practice');
    });
  });
});
