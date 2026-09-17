import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asPackageJSON } from './asPackageJSON';

/**
 * .what = unit coverage for `asPackageJSON`, the one source every `package.json` declaration
 *         parses through (D50). it holds the happy parse, the malformed-json branch, AND the
 *         shape-guard branch (a top-level scalar / array / null is valid json but not a
 *         package.json OBJECT).
 * .why  = the shape guard exists to replace a context-free `TypeError: Cannot read properties of
 *         null` that a caller hits when it derefs `.dependencies` on a non-object parse. that
 *         branch shipped untested — so a refactor that dropped it would red no test while it
 *         reopened the exact context-free failure the util exists to close. this clamps it: the
 *         guard throws a caller-must-fix ConstraintError that names the shape it got.
 */
describe('asPackageJSON', () => {
  const context = { practice: 'demo-practice' };

  given('[case1] a valid top-level json object', () => {
    when('[t0] parsed', () => {
      then('it returns the parsed object', () => {
        const parsed = asPackageJSON(
          { contents: '{"name":"x","devDependencies":{"jest":"29.0.0"}}' },
          context,
        );
        expect(parsed.name).toEqual('x');
        expect(parsed.devDependencies.jest).toEqual('29.0.0');
      });
    });
  });

  given('[case2] malformed json (a stray character)', () => {
    when('[t0] parsed', () => {
      then('it throws a ConstraintError that names the practice + a fix hint', async () => {
        const error = await getError(() =>
          asPackageJSON({ contents: '{"name": }' }, context),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('[demo-practice]');
        expect(error.message).toContain('could not parse package.json');
        expect(error.message).toContain('valid json');
      });
    });
  });

  // the shape-guard branch: valid json, but not a package.json OBJECT. each was previously untested.
  given('[case3] valid json that is not a top-level object', () => {
    const SHAPE_CASES = [
      { description: 'a top-level array', contents: '[1,2,3]', shape: 'an array' },
      { description: 'a top-level null', contents: 'null', shape: 'null' },
      { description: 'a top-level number', contents: '42', shape: 'number' },
      { description: 'a top-level string', contents: '"just a string"', shape: 'string' },
    ];

    SHAPE_CASES.map((thisCase) =>
      when(`[t0] parsed — ${thisCase.description}`, () => {
        then('it throws a ConstraintError that names the got shape + a fix hint', async () => {
          const error = await getError(() =>
            asPackageJSON({ contents: thisCase.contents }, context),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('[demo-practice]');
          expect(error.message).toContain('not a json object');
          expect(error.message).toContain(`got ${thisCase.shape}`);
          expect(error.message).toContain('a {...}, not a scalar or array');
        });
      }),
    );
  });
});
