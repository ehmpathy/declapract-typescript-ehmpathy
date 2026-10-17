import { ConstraintError } from 'helpful-errors';

import { type ConnectionOptions, checkServerIdentity } from 'node:tls';
import { RDS_CA_BUNDLE_US_EAST_1 } from './rdsCaBundleUsEast1';

/**
 * .what = the aws region an rds endpoint lives in, read from its dns name
 * .why = the ca bundle is per region, so the region decides which roots verify the cluster
 */
const asRdsEndpointRegion = (input: { endpoint: string }): string | null =>
  /\.(?<region>[a-z]{2}(?:-[a-z]+)+-\d+)\.rds\.amazonaws\.com$/.exec(
    input.endpoint,
  )?.groups?.region ?? null;

/**
 * .what = the tls options a pg client connects with, derived from the cluster endpoint
 * .why = a cloud cluster is reached encrypted and verified (verify-full), so the connection
 *        works whether or not the cluster forces ssl, and never trusts an impostor.
 *        the local testdb declares no cluster endpoint and speaks no tls, so it connects plain
 * .note = the name check pins to the cluster endpoint, never the dialed host: a local tunnel
 *         dials an ssm proxy alias the certificate does not carry, and pg@8 overwrites any
 *         servername option with the dialed host (lib/connection.js)
 * .note = only the us-east-1 roots ship here. an endpoint in any other region fails loud, so a
 *         cluster is never dialed with roots that cannot verify it
 */
export const asDatabaseClientSsl = (input: {
  clusterEndpoint: string | null;
}): ConnectionOptions | false => {
  // no cluster endpoint declared, so this is the local testdb, which speaks no tls
  if (!input.clusterEndpoint) return false;
  const clusterEndpoint = input.clusterEndpoint;

  // only the us-east-1 roots ship, so any other region must add its own bundle first
  const region = asRdsEndpointRegion({ endpoint: clusterEndpoint });
  if (region !== 'us-east-1')
    throw new ConstraintError(
      'the cluster endpoint is not in us-east-1, so no ca bundle here can verify it',
      {
        clusterEndpoint,
        region,
        hint: `add the rds ca bundle for that region (https://truststore.pki.rds.amazonaws.com/<region>/<region>-bundle.pem) beside rdsCaBundleUsEast1.ts, and pick it by region here`,
      },
    );

  // verify the chain against the rds roots, and the name against the cluster endpoint
  return {
    ca: RDS_CA_BUNDLE_US_EAST_1,
    rejectUnauthorized: true,
    checkServerIdentity: (_hostDialed, cert) =>
      checkServerIdentity(clusterEndpoint, cert),
  };
};
