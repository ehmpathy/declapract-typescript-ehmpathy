import { getError } from 'test-fns';

import { check, fix } from './parameter-store.tf.declapract';

const legacyContents = `data "aws_ssm_parameter" "legacy_admin_password" {
  name            = "\${local.parameter_store_namespace}.database.admin.password"
  count           = var.environment == "prod" ? 1 : 0
  with_decryption = true
}
resource "aws_ssm_parameter" "secret_database_admin_password" {
  name  = "\${local.parameter_store_namespace}.database.admin.password"
  type  = "SecureString"
  value = "__IGNORED__"
  tags  = local.tags
  count = var.environment == "prod" ? 1 : 0
  lifecycle {
    ignore_changes = [
      value
    ]
  }
}
resource "aws_ssm_parameter" "secret_database_role_crud_password" {
  name  = "\${local.parameter_store_namespace}.database.role.crud.password"
  type  = "SecureString"
  value = "__CHANG3_ME__"
  tags  = local.tags
  lifecycle {
    ignore_changes = [value]
  }
}
`;

describe('terraform-parameters parameter-store.tf.declapract', () => {
  describe('check', () => {
    it('should detect the bad practice when terraform declares an ssm parameter resource', () => {
      expect(() => check(legacyContents, {} as any)).not.toThrow();
    });

    it('should skip a file with no ssm parameter resources', async () => {
      const error = await getError(async () =>
        check('resource "aws_s3_bucket" "b" {}', {} as any),
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('not the terraform-parameters bad practice');
    });

    it('should skip an already-migrated file (only removed{} blocks)', async () => {
      const migrated = `removed {\n  from = aws_ssm_parameter.x\n  lifecycle {\n    destroy = false\n  }\n}\n`;
      const error = await getError(async () => check(migrated, {} as any));
      expect(error).toBeDefined();
    });
  });

  describe('fix', () => {
    it('should rewrite every resource block into a forget block and drop data reads', async () => {
      const { contents } = await fix(legacyContents, {} as any);

      // no resource or data blocks remain
      expect(contents).not.toContain('resource "aws_ssm_parameter"');
      expect(contents).not.toContain('data "aws_ssm_parameter"');

      // each param is now a destroy=false forget block
      expect(contents).toContain(
        'from = aws_ssm_parameter.secret_database_admin_password',
      );
      expect(contents).toContain(
        'from = aws_ssm_parameter.secret_database_role_crud_password',
      );
      expect(contents).toContain('destroy = false');

      // the nested lifecycle brace did not truncate the block early
      expect(contents).not.toContain('ignore_changes');
    });

    it('should name the copy target of each admin/service forget (#686)', async () => {
      const withService = `${legacyContents}resource "aws_ssm_parameter" "secret_database_service_password" {
  name  = "\${local.parameter_store_namespace}.database.service.password"
  type  = "SecureString"
  value = "__IGNORED__"
  lifecycle {
    ignore_changes = [value]
  }
}
`;
      // a documented cast: the fix reads only `projectVariables` off its context, which carries
      // many other fields. removal path: a declapract partial-context builder.
      const context = {
        projectVariables: { organizationName: 'ahbode', projectName: 'svc-chat' },
      } as any;
      const { contents } = await fix(withService, context);

      // the admin forget names both cicd targets, on the line above its block
      expect(contents).toContain(
        [
          '# copy this value before the first plan → /ahbode/svc-chat/{config}/database.role.cicd.for-plan.password, /ahbode/svc-chat/{config}/database.role.cicd.for-apply.password (see provision/aws/readme.md)',
          'removed {',
          '  from = aws_ssm_parameter.secret_database_admin_password',
        ].join('\n'),
      );

      // the service forget names the crud target
      expect(contents).toContain(
        [
          '# copy this value before the first plan → /ahbode/svc-chat/{config}/database.role.crud.password (see provision/aws/readme.md)',
          'removed {',
          '  from = aws_ssm_parameter.secret_database_service_password',
        ].join('\n'),
      );

      // a param of neither role carries no copy note
      expect(contents).not.toContain(
        'copy this value before the first plan → /ahbode/svc-chat/{config}/database.role.crud.password (see provision/aws/readme.md)\nremoved {\n  from = aws_ssm_parameter.secret_database_role_crud_password',
      );
      expect(contents).toMatchSnapshot();

      // idempotent: the fix over its own output changes zero
      const { contents: twice } = await fix(contents, context);
      expect(twice).toEqual(contents);
    });

    it('should be idempotent — a second fix over its own output changes zero', async () => {
      // apply once, then feed the output back through the fix. the forget-rewrite
      // regex must not re-match its own removed{} blocks (per rule.require.idempotent-fixes).
      const { contents: once } = await fix(legacyContents, {} as any);
      const { contents: twice } = await fix(once, {} as any);
      expect(twice).toEqual(once);
    });
  });
});
