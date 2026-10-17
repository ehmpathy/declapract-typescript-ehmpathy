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
 *         declared globs under `not` is returned verbatim; a consumer that lacks one has it unioned
 *         in, in whichever mode (subject/simple) it already uses; a consumer on the old `ref` shape
 *         has the declared globs moved to `not` (#689); its own say/ref entries survive.
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

const REASON_GLOB = 'briefs/domain.terms/term=*._.choice.reason.md';
const EXAMPLE_GLOB = 'briefs/domain.terms/term=*._.choice.example=*.md';
const BUDGET = 'budget:\n  tokens: 5000\n';

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

    it('should seed the glossary variants under not, never ref (#689)', () => {
      const parsed = yaml.parse(template);

      expect(parsed.briefs.not).toEqual([REASON_GLOB, EXAMPLE_GLOB]);
      expect(parsed.briefs.ref).toBeUndefined();
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
   * .what = a consumer that lacks a declared glob has it unioned in under `not`.
   * .note = the fixture omits the example glob on purpose. a fixture that carried it would feed
   *         the expectation it is measured against, and pass even after the union broke.
   */
  describe('a consumer that lacks a declared not glob', () => {
    const partial = `${BUDGET}briefs:\n  not:\n    - ${REASON_GLOB}\n`;

    it('should be flagged by check', () => {
      expect(() => check(partial, ctx)).toThrow();
    });

    it('should have the absent glob unioned in by fix', async () => {
      const result = await fix(partial, ctx);
      const not = yaml.parse(result.contents!).briefs.not as string[];

      expect(not).toEqual([REASON_GLOB, EXAMPLE_GLOB]);
    });
  });

  /**
   * .what = a consumer on the old `ref` shape has the declared globs moved to `not` (#689).
   * .why  = before this, a consumer that moved them to `not` failed check, and the next fix added
   *         them back under `ref`. the move must keep the consumer's own ref entries.
   */
  describe('a consumer on the old ref shape, with its own ref entries', () => {
    const oldShape = `${BUDGET}briefs:\n  ref:\n    # my own on-demand briefs\n    - briefs/own.md\n    - ${REASON_GLOB}\n    - ${EXAMPLE_GLOB}\n`;

    it('should be flagged by check', () => {
      expect(() => check(oldShape, ctx)).toThrow();
    });

    it('should move the declared globs to not', async () => {
      const parsed = yaml.parse((await fix(oldShape, ctx)).contents!);

      expect(parsed.briefs.not).toEqual([REASON_GLOB, EXAMPLE_GLOB]);
      expect(parsed.briefs.ref).not.toContain(REASON_GLOB);
      expect(parsed.briefs.ref).not.toContain(EXAMPLE_GLOB);
    });

    it("should keep the consumer's own ref entries and their comment", async () => {
      const result = await fix(oldShape, ctx);

      expect(yaml.parse(result.contents!).briefs.ref).toEqual(['briefs/own.md']);
      expect(result.contents).toContain('# my own on-demand briefs');
    });

    it('should match snapshot', async () => {
      const result = await fix(oldShape, ctx);

      expect(oldShape).toMatchSnapshot('old ref shape — before');
      expect(result.contents).toMatchSnapshot('old ref shape — after');
    });
  });

  /**
   * .what = a consumer whose ref held only the declared globs loses the empty `ref` key.
   * .why  = an empty `ref: []` left behind is noise a reader must decode
   */
  describe('a consumer whose ref held only the declared globs', () => {
    const onlyDeclared = `${BUDGET}briefs:\n  ref:\n    - ${REASON_GLOB}\n    - ${EXAMPLE_GLOB}\n`;

    it('should drop the empty ref key and seed not', async () => {
      const parsed = yaml.parse((await fix(onlyDeclared, ctx)).contents!);

      expect(parsed.briefs.ref).toBeUndefined();
      expect(parsed.briefs.not).toEqual([REASON_GLOB, EXAMPLE_GLOB]);
    });
  });

  /**
   * .what = a consumer that already moved to `not` passes check (the #689 report).
   */
  describe('a consumer that already lists the variants under not, with its own ref', () => {
    const adopted = `${BUDGET}briefs:\n  ref:\n    - briefs/own.md\n  not:\n    - ${REASON_GLOB}\n    - ${EXAMPLE_GLOB}\n`;

    it('should pass check unchanged', () => {
      expect(() => check(adopted, ctx)).not.toThrow();
    });
  });

  /**
   * .what = a consumer in SUBJECT mode (`always.briefs`) has the globs unioned into
   *         `always.briefs.not`, never into a fresh top-level `briefs:`.
   * .why  = req 1's safety: the fix must never corrupt a subject-mode consumer into an invalid
   *         mixed `always:` + `briefs:` file.
   */
  describe('a subject-mode consumer', () => {
    const subject = `always:\n  briefs:\n    ref:\n      - briefs/custom.md\n      - ${REASON_GLOB}\nsubject:\n  find:\n    - '**/*'\n`;

    it('should union the globs into always.briefs.not, and move the stray ref', async () => {
      const parsed = yaml.parse((await fix(subject, ctx)).contents!);

      expect(parsed.always.briefs.not).toEqual([REASON_GLOB, EXAMPLE_GLOB]);
      expect(parsed.always.briefs.ref).toEqual(['briefs/custom.md']);
    });

    it('should not create a top-level briefs key (stays subject mode)', async () => {
      const result = await fix(subject, ctx);

      expect(yaml.parse(result.contents!).briefs).toBeUndefined();
    });
  });

  /**
   * .what = a simple-mode consumer with a `briefs.say` list but no `briefs.not` gets `not` seeded,
   *         and its say entries survive.
   */
  describe('a simple-mode consumer with say but no not', () => {
    const sayOnly = `briefs:\n  say:\n    - briefs/own.md\n`;

    it('should seed briefs.not with the declared globs', async () => {
      const parsed = yaml.parse((await fix(sayOnly, ctx)).contents!);

      expect(parsed.briefs.not).toEqual([REASON_GLOB, EXAMPLE_GLOB]);
    });

    it("should preserve the consumer's own say entries", async () => {
      const result = await fix(sayOnly, ctx);
      const say = yaml.parse(result.contents!).briefs.say as string[];

      expect(say).toContain('briefs/own.md');
    });
  });

  /**
   * .what = an adopter's own budget value survives (F62).
   * .why  = rhachet >= 1.49 enforces the budget, so an upgrade that reset a raised cap would halt
   *         that adopter's boot. findsert: absent -> 5000; present -> kept.
   */
  describe('the budget findsert', () => {
    it("should keep an adopter's own budget value", async () => {
      const own = `budget:\n  tokens: 12000\nbriefs:\n  ref:\n    - ${REASON_GLOB}\n`;
      const parsed = yaml.parse((await fix(own, ctx)).contents!);

      expect(parsed.budget.tokens).toEqual(12000);
    });

    it('should seed 5000 where the adopter has none', async () => {
      const none = `briefs:\n  not:\n    - ${REASON_GLOB}\n    - ${EXAMPLE_GLOB}\n`;
      const result = (await fix(none, ctx)).contents!;

      expect(yaml.parse(result).budget.tokens).toEqual(5000);
      expect(result).toContain('a boot over it halts');
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
      {
        slug: 'a simple-mode partial',
        contents: `briefs:\n  not:\n    - ${REASON_GLOB}\n`,
      },
      {
        slug: 'an old ref-shape consumer',
        contents: `briefs:\n  ref:\n    - briefs/own.md\n    - ${REASON_GLOB}\n    - ${EXAMPLE_GLOB}\n`,
      },
      {
        slug: 'a subject-mode consumer',
        contents: `always:\n  briefs:\n    ref:\n      - briefs/custom.md\n`,
      },
      {
        slug: 'a say-only consumer',
        contents: `briefs:\n  say:\n    - briefs/own.md\n`,
      },
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
