import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the `old-dev-config-location` relocate + tier-migrate, run
 *         through the REAL declapract apply pipeline against a genTempDir clone of a consumer
 *         repo (the blocker.1 / row-4 clamp).
 * .why  = the fix both RELOCATES `config/dev.json` → `config/prep.json` (a `relativeFilePath`
 *         rewrite) AND TRANSFORMS the content via `migrateDevConfigToPrep`. per
 *         `rule.require.declapract-integration-tests`, 'relocate a file' and 'transform blocks'
 *         are each rows that REQUIRE a pipeline test — a unit test of the exported `fix` never
 *         exercises the glob→file match or the `relativeFilePath` rewrite. this is that test.
 * .note = the config file is snapshotted in full (before AND after) so a reviewer can eyeball
 *         the exact end-state.
 * .teeth = the input holds `"access": "dev"` — the ONE unambiguous tier token, migrated to
 *          `prep` — plus four host values that must each survive byte-for-byte: a `://` URL
 *          `https://auth.myapp.dev`, a mid-dotted bare host `bastion.dev.example.com`, a
 *          terminal bare host `aws.ssmproxy.mydb.dev`, and a foreign public host
 *          `api.dev.paypal.com`. a `.dev` label is axis-ambiguous WHEREVER it sits, so per
 *          guard #3 (a rewrite that cannot verify its output must not guess) NO host is
 *          rewritten. the after-state proves the tier migrate, all four hosts preserved, the
 *          relocation, and that NO `@declapract:review` bytes ever enter the emitted config.
 */
describe('config — old-dev-config-location relocate + tier-migrate (row-4 clamp)', () => {
  given('[case1] a repo with a config/dev.json to migrate', () => {
    const tempDir = genTempDir({
      slug: 'declapract-config-old-dev-config-location',
      clone: './src/practices/config/.test/assets/demo-repo-with-dev-config',
      symlink: [{ at: 'src', to: 'src' }],
    });

    const devPath = 'config/dev.json';
    const prepPath = 'config/prep.json';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const exists = async (relativePath: string): Promise<boolean> =>
      fs
        .access(path.join(tempDir, relativePath))
        .then(() => true)
        .catch(() => false);
    const applyMigrate = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'config',
        file: devPath,
      });

    when('[t0] the migration input (before any fix)', () => {
      then('config/dev.json holds the dev tier + matches snapshot', async () => {
        const before = await read(devPath);
        expect(before).toContain('"access": "dev"');
        expect(before).toMatchSnapshot('config/dev.json — before');
      });
    });

    when('[t1] the relocate + migrate fix is applied', () => {
      useThen('migrate the dev config', async () => applyMigrate());

      then(
        'config/prep.json now holds the migrated content + config/dev.json is gone + matches snapshot',
        async () => {
          // the relocation landed: the new path exists, the old path is unlinked
          expect(await exists(prepPath)).toBe(true);
          expect(await exists(devPath)).toBe(false);

          const after = await read(prepPath);
          // the access itself is the one unambiguous token → migrated
          expect(after).toContain('"access": "prep"');
          expect(after).not.toContain('"access": "dev"');
          // EVERY host survives byte-for-byte. the util runs on the CONSUMER's real config, whose
          // host values are the consumer's own — a `.dev` label is axis-ambiguous WHEREVER it sits,
          // so per guard #3 (a rewrite that cannot verify its output must not guess) NO host is
          // rewritten.
          expect(after).toContain('bastion.dev.example.com');
          expect(after).toContain('aws.ssmproxy.mydb.dev');
          expect(after).toContain('https://auth.myapp.dev');
          // the FOREIGN public host is the decisive corruption case: a mid-dotted `dev` that is a
          // foreign host's own label must survive byte-for-byte. teeth: the prior mid-dotted
          // rewrite turned this into `api.prep.paypal.com`, a silent public-endpoint corruption
          // (i013 r7.b1) surfaced only by a human read of the apply diff.
          expect(after).toContain('api.dev.paypal.com');
          expect(after).not.toContain('api.prep.paypal.com');
          // no host was flipped to `.prep`, so no wrong-tier value ever enters the config
          expect(after).not.toContain('bastion.prep.example.com');
          expect(after).not.toContain('aws.ssmproxy.mydb.prep');
          // the migration never emits a value it cannot verify — no marker bytes in config
          expect(after).not.toContain('@declapract:review');
          // full content, for the reviewer's eye
          expect(after).toMatchSnapshot('config/prep.json — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // config/dev.json is gone after the first relocate, so the EXISTS check no longer
      // fires and no fix runs — config/prep.json must be untouched (per
      // rule.require.idempotent-fixes).
      const passes = useThen(
        'a second apply over the already-migrated repo',
        async () => {
          const before = await read(prepPath);
          await applyMigrate();
          const after = await read(prepPath);
          return { before, after };
        },
      );

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
