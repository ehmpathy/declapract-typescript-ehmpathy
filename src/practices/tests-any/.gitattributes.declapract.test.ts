import { stripVTControlCharacters } from 'node:util';

import { getError } from 'test-fns';

import { check, fix } from './best-practice/.gitattributes.declapract';

const context = {} as Parameters<typeof fix>[1]; // .note = the fix reads no context

const SECTION = `# [tests-any] collapse test source in pr diffs; snapshots stay open
*.test.ts linguist-generated
*.test.tsx linguist-generated
`;

const BLOCK_GIT = `# [git] exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
`;

const BLOCK_RHACHET = `# [rhachet] collapse route robocode in pr diffs; yields and radio stay open
.route/** linguist-generated
`;

const TEST_CASES: { description: string; given: string | null; expect: string }[] = [
  {
    description: 'emits its section when no file exists',
    given: null,
    expect: SECTION,
  },
  {
    description: 'lands after the git block and before the rhachet block',
    given: `${BLOCK_RHACHET}\n${BLOCK_GIT}`,
    expect: `${BLOCK_GIT}\n${SECTION}\n${BLOCK_RHACHET}`,
  },
  {
    description: 'keeps a repo-own line, last',
    given: '*.png binary\n',
    expect: `${SECTION}\n*.png binary\n`,
  },
  {
    description: 'lifts a hand-copied entry out of a repo-own block',
    given: '*.png binary\n*.test.ts linguist-generated\n',
    expect: `${SECTION}\n*.png binary\n`,
  },
];

describe('tests-any .gitattributes', () => {
  TEST_CASES.forEach((thisCase) =>
    describe(thisCase.description, () => {
      it('fix emits the expected file', async () => {
        const { contents } = await fix(thisCase.given, context);
        expect(contents).toEqual(thisCase.expect);
      });

      it('fix(fix(x)) === fix(x) — the second pass changes zero', async () => {
        const { contents: once } = await fix(thisCase.given, context);
        const { contents: twice } = await fix(once, context);
        expect(twice).toEqual(once);
      });

      it('check passes on the fixed output', async () => {
        const { contents: once } = await fix(thisCase.given, context);
        expect(() => check(once, context)).not.toThrow();
      });
    }),
  );

  it('check throws on a file without the section, so a plan flags it', async () => {
    const error = await getError(async () => check(BLOCK_GIT, context));
    // the plan shows the adopter this diff: received vs the file the fix would write
    const message = stripVTControlCharacters(error.message);
    expect(message).toContain('toEqual');
    expect(message).toContain('*.test.ts linguist-generated');
    expect(message).toMatchSnapshot();
  });

  it('declares no line for snapshots, so they render open', async () => {
    const { contents } = await fix(null, context);
    expect(contents).not.toContain('.snap');
  });
});
