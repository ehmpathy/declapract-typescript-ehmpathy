variable "environment" {}

locals {
  service      = "@declapract{variable.serviceName}"
  s3_namespace = "@declapract{variable.infrastructureNamespaceId}"
}

locals {
  tags = {
    app         = "@declapract{variable.organizationName}"
    environment = var.environment
    product     = local.service
  }
}
