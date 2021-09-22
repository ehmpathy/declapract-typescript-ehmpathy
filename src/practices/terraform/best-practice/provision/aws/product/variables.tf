variable "environment" {}

locals {
  service = "@declapract{variable.serviceName}"
}

locals {
  tags = {
    app         = "@declapract{variable.organizationName}"
    environment = var.environment
    product     = local.service
  }
}
