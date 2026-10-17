import { ConstraintError, UnexpectedCodePathError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import type { PeerCertificate } from 'node:tls';
import { asDatabaseClientSsl } from './asDatabaseClientSsl';
import { RDS_CA_BUNDLE_US_EAST_1 } from './rdsCaBundleUsEast1';

const CLUSTER_ENDPOINT = 'surfdb.cluster-abc123.us-east-1.rds.amazonaws.com';

/**
 * .what = a peer certificate shaped as the one an aurora cluster presents
 * .why = checkServerIdentity reads only the subject and the subject alt names
 */
const certOfCluster = {
  subject: { CN: CLUSTER_ENDPOINT },
  subjectaltname: `DNS:${CLUSTER_ENDPOINT}`,
} as PeerCertificate; // note: a partial cert; checkServerIdentity reads only these two fields

describe('asDatabaseClientSsl', () => {
  given('[case1] no cluster endpoint declared (the local testdb)', () => {
    when('[t0] the ssl options are derived', () => {
      then('the client connects plain', () => {
        expect(asDatabaseClientSsl({ clusterEndpoint: null })).toEqual(false);
      });
    });
  });

  given('[case2] a us-east-1 cluster endpoint declared', () => {
    const ssl =
      asDatabaseClientSsl({ clusterEndpoint: CLUSTER_ENDPOINT }) ||
      UnexpectedCodePathError.throw(
        'a declared cluster endpoint must yield ssl options, never a plain connect',
        { clusterEndpoint: CLUSTER_ENDPOINT },
      );

    when('[t0] the ssl options are derived', () => {
      then('the chain is verified against the rds roots', () => {
        expect(ssl.rejectUnauthorized).toEqual(true);
        expect(ssl.ca).toEqual(RDS_CA_BUNDLE_US_EAST_1);
      });
    });

    when('[t1] the dialed host is a local tunnel alias', () => {
      then('the name check passes against the cluster endpoint', () => {
        expect(
          ssl.checkServerIdentity!('aws.ssmproxy.surfdb.prep', certOfCluster),
        ).toEqual(undefined);
      });
    });

    when('[t2] the certificate names a different host', () => {
      then('the name check rejects it', () => {
        const certOfImpostor = {
          subject: { CN: 'impostor.example.com' },
          subjectaltname: 'DNS:impostor.example.com',
        } as PeerCertificate; // note: a partial cert; checkServerIdentity reads only these two fields
        // node's Error lives in another realm than jest's, so assert on the message
        expect(
          ssl.checkServerIdentity!(CLUSTER_ENDPOINT, certOfImpostor)?.message,
        ).toContain(`Host: ${CLUSTER_ENDPOINT}. is not in the cert's altnames`);
      });
    });
  });

  given('[case3] a cluster endpoint outside us-east-1', () => {
    when('[t0] the ssl options are derived', () => {
      then('it fails loud, with a hint to add that region bundle', async () => {
        const error = await getError(async () =>
          asDatabaseClientSsl({
            clusterEndpoint:
              'surfdb.cluster-abc123.eu-west-2.rds.amazonaws.com',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('not in us-east-1');
        expect(JSON.stringify(error)).toContain(
          'truststore.pki.rds.amazonaws.com',
        );
      });
    });
  });
});
