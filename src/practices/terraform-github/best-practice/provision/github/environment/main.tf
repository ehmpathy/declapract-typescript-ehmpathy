provider "github" {
  owner = "@declapract{variable.organizationName}" # for the @declapract{variable.organizationName} organization
  # note: `token` is sourced from env var GITHUB_TOKEN (e.g,. `use.github`)
}

terraform {
  backend "s3" {
    bucket  = "terraform-state-@declapract{variable.infrastructureNamespaceId}-prod" # tracked in the prod aws account's s3 bucket, so `use.@declapract{variable.organizationName}.prod`
    key     = "@declapract{variable.projectName}-github"
    region  = "us-east-1"
    encrypt = true
  }
}

module "product" {
  source     = "../product"
  name       = "@declapract{variable.projectName}"
  visibility = "private"
  protected  = true
}
