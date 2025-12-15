import type { FileCheckFunction } from 'declapract';

import { getServiceVariables } from '../../../../../getVariables';

export const check: FileCheckFunction = (contents, context) => {
  const { awsAccountId } = getServiceVariables(context);
  if (!contents?.includes(awsAccountId.prod))
    throw new Error('does not contain aws prod account id');
};
