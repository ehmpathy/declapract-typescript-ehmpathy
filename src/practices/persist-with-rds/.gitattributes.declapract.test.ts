import { stripVTControlCharacters } from 'node:util';

import { getError } from 'test-fns';

import { check, fix } from './best-practice/.gitattributes.declapract';

const context = {} as Parameters<typeof fix>[1]; // .note = the fix reads no context

const SECTION = `# [persist-with-rds] collapse dao-generator output in pr diffs
src/access/daos/** linguist-generated
provision/schema/sql/tables/** linguist-generated
provision/schema/sql/views/** linguist-generated
provision/schema/sql/functions/** linguist-generated
`;

const TEST_CASES: { description: string; given: string | null; expect: string }[] = [
  {
    description: 'emits its section when no file exists',
    given: null,
    expect: SECTION,
  },
  {
    description: 'keeps a repo-own override for hand-written daos, last',
    given: 'src/access/daos/custom/** -linguist-generated\n',
    expect: `${SECTION}\nsrc/access/daos/custom/** -linguist-generated\n`,
  },
  {
    description:
      'sits ahead of persist-with-dynamodb, and leaves its shared dao line untouched',
    given:
      '# [persist-with-dynamodb] collapse dao-generator output in pr diffs\nsrc/access/daos/** linguist-generated\n',
    expect: `${SECTION}\n# [persist-with-dynamodb] collapse dao-generator output in pr diffs\nsrc/access/daos/** linguist-generated\n`,
  },
];

describe('persist-with-rds .gitattributes', () => {
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
    expect(message).toContain('src/access/daos/** linguist-generated');
    expect(message).toMatchSnapshot();
  });

  it('declares no line for hand-declared sql init', async () => {
    const { contents } = await fix(null, context);
    expect(contents).not.toContain('sql/init');
  });
});
