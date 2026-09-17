import { readFileSync } from 'node:fs';

import { given, then, useBeforeAll, when } from 'test-fns';
import yaml from 'yaml';

/**
 * .what = two clamps on the `deploy.yml` caller:
 *         1. caller↔callee reconciliation — the caller must pass the `pagerduty-integration-key`
 *            secret the `.deploy-sls.yml` callee DECLARES and USES, so a prod deploy/acceptance
 *            failure actually pages (D29 / #573).
 *         2. prod test-gate precedence — the prod job's `if:` must bind the `needs.test` gate to
 *            EVERY trigger branch, so a tag push cannot deploy to prod on a failed test (i014 r11).
 * .why  = (1) the callee marks the secret `required: false`, so github never errors when a caller
 *         omits it — the omission is SILENT. the callee's `alarm on failure` step gates on
 *         `if: failure() && env.PAGERDUTY_INTEGRATION_KEY`, so an unpassed secret leaves the step
 *         SKIPPED and every prod alert dead. the current template shipped a `prod` job with no
 *         `secrets:` block, and `deploy.yml` is EQUALS — so `declapract fix` STRIPPED the
 *         pass-through a consumer had, so its alerts died by conformance. this clamp is the guard
 *         github cannot be: it reconciles the caller's pass-through against the callee's declaration.
 *         (2) github-actions `&&` binds tighter than `||`, so an `if:` written
 *         `(tag) || (access==prod) && always() && (test ok)` parses as `tag || (access && always &&
 *         test)` — the test gate binds ONLY to the access branch, so a `v*` TAG PUSH deploys to prod
 *         even when `test` FAILED. the correct shape wraps both trigger branches in one outer group:
 *         `((tag) || access==prod) && always() && (test ok)`. this is the silent-break class the wish
 *         fights — an untested build reaches prod, every gate green. the clamp reads the raw `if:`
 *         and reddens on the un-grouped (bug) shape.
 * .note = a filesystem walk → integration suite per `rule.forbid.unit.remote-boundaries`; no
 *         credential, no network — the boundary alone classifies it.
 * .note = the secret clamp is scoped to the `prod` job by design. the callee marks the secret
 *         `required: false` and the org convention alerts under prod access alone (a prep failure that pages
 *         prod would be noise), so a `prep` job legitimately omits it. the reconciliation asserts
 *         the ONE call that matters.
 */

const WORKFLOWS_DIR = `${__dirname}/best-practice/.github/workflows`;
const PAGERDUTY_SECRET = 'pagerduty-integration-key';

/**
 * .what = whether the prod job's collapsed `if:` wraps BOTH trigger branches in ONE outer group
 *         that the ` && always()` test-gate binds over — the correct precedence.
 * .why  = a pure transformer leaf, named so the assertion below reads intent rather than a raw
 *         precedence regex a reader must simulate. the buggy single-group shape opens one paren
 *         `(startsWith`; the correct shape opens a second, OUTER paren `((startsWith` the
 *         ` && always()` gate closes over, so the gate binds to the tag-push branch too, not the
 *         access branch alone. mirrors the peer cicd-app-react-native-expo prod-gate clamp.
 */
