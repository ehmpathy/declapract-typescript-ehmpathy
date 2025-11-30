# Secrets Manager secret for RDS Data API authentication
# The secret contains username/password credentials for the crud database role

data "aws_ssm_parameter" "database_role_crud_password" {
  count = var.environment == "prod" ? 1 : 0
  name  = "${local.parameter_store_namespace}.database.role.crud.password"
}

resource "aws_secretsmanager_secret" "rds_data_api_credentials" {
  name = "rds-db-credentials/ahbodedb/user/@declapract{variable.databaseUserName.serviceUser}"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "rds_data_api_credentials" {
  secret_id = aws_secretsmanager_secret.rds_data_api_credentials.id
  secret_string = jsonencode({
    username = "@declapract{variable.databaseUserName.serviceUser}"
    password = var.environment == "prod" ? data.aws_ssm_parameter.database_role_crud_password[0].value : "__CHANG3_ME__"
  })
}
