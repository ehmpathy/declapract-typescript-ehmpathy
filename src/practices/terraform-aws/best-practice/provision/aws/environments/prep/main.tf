provider "aws" {
  region              = "us-east-1"
  allowed_account_ids = ["@declapract{variable.awsAccountId.prep}"] # `prep` access tier resources are provisioned in the `prep` aws account
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
  environment = "dev" # infrastructure stays named 'dev', application uses ACCESS=prep
}
