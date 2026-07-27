import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the terraform-parameters forget, run through the REAL
 *   declapract apply pipeline against a genTempDir clone of a consumer repo.
 * .why = the bad-practice fix must rewrite every `resource "aws_ssm_parameter"` into
 *   a `removed{}` forget block (never a destroy), and drop the `data` seed-reads —
 *   so terraform lets go of the params without loss of the live value. the
 *   go-forward declastruct wish declares its own names separately; the OLD names
 *   here are simply orphaned (forgotten from terraform, not adopted by declastruct).
 * .note = the terraform file is snapshotted in full (before AND after) so a reviewer
 *   can eyeball the exact end-state, per rule.require.declapract-integration-tests.
 */
describe('terraform-parameters forget', () => {
  given(
    '[case1] a repo with terraform-managed ssm params',
    () => {
      const tempDir = genTempDir({
        slug: 'declapract-terraform-parameters',
        clone: './src/practices/persist-with-rds/bad-practices/terraform-parameters/.test/assets/demo-repo-with-terraform-ssm',
        symlink: [{ at: 'src', to: 'src' }],
      });

      const tfPath = 'provision/aws/product/parameter-store.tf';
      const read = (relativePath: string) =>
        fs.readFile(path.join(tempDir, relativePath), 'utf-8');
      const applyForget = () =>
        executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'persist-with-rds',
          file: tfPath,
        });

      when('[t0] the migration input (before any fix)', () => {
        then('the terraform input matches snapshot', async () => {
          expect(await read(tfPath)).toMatchSnapshot(
            'parameter-store.tf — before',
          );
        });
      });

      when('[t1] the bad-practice forget fix is applied', () => {
        useThen('forget the terraform params', async () => applyForget());

        then(
          'the terraform file holds only removed{} forget blocks (no resource/data blocks) and matches snapshot',
          async () => {
            const tf = await read(tfPath);
            expect(tf).not.toContain('resource "aws_ssm_parameter"');
            expect(tf).not.toContain('data "aws_ssm_parameter"');
            expect(tf).toContain(
              'from = aws_ssm_parameter.secret_database_role_crud_password',
            );
            expect(tf).toContain(
              'from = aws_ssm_parameter.secret_twilio_authToken',
            );
            expect(tf).toContain('destroy = false');
            // full content, for the reviewer's eye
            expect(tf).toMatchSnapshot('parameter-store.tf — after');
          },
        );
      });

      when('[t2] the forget fix is applied a second time (idempotency)', () => {
        // capture the post-first-forget state, apply again, capture again — assert
        // zero change. the forget regex must not re-match its own removed{} output
        // (per rule.require.idempotent-fixes).
        const passes = useThen(
          'a second forget over its own output',
          async () => {
            const before = await read(tfPath); // post-first-forget
            await applyForget(); // second apply
            const after = await read(tfPath);
            return { before, after };
          },
        );

        then('the second forget is a no-op', () => {
          expect(passes.after).toEqual(passes.before);
        });
      });
    },
  );
});
