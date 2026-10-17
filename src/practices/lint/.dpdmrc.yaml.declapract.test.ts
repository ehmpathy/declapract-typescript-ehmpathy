import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FileCheckContext } from 'declapract';
import { given, then, when } from 'test-fns';

import { check, fix } from './best-practice/.dpdmrc.yaml.declapract';

const declaredFileContents = readFileSync(
  join(__dirname, 'best-practice/.dpdmrc.yaml'),
  'utf8',
);
// .note = a documented cast (rule.forbid.as-cast): the declaration reads only these two fields
const context = {
  declaredFileContents,
  relativeFilePath: '.dpdmrc.yaml',
} as FileCheckContext;

const CASES = [
  {
    description: 'the shipped template',
    given: declaredFileContents,
    expect: { checkPasses: true },
  },
  {
    description: 'a cited devDep entry',
    given: 'exclude:\n  # cited cycle\n  - jest-circus\n',
    expect: { checkPasses: true },
  },
  {
    description: 'an entry of ^node_modules',
    given: 'exclude:\n  - jest-circus\n  - ^node_modules\n',
    expect: { checkPasses: false },
  },
  {
    description: "dpdm's own /node_modules/ default",
    given: 'exclude:\n  - /node_modules/\n',
    expect: { checkPasses: false },
  },
  {
    description: 'an alias entry that resolves to node_modules',
    given: 'paths:\n  - &deps node_modules\nexclude:\n  - jest-circus\n  - *deps\n',
    expect: { checkPasses: false },
  },
  {
    description: 'an exclude that is an alias to a list with a node_modules entry',
    given: 'shared: &list\n  - jest-circus\n  - node_modules\nexclude: *list\n',
    expect: { checkPasses: false },
  },
  {
    description: 'no exclude key',
    given: '# no keys\n',
    expect: { checkPasses: false },
  },
  {
    description: 'an exclude that is a string, not a list',
    given: 'exclude: jest\n',
    expect: { checkPasses: false },
  },
  {
    description: 'a root that is a list, not a map',
    given: '- jest\n',
    expect: { checkPasses: false },
  },
];

describe('lint .dpdmrc.yaml check + fix (#628)', () => {
  CASES.forEach((thisCase) =>
    given(`a .dpdmrc.yaml with ${thisCase.description}`, () => {
      when('[t0] check runs', () => {
        then(
          thisCase.expect.checkPasses ? 'check passes' : 'check throws',
          () => {
            if (thisCase.expect.checkPasses)
              return expect(() => check(thisCase.given, context)).not.toThrow();
            return expect(() => check(thisCase.given, context)).toThrow();
          },
        );
      });

      when('[t1] fix runs', () => {
        then('check passes on the fixed output', async () => {
          const { contents } = await fix(thisCase.given, context);
          expect(() => check(contents, context)).not.toThrow();
        });

        then('fix on its own output changes zero bytes', async () => {
          const once = (await fix(thisCase.given, context)).contents;
          const twice = (await fix(once, context)).contents;
          expect(twice).toEqual(once);
        });

        if (thisCase.expect.checkPasses)
          then('a policy-valid file is returned unchanged', async () => {
            const { contents } = await fix(thisCase.given, context);
            expect(contents).toEqual(thisCase.given);
          });
      });
    }),
  );

  given('an absent .dpdmrc.yaml', () => {
    then('fix writes the declared template', async () => {
      const { contents } = await fix(null, context);
      expect(contents).toEqual(declaredFileContents);
    });
  });

  given('a .dpdmrc.yaml with a node_modules entry among comments', () => {
    then('fix drops only that entry and keeps the comments', async () => {
      const { contents } = await fix(
        '# repo list\nexclude:\n  # cited\n  - jest-circus\n  - node_modules\n',
        context,
      );
      expect(contents).toMatchSnapshot();
      expect(contents).toContain('# cited');
      expect(contents).not.toContain('node_modules');
    });
  });
});
