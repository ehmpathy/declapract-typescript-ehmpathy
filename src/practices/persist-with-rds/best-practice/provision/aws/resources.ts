import type { DeclastructProvider } from 'declastruct';
import { getDeclastructAwsProvider } from 'declastruct-aws';
import type { DomainEntity } from 'domain-objects';
import { genLogMethods } from 'sdk-logs';

import { getAllParameters } from './resources.parameters';

/**
 * .what = the declastruct wish for this service's aws resources.
 * .why = declastruct-aws owns the ssm parameters that terraform now forgets (see
 *        provision/aws/product/parameter-store.tf). the plan role reconciles secrets
 *        without any ssm:GetParameter or kms:Decrypt; apply writes via PutParameter +
 *        kms:Encrypt.
 * .name = `getProviders` + `getResources` are declastruct's REQUIRED wish entrypoint names, so
 *         both are exempt from the get-set-gen One/All cardinality rule (a `getAll*` rename makes
 *         declastruct find no entrypoint — the wish dies). external-framework contract names.
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
  getAllParameters({ accessSlug: null });
