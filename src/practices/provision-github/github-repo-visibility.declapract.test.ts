import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = the clamp on the repo visibility the provision-github practice derives from package.json
 * .why = privacy is the default. a repo goes public only when its package.json declares
 *        `"private": false`; an absent key, a null, or any other value provisions it private.
 *        a fail-open derivation publishes every repo that never thought to say otherwise
 * .note = the declaration imports declastruct providers and carries `@declapract{variable.*}`
 *         literals, so it cannot be invoked here. the clamp lifts the `visibility:` expression out
 *         of the source and evaluates it against each package.json shape, so it proves behavior,
 *         not text
 * .teeth = restore `pkg.private === true ? 'private' : 'public'` and the absent-key case reddens
 */

// anchor on __dirname (a nested jest run has a different cwd); the declaration is under best-practice/.
const RESOURCES = readFileSync(
  join(__dirname, 'best-practice/provision/github.repo/resources.ts'),
  'utf8',
);

/**
 * .what = the visibility the declaration derives for one package.json shape
 */
const getVisibilityDerived = (input: { pkg: Record<string, unknown> }): unknown => {
  const expression = RESOURCES.match(/visibility: (?<expression>[^,\n]+),/)?.groups
    ?.expression;
  if (!expression) throw new Error('no `visibility:` expression found in resources.ts');
  return new Function('pkg', `return ${expression};`)(input.pkg);
};

const TEST_CASES = [
  { description: 'no private key', pkg: {}, visibility: 'private' },
  { description: 'private: true', pkg: { private: true }, visibility: 'private' },
  { description: 'private: null', pkg: { private: null }, visibility: 'private' },
  { description: 'private: "false" (a string)', pkg: { private: 'false' }, visibility: 'private' },
  { description: 'private: 0', pkg: { private: 0 }, visibility: 'private' },
  { description: 'private: false, explicit', pkg: { private: false }, visibility: 'public' },
];

describe('github-repo-visibility (provision-github)', () => {
  given('the shipped provision/github.repo/resources.ts', () => {
    TEST_CASES.forEach((thisCase) =>
      when(`package.json has ${thisCase.description}`, () => {
        then(`the repo is ${thisCase.visibility}`, () => {
          expect(getVisibilityDerived({ pkg: thisCase.pkg })).toEqual(
            thisCase.visibility,
          );
        });
      }),
    );
  });
});
