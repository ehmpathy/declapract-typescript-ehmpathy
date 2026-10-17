import { getError } from 'test-fns';

import { asPresenceCheck } from './asPresenceCheck';

const check = asPresenceCheck({
  expected: 'at least one domain object under src/domain.objects/',
  hint: 'declare the nouns this service operates on',
});

const TEST_CASES = [
  {
    description: 'passes when the declared glob found a file',
    given: { contents: 'export class Surfer {}' },
    expect: { error: null },
  },
  {
    description: 'passes when the found file is empty',
    given: { contents: '' },
    expect: { error: null },
  },
  {
    description: 'names what to author when the declared glob found no file',
    given: { contents: null },
    expect: {
      error:
        'expected at least one domain object under src/domain.objects/; declare the nouns this service operates on',
    },
  },
];

describe('asPresenceCheck', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, async () => {
      if (thisCase.expect.error === null) {
        expect(() => check(thisCase.given.contents)).not.toThrow();
        return;
      }
      const error = await getError(async () => check(thisCase.given.contents));
      expect(error.message).toEqual(thisCase.expect.error);
    }),
  );
});
