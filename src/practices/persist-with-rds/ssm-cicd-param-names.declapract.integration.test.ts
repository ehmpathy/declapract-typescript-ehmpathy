import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps that the ssm-off-terraform wish declares the two cicd credentials as SLASH paths
 *         with NO tier segment, while the crud credential keeps its dotted tier-scoped name.
 * .why  = the prod plan role pins its ONE `kms:Decrypt` exception to a slash arn
 *         (`parameter/*​/svc-*​/database/role/cicd/for-plan/*`) that needs literal `/` separators
 *         and omits a tier (the aws ACCOUNT separates prep from prod, never the name). a dotted
 *         name cannot match that arn, so the plan role gets ciphertext or a denial, forever, and
 *         a repo does not find out until prod (#591). the shipped `ahbode/svc-home-services` proved
 *         the slash form; this clamp ports it into the practice so no consumer inherits the dotted
 *         cicd name again. crud is pinned by NO policy, so it keeps its dotted name and this clamp
 *         leaves it alone.
 * .teeth = revert either cicd entry to the dotted `${namespace}.database.role.cicd.for-plan.password`
 *          form and the slash-present case reddens; the no-dotted-cicd case reddens too.
 * .note = `.declapract.test.ts` = this repo's UNIT-test marker; at the practice ROOT (not under
 *         best-practice/), so it is neither loaded as a declaration nor copied to a consumer.
 */

// anchor on __dirname, not process.cwd(): a nested `jest src/practices/...` run has a different cwd.
// from this file (src/practices/persist-with-rds/) the best-practice tree is one segment down.
const paramsPath = join(
  __dirname,
  'best-practice/provision/aws/resources.parameters.ts',
);

describe('persist-with-rds ssm cicd param names are slash-path, tierless', () => {
  const source = readFileSync(paramsPath, 'utf8');

  given('[case1] the two cicd credentials', () => {
    when('[t0] resources.parameters.ts is read', () => {
      then('for-plan is a slash path, byte-identical to the iam pin', () => {
        expect(source).toContain('/database/role/cicd/for-plan/password');
      });

      then('for-apply is a slash path', () => {
        expect(source).toContain('/database/role/cicd/for-apply/password');
      });

      then('neither cicd name is dotted (a dotted name cannot match the arn pin)', () => {
        expect(source).not.toContain('.database.role.cicd.for-plan');
        expect(source).not.toContain('.database.role.cicd.for-apply');
      });

      then('the cicd slash path carries no tier segment (project joins /database directly)', () => {
        // /{org}/{project}/database/... — a tier segment would split project from database
        expect(source).toContain('projectName}/database/role/cicd/for-plan/password');
        expect(source).not.toContain('${slug}/database/role/cicd');
      });

      // the emitted param-name lines are the caller-faced contract: snapshot them so a reword that
      // keeps the slash tokens green (a re-templated prefix, a moved tier segment) reddens a vibecheck.
      then('the emitted cicd + crud param-name lines match snapshot', () => {
        const nameLines = source
          .split('\n')
          .filter((line) => line.includes('database/role/cicd') || line.includes('database.role.'))
          .map((line) => line.trim());
        expect(nameLines).toMatchSnapshot('ssm cicd + crud param names');
      });
    });
  });

  given('[case2] the crud credential', () => {
    when('[t0] resources.parameters.ts is read', () => {
      then('crud keeps its dotted tier-scoped name (no policy pins it)', () => {
        expect(source).toContain('${namespace}.database.role.crud.password');
      });
    });
  });
});
