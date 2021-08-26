resource "aws_ssm_parameter" "secret_database_admin_password" {
  name  = "${local.parameter_store_namespace}.database.admin.password"
  type  = "SecureString"
  value = "__IGNORED__" # replaced with placeholder after instantiation, because lifecycle.ignore_changes is true and we dont want secrets in version control
  tags  = local.tags
  count = var.environment == "prod" ? 1 : 0 # only needed in prod env, in other envs its hardcoded in config since not sensitive
  lifecycle {
    ignore_changes = [
      value # we only need the real value on the first initialization, afterwards, users shouldn't have this
    ]
  }
}
resource "aws_ssm_parameter" "secret_database_service_password" {
  name  = "${local.parameter_store_namespace}.database.service.password"
  type  = "SecureString"
  value = "__IGNORED__" # replaced with placeholder after instantiation, because lifecycle.ignore_changes is true and we dont want secrets in version control
  tags  = local.tags
  count = var.environment == "prod" ? 1 : 0 # only needed in prod env, in other envs its hardcoded in config since not sensitive
  lifecycle {
    ignore_changes = [
      value # we only need the real value on the first initialization, afterwards, users shouldn't have this
    ]
  }
}
