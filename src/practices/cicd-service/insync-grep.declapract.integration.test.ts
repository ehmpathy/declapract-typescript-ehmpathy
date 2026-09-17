import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps the two peer apply-gate greps in cicd-service to the LITERAL in-sync marker
 *         each tool actually emits, so the has-changes-planned=false fast path stays live — the same
 *         guard #561 added for cicd-common/.declastruct.yml, extended to its two untested peers.
 * .why  = an apply-gate greps the tool's plan log for an "in sync / no changes" phrase to skip a
 *         redundant apply. if the grep string drifts from the tool's real output (the #561 failure:
 *         a capital-E grep vs a lowercase marker), the fast path silently dies — every plan falls to
 *         has-changes-planned=true and apply always runs. it fails SAFE (over-gates, a redundant
 *         idempotent apply), so no alarm ever fires; a clamp tied to the tool's real output is the
 *         only guard that catches such a drift.
 * .verified = both markers match the tool's real output as of this clamp:
 *         - sql-schema-control emits `Everything is up to date 🎉` (capital E) — displayPlans.ts:28
 *           + src/contract/__snapshots__/cli.acceptance.test.ts.snap.
 *         - terraform emits `No changes. Your infrastructure matches the configuration.` — the
 *           standard `terraform plan` no-change line.
 * .teeth = drift either grep (e.g. lowercase the sql marker, or reword the terraform phrase) and the
 *          assertion for that grep reddens.
 * .note = the subject is the shipped TEMPLATE, read from __dirname/best-practice. this file sits at
 *         the practice ROOT, so declapract never emits it (per the #583 relocation convention).
 */
describe('cicd-service apply-gate in-sync greps', () => {
  given('the shipped .sql-schema-control.yml', () => {
    const yml = readFileSync(
      join(__dirname, 'best-practice/.github/workflows/.sql-schema-control.yml'),
      'utf8',
    );

    when('the apply-gate grep is read', () => {
      // sql-schema-control emits this literal phrase (capital E); the workflow must match it verbatim
      const marker = 'Everything is up to date';

      then('it greps the marker sql-schema-control actually emits', () => {
        expect(yml).toContain(`grep "${marker}" ./plan.log`);
      });

      // the emitted grep line is the caller-faced contract: snapshot it so a reword that keeps
      // the marker token green reddens a vibecheck.
      then('the emitted apply-gate grep line matches snapshot', () => {
        const grepLine = yml
          .split('\n')
          .find((line) => line.includes('grep "') && line.includes('./plan.log'));
        expect(grepLine?.trim()).toMatchSnapshot('sql-schema-control apply-gate grep');
      });
    });
  });

  given('the shipped .terraform.yml', () => {
    const yml = readFileSync(
      join(__dirname, 'best-practice/.github/workflows/.terraform.yml'),
      'utf8',
    );

    when('the apply-gate grep is read', () => {
      // terraform emits `No changes. Your infrastructure matches the configuration.` on a clean plan
      const marker = 'infrastructure matches the configuration';

      then('it greps the marker terraform actually emits', () => {
        expect(yml).toContain(`grep "${marker}" ./plan.log`);
      });

      // the emitted grep line is the caller-faced contract: snapshot it so a reword that keeps
      // the marker token green reddens a vibecheck.
      then('the emitted apply-gate grep line matches snapshot', () => {
        const grepLine = yml
          .split('\n')
          .find((line) => line.includes('grep "') && line.includes('./plan.log'));
        expect(grepLine?.trim()).toMatchSnapshot('terraform apply-gate grep');
      });
    });
  });
});
