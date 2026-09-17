import type { FileCheckContext } from 'declapract';

import { check, fix } from './*.ts.declapract';

describe('old-stage-enum', () => {
  describe('check', () => {
    it('should match files with Stage.PRODUCTION', () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.PRODUCTION) doAction();
      `.trim();

      expect(() => check(contents, {} as FileCheckContext)).not.toThrow();
    });

    it('should match files with Stage.DEVELOPMENT', () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.DEVELOPMENT) doAction();
      `.trim();

      expect(() => check(contents, {} as FileCheckContext)).not.toThrow();
    });

    it('should match files with Stage.TEST', () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.TEST) doAction();
      `.trim();

      expect(() => check(contents, {} as FileCheckContext)).not.toThrow();
    });

    it('should not match files without a Stage enum reference', () => {
      const contents = `
import { stage } from './environment';
if (stage === 'prod') doAction();
      `.trim();

      expect(() => check(contents, {} as FileCheckContext)).toThrow(
        'does not match bad practice',
      );
    });
  });

  describe('fix', () => {
    it('should replace Stage.PRODUCTION with prod literal', async () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.PRODUCTION) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).toContain("'prod'");
      expect(result.contents).not.toContain('Stage.PRODUCTION');
    });

    it('should replace Stage.TEST with test literal', async () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.TEST) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).toContain("'test'");
      expect(result.contents).not.toContain('Stage.TEST');
    });

    it('should LEAVE Stage.DEVELOPMENT in place and mark it for review — never guess a value', async () => {
      // D27 / guard #3: 'dev' was overloaded across the access-tier axis (→ 'prep') and the
      // deploy-stage axis (→ 'dev'); the regex cannot know which, so it must NOT emit a value.
      // it leaves the code reference exactly as found — no value splice — and adds only a `//`
      // COMMENT pointer above it (a comment is not a value, so no guess is emitted).
      const contents = `
import { Stage } from './environment';
if (stage === Stage.DEVELOPMENT) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // teeth: the code reference is preserved verbatim — a re-introduced guess would rewrite it
      // to a value (e.g. `=== 'prep'`); it must still read `=== Stage.DEVELOPMENT`.
      expect(result.contents).toContain('stage === Stage.DEVELOPMENT');
      expect(result.contents).not.toContain("=== 'prep'");
      // the `Stage` import is KEPT — the file still references the enum, so it must compile.
      expect(result.contents).toContain('import { Stage }');
    });

    it('should mark each DEVELOPMENT reference with a review pointer for where + what (r9.b2)', async () => {
      // r9 i012 blocker: a bare red plan names neither WHERE the unsettled reference sits nor WHAT
      // to pick. the fix inserts a `// @declapract:review:` comment directly above the line, for
      // both — without a value guess and without a cleared check.
      const contents = `
import { Stage } from './environment';
if (stage === Stage.DEVELOPMENT) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);
      const lines = (result.contents ?? '').split('\n');

      // teeth: drop withDevelopmentAxisReviewMarker -> the marker is absent (bare red plan)
      expect(result.contents).toContain('@declapract:review');
      // the WHAT: the marker states the axis choice
      expect(result.contents).toContain("access ('test'|'prep'|'prod')");
      // the WHERE: the marker sits directly above the Stage.DEVELOPMENT line
      const devLineIndex = lines.findIndex((line) =>
        line.includes('=== Stage.DEVELOPMENT'),
      );
      expect(lines[devLineIndex - 1]).toContain('@declapract:review');
      // snapshot the marker verbatim — user-faced output; a reword must redden a vibecheck.
      // .note = the marker is a COMPENSATION, not the endpoint: a consumer who runs `declapract
      //         plan` reads only green/red, so this in-file text is the sole could-not-fire signal.
      //         the durable "could-not-fire vs passed" plan signal is owed upstream
      //         (ehmpathy/declapract#107).
      expect(result.contents).toMatchSnapshot('old-stage-enum DEVELOPMENT — review marker');
    });

    it('keeps the check RED after the marker lands — the comment is not a property access', async () => {
      // the essential half of r9.b2 + guard #3: the marker is a COMMENT, so the parser still
      // detects the real `Stage.DEVELOPMENT` property access and `check` still matches → plan red.
      const contents = `
import { Stage } from './environment';
if (stage === Stage.DEVELOPMENT) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // teeth: a marker that rewrote the reference (a value splice) would clear the check → green
      expect(() =>
        check(result.contents!, {} as FileCheckContext),
      ).not.toThrow();
    });

    it('should LEAVE the file in violation on a DEVELOPMENT reference — plan stays red after fix', async () => {
      // the essential half of guard #3: because DEVELOPMENT is left, `check` still matches it
      // after `fix`, so `declapract plan` stays RED until a human resolves the axis by hand —
      // a green plan can never hide a wrong-axis value.
      const contents = `
import { Stage } from './environment';
if (stage === Stage.DEVELOPMENT) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // teeth: a fix that guessed a value would clear the check → plan green with a guess.
      expect(() =>
        check(result.contents!, {} as FileCheckContext),
      ).not.toThrow();
    });

    it('should be idempotent — a second pass leaves the untouched DEVELOPMENT reference identical', async () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.DEVELOPMENT) doAction();
      `.trim();

      const once = await fix(contents, {} as FileCheckContext);
      const twice = await fix(once.contents!, {} as FileCheckContext);
      expect(twice.contents).toEqual(once.contents);
    });

    it('should migrate PRODUCTION but KEEP the Stage import when a DEVELOPMENT reference remains', async () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.PRODUCTION) doAction();
if (stage === Stage.DEVELOPMENT) doOther();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // PRODUCTION migrated, DEVELOPMENT preserved, import kept (still referenced)
      expect(result.contents).toContain("'prod'");
      expect(result.contents).not.toContain('Stage.PRODUCTION');
      expect(result.contents).toContain('Stage.DEVELOPMENT');
      expect(result.contents).toContain('import { Stage }');
    });

    it('should remove a Stage-only import when only unambiguous members were present', async () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.PRODUCTION) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).not.toContain('import { Stage }');
    });

    it('should remove Stage from a multi-import when only unambiguous members were present', async () => {
      const contents = `
