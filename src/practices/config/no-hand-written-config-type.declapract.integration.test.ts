import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps that neither the `config` nor the `persist-with-rds` best-practice ships a
 *         hand-written `Config.ts`, and that the schema-inferred `Config` is the sole source.
 * .why  = the practice used to ship TWO `Config` exports in one dir: a hand-written `interface
 *         Config` (Config.ts) and the grant-aware `z.infer` `Config` (config.schema.ts). the
 *         hand-written twin has no reader (getConfig imports Config from ./config.schema), so it can
 *         only drift from the live schema, never constrain it -- and it DID drift in a stamped repo
 *         to `access: 'test' | 'dev' | 'prod'` (`dev` is a legacy deploy-slug value, never an access
 *         tier; `prep` absent), read as a sanctioned contract and traced to a prod defect (#588). a dead type that
 *         contradicts the live one is worse than absent -- it reads as authoritative. this clamp keeps
 *         the twin gone.
 * .teeth = re-create either best-practice `src/utils/config/Config.ts` and its case reddens; a drop
 *          of the schema-inferred `Config` export reddens the sole-source case.
 * .note = `.declapract.test.ts` = this repo's UNIT-test marker; at the practice ROOT (not under
 *         best-practice/), so it is neither loaded as a declaration nor copied to a consumer.
 */

// anchor on __dirname, not process.cwd(): a nested `jest src/practices/...` run has a different
// cwd, and a repo-root-relative path under process.cwd() would then miss the tree (vacuous green) or
// throw. from this file (src/practices/config/) the repo root is three segments up.
const REPO_ROOT = join(__dirname, '../../..');

const handWrittenConfigPaths = [
  'src/practices/config/best-practice/src/utils/config/Config.ts',
  'src/practices/persist-with-rds/best-practice/src/utils/config/Config.ts',
];

const configSchemaPath = join(
  REPO_ROOT,
  'src/practices/config/best-practice/src/utils/config/config.schema.ts',
);

describe('config practice ships no hand-written Config type', () => {
  for (const relPath of handWrittenConfigPaths) {
    given(`[case] ${relPath}`, () => {
      when('[t0] the best-practice tree is inspected', () => {
        then('the hand-written Config.ts is absent (schema is the source)', () => {
          expect(existsSync(join(REPO_ROOT, relPath))).toEqual(false);
        });

        then('its declapract declaration is absent too', () => {
          expect(existsSync(join(REPO_ROOT, `${relPath}.declapract.ts`))).toEqual(
            false,
          );
        });
      });
    });
  }

  given('[case] the sole Config source', () => {
    const schema = readFileSync(configSchemaPath, 'utf8');

    when('[t0] config.schema.ts is read', () => {
      then('it exports the grant-aware schema-inferred Config', () => {
        expect(schema).toContain('export type Config<TGrant extends Grant');
      });
    });
  });
});
