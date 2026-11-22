import { given, then, useThen } from 'test-fns';

import { asJsonMergedDeep, type JsonArrayUnionRule, type JsonLeafKeepRule } from './asJsonMergedDeep';

const keepNone: JsonLeafKeepRule = () => false;
const unionNone: JsonArrayUnionRule = () => false;
const unionExclude: JsonArrayUnionRule = ({ path }) => path.join('.') === 'exclude';

const TEST_CASES = [
  {
    description: 'a declared array unions with the found one: declared entries lead, found-only entries follow in found order',
    given: { declared: { exclude: ['dist', 'node_modules'] }, found: { exclude: ['.cache', 'dist', 'tmp'] }, isArrayUnioned: unionExclude },
    expect: { exclude: ['dist', 'node_modules', '.cache', 'tmp'] },
  },
  {
    description: 'a found entry equal to a declared one by value (an object) is not repeated',
    given: {
      declared: { exclude: [{ path: 'a' }] },
      found: { exclude: [{ path: 'a' }, { path: 'b' }] },
      isArrayUnioned: unionExclude,
    },
    expect: { exclude: [{ path: 'a' }, { path: 'b' }] },
  },
  {
    description: 'a found array with no extra entries leaves the declared one as is',
    given: { declared: { exclude: ['dist'] }, found: { exclude: ['dist'] }, isArrayUnioned: unionExclude },
    expect: { exclude: ['dist'] },
  },
  {
    description: 'a rule that unions no path lets the declared array replace the found one',
    given: { declared: { exclude: ['dist'] }, found: { exclude: ['.cache', 'dist'] }, isArrayUnioned: unionNone },
    expect: { exclude: ['dist'] },
  },
  {
    description: 'an array at a path the rule does not name is replaced, while the named path unions',
    given: {
      declared: { exclude: ['dist'], include: ['src'] },
      found: { exclude: ['tmp'], include: ['lib'] },
      isArrayUnioned: unionExclude,
    },
    expect: { exclude: ['dist', 'tmp'], include: ['src'] },
  },
  {
    description: 'a declared array over a found non-array takes the declared array',
    given: { declared: { exclude: ['dist'] }, found: { exclude: 'dist' }, isArrayUnioned: unionExclude },
    expect: { exclude: ['dist'] },
  },
];

describe('asJsonMergedDeep', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      const merge = (found: unknown) =>
        asJsonMergedDeep({
          declared: thisCase.given.declared,
          found,
          path: [],
          isLeafKept: keepNone,
          isArrayUnioned: thisCase.given.isArrayUnioned,
        });

      const merged = useThen('the merge runs', async () => ({ once: merge(thisCase.given.found) }));

      then('it returns the merged json', () => {
        expect(merged.once).toEqual(thisCase.expect);
      });

      then('a second merge over its own output returns the same json', () => {
        expect(merge(merged.once)).toEqual(merged.once);
      });
    }),
  );
});
