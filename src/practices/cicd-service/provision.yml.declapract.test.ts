import type { FileContentsContext } from 'declapract';

import {
  RDS_JOBS_ANCHOR,
  contents,
  withoutRdsJobs,
} from './best-practice/.github/workflows/provision.yml.declapract';

/**
 * .what = builds the minimal FileContentsContext the `contents` fn actually reads
 * .why  = the provision.yml `contents` fn reads only `projectPractices` (the rds-usecase
 *         signal). the single documented cast here is the sanctioned test-context idiom
 *         (howto.add-bad-practice.md); it is confined to this helper so no call site casts.
 */
const asContext = (projectPractices: string[]): FileContentsContext =>
  ({ projectPractices }) as unknown as FileContentsContext;

/**
 * .teeth = the D28 gate. the "omits" case is the sharp one: it reddens if the strip anchor
 *          drifts or the gate is removed — the exact state where a non-rds service inherits rds
 *          jobs it cannot run (the live break D28/#573 names).
 */
describe('provision.yml — the D28 rds-jobs gate', () => {
  it('includes the 4 rds jobs when the project uses persist-with-rds', async () => {
    const declared = await contents(asContext(['persist-with-rds']));
    expect(declared).toContain('sql-schema-prep:');
    expect(declared).toContain('sql-schema-prod:');
    expect(declared).toContain('aws-prep-declastruct:');
    expect(declared).toContain('aws-prod-declastruct:');
  });

  it('omits the 4 rds jobs when the project does not use persist-with-rds', async () => {
    const declared = await contents(asContext([]));
    expect(declared).not.toContain('sql-schema-prep:');
    expect(declared).not.toContain('sql-schema-prod:');
    expect(declared).not.toContain('aws-prep-declastruct:');
    expect(declared).not.toContain('aws-prod-declastruct:');
  });

  it('keeps the generic jobs regardless of the rds usecase', async () => {
    const declared = await contents(asContext([]));
    expect(declared).toContain('aws-test-terraform:');
    expect(declared).toContain('aws-prep-terraform:');
    expect(declared).toContain('aws-prod-terraform:');
    expect(declared).toContain('github:');
  });
});

/**
 * .teeth = the fail-loud clamp for the strip. a bare `split(ANCHOR)[0]` on a MISSED anchor
 *          returns the whole superset, so a non-rds consumer would silently inherit all 4 rds
 *          jobs and CONTAINS would still pass (a superset holds the declared prefix) — the exact
 *          D28 silent re-ship. so a miss must THROW, not fail OPEN (`rule.forbid.failhide`).
 *          revert the `if (!includes) throw` guard and the first case here goes green (the miss
 *          returns the unstripped input), so the throw is what this clamp holds.
 */
describe('withoutRdsJobs — fail loud on a missed anchor', () => {
  it('throws when the rds-jobs anchor is absent, rather than re-ship the whole superset', () => {
    expect(() => withoutRdsJobs({ contents: 'jobs:\n  github:\n    x: y\n' })).toThrow(
      /could not find the rds-jobs anchor/,
    );
  });

  it('truncates at the anchor when present, holds only the pre-anchor prefix', () => {
    const superset = `prefix-jobs${RDS_JOBS_ANCHOR}\n    rds-tail: here\n`;
    const stripped = withoutRdsJobs({ contents: superset });
    expect(stripped).toBe('prefix-jobs\n');
    expect(stripped).not.toContain('sql-schema-prep:');
    expect(stripped).not.toContain('rds-tail');
  });
});
