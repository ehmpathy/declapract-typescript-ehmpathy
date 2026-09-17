import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps #554/#570: the shipped commitlint.config.js overrides body-max-line-length
 *         to warn-level 140, aligned with the header-max-length cap, so a squash-merge release PR
 *         cannot fail test:commits on a long header-turned-body-bullet.
 * .why  = config-conventional's default body-max-line-length is error-level 100. a github
 *         squash-merge collapses a PR's sub-commit headers into `* ` body bullets, so a header
 *         near the 140-char header cap becomes a body line over 100 — which errors the
 *         release-branch lint even though every source header was valid. the template MUST carry
 *         the override (not just this repo's own root config, which #570 fixed) so every consumer
 *         inherits it.
 * .teeth = delete the body-max-line-length line from best-practice/commitlint.config.js and the
 *          "declares body-max-line-length" assertion reddens (the config-conventional default,
 *          error-level 100, reasserts).
 * .note = the subject is the shipped TEMPLATE, read from __dirname. this file sits at the practice
 *         ROOT, so declapract never emits it (per the #583 relocation convention).
 */
describe('conventional-commits commitlint body-max-line-length', () => {
  given('the shipped commitlint.config.js', () => {
    const source = readFileSync(
      join(__dirname, 'best-practice/commitlint.config.js'),
      'utf8',
    );
    const ruleLine = source
      .split('\n')
      .find((line) => line.includes('body-max-line-length'));

    when('the body-max-line-length rule is read', () => {
      then('it declares body-max-line-length (not the config-conventional default)', () => {
        expect(ruleLine).toBeDefined();
      });

      then('it is warn-level 140, aligned with the header cap (a long header cannot block a release)', () => {
        expect(ruleLine).toContain('[1, ');
        expect(ruleLine).toContain('140]');
      });

      // the emitted rule line is the caller-faced contract: snapshot it so a reword that keeps
      // the tokens green (a re-ordered tuple, a level change) reddens a vibecheck.
      then('the emitted rule line matches snapshot', () => {
        expect(ruleLine?.trim()).toMatchSnapshot('commitlint body-max-line-length rule line');
      });
    });
  });
});
