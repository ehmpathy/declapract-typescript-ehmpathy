import { getError, given, then, when } from 'test-fns';

import {
  defineExpectedGitattributesContents,
  type GitattributesSection,
} from './defineExpectedGitattributesContents';

const sectionsGit: readonly GitattributesSection[] = [
  {
    header: { latest: '# [git] first', retired: ['# git legacy'] },
    entries: { latest: ['a1 -diff', 'a2 -diff'], retired: ['a0 -diff'] },
  },
];

const TEST_CASES = [
  {
    description: 'emits only the managed section when no file exists',
    given: { contents: null },
    expect: { output: '# [git] first\na1 -diff\na2 -diff\n' },
  },
  {
    description: 'moves repo-own lines after the managed section',
    given: { contents: '*.png binary\n\n# [git] first\na1 -diff\na2 -diff\n' },
    expect: {
      output: '# [git] first\na1 -diff\na2 -diff\n\n*.png binary\n',
    },
  },
  {
    description: 'lifts legacy headers and prior entries out of the file',
    given: { contents: '# git legacy\na0 -diff\na1 -diff\n*.png binary\n' },
    expect: {
      output: '# [git] first\na1 -diff\na2 -diff\n\n*.png binary\n',
    },
  },
  {
    description: 'lifts a hand-copied managed line out of a repo-own block',
    given: { contents: 'x.ts -linguist-generated\na2 -diff\n' },
    expect: {
      output: '# [git] first\na1 -diff\na2 -diff\n\nx.ts -linguist-generated\n',
    },
  },
  {
    description: 'keeps a foreign tagged block verbatim, in declarer order',
    given: { contents: '# [rhachet] last\nz1 -diff\n\n# [tests-any] mid\nb1 -diff\n' },
    expect: {
      output:
        '# [git] first\na1 -diff\na2 -diff\n\n# [tests-any] mid\nb1 -diff\n\n# [rhachet] last\nz1 -diff\n',
    },
  },
  {
    description:
      'keeps a dropped declarer block above a repo-own override, so the override still wins',
    given: {
      contents:
        'x/custom/** -linguist-generated\n\n# [tests-any] mid\nx/** linguist-generated\n',
    },
    expect: {
      output:
        '# [git] first\na1 -diff\na2 -diff\n\n# [tests-any] mid\nx/** linguist-generated\n\nx/custom/** -linguist-generated\n',
    },
  },
  {
    description:
      'adds an entry an upgrade declares, and keeps the repo-own override last',
    given: {
      contents: '# [git] first\na1 -diff\n\nx/custom/** -linguist-generated\n',
    },
    expect: {
      output:
        '# [git] first\na1 -diff\na2 -diff\n\nx/custom/** -linguist-generated\n',
    },
  },
  {
    description:
      'sorts a hand-written tag after every listed declarer, ahead of repo-own lines',
    given: {
      contents:
        '*.png binary\n\n# [mine] hand tag\nm1 -diff\n\n# [rhachet] last\nz1 -diff\n',
    },
    expect: {
      output:
        '# [git] first\na1 -diff\na2 -diff\n\n# [rhachet] last\nz1 -diff\n\n# [mine] hand tag\nm1 -diff\n\n*.png binary\n',
    },
  },
  {
    description:
      'keeps a foreign section byte for byte, even where it repeats an entry this declarer holds',
    given: { contents: '# [tests-any] mid\na1 -diff\nb1 -diff\n' },
    expect: {
      output:
        '# [git] first\na1 -diff\na2 -diff\n\n# [tests-any] mid\na1 -diff\nb1 -diff\n',
    },
  },
  {
    description:
      'keeps a hand-added line from its own tagged block as a repo-own line, after every section',
    given: { contents: '# [git] first\na1 -diff\nmy/** -diff\na2 -diff\n' },
    expect: {
      output: '# [git] first\na1 -diff\na2 -diff\n\nmy/** -diff\n',
    },
  },
  {
    description: 'keeps a foreign section that holds only comments',
    given: { contents: '# [tests-any] mid\n# decide whether fixtures fold\n' },
    expect: {
      output:
        '# [git] first\na1 -diff\na2 -diff\n\n# [tests-any] mid\n# decide whether fixtures fold\n',
    },
  },
  {
    description: 'reads crlf input and emits lf',
    given: { contents: '*.png binary\r\n' },
    expect: {
      output: '# [git] first\na1 -diff\na2 -diff\n\n*.png binary\n',
    },
  },
];

describe('defineExpectedGitattributesContents', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const output = defineExpectedGitattributesContents({
        contents: thisCase.given.contents,
        declarer: 'git',
        sections: sectionsGit,
      });
      expect(output).toEqual(thisCase.expect.output);

      // the output is a fixed point: a second pass changes zero
      expect(
        defineExpectedGitattributesContents({
          contents: output,
          declarer: 'git',
          sections: sectionsGit,
        }),
      ).toEqual(output);
    }),
  );

  given('a section whose header lacks the declarer tag', () => {
    when('the contents are defined', () => {
      then('it throws, since the layout rests on the tag', async () => {
        const error = await getError(async () =>
          defineExpectedGitattributesContents({
            contents: null,
            declarer: 'git',
            sections: [
              {
                header: { latest: '# first', retired: [] },
                entries: { latest: ['a1 -diff'], retired: [] },
              },
            ],
          }),
        );
        expect(error.message).toContain('lacks its declarer tag');
      });
    });
  });

  given('a declarer absent from declarersOrderedForGitattributes', () => {
    when('the contents are defined', () => {
      then('it throws, since its place in the order must be decided', async () => {
        const error = await getError(async () =>
          defineExpectedGitattributesContents({
            contents: null,
            declarer: 'mine',
            sections: [
              {
                header: { latest: '# [mine] first', retired: [] },
                entries: { latest: ['m1 -diff'], retired: [] },
              },
            ],
          }),
        );
        expect(error.message).toContain('has no place');
      });
    });
  });
});
