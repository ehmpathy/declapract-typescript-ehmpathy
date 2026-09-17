import { join } from 'node:path';

import { check, fix } from './provision.yml.declapract';

// .note (rule.forbid.as-cast, documented): the declapract context arg is a PARTIAL mock. check
// reads `context.projectPractices` AND `context.getProjectRootDirectory()`; the `as any` asserts
// that partial to the full FileCheckContext type. this is the repo-wide test idiom.

// fixture roots (real dirs, read by existsSync — no temp dir, no symlink walk, so a unit test).
// repo-non-rds ships NO provision callee, so shipsAnyRdsCallee is false there; the two *-callee
// roots each ship one rds callee on disk, the scope-robust signal that survives a narrow
// `--practice cicd-service` apply.
const FIXTURES = join(__dirname, '../../.test/assets');
const ROOT_NON_RDS = join(FIXTURES, 'repo-non-rds');
const ROOT_RDS_SCHEMA = join(FIXTURES, 'repo-with-schema-callee');
const ROOT_RDS_AWS = join(FIXTURES, 'repo-with-aws-resources-callee');

const genContext = (input: { root: string; projectPractices: string[] }) =>
  ({
    projectPractices: input.projectPractices,
    getProjectRootDirectory: () => input.root,
  }) as any;

// a minimal non-rds superset: the generic `github` job, then the rds-jobs tail (the anchor).
const supersetContents = `
jobs:
  github:
    uses: ./.github/workflows/.declastruct.yml
    with:
      scope: github
      access: prod

  sql-schema-prep:
    uses: ./.github/workflows/.sql-schema-control.yml
    with:
      access: prep

  sql-schema-prod:
    uses: ./.github/workflows/.sql-schema-control.yml
    with:
      access: prod

  aws-prep-declastruct:
    uses: ./.github/workflows/.declastruct.yml
    with:
      scope: aws
      access: prep

  aws-prod-declastruct:
    uses: ./.github/workflows/.declastruct.yml
    with:
      scope: aws
      access: prod
`.trim();

const RDS_JOBS = [
  'sql-schema-prep:',
  'sql-schema-prod:',
  'aws-prep-declastruct:',
  'aws-prod-declastruct:',
];

describe('rds-jobs-in-non-rds-service', () => {
  describe('check', () => {
    it('detects the rds-jobs tail in a non-rds service', () => {
      expect(() =>
        check(
          supersetContents,
          genContext({
            root: ROOT_NON_RDS,
            projectPractices: ['cicd-service'],
          }),
        ),
      ).not.toThrow();
    });

    it('does not match when persist-with-rds is in play — an rds service keeps its jobs', () => {
      expect(() =>
        check(
          supersetContents,
          genContext({
            root: ROOT_NON_RDS,
            projectPractices: ['cicd-service', 'persist-with-rds'],
          }),
        ),
      ).toThrow('does not match bad practice');
    });

    it('does not match when the rds tail is already gone', () => {
      const narrowed = supersetContents.split('\n\n  sql-schema-prep:')[0]!;
      expect(() =>
        check(
          narrowed,
          genContext({
            root: ROOT_NON_RDS,
            projectPractices: ['cicd-service'],
          }),
        ),
      ).toThrow('does not match bad practice');
    });

    // the scope-robust clamp (r11 b2). a narrow `declapract fix --practice cicd-service` darkens
    // `context.projectPractices` to `['cicd-service']` (getScopedPractices runs BEFORE the
    // derivation), so the persist-with-rds flag alone would go dark on a GENUINE rds repo and the
    // strip would truncate its live rds jobs. the callee-on-disk signal does not depend on the
    // `--practice` filter, so it holds the rds truth under a narrow apply and refuses the strip.
    it('does NOT strip a genuine rds repo under narrow --practice scope — schema callee on disk', () => {
      expect(() =>
        check(
          supersetContents,
          genContext({
            root: ROOT_RDS_SCHEMA, // provision/schema present, though the flag is dark
            projectPractices: ['cicd-service'],
          }),
        ),
      ).toThrow('does not match bad practice');
    });

    it('does NOT strip a genuine rds repo under narrow --practice scope — aws resources callee on disk', () => {
      expect(() =>
        check(
          supersetContents,
          genContext({
            root: ROOT_RDS_AWS, // provision/aws/resources.ts present, though the flag is dark
            projectPractices: ['cicd-service'],
          }),
        ),
      ).toThrow('does not match bad practice');
    });
  });

  describe('fix', () => {
    it('strips all 4 rds jobs from a non-rds superset', async () => {
      const { contents: fixed } = await fix(supersetContents, {} as any);
      for (const job of RDS_JOBS) expect(fixed).not.toContain(job);
    });

    it('keeps the generic github job intact', async () => {
      const { contents: fixed } = await fix(supersetContents, {} as any);
      expect(fixed).toContain('github:');
    });

    it('leaves absent contents untouched', async () => {
      const { contents: fixed } = await fix(null as any, {} as any);
      expect(fixed).toBeNull();
    });
  });

  describe('idempotency (rule.require.idempotent-fixes)', () => {
    it('check throws on the fixed output — a second pass cannot loop', async () => {
      const { contents: fixed } = await fix(supersetContents, {} as any);
      expect(() =>
        check(
          fixed as string,
          genContext({ root: ROOT_NON_RDS, projectPractices: ['cicd-service'] }),
        ),
      ).toThrow('does not match bad practice');
    });

    it('fix(fix(x)) throws loud on the second strip — the anchor is gone', async () => {
      const { contents: once } = await fix(supersetContents, {} as any);
      expect(() => fix(once as string, {} as any)).toThrow(
        'could not find the rds-jobs anchor',
      );
    });
  });
});
