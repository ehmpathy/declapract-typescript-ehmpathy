import { FileCheckType, FileFixFunction } from 'declapract';
import { getServiceVariables } from '../../../../../../getVariables';

export const check = FileCheckType.CONTAINS; // i.e., check that the contents of the file contains what's declared (default is equals)

export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return {}; // do nothing if file dne; // TODO: return the parsed declared contents in the future
  const { organizationName, serviceName } = getServiceVariables(context);
  return {
    contents: contents.replace(
      `parameter_store_namespace = "${organizationName}.${serviceName}.\${var.environment}"\n`,
      `parameter_store_namespace = "${organizationName}.${serviceName}.\${var.environment}" # keep in sync with \`/config/\${env}.json#parameterStoreNamespace\n`,
    ),
  };
};
