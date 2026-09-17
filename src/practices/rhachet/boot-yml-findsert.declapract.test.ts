import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'yaml';

import {
  check,
  fix,
} from './best-practice/.agent/repo=.this/role=any/boot.yml.declapract';

/**
 * .what = the unit grain of the boot.yml findsert: the exported check/fix, exercised in memory
 *         against the shipped template as `declaredFileContents`.
 * .why  = #105 req 1 is that the boot.yml is only ever FINDSERTED into a consumer, never
 *         whole-file overwritten -- so a consumer's own boot entries survive. this suite clamps
 *         the union: a fresh consumer gets the template; a consumer that already carries the
 *         declared globs is returned verbatim; a consumer that lacks one has it unioned in, in
 *         whichever mode (subject/simple) it already uses, and its own say/ref entries survive.
 * .note = the integration suite proves the union through the real declapract pipeline. this is the
 *         in-memory grain, which isolates each branch of `defineExpectedContents`.
 * .note = the template is read as `declaredFileContents`, so the suite stays in sync with the
 *         shipped file rather than a hardcoded copy that could drift.
 */

// anchor on __dirname (a nested jest run has a different cwd); the template is one segment down.
const template = readFileSync(
  join(__dirname, 'best-practice/.agent/repo=.this/role=any/boot.yml'),
  'utf8',
);
const ctx = { declaredFileContents: template } as any;

const REASON_REF = 'briefs/domain.terms/term=*._.choice.reason.md';
const EXAMPLE_REF = 'briefs/domain.terms/term=*._.choice.example=*.md';

describe('boot.yml findsert (rhachet)', () => {
  /**
   * .what = a consumer with no boot.yml gets the whole declared template verbatim.
   * .why  = a fresh scaffold has no file to union into, so the fix writes the template as-is.
   */
  describe('a fresh consumer', () => {
    it('should receive the whole declared template', async () => {
      const result = await fix(null, ctx);

      expect(result.contents).toEqual(template);
    });

    it('should be flagged by check when the file is absent', () => {
      // an absent file is not equal to the template, so check rejects it (declapract then runs fix)
      expect(() => check(null, ctx)).toThrow();
    });
  });

  /**
   * .what = an already-conformant consumer is returned verbatim, and its check passes.
   * .why  = the fixed-point requirement: `check` passes on the fix's own output, so declapract
   *         does not rewrite the file forever. the template itself is the conformant case.
   */
  describe('an already-conformant consumer', () => {
    it('should pass check unchanged', () => {
      expect(() => check(template, ctx)).not.toThrow();
    });

    it('should be returned verbatim by fix (no round-trip)', async () => {
      const result = await fix(template, ctx);

      expect(result.contents).toEqual(template);
    });
  });

  /**
   * .what = a consumer that lacks a declared glob has it unioned in.
   * .why  = the core of the findsert -- an absent declared ref demotes the deep variant a
   *         consumer would otherwise carry at say level.
   * .note = the fixture omits the example glob on purpose. a fixture that carried it would feed
   *         the expectation it is measured against, and pass even after the union broke.
   */
  describe('a consumer that lacks a declared ref glob', () => {
    const partial = `briefs:\n  ref:\n    - ${REASON_REF}\n`;

    it('should be flagged by check', () => {
      expect(() => check(partial, ctx)).toThrow();
    });

    it('should have the absent glob unioned in by fix', async () => {
      const result = await fix(partial, ctx);

      expect(result.contents).toContain(REASON_REF);
      expect(result.contents).toContain(EXAMPLE_REF);
    });

    it('should not duplicate a glob the consumer already carries', async () => {
      const result = await fix(partial, ctx);
      const refs = (
        yaml.parse(result.contents!).briefs.ref as string[]
      ).filter((glob) => glob === REASON_REF);

      expect(refs).toHaveLength(1);
    });
  });

  /**
   * .what = a consumer in SUBJECT mode (`always.briefs.ref`) has the globs unioned into that
   *         list, never into a fresh top-level `briefs:`.
   * .why  = req 1's safety: the fix must never corrupt a subject-mode consumer into an invalid
   *         mixed `always:` + `briefs:` file. it unions into whichever ref list already exists.
   */
  describe('a subject-mode consumer', () => {
    const subject = `always:\n  briefs:\n    ref:\n      - briefs/custom.md\nsubject:\n  find:\n    - '**/*'\n`;

    it('should union the globs into always.briefs.ref', async () => {
      const result = await fix(subject, ctx);
      const refs = yaml.parse(result.contents!).always.briefs.ref as string[];

      expect(refs).toContain('briefs/custom.md');
      expect(refs).toContain(REASON_REF);
      expect(refs).toContain(EXAMPLE_REF);
    });

    it('should not create a top-level briefs key (stays subject mode)', async () => {
      const result = await fix(subject, ctx);

      expect(yaml.parse(result.contents!).briefs).toBeUndefined();
    });
  });

  /**
   * .what = a simple-mode consumer with a `briefs.say` list but no `briefs.ref` gets the ref list
   *         seeded, and its say entries survive.
   * .why  = the seed branch of getOrSeedRefSeq -- the fix adds a `briefs.ref` only when neither a
   *         subject nor a simple ref list exists, and never touches the consumer's own say list.
   */
  describe('a simple-mode consumer with say but no ref', () => {
    const sayOnly = `briefs:\n  say:\n    - briefs/own.md\n`;

    it('should seed briefs.ref with the declared globs', async () => {
      const result = await fix(sayOnly, ctx);
      const refs = yaml.parse(result.contents!).briefs.ref as string[];

      expect(refs).toContain(REASON_REF);
      expect(refs).toContain(EXAMPLE_REF);
    });

    it("should preserve the consumer's own say entries", async () => {
      const result = await fix(sayOnly, ctx);
      const say = yaml.parse(result.contents!).briefs.say as string[];

      expect(say).toContain('briefs/own.md');
    });
  });

  /**
   * .what = idempotency has two clauses: the fix is a fixed point, and check passes on its output.
   * .why  = a fix that is not a fixed point churns the file on every upgrade; a check that still
   *         throws on the fix's own output makes declapract re-flag the file forever.
   */
  describe('idempotency', () => {
    const casesToFix = [
      { slug: 'an absent file', contents: null as string | null },
      { slug: 'a simple-mode partial', contents: `briefs:\n  ref:\n    - ${REASON_REF}\n` },
      {
        slug: 'a subject-mode consumer',
        contents: `always:\n  briefs:\n    ref:\n      - briefs/custom.md\n`,
      },
      { slug: 'a say-only consumer', contents: `briefs:\n  say:\n    - briefs/own.md\n` },
    ];

    casesToFix.forEach((thisCase) => {
      it(`should be a fixed point, given ${thisCase.slug}`, async () => {
        const once = (await fix(thisCase.contents, ctx)).contents!;
        const twice = (await fix(once, ctx)).contents!;

        expect(twice).toEqual(once);
      });

      it(`should satisfy its own check, given ${thisCase.slug}`, async () => {
        const once = (await fix(thisCase.contents, ctx)).contents!;

        expect(() => check(once, ctx)).not.toThrow();
      });
    });
  });
});