const isProdGateGroupedCorrectly = (input: { collapsedIf: string }): boolean =>
  /\(\(startsWith\(github\.ref, 'refs\/tags\/'\).*\|\| github\.event\.inputs\.access == 'prod'\) &&\s*always\(\)/.test(
    input.collapsedIf,
  );

const readWorkflow = (input: { file: string }): { text: string; parsed: any } => {
  const text = readFileSync(`${WORKFLOWS_DIR}/${input.file}`, 'utf-8');
  return { text, parsed: yaml.parse(text) };
};

describe('cicd-service — deploy caller↔callee secret reconciliation (D29 clamp)', () => {
  given('[case1] the `.deploy-sls.yml` callee and the `deploy.yml` caller', () => {
    const scene = useBeforeAll(() => ({
      callee: readWorkflow({ file: '.deploy-sls.yml' }),
      caller: readWorkflow({ file: 'deploy.yml' }),
    }));

    when('[t0] the callee declares and uses the pagerduty secret', () => {
      then('it declares the secret under `workflow_call.secrets`', () => {
        // guard the shape so an absent `on.workflow_call` fails as a clean red, not a
        // raw TypeError — this file is a durable sentry, a crash undermines that role
        const workflowCall = scene.callee.parsed.on?.workflow_call;
        expect(workflowCall).toBeDefined();
        const declared = workflowCall?.secrets ?? {};
        expect(Object.keys(declared)).toContain(PAGERDUTY_SECRET);
      });

      then('it USES the secret in a step (so an unpassed value is a live gap)', () => {
        expect(scene.callee.text).toContain(`secrets.${PAGERDUTY_SECRET}`);
      });
    });

    when('[t1] the caller invokes the callee for the prod deploy', () => {
      then('the prod job passes the pagerduty secret through', () => {
        // guard the shape: an absent `jobs.prod` fails as a clean red, not a raw TypeError
        const prodJob = scene.caller.parsed.jobs?.prod;
        expect(prodJob).toBeDefined();
        // teeth: a `prod` job with no `secrets:` block (the shipped defect) leaves this undefined,
        // so the assertion reddens — which is exactly the state that killed prod alerts.
        const prodSecrets = prodJob?.secrets ?? {};
        expect(Object.keys(prodSecrets)).toContain(PAGERDUTY_SECRET);
      });

      then('the prod job actually calls `.deploy-sls.yml`', () => {
        // guard the shape: a `prod` job absent a `uses:` key leaves this undefined, so assert it
        // is a string first — else `.toContain` on undefined throws a raw TypeError, not a clean
        // red. this file is a durable sentry; a crash undermines that role (r7 i012 nitpick).
        // guards the assertion above from vacuity — it reconciles a REAL call, not a renamed job
        const prodUses = scene.caller.parsed.jobs?.prod?.uses;
        expect(typeof prodUses).toBe('string');
        expect(prodUses).toContain('.deploy-sls.yml');
      });
    });

    when('[t2] the prod job gates on the test result across every trigger branch', () => {
      // github-actions `&&` binds tighter than `||`. so a prod `if:` written
      //   (tag) || (access==prod) && always() && (test ok)
      // parses as  tag || (access && always && test)  — the test gate binds ONLY to the access
      // branch, and a `v*` TAG PUSH deploys to prod on a FAILED test. the correct shape wraps
      // both trigger branches in one OUTER group the gate applies to:
      //   ((tag) || access==prod) && always() && (test ok)
      // `scene` is a useBeforeAll proxy — read it only inside a `then` (post-setup), never at the
      // `when` body level, so each `then` derives the collapsed `if:` string itself.
      const collapseProdIf = (): string =>
        (scene.caller.parsed.jobs?.prod?.if ?? '').replace(/\s+/g, ' ').trim();

      then('the two trigger branches sit in one outer group the test-gate binds to', () => {
        const collapsed = collapseProdIf();
        // guard the shape: an absent `if` leaves collapsed empty, a clean red not a crash
        expect(collapsed.length).toBeGreaterThan(0);
        // teeth: revert the outer paren and isProdGateGroupedCorrectly reddens.
        expect(isProdGateGroupedCorrectly({ collapsedIf: collapsed })).toEqual(
          true,
        );
      });

      then('the buggy per-branch group (access alone in parens after `||`) is absent', () => {
        // teeth: the precedence bug wraps the access branch in its OWN parens after the `||`
        // (`|| (github.event.inputs.access == 'prod') &&`), which lets the tag branch stand alone.
        // the correct shape leaves the access branch bare inside the outer group.
        expect(collapseProdIf()).not.toContain(
          "|| (github.event.inputs.access == 'prod') &&",
        );
      });

      then('the test-result gate itself is present (guards the above from vacuity)', () => {
        expect(collapseProdIf()).toContain(
          "always() && (needs.test.result == 'success' || needs.test.result == 'skipped')",
        );
      });
    });

    when('[t3] the emitted prod-job contract is snapshotted for review', () => {
      // the regex + toContain clamps above prove the SHAPE; this snapshots the emitted
      // contract itself so a reviewer vibechecks the actual `if:` gate and `secrets:`
      // pass-through, and any drift (a reword, an operand reshuffle, a dropped secret)
      // shows as a diff. per rule.require.contract-snapshot-exhaustiveness.
      then('the prod job `if:` gate matches snapshot', () => {
        const prodIf = scene.caller.parsed.jobs?.prod?.if ?? '';
        expect(prodIf).toMatchSnapshot('deploy.yml prod job if: (test-gate precedence)');
      });

      then('the prod job `secrets:` pass-through matches snapshot', () => {
        const prodSecrets = scene.caller.parsed.jobs?.prod?.secrets ?? {};
        expect(yaml.stringify(prodSecrets)).toMatchSnapshot(
          'deploy.yml prod job secrets: (pagerduty pass-through)',
        );
      });

      then('the callee alarm-on-failure step matches snapshot', () => {
        // the pass-through only pages if the callee still gates an alarm step on the secret;
        // snapshot the CONTIGUOUS `alarm on failure` step block — not a line-filter join across the
        // whole file, which spliced the `secrets:` declaration (6-space indent) and this step's
        // env/with lines (10-space indent) into an unparseable, mis-indented fragment. the whole
        // step is valid, uniformly-based yaml, and it still shows both secret usages, so a drop of
        // the step (or of its secret reference) stays diff-visible.
        const alarmBlock =
          scene.callee.text.match(
            /[ \t]*- name: alarm on failure[\s\S]*?pagerduty-dedup-key: github_workflow_failed\n/,
          )?.[0] ?? '';
        // guard vacuity: an empty match would snapshot '' and pass silently on a renamed step
        expect(alarmBlock.length).toBeGreaterThan(0);
        expect(alarmBlock).toMatchSnapshot(
          '.deploy-sls.yml alarm-on-failure step',
        );
      });
    });
  });
});
