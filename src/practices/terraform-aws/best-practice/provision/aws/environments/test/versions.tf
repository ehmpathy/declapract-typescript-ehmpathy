terraform {
  required_version = ">= 1.7" # removed{} blocks (parameter-store forget) need >= 1.7
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "3.74.3"
    }
  }
}
