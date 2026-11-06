import { stripVTControlCharacters } from 'node:util';

import { getError } from 'test-fns';

import { check, fix } from './best-practice/.gitattributes.declapract';

const context = {} as Parameters<typeof fix>[1]; // .note = the fix reads no context

const SECTION = `# [rhachet] collapse route robocode in pr diffs; yields and radio stay open
.route/** linguist-generated
.route/**/*.yield.* -linguist-generated
.route/**/.radio/** -linguist-generated
.behavior/** linguist-generated
.behavior/**/*.yield.* -linguist-generated
.behavior/**/.radio/** -linguist-generated
`;

const BLOCK_TESTS = `# [tests-any] collapse test source in pr diffs; snapshots stay open
*.test.ts linguist-generated
`;

const TEST_CASES: { description: string; given: string | null; expect: string }[] = [
  {
    description: 'emits its section when no file exists',
    given: null,
    expect: SECTION,
  },
  {
    description: 'lands after every other declarer, so its exceptions win',
    given: BLOCK_TESTS,
    expect: `${BLOCK_TESTS}\n${SECTION}`,
  },
  {
    description: 'keeps a repo-own override, last',
    given: '.route/**/0.wish.md -linguist-generated\n',
    expect: `${SECTION}\n.route/**/0.wish.md -linguist-generated\n`,
  },
];

describe('rhachet .gitattributes', () => {
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

  it('check throws when its section sits above another declarer', async () => {
    const error = await getError(async () =>
      check(`${SECTION}\n${BLOCK_TESTS}`, context),
    );
    // the plan shows the adopter this diff: received vs the file the fix would write
    const message = stripVTControlCharacters(error.message);
    expect(message).toContain('toEqual');
    expect(message).toMatchSnapshot();
  });

  it('places each exception after the collapse line it carves out of', async () => {
    const { contents } = await fix(null, context);
    const lines = contents!.split('\n');
    ['.route', '.behavior'].forEach((root) =>
      expect(lines.indexOf(`${root}/** linguist-generated`)).toBeLessThan(
        lines.indexOf(`${root}/**/*.yield.* -linguist-generated`),
      ),
    );
  });
});
