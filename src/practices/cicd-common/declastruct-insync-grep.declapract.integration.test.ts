import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps #561: the .declastruct.yml apply-gate greps the LOWERCASE marker declastruct
 *         actually emits (`🎉 everything is in sync!`), so the in-sync fast path is live, not dead.
 * .why  = declastruct's marker is lowercase (planChanges.ts: `context.log.info('🎉 everything is in
 *         sync!')`). a capital-E `Everything is in sync` grep is case-sensitive and never matches, so
 *         every plan falls to the has-changes-planned=true arm — a fast path dead its whole life. it
 *         fails SAFE (over-gates), so no alarm ever fired; a clamp is the only thing that keeps the
 *         grep tied to the tool's real output.
 * .teeth = revert the grep to `grep "Everything is in sync"` (capital E) and the "greps the
 *          lowercase marker" assertion reddens.
 * .note = the subject is the shipped TEMPLATE, read from __dirname. this file sits at the practice
 *         ROOT, so declapract never emits it (per the #583 relocation convention).
 */
describe('cicd-common .declastruct.yml in-sync grep', () => {
  given('the shipped .declastruct.yml', () => {
    const yml = readFileSync(
      join(__dirname, 'best-practice/.github/workflows/.declastruct.yml'),
      'utf8',
    );

    when('the apply-gate grep is read', () => {
      // declastruct emits this literal phrase, lowercase; the workflow must match it verbatim
      const markerLower = 'everything is in sync';
      const markerCapital = 'Everything is in sync';

      then('it greps the lowercase marker declastruct actually emits', () => {
        expect(yml).toContain(`grep -qF "${markerLower}"`);
      });

      then('it does NOT grep the capital-E form that never matches (#561)', () => {
        expect(yml).not.toContain(markerCapital);
      });

      then('the emitted apply-gate grep line matches snapshot', () => {
        // snapshot the caller-faced contract itself, so a reword that keeps the
        // marker token green (a re-ordered -qF, a re-phrased fallback) reddens a vibecheck
        const grepLine = yml
          .split('\n')
          .find((line) => line.includes('grep -qF "'));
        expect(grepLine?.trim()).toMatchSnapshot('declastruct apply-gate grep');
      });
    });
  });
});
