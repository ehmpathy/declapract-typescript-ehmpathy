terraform {
  backend "s3" {
    bucket = "terraform-state-@declapract{variable.infrastructureNamespaceId}-dev"
    key    = "@declapract{variable.serviceName}-dev"
    region = "us-east-1"
  }
}

module "product" {
  source      = "../../product"
  environment = "dev"
}
