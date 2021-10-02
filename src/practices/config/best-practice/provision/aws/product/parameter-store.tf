locals {
  parameter_store_namespace = "@declapract{variable.organizationName}.${local.service}.${var.environment}" # keep in sync with `/config/${env}.json#parameterStoreNamespace
}
