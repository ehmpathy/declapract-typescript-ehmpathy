import { given, then, useBeforeAll, when } from 'test-fns';

import { X509Certificate } from 'node:crypto';
import { RDS_CA_BUNDLE_US_EAST_1 } from './rdsCaBundleUsEast1';

/**
 * .what = split a pem bundle into one pem per certificate
 * .why = node parses exactly one certificate per X509Certificate
 */
const asPemCertificates = (input: { bundle: string }): string[] =>
  input.bundle.match(
    /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
  ) ?? [];

/**
 * .what = the common name a certificate's subject declares
 * .why = the subject is one multi-line string; the CN line names the root
 */
const asCommonName = (input: { cert: X509Certificate }): string | null =>
  input.cert.subject
    .split('\n')
    .find((line) => line.startsWith('CN='))
    ?.slice('CN='.length) ?? null;

describe('RDS_CA_BUNDLE_US_EAST_1', () => {
  given('[case1] the embedded bundle', () => {
    when('[t0] each certificate in it is parsed', () => {
      const scene = useBeforeAll(async () => ({
        certs: asPemCertificates({ bundle: RDS_CA_BUNDLE_US_EAST_1 }).map(
          (pem) => new X509Certificate(pem),
        ),
      }));

      then('it holds the three us-east-1 roots', () => {
        expect(scene.certs.map((cert) => asCommonName({ cert }))).toEqual([
          'Amazon RDS us-east-1 Root CA RSA2048 G1',
          'Amazon RDS us-east-1 Root CA RSA4096 G1',
          'Amazon RDS us-east-1 Root CA ECC384 G1',
        ]);
      });

      then('each is a certificate authority that signed itself', () => {
        for (const cert of scene.certs) {
          expect(cert.ca).toEqual(true);
          expect(cert.checkIssued(cert)).toEqual(true);
          expect(cert.verify(cert.publicKey)).toEqual(true);
        }
      });
    });
  });
});
