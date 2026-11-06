import { stripVTControlCharacters } from 'node:util';

import { getError } from 'test-fns';

import { check, fix } from './best-practice/.gitattributes.declapract';

const context = {} as Parameters<typeof fix>[1]; // .note = the fix reads no context

const SECTION = `# [persist-with-dynamodb] collapse dao-generator output in pr diffs
src/access/daos/**/.generated/** linguist-generated
`;

const TEST_CASES: { description: string; given: string | null; expect: string }[] = [
  {
    description: 'emits its section when no file exists',
    given: null,
    expect: SECTION,
  },
  {
    description: 'lifts the retired fold of whole daos, so the internal contracts render open',
    given:
      '# [persist-with-dynamodb] collapse dao-generator output in pr diffs\nsrc/access/daos/** linguist-generated\n',
    expect: SECTION,
  },
  {
    description: 'keeps a repo-own line, last',
    given: '*.png binary\n',
    expect: `${SECTION}\n*.png binary\n`,
  },
];

describe('persist-with-dynamodb .gitattributes', () => {
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
    const error = await getError(async () => check('*.png binary\n', context));
    // the plan shows the adopter this diff: received vs the file the fix would write
    const message = stripVTControlCharacters(error.message);
    expect(message).toContain('toEqual');
    expect(message).toContain('src/access/daos/**/.generated/** linguist-generated');
    expect(message).toMatchSnapshot();
  });

  it('declares no line for terraform output, which holds hand-written infra too', async () => {
    const { contents } = await fix(null, context);
    expect(contents).not.toContain('provision/');
  });
});
