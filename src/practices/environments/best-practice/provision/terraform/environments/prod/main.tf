terraform {
  backend "s3" {
    bucket = "terraform-state-@declapract{variable.infrastructureNamespaceId}-prod"
    key    = "@declapract{variable.serviceName}-prod"
    region = "us-east-1"
  }
}

module "product" {
  source      = "../../product"
  environment = "prod"
}
