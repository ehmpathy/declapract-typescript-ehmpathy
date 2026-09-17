import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'yaml';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the boot.yml FINDSERT (#105 req 1), run through the REAL declapract
 *         apply pipeline against a genTempDir clone of a consumer whose boot.yml already carries its
 *         OWN say + ref entries.
 * .why  = req 1 is that the boot.yml is only ever findserted into a consumer, never whole-file
 *         overwritten — so a consumer's own boot entries survive. per
 *         `rule.require.declapract-integration-tests`, a `fix` with logic (a yaml union that reads the
 *         consumer's extant file) owes a pipeline test: a unit test of the exported `fix` never
 *         exercises the glob→file match nor the apply against a real consumer file. this is that test.
 * .note = the consumer boot is SIMPLE mode with a `say` pick and a `ref` pick of its own. the
 *         after-state proves both declared deep-variant globs are unioned in AND both consumer picks
 *         survive byte-for-value — the whole-file-overwrite failure this guards against would drop them.
 * .note = the boot is snapshotted in full (before AND after) so a reviewer can eyeball the exact
 *         end-state (`rule.require.snapshots`).
 */
describe('rhachet — boot.yml findsert (req 1: consumer entries survive)', () => {
  given("[case1] a consumer whose boot.yml carries its own entries", () => {
    const tempDir = genTempDir({
      slug: 'declapract-rhachet-boot-findsert',
      clone:
        './src/practices/rhachet/.test/assets/demo-repo-with-consumer-boot',
      symlink: [{ at: 'src', to: 'src' }],
    });

    const bootPath = '.agent/repo=.this/role=any/boot.yml';
    const REASON_REF = 'briefs/domain.terms/term=*._.choice.reason.md';
    const EXAMPLE_REF = 'briefs/domain.terms/term=*._.choice.example=*.md';

    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'rhachet',
        file: bootPath,
      });

    when('[t0] the input (before any fix)', () => {
      then('the consumer boot.yml carries its own picks, no budget, + matches snapshot', async () => {
        const before = await read(bootPath);
        expect(before).toContain('briefs/my-own-brief.md');
        expect(before).toContain('briefs/my-own-deep-variant.md');
        // the consumer predates the budget cap — it carries none (the findsert-add path)
        expect(yaml.parse(before).budget).toBeUndefined();
        expect(before).toMatchSnapshot('boot.yml — before');
      });
    });

    when('[t1] the findsert fix is applied', () => {
      useThen('union the declared deep-variant globs into the consumer boot', async () =>
        applyFix(),
      );

      then(
        "both declared globs land AND the consumer's own say + ref picks survive, and it matches snapshot",
        async () => {
          const after = await read(bootPath);
          const parsed = yaml.parse(after);

          // the two declared deep-variant globs were unioned into the consumer's ref list
          expect(parsed.briefs.ref).toContain(REASON_REF);
          expect(parsed.briefs.ref).toContain(EXAMPLE_REF);
          // the consumer's OWN ref pick survives (the whole-overwrite failure would drop it)
          expect(parsed.briefs.ref).toContain('briefs/my-own-deep-variant.md');
          // the consumer's OWN say pick survives untouched
          expect(parsed.briefs.say).toContain('briefs/my-own-brief.md');
          // it stayed simple mode — the fix created no top-level always: key
          expect(parsed.always).toBeUndefined();
          // the budget cap was findserted into a consumer that predated it
          expect(parsed.budget.tokens).toEqual(5_000);
          // full content, for the reviewer's eye
          expect(after).toMatchSnapshot('boot.yml — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // once both globs are present, the check passes and the fix is a no-op — the boot must be
      // byte-identical across a re-apply (`rule.require.idempotent-fixes`).
      const passes = useThen(
        'a second apply over its own output',
        async () => {
          const before = await read(bootPath);
          await applyFix();
          const after = await read(bootPath);
          return { before, after };
        },
      );

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });

  given("[case2] a consumer whose boot.yml already declares a divergent budget", () => {
    const tempDir = genTempDir({
      slug: 'declapract-rhachet-boot-budget-preserved',
      clone:
        './src/practices/rhachet/.test/assets/demo-repo-with-consumer-boot',
      symlink: [{ at: 'src', to: 'src' }],
    });

    const bootPath = '.agent/repo=.this/role=any/boot.yml';
    const bootAbs = path.join(tempDir, bootPath);

    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'rhachet',
        file: bootPath,
      });

    // seed the writable clone with a budget the consumer chose on purpose — a value the findsert
    // must NOT revert (findsert, never upsert). this proves the present-value-preserved branch
    // through the real pipeline, no extra fixture needed.
    when('[t0] the consumer set its own budget of 9000', () => {
      useThen('write a divergent budget into the cloned boot', async () => {
        const before = await fs.readFile(bootAbs, 'utf-8');
        await fs.writeFile(bootAbs, `${before}budget:\n  tokens: 9000\n`, 'utf-8');
      });

      then('the seed carries the consumer budget', async () => {
        expect(yaml.parse(await fs.readFile(bootAbs, 'utf-8')).budget.tokens).toEqual(9000);
      });
    });

    when('[t1] the findsert fix is applied', () => {
      useThen('apply the fix over the consumer-chosen budget', async () => applyFix());

      then("the consumer's budget survives untouched (findsert, never upsert)", async () => {
        const parsed = yaml.parse(await fs.readFile(bootAbs, 'utf-8'));
        expect(parsed.budget.tokens).toEqual(9000);
      });
    });
  });
});
