import type { DeclastructProvider } from 'declastruct';
import { getDeclastructAwsProvider } from 'declastruct-aws';
import type { DomainEntity } from 'domain-objects';
import { genLogMethods } from 'sdk-logs';

import { getParameters } from './resources.parameters';

/**
 * .what = the declastruct wish for this service's aws resources.
 * .why = declastruct-aws owns the ssm parameters that terraform now forgets (see
 *        provision/aws/product/parameter-store.tf). the plan role reconciles secrets
 *        WITHOUT any ssm:GetParameter or kms:Decrypt; apply writes via PutParameter +
 *        kms:Encrypt.
 */

export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider(
    {},
    {
      // MUST be an sdk-logs logger — the DAOs read log._.level via as-procedure
      log: genLogMethods(),
    },
  ),
];

export const getResources = async (): Promise<DomainEntity<any>[]> =>
  getParameters();
