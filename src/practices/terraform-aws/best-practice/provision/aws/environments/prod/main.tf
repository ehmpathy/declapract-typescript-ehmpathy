provider "aws" {
  region              = "us-east-1"
  allowed_account_ids = ["@declapract{variable.awsAccountId.prod}"] # `prod` environment resources are provisioned in the `prod` aws account
}

terraform {
  backend "s3" {
    bucket  = "terraform-state-@declapract{variable.infrastructureNamespaceId}-prod"
    key     = "@declapract{variable.projectName}-prod"
    region  = "us-east-1"
    encrypt = true
  }
}

module "product" {
  source      = "../../product"
  environment = "prod"
}
