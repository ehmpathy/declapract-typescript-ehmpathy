provider "aws" {
  region              = "us-east-1"
  allowed_account_ids = ["@declapract{variable.awsAccountId.prep}"] # `test` environment resources are provisioned in the `prep` aws account
}

terraform {
  backend "s3" {
    bucket  = "terraform-state-@declapract{variable.infrastructureNamespaceId}-test"
    key     = "@declapract{variable.projectName}-test"
    region  = "us-east-1"
    encrypt = true
  }
}

module "product" {
  source      = "../../product"
  environment = "test"
}
