import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';
import { parse } from 'yaml';

/**
 * .what = clamps #581 + `rule.forbid.dpdm-exclude-change`: the shipped .dpdmrc.yaml keeps an empty
 *         `exclude` and never adds node_modules, so dpdm checks ALL files for cycles (deps included).
 * .why  = an empty `exclude: []` is the POLICY, not a no-op — it renders `--exclude ""` (dpdm's
 *         include-all value), so a prod-dep cycle cannot ship to consumers unseen. the hazard is a
 *         future tidy-up that adds `node_modules` / `^node_modules` or "fixes" the list toward
 *         dpdm's own `/node_modules/` default — either silently disables the policy across every
 *         consumer repo. the parse reads the `exclude` VALUE, so the ⚠️ node_modules mention in the
 *         file's own comment does not false-match.
 * .teeth = add `^node_modules` (or any node_modules entry) to `exclude` in best-practice/.dpdmrc.yaml
 *          and the "no node_modules" assertion reddens.
 * .note = the subject is the shipped TEMPLATE, read from __dirname. this file sits at the practice
 *         ROOT, so declapract never emits it (per the #583 relocation convention).
 */
describe('lint .dpdmrc.yaml exclude policy', () => {
  given('the shipped .dpdmrc.yaml', () => {
    const parsed = parse(
      readFileSync(join(__dirname, 'best-practice/.dpdmrc.yaml'), 'utf8'),
    );
    const exclude: unknown = parsed?.exclude;

    when('the exclude list is read', () => {
      then('it is an array', () => {
        expect(Array.isArray(exclude)).toEqual(true);
      });

      then('it is empty (all files checked, deps included — the org policy)', () => {
        expect(exclude).toEqual([]);
      });

      then('no entry excludes node_modules (that would disable the policy)', () => {
        const entries = (exclude as unknown[]).map((e) => String(e));
        const hasNodeModules = entries.some((e) => e.includes('node_modules'));
        expect(hasNodeModules).toEqual(false);
      });

      // the emitted exclude value is the caller-faced contract: snapshot it so a reword toward
      // dpdm's node_modules default reddens a vibecheck, not just the token assertion.
      then('the emitted exclude value matches snapshot', () => {
        expect(exclude).toMatchSnapshot('dpdmrc exclude value');
      });
    });
  });
});
