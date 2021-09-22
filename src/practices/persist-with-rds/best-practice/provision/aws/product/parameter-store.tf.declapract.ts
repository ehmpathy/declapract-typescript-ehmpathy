import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS; // i.e., check that the contents of the file contains what's declared (default is equals)

export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents: context.declaredFileContents };
  return {
    contents: contents
      .replace(
        /value\s+\= var\.secret_database_\w+_password/g,
        `value = "__IGNORED__" # "ignored" since we dont want to check in secrets to version control (terraform.lifecycle.ignore_changes -> value isn't overwritten)`,
      )
      .replace(
        /local\.tags\n\s+lifecycle/g,
        `local.tags\n  count = var.environment == "prod" ? 1 : 0 # only needed in prod env, in other envs its hardcoded in config.\${env}.json since it's not sensitive\n  lifecycle`,
      ),
  };
};
