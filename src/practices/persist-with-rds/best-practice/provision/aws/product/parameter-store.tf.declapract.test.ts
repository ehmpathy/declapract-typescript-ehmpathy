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

  it('should append secret_database_role_cicd_password resource if not present', async () => {
    const { contents: fixedContents } = await fix(exampleContents, {} as any);
    expect(fixedContents).toContain(
      'resource "aws_ssm_parameter" "secret_database_role_cicd_password"',
    );
    expect(fixedContents).toContain(
      'value = aws_ssm_parameter.secret_database_admin_password[0].value',
    );
  });

  it('should append secret_database_role_crud_password resource if not present', async () => {
    const { contents: fixedContents } = await fix(exampleContents, {} as any);
    expect(fixedContents).toContain(
      'resource "aws_ssm_parameter" "secret_database_role_crud_password"',
    );
    expect(fixedContents).toContain(
      'value = aws_ssm_parameter.secret_database_service_password[0].value',
    );
  });

  it('should not duplicate role resources if they already exist', async () => {
    const contentsWithRoles =
      exampleContents +
      `
resource "aws_ssm_parameter" "secret_database_role_cicd_password" {
  name  = "\${local.parameter_store_namespace}.database.role.cicd.password"
  type  = "SecureString"
  value = aws_ssm_parameter.secret_database_admin_password[0].value
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
  value = aws_ssm_parameter.secret_database_service_password[0].value
  tags  = local.tags
  count = var.environment == "prod" ? 1 : 0
  lifecycle {
    ignore_changes = [
      value
    ]
  }
}
`;
    const { contents: fixedContents } = await fix(contentsWithRoles, {} as any);
    const cicdMatches = (
      fixedContents?.match(/secret_database_role_cicd_password/g) || []
    ).length;
    const crudMatches = (
      fixedContents?.match(/secret_database_role_crud_password/g) || []
    ).length;
    expect(cicdMatches).toBe(1); // should only appear once (in resource name)
    expect(crudMatches).toBe(1); // should only appear once (in resource name)
  });
});
