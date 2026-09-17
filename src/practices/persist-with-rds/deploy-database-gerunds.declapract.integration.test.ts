import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps #549: the shipped provision/schema/deploy.database.sh carries no gerund
 *         (-ing) progress-string, comment, or error — imperative/plain verbs only, per
 *         rule.forbid.gerunds.
 * .why  = this template is emitted verbatim to every persist-with-rds consumer, and each
 *         consumer runs the mechanic gerund hook on the emitted file. a gerund in the
 *         template trips that hook downstream, so each repo re-fixes it and re-diverges from
 *         the template — the fix must live upstream, here, once.
 * .teeth = revert any progress-string to its gerund form (e.g. "create the database" ->
 *          "creating the database") in best-practice/provision/schema/deploy.database.sh and
 *          the paired "no gerund" assertion reddens.
 * .note = the subject is the shipped TEMPLATE, read from __dirname. this file sits at the
 *         practice ROOT, so declapract never emits it (per the #583 relocation convention).
 */
describe('persist-with-rds deploy.database.sh gerund-free', () => {
  given('the shipped deploy.database.sh', () => {
    const source = readFileSync(
      join(__dirname, 'best-practice/provision/schema/deploy.database.sh'),
      'utf8',
    );

    // the exact gerund forms #549 removed; none may reappear in the template
    const forbidden = [
      'creating',
      'installing',
      'granting',
      'before running this',
    ];

    when('the template body is read', () => {
      forbidden.forEach((word) =>
        then(`it carries no gerund form: "${word}"`, () => {
          expect(source.includes(word)).toEqual(false);
        }),
      );

      then('it keeps the imperative progress strings', () => {
        expect(source).toContain('🔨 create the database...');
        expect(source).toContain('🔨 install the extensions...');
        expect(source).toContain('🔨 create the schema...');
        expect(source).toContain('🔨 create the cicd user...');
      });

      then('the emitted deploy.database.sh matches snapshot', () => {
        // snapshot the whole shipped file so a reworded progress string that stays
        // gerund-free still reddens a vibecheck in review — the token asserts prove the
        // gerund class is absent, this proves the exact text (rule.require.contract-snapshot-exhaustiveness)
        expect(source).toMatchSnapshot('deploy.database.sh');
      });
    });
  });
});
