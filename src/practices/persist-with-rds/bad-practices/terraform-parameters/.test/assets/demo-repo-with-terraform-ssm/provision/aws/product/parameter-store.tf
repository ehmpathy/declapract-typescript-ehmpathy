data "aws_ssm_parameter" "legacy_admin_password" {
  name            = "${local.parameter_store_namespace}.database.admin.password"
  count           = var.environment == "prod" ? 1 : 0
  with_decryption = true
}
resource "aws_ssm_parameter" "secret_database_role_crud_password" {
  name  = "${local.parameter_store_namespace}.database.role.crud.password"
  type  = "SecureString"
  value = "__IGNORED__"
  tags  = local.tags
  lifecycle {
    ignore_changes = [value]
  }
}
resource "aws_ssm_parameter" "secret_twilio_authToken" {
  name  = "${local.parameter_store_namespace}.twilio.authToken"
  type  = "SecureString"
  value = "__IGNORED__"
  tags  = local.tags
  lifecycle {
    ignore_changes = [value]
  }
}