import { stage, Stage } from './environment';
if (stage === Stage.TEST) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).toContain('import { stage } from');
      expect(result.contents).not.toContain('Stage');
    });
  });

  // a `${Stage.X}` interpolation inside a template literal is REAL code (it evaluates the
  // enum member at runtime), so the mask must NOT blank it — else a live reference would be
  // silently neither flagged nor migrated (the 'could-not-fire vs passed' silent defect).
  describe('template-literal interpolation (${} is code, static text is not)', () => {
    it('detects a live ${Stage.DEVELOPMENT} interpolation', () => {
      const contents = `
import { Stage } from './environment';
const env = \`access: \${Stage.DEVELOPMENT}\`;
      `.trim();

      // teeth: a mask that blanked the whole template literal would hide this → check throws.
      expect(() => check(contents, {} as FileCheckContext)).not.toThrow();
    });

    it('migrates a ${Stage.PRODUCTION} interpolation and keeps the static text intact', async () => {
      const contents = `
import { Stage } from './environment';
const env = \`access: \${Stage.PRODUCTION}\`;
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // the interpolation is code → migrated; the static text around it is preserved.
      expect(result.contents).toContain("${'prod'}");
      expect(result.contents).toContain('access: ');
      expect(result.contents).not.toContain('Stage.PRODUCTION');
    });

    it('does NOT detect a Stage.X that lives only in the static text of a template literal', () => {
      const contents = `
const label = \`this mentions Stage.TEST as static prose\`;
if (stage === 'test') doAction();
      `.trim();

      // static template text is a string → masked → not a usage to migrate.
      expect(() => check(contents, {} as FileCheckContext)).toThrow(
        'does not match bad practice',
      );
    });
  });

  // a `Stage.X` inside a regex literal is pattern TEXT, not a live enum reference. the mask must
  // blank it so `check` neither flags it nor `fix` splices a value into the middle of the regex —
  // the value-emit-into-code corruption the whole file exists to prevent.
  describe('regex-literal safety (a matcher is text, not a usage)', () => {
    it('does NOT detect a Stage.PRODUCTION inside a `= /.../ ` matcher', () => {
      const contents = `
const re = /Stage.PRODUCTION/;
if (stage === 'prod') doAction();
      `.trim();

      // teeth: a mask that treated the regex as code would flag this → check would not throw.
      expect(() => check(contents, {} as FileCheckContext)).toThrow(
        'does not match bad practice',
      );
    });

    it('does NOT detect a Stage.TEST inside a `(/.../)` matcher', () => {
      const contents = `
if (label.match(/Stage.TEST/)) doAction();
      `.trim();

      expect(() => check(contents, {} as FileCheckContext)).toThrow(
        'does not match bad practice',
      );
    });

    it('leaves a regex matcher byte-for-byte intact — no value spliced into it', async () => {
      const contents = `
const re = /Stage.PRODUCTION/;
if (stage === 'prod') doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // teeth: without a regex mask, fix splices 'prod' into the regex → /s'prod'/ corruption.
      expect(result.contents).toContain('/Stage.PRODUCTION/');
      expect(result.contents).not.toContain("/s'prod'/");
    });

    it('migrates a REAL code reference but preserves a Stage.PRODUCTION regex beside it', async () => {
      const contents = `
import { Stage } from './environment';
const re = /Stage.PRODUCTION/;
if (stage === Stage.PRODUCTION) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // the regex matcher is preserved; only the real code reference is rewritten
      expect(result.contents).toContain('/Stage.PRODUCTION/');
      expect(result.contents).toContain("if (stage === 'prod')");
    });

    it('still divides — a `/` division is not misread as a regex-start', () => {
      // a `/` after an identifier / number is division; a Stage.PRODUCTION on a later line must
      // still be detected (the division must not swallow it into a phantom regex span).
      const contents = `
const half = total / 2;
if (stage === Stage.PRODUCTION) doAction();
      `.trim();

      expect(() => check(contents, {} as FileCheckContext)).not.toThrow();
    });
  });

  // positions a hand-rolled character mask left open — a `/` after a closer (`}`/`)`/`]`), a regex
  // nested in a `${...}` interpolation, a brace inside that regex. the parser classifies each
  // exactly, so a `Stage.X` that is regex TEXT is never a property access: the value-splice-into-code
  // corruption is foreclosed by construction, not chased one token position at a time.
  describe('parser classification — a matcher is text in every position', () => {
    it('does NOT detect a Stage.PRODUCTION regex that follows a block-close `}`', () => {
      const contents = `
if (cond) { doAction(); }
/Stage.PRODUCTION/.test(y);
      `.trim();

      // teeth: a `/` after `}` (block-end) begins a regex; a char mask read it as division and
      // left the matcher as code → fix spliced 'prod' into it. the parser never does.
      expect(() => check(contents, {} as FileCheckContext)).toThrow(
        'does not match bad practice',
      );
    });

    it('does NOT detect a Stage.PRODUCTION regex that follows a `)`', () => {
      const contents = `
if (x) /Stage.PRODUCTION/.test(y);
      `.trim();

      expect(() => check(contents, {} as FileCheckContext)).toThrow(
        'does not match bad practice',
      );
    });

    it('does NOT splice a value into a regex nested in a template `${...}` interpolation', async () => {
      const contents = `
const ok = \`x\${/Stage.PRODUCTION/.test(s) ? 1 : 0}\`;
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // teeth: the char mask left the ${...} region as code with no re-scan, so the nested matcher
      // was spliced → /s'prod'/. the parser sees a regex literal inside the interpolation.
      expect(result.contents).toContain('/Stage.PRODUCTION/');
      expect(result.contents).not.toContain("/s'prod'/");
    });

    it('handles a `}` inside that nested regex — a brace-depth scan of `${...}` could not', async () => {
      const contents = `
const ok = \`x\${/Stage.PRODUCTION}/.test(s) ? 1 : 0}\`;
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // teeth: a `}` inside the regex threw off a brace-depth scan of the ${...} region; the parser
      // bounds the interpolation correctly, so the matcher is preserved whole.
      expect(result.contents).toContain('/Stage.PRODUCTION}/');
      expect(result.contents).not.toContain("'prod'");
    });

    it('still migrates a real ${Stage.PRODUCTION} interpolation beside a nested matcher', async () => {
      const contents = `
import { Stage } from './environment';
const ok = \`\${/Stage.TEST/.test(s)}-\${Stage.PRODUCTION}\`;
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // the live interpolation migrates; the regex text beside it is preserved
      expect(result.contents).toContain("${'prod'}");
      expect(result.contents).toContain('/Stage.TEST/');
    });
  });

  // the parser protects comments + string literals: a Stage.X mention inside one must be
  // neither flagged (no stuck check) nor migrated (no corruption).
  describe('comment/string safety', () => {
    describe('check', () => {
      it('does not detect a Stage.DEVELOPMENT mention that lives only in a block comment', () => {
        const contents = `
/** @see Stage.DEVELOPMENT for the dev tier */
if (stage === 'prep') doAction();
        `.trim();

        expect(() => check(contents, {} as FileCheckContext)).toThrow(
          'does not match bad practice',
        );
      });

      it('does not detect a Stage.TEST mention that lives only in a line comment', () => {
        const contents = `
// legacy note: Stage.TEST used to gate here
if (stage === 'test') doAction();
        `.trim();

        expect(() => check(contents, {} as FileCheckContext)).toThrow(
          'does not match bad practice',
        );
      });

      it('does not detect a Stage.PRODUCTION mention that lives only in a string literal', () => {
        const contents = `
const label = 'Stage.PRODUCTION';
if (stage === 'prod') doAction();
        `.trim();

        expect(() => check(contents, {} as FileCheckContext)).toThrow(
          'does not match bad practice',
        );
      });

      it('still detects a real code reference even when a comment also mentions the enum', () => {
        const contents = `
// note about Stage.DEVELOPMENT
if (stage === Stage.DEVELOPMENT) doAction();
        `.trim();

        expect(() => check(contents, {} as FileCheckContext)).not.toThrow();
      });
    });

    describe('fix', () => {
      it('leaves a block-comment mention byte-for-byte intact', async () => {
        const contents = `
/** @see Stage.PRODUCTION for the prod tier */
if (stage === 'prep') doAction();
        `.trim();

        const result = await fix(contents, {} as FileCheckContext);

        // the doc comment survives whole; no code reference existed to migrate
        expect(result.contents).toContain(
          '/** @see Stage.PRODUCTION for the prod tier */',
        );
        expect(result.contents).not.toContain("'prod'");
      });

      it('migrates the code reference but preserves a comment mention beside it', async () => {
        const contents = `
// note about Stage.PRODUCTION
if (stage === Stage.PRODUCTION) doAction();
        `.trim();

        const result = await fix(contents, {} as FileCheckContext);

        // the comment's mention is untouched; only the code reference is rewritten
        expect(result.contents).toContain('// note about Stage.PRODUCTION');
        expect(result.contents).toContain("if (stage === 'prod'");
        // no stray corruption: the only Stage.PRODUCTION left is the comment one
        const codeReferenceGone = !/=== Stage\.PRODUCTION/.test(
          result.contents ?? '',
        );
        expect(codeReferenceGone).toBe(true);
      });

      it('leaves a string-literal mention intact', async () => {
        const contents = `
const label = 'Stage.PRODUCTION';
if (stage === 'prod') doAction();
        `.trim();

        const result = await fix(contents, {} as FileCheckContext);

        expect(result.contents).toContain("const label = 'Stage.PRODUCTION';");
      });
    });
  });

  // a consumer that shadows the enum with its OWN top-level `Stage` (a local object literal named
  // `Stage`) is an ACCEPTED, disclosed residual — the walk matches any top-level `Stage.<member>`
  // property access, so a local shadow is treated the same as the org enum. these tests CHARACTERIZE
  // that current behavior rather than assert it correct: the org-standard enum name is not re-used
  // locally in practice, so the residual is benign. teeth: add scope-analysis that skips a local
  // shadow and these two pins redden — a signal the residual changed on purpose, not by accident.
  describe('shadowed-enum characterization (accepted residual — a local Stage is treated as the enum)', () => {
    it('migrates a shadowed Stage.PRODUCTION as though it were the enum', async () => {
      const contents = `
const Stage = { PRODUCTION: 'x', TEST: 'y' };
if (env === Stage.PRODUCTION) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // characterizes: the walk cannot tell a local shadow from the enum, so it rewrites the access.
      expect(result.contents).toContain("=== 'prod'");
      expect(result.contents).not.toContain('Stage.PRODUCTION');
    });

    it('leaves + marks a shadowed Stage.DEVELOPMENT as though it were the enum', async () => {
      const contents = `
const Stage = { DEVELOPMENT: 'x' };
if (env === Stage.DEVELOPMENT) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // characterizes: the ambiguous member is left in place + review-marked, shadow or not.
      expect(result.contents).toContain('=== Stage.DEVELOPMENT');
      expect(result.contents).toContain('@declapract:review');
    });
  });

  // the parser walk catches `Stage.<member>` in THREE node positions, not just value position. a
  // type annotation (`x: Stage.PRODUCTION`, a QualifiedName) and a bracket lookup
  // (`Stage['PRODUCTION']`, an ElementAccess with a string-literal key) name the same enum member
  // and are just as axis-ambiguous, so they must migrate + red-gate together. teeth: drop the
  // QualifiedName or ElementAccess branch from getStageAccesses and these redden.
  describe('type-position + bracket-access coverage', () => {
    it('detects a type-position Stage.PRODUCTION (a QualifiedName)', () => {
      const contents = `
import { Stage } from './environment';
const x: Stage.PRODUCTION = env;
      `.trim();

      expect(() => check(contents, {} as FileCheckContext)).not.toThrow();
    });

    it('migrates a type-position Stage.PRODUCTION to its literal', async () => {
      const contents = `
import { Stage } from './environment';
const x: Stage.PRODUCTION = env;
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).toContain("'prod'");
      expect(result.contents).not.toContain('Stage.PRODUCTION');
    });

    it('leaves + marks a type-position Stage.DEVELOPMENT', async () => {
      const contents = `
import { Stage } from './environment';
const x: Stage.DEVELOPMENT = env;
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).toContain('Stage.DEVELOPMENT');
      expect(result.contents).toContain('@declapract:review');
    });

    it('detects + migrates a bracket-access Stage[PRODUCTION]', async () => {
      const contents = `
import { Stage } from './environment';
if (env === Stage['PRODUCTION']) doAction();
      `.trim();

      expect(() => check(contents, {} as FileCheckContext)).not.toThrow();

      const result = await fix(contents, {} as FileCheckContext);
      expect(result.contents).toContain("'prod'");
      expect(result.contents).not.toContain("Stage['PRODUCTION']");
    });
  });

  // the import-specifier drop is AST-driven, so `Stage` is removed wherever it sits in the
  // named-bindings list — even the MIDDLE (`{ A, Stage, B }`), which a first/last-only regex
  // silently skips (a dead import left to fail the lint). teeth: revert to the regex form and the
  // mid-list case leaves `Stage` behind.
  describe('import-specifier drop (mid-list)', () => {
    it('drops a mid-list Stage specifier + preserves its neighbors', async () => {
      const contents = `
import { getConfig, Stage, getEnv } from './environment';
if (stage === Stage.PRODUCTION) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      // Stage migrated → import no longer needed → dropped, neighbors kept verbatim
      expect(result.contents).toContain(
        "import { getConfig, getEnv } from './environment';",
      );
      expect(result.contents).not.toContain('Stage');
    });

    it('drops a first-position Stage specifier + preserves the rest', async () => {
      const contents = `
import { Stage, getConfig } from './environment';
if (stage === Stage.PRODUCTION) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).toContain(
        "import { getConfig } from './environment';",
      );
      expect(result.contents).not.toContain('Stage');
    });

    it('removes the whole import when Stage is the sole specifier', async () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.PRODUCTION) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).not.toContain('import { Stage }');
      expect(result.contents).not.toContain('Stage');
    });
  });

  // the review-marker dedup scans the whole contiguous `//` comment block above a Stage.DEVELOPMENT
  // line, not just the single line directly above — so a marker a reformat pushed one comment-line
  // up is still seen, and a second pass adds no second marker. teeth: revert the guard to the
  // single-prevLine check and this doubles the marker.
  describe('review-marker dedup (contiguous comment block)', () => {
    it('does not double-insert when the marker sits above another comment line', async () => {
      const contents = `
// @declapract:review: Stage.DEVELOPMENT is axis-ambiguous — pick by hand
// an unrelated note directly above the reference
if (stage === Stage.DEVELOPMENT) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      const markerCount = (
        result.contents?.match(/@declapract:review/g) ?? []
      ).length;
      expect(markerCount).toBe(1);
    });

    it('is idempotent across a second fix pass', async () => {
      const contents = `
if (stage === Stage.DEVELOPMENT) doAction();
      `.trim();

      const once = await fix(contents, {} as FileCheckContext);
      const twice = await fix(once.contents ?? '', {} as FileCheckContext);

      const markerCount = (
        twice.contents?.match(/@declapract:review/g) ?? []
      ).length;
      expect(markerCount).toBe(1);
    });
  });
});
