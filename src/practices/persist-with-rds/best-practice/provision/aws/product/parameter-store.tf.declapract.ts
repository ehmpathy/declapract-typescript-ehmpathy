import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS; // i.e., check that the contents of the file contains what's declared (default is equals)

const cicdRoleResource = `resource "aws_ssm_parameter" "secret_database_role_cicd_password" {
  name  = "\${local.parameter_store_namespace}.database.role.cicd.password"
  type  = "SecureString"
  value = aws_ssm_parameter.secret_database_admin_password[0].value
  tags  = local.tags
  count = var.environment == "prod" ? 1 : 0
  lifecycle {
    ignore_changes = [
      value # we only need the real value on the first initialization, afterwards, users shouldn't have this
    ]
  }
}`;

const crudRoleResource = `resource "aws_ssm_parameter" "secret_database_role_crud_password" {
  name  = "\${local.parameter_store_namespace}.database.role.crud.password"
  type  = "SecureString"
  value = aws_ssm_parameter.secret_database_service_password[0].value
  tags  = local.tags
  count = var.environment == "prod" ? 1 : 0
  lifecycle {
    ignore_changes = [
      value # we only need the real value on the first initialization, afterwards, users shouldn't have this
    ]
  }
}`;

export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents: context.declaredFileContents };
  let fixed = contents
    .replace(
      /value\s+\= var\.secret_database_\w+_password/g,
      `value = "__IGNORED__" # "ignored" since we dont want to check in secrets to version control (terraform.lifecycle.ignore_changes -> value isn't overwritten)`,
    )
    .replace(
      /local\.tags\n\s+lifecycle/g,
      `local.tags\n  count = var.environment == "prod" ? 1 : 0 # only needed in prod env, in other envs its hardcoded in config.\${env}.json since it's not sensitive\n  lifecycle`,
    );

  // Append role resources if not already present
  if (!fixed.includes('secret_database_role_cicd_password')) {
    fixed = fixed.trimEnd() + '\n' + cicdRoleResource + '\n';
  }
  if (!fixed.includes('secret_database_role_crud_password')) {
    fixed = fixed.trimEnd() + '\n' + crudRoleResource + '\n';
  }

  return { contents: fixed };
};
