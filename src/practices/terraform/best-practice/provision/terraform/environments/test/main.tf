provider "aws" {
  region = "us-east-1"
}

terraform {
  backend "s3" {
    bucket = "terraform-state-@declapract{variable.infrastructureNamespaceId}-test"
    key    = "@declapract{variable.serviceName}-test"
    region = "us-east-1"
    encrypt = true
  }
}

module "product" {
  source      = "../../product"
  environment = "test"
}
