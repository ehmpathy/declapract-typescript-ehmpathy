locals {
  parameter_store_namespace = "@declapract{variable.organizationName}.@declapract{variable.serviceName}.${var.environment}" # keep in sync with `/config/${env}.json#parameterStoreNamespace
}
