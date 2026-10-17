import { asActionPinTargetTag } from './asActionPinTargetTag';

const TAGS = ['v4', 'v4.0.0', 'v4.1.7', 'v4.2.2', 'v5', 'v5.0.0', 'v5.1.0-rc.1', 'v40.0.0'];

const TEST_CASES = [
  {
    description: 'a major-only tail keeps its tag, so its commit is re-read',
    given: { tagPinned: 'v4', tagsAvailable: TAGS },
    expect: 'v4',
  },
  {
    description: 'a full tail moves to the newest full tag of the same major',
    given: { tagPinned: 'v4.0.0', tagsAvailable: TAGS },
    expect: 'v4.2.2',
  },
  {
    description: 'a full tail never crosses into the next major, nor into a lookalike major',
    given: { tagPinned: 'v4.2.2', tagsAvailable: TAGS },
    expect: 'v4.2.2',
  },
  {
    description: 'a prerelease never qualifies',
    given: { tagPinned: 'v5.0.0', tagsAvailable: TAGS },
    expect: 'v5.0.0',
  },
  {
    description: 'a tail with no `v` prefix stays on tags with no `v` prefix',
    given: { tagPinned: '0.2.0', tagsAvailable: ['0.2.0', '0.3.1', 'v0.9.0', '1.0.0'] },
    expect: '0.3.1',
  },
  {
    description: 'a tail that is not a version stays as it is',
    given: { tagPinned: 'main', tagsAvailable: TAGS },
    expect: 'main',
  },
  {
    description: 'a pin newer than any listed tag never moves backward',
    given: { tagPinned: 'v4.9.0', tagsAvailable: TAGS },
    expect: 'v4.9.0',
  },
];

describe('asActionPinTargetTag', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asActionPinTargetTag(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
