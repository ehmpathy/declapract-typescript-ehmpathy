# ====================
# legacy params (kept for backwards compatibility)
# ====================
resource "aws_ssm_parameter" "secret_database_admin_password" {
  name  = "${local.parameter_store_namespace}.database.admin.password"
  type  = "SecureString"
  value = "__IGNORED__" # "ignored" since we dont want to check in secrets to version control (terraform.lifecycle.ignore_changes -> value isn't overwritten)
  tags  = local.tags
  count = var.environment == "prod" ? 1 : 0 # only needed in prod env, in other envs its hardcoded in config.${env}.json since it's not sensitive
  lifecycle {
    ignore_changes = [
      value # we only need the real value on the first initialization, afterwards, users shouldn't have this
    ]
  }
}
resource "aws_ssm_parameter" "secret_database_service_password" {
  name  = "${local.parameter_store_namespace}.database.service.password"
  type  = "SecureString"
  value = "__IGNORED__" # "ignored" since we dont want to check in secrets to version control (terraform.lifecycle.ignore_changes -> value isn't overwritten)
  tags  = local.tags
  count = var.environment == "prod" ? 1 : 0 # only needed in prod env, in other envs its hardcoded in config.${env}.json since it's not sensitive
  lifecycle {
    ignore_changes = [
      value # we only need the real value on the first initialization, afterwards, users shouldn't have this
    ]
  }
}

# ====================
# new role-based params (standard naming)
# ====================
# read legacy params to copy values (prod only)
data "aws_ssm_parameter" "legacy_admin_password" {
  name            = "${local.parameter_store_namespace}.database.admin.password"
  count           = var.environment == "prod" ? 1 : 0
  with_decryption = true
}
data "aws_ssm_parameter" "legacy_service_password" {
  name            = "${local.parameter_store_namespace}.database.service.password"
  count           = var.environment == "prod" ? 1 : 0
  with_decryption = true
}

resource "aws_ssm_parameter" "secret_database_role_cicd_password" {
  name  = "${local.parameter_store_namespace}.database.role.cicd.password"
  type  = "SecureString"
  value = var.environment == "prod" ? data.aws_ssm_parameter.legacy_admin_password[0].value : "__CHANG3_ME__"
  tags  = local.tags
  count = var.environment != "test" ? 1 : 0
  lifecycle {
    ignore_changes = [value]
  }
}
resource "aws_ssm_parameter" "secret_database_role_crud_password" {
  name  = "${local.parameter_store_namespace}.database.role.crud.password"
  type  = "SecureString"
  value = var.environment == "prod" ? data.aws_ssm_parameter.legacy_service_password[0].value : "__CHANG3_ME__"
  tags  = local.tags
  count = var.environment != "test" ? 1 : 0
  lifecycle {
    ignore_changes = [value]
  }
}
