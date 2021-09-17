provider "aws" {
  region = "us-east-1"
}

terraform {
  backend "s3" {
    bucket = "terraform-state-@declapract{variable.infrastructureNamespaceId}-dev"
    key    = "@declapract{variable.serviceName}-dev"
    region = "us-east-1"
    encrypt = true
  }
}

module "product" {
  source      = "../../product"
  environment = "dev"
}
