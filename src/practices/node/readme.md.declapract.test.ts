import { given, then, when } from 'test-fns';

import { fix } from './best-practice/readme.md.declapract';

const declaredFileContents = '# svc-surf\n';
const context = { declaredFileContents, relativeFilePath: 'readme.md' } as any;

const CASES = [
  {
    description: 'an absent readme',
    given: null,
    expect: { contents: '# svc-surf\n' },
  },
  {
    description: 'a readme with the title',
    given: '# svc-surf\n\nsurf lessons, booked.\n',
    expect: { contents: '# svc-surf\n\nsurf lessons, booked.\n' },
  },
  {
    description: 'a readme without the title',
    given: 'surf lessons, booked.\n',
    expect: { contents: '# svc-surf\n\nsurf lessons, booked.\n' },
  },
];

describe('node readme.md fix (#607)', () => {
  CASES.forEach((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] fix runs', () => {
        then('it writes the expected readme', async () => {
          const { contents } = await fix(thisCase.given, context);
          expect(contents).toEqual(thisCase.expect.contents);
        });

        then('the output holds the declared title, so the CONTAINS check passes', async () => {
          const { contents } = await fix(thisCase.given, context);
          expect(contents).toContain(declaredFileContents);
        });

        then('fix on its own output changes zero bytes', async () => {
          const once = (await fix(thisCase.given, context)).contents ?? null;
          const twice = (await fix(once, context)).contents;
          expect(twice).toEqual(once);
        });
      });
    }),
  );
});
