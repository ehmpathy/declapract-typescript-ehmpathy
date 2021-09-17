import { fix } from './parameter-store.tf.declapract';

const exampleContents = `
resource "aws_ssm_parameter" "secret_database_admin_password" {
  name  = "\${local.parameter_store_namespace}.database.admin.password"
  type  = "SecureString"
  value = "__IGNORED__" # "ignored" since we dont want to check in secrets to version control (terraform.lifecycle.ignore_changes -> value isn't overwritten)
  tags  = local.tags
  lifecycle {
    ignore_changes = [
      value # we only need the real value on the first initialization, afterwards, users shouldn't have this
    ]
  }
}
resource "aws_ssm_parameter" "secret_database_service_password" {
  name  = "\${local.parameter_store_namespace}.database.service.password"
  type  = "SecureString"
  value = "__IGNORED__" # "ignored" since we dont want to check in secrets to version control (terraform.lifecycle.ignore_changes -> value isn't overwritten)
  tags  = local.tags
  lifecycle {
    ignore_changes = [
      value # we only need the real value on the first initialization, afterwards, users shouldn't have this
    ]
  }
}
`;

describe('parameter-store.ts', () => {
  it('should add the count if the count is missing', async () => {
    const { contents: fixedContents } = await fix(exampleContents, {} as any);
    expect(fixedContents).toContain('count = ');
  });
});
