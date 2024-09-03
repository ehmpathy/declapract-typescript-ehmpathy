variable "environment" {}

locals {
  service      = "@declapract{variable.projectName}"
  s3_namespace = "@declapract{variable.infrastructureNamespaceId}"
}

locals {
  tags = {
    app         = "@declapract{variable.organizationName}"
    environment = var.environment
    product     = local.service
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
locals {
  aws_account_id = data.aws_caller_identity.current.account_id
  aws_region     = data.aws_region.current.name
}
