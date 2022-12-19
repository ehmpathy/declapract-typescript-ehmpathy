provider "aws" {
  region              = "us-east-1"
  allowed_account_ids = ["@declapract{variable.awsAccountId.dev}"] # `dev` environment resources are provisioned in the `dev` aws account
}

terraform {
  backend "s3" {
    bucket  = "terraform-state-@declapract{variable.infrastructureNamespaceId}-dev"
    key     = "@declapract{variable.projectName}-dev"
    region  = "us-east-1"
    encrypt = true
  }
}

module "product" {
  source      = "../../product"
  environment = "dev"
}
