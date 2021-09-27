locals {
  parameter_store_namespace = "@declapract{variable.organizationName}.${var.service}.${var.environment}" # keep in sync with `/config/${env}.json#parameterStoreNamespace
}
