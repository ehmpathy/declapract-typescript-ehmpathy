import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps #563: the shipped provision:testdb chain sets ACCESS=test on every inner
 *         provision:schema:* call, so a freshly-stamped repo can derive access and provision its
 *         local testdb without a hand-edit.
 * .why  = each schema call invokes sql-schema-control → getConfig() → getEnvironment.static(); with
 *         no ACCESS in a local shell (no aws account alias / NODE_ENV that fits), every access parser
 *         fails and it throws `could not derive access`. the local testdb always provisions the
 *         `test` tier, so ACCESS=test is a constant here, not the cicd `${{ inputs.access }}`
 *         interpolation the live-db path uses.
 * .teeth = drop an `ACCESS=test` from any inner schema call in best-practice/package.json and the
 *          "no bare schema call" assertion reddens (a bare `&& npm run provision:schema:` reappears).
 * .note = the subject is the shipped TEMPLATE (best-practice/package.json, a CONTAINS check), read
 *         from __dirname. this file sits at the practice ROOT, so declapract never emits it.
 */
describe('persist-with-rds provision:testdb access', () => {
  given('the shipped best-practice package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, 'best-practice/package.json'), 'utf8'),
    );
    const provisionTestdb: string = pkg.scripts['provision:testdb'];

    when('the provision:testdb chain is read', () => {
      then('each inner schema call carries ACCESS=test', () => {
        expect(provisionTestdb).toContain(
          'ACCESS=test npm run provision:schema:plan',
        );
        expect(provisionTestdb).toContain(
          'ACCESS=test npm run provision:schema:apply',
        );
      });

      then('no inner schema call runs without ACCESS (would throw could-not-derive)', () => {
        // a bare `&& npm run provision:schema:` (not preceded by ACCESS=test) throws
        // `could not derive access` in a local shell — the #563 defect
        expect(provisionTestdb).not.toMatch(/&&\s*npm run provision:schema:/);
      });

      then('the emitted provision:testdb chain matches snapshot', () => {
        // snapshot the shipped chain contract itself, so a reword that keeps the
        // ACCESS=test tokens green (a re-ordered &&, a dropped command) reddens a vibecheck
        expect(provisionTestdb).toMatchSnapshot('provision:testdb chain');
      });
    });
  });
});
