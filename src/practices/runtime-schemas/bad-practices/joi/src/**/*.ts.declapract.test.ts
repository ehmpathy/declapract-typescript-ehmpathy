import { check, fix } from './*.ts.declapract';

describe('joi-imports source files', () => {
  describe('check', () => {
    it('should match files that import from joi (default import)', () => {
      const contents = `import Joi from 'joi';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files that import from joi (namespace import)', () => {
      const contents = `import * as Joi from 'joi';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files that import from joi (named import)', () => {
      const contents = `import { Schema } from 'joi';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files that import from joi (double quotes)', () => {
      const contents = `import Joi from "joi";`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should not match files without joi imports', () => {
      const contents = `import { z } from 'zod';`;
      expect(() => check(contents, {} as any)).toThrow(
        'does not import from joi',
      );
    });
  });

  describe('fix', () => {
    it('should transform default joi import to zod import', async () => {
      const contents = `import Joi from 'joi';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("import { z } from 'zod'");
      expect(fixed).not.toContain('joi');
    });

    it('should transform namespace joi import to zod import', async () => {
      const contents = `import * as Joi from 'joi';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("import { z } from 'zod'");
      expect(fixed).not.toContain('joi');
    });

    it('should transform named joi import to zod import', async () => {
      const contents = `import { Schema, ObjectSchema } from 'joi';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("import { z } from 'zod'");
      expect(fixed).not.toContain('joi');
    });

    it('should transform Joi.object to z.object', async () => {
      const contents = `const schema = Joi.object({ name: Joi.string() });`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('z.object');
      expect(fixed).toContain('z.string');
      expect(fixed).not.toContain('Joi.');
    });

    it('should transform basic schema types', async () => {
      const contents = `
const schema = Joi.object({
  name: Joi.string(),
  age: Joi.number(),
  active: Joi.boolean(),
  tags: Joi.array(),
  createdAt: Joi.date(),
  extra: Joi.any(),
});`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('z.object');
      expect(fixed).toContain('z.string');
      expect(fixed).toContain('z.number');
      expect(fixed).toContain('z.boolean');
      expect(fixed).toContain('z.array');
      expect(fixed).toContain('z.date');
      expect(fixed).toContain('z.any');
      expect(fixed).not.toContain('Joi.');
    });

    it('should remove .required() calls (zod is required by default)', async () => {
      const contents = `const schema = Joi.object({ name: Joi.string().required() });`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('z.string()');
      expect(fixed).not.toContain('.required()');
    });

    it('should handle a complete file transformation', async () => {
      const contents = `import Joi from 'joi';

const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().required(),
  age: Joi.number(),
});

export { userSchema };`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("import { z } from 'zod'");
      expect(fixed).toContain('z.object');
      expect(fixed).toContain('z.string()');
      expect(fixed).toContain('z.number()');
      expect(fixed).not.toContain('Joi');
      expect(fixed).not.toContain('.required()');
    });
  });

  // #594 — the rewrite makes three SILENT semantic changes a regex cannot get right
  // (optionality flip, unknown-key policy, date coercion). it must flag them loud, not guess.
  // .note = the marker is a COMPENSATION, not the endpoint: a consumer who runs `declapract plan`
  //         still reads only a green/red status, so the in-file marker text is the sole
  //         could-not-fire signal. the durable "could-not-fire vs passed" plan signal is owed
  //         upstream (ehmpathy/declapract#107); until it lands, this clamp verifies the marker text
  //         so a reword cannot silently drop the diagnostic.
  describe('@declapract:review marker (#594)', () => {
    it('prepends a review marker to every rewritten file', async () => {
      const contents = `import Joi from 'joi';
const schema = Joi.object({ name: Joi.string() });`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('@declapract:review');
    });

    it('the marker names the three silent semantic changes', async () => {
      const contents = `import Joi from 'joi';
const schema = Joi.object({ name: Joi.string() });`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('optionality');
      expect(fixed).toContain('unknown keys');
      expect(fixed).toContain('date coercion');
      // snapshot the marker verbatim — user-faced output; a reword must redden a vibecheck
      expect(fixed).toMatchSnapshot('joi rewrite — review marker');
    });

    it('is idempotent: the check no longer fires on the rewritten output', async () => {
      const contents = `import Joi from 'joi';
const schema = Joi.object({ name: Joi.string() });`;
      const { contents: fixed } = await fix(contents, {} as any);

      // post-rewrite the joi import is gone, so a second pass skips (no double marker)
      expect(() => check(fixed!, {} as any)).toThrow('does not import from joi');
    });
  });
});
