import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps that the rhachet practice's shipped boot.yml defaults every brief to SAY level and
 *         refs ONLY the deep glossary variants (`.reason`, `.example`), via GLOBs — never this repo's
 *         enumerated term list, and never a `say:` enumeration.
 * .why  = the boot.yml is a TEMPLATE copied to every consumer. under #105 the shape is SIMPLE mode
 *         with `say` ABSENT + `ref` present, so the loader reads every discovered brief at say-level
 *         EXCEPT the ref-matched deep variants. the ref entries must be globs (matched against the
 *         consumer's tree by rhachet's fast-glob), never a hardcoded list of THIS repo's terms -- an
 *         enumerated list would ref terms a consumer does not have and miss the ones it does. a glob
 *         is also drift-proof: a new term's deep variants auto-demote, and no say entry is ever
 *         enumerated.
 * .teeth = swap a `term=*` deep-variant glob for an enumerated `term=convergence._.choice.reason.md`
 *          and the "no hardcoded term name" case reddens; add a `say:` key and the "no say
 *          enumeration" case reddens; add an `always:` key and the "simple mode" case reddens; ref
 *          the `._.choice._.md` root (a say-level brief) and the "choice root stays say" case reddens.
 * .note = the subject is the shipped TEMPLATE text. the `.integration.test.ts` suffix reads the
 *         filesystem (a remote boundary); this file sits at the practice ROOT (not under
 *         best-practice/), so it is neither loaded as a declaration nor copied to a consumer.
 * .note = this supersedes the #587 ref-all clamp: #587 refed the whole glossary (choice root +
 *         readme) for a near-zero boot cost; #105 flips the default to say and refs only the
 *         reason/example deep variants. the assertions below encode the #105 shape.
 */

// anchor on __dirname, not process.cwd(): a nested `jest src/practices/...` run has a different cwd.
// from this file (src/practices/rhachet/) the best-practice tree is one segment down.
const bootYmlPath = join(
  __dirname,
  'best-practice/.agent/repo=.this/role=any/boot.yml',
);

const REASON_REF = 'briefs/domain.terms/term=*._.choice.reason.md';
const EXAMPLE_REF = 'briefs/domain.terms/term=*._.choice.example=*.md';
const CHOICE_ROOT_REF = 'briefs/domain.terms/term=*._.choice._.md';

describe('rhachet boot.yml defaults to say, refs only deep glossary variants', () => {
  given('[case1] the shipped boot.yml template', () => {
    const contents = readFileSync(bootYmlPath, 'utf8');

    when('[t0] the template is read', () => {
      then('it is simple mode (top-level briefs:, no always:)', () => {
        expect(contents).toMatch(/^briefs:/m);
        expect(contents).not.toMatch(/^always:/m);
      });

      then('it enumerates no say entry (say defaults for every brief)', () => {
        // the whole point of #105: `say` is absent, so the loader defaults every discovered brief to
        // say. a `say:` key would enumerate — exactly what #105 forbids.
        expect(contents).not.toMatch(/^\s*say:/m);
      });

      then('it refs the deep glossary variants via globs', () => {
        expect(contents).toContain(REASON_REF);
        expect(contents).toContain(EXAMPLE_REF);
      });

      then('it does not ref the choice root (it stays say-level)', () => {
        // the `._.choice._.md` root is the say-lean brief a consumer wants in context; only the
        // reason-deep + example variants demote to ref.
        expect(contents).not.toContain(CHOICE_ROOT_REF);
      });

      then('it hardcodes no specific term name (stays per-consumer correct)', () => {
        // a concrete `term=<slug>._.choice...` (slug != the `*` glob) would be this repo's own term,
        // wrong for a consumer. the only legal `term=` token is the glob wildcard.
        const concreteTermRefs = (
          contents.match(/term=[a-z][a-z-]*\._\.choice/g) || []
        ).filter((m) => !m.startsWith('term=*'));
        expect(concreteTermRefs).toEqual([]);
      });

      then('the emitted glossary ref lines match snapshot', () => {
        // snapshot the governed glossary ref lines themselves, so a reshaped ref that keeps the glob
        // tokens green (a reordered entry, a rephrased comment) reddens a vibecheck in review
        // (rule.require.contract-snapshot-exhaustiveness)
        const refLines = contents
          .split('\n')
          .filter((line) => line.includes('domain.terms/'))
          .map((line) => line.trim())
          .join('\n');
        expect(refLines).toMatchSnapshot('boot.yml glossary refs');
      });
    });
  });
});
