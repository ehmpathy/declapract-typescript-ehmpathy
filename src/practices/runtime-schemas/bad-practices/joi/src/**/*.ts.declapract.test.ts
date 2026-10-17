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

  // #629 — a bare joi `.uuid()` checks the 8-4-4-4-12 layout only; zod's `.uuid()` adds the version
  // and variant nibbles, so a naive map narrows a public contract with no compile signal. the
  // faithful map is `z.guid()`; a single uuidv4 version option earns `z.uuidv4()`.
  describe('uuid semantics (#629)', () => {
    // zod 4 rides in via declapract; resolve it from there to parse the emitted schema
    const { z } = require(
      require.resolve('zod', { paths: [require.resolve('declapract')] }),
    );
    const asSchemaFromExpression = (expression: string) =>
      new Function('z', `return ${expression};`)(z);
    const nonV4Uuid = 'beefbeef-beef-beef-beef-beefbeefbeef';

    it('maps a bare Joi.string().uuid() to z.guid(), which accepts what joi accepted', async () => {
      const contents = `import Joi from 'joi';
const schema = Joi.object({ id: Joi.string().uuid().required() });`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toContain('id: z.guid()');
      expect(fixed).not.toContain('.uuid()');
      expect(asSchemaFromExpression('z.guid()').safeParse(nonV4Uuid).success).toBe(true);
      // teeth: the narrowed map rejects the same id
      expect(
        asSchemaFromExpression('z.string().uuid()').safeParse(nonV4Uuid).success,
      ).toBe(false);
    });

    it('maps a Joi.string().guid() alias the same way', async () => {
      const contents = `import Joi from 'joi';
const schema = Joi.string().guid();`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toContain('const schema = z.guid();');
    });

    it('maps a single uuidv4 version option to z.uuidv4()', async () => {
      const contents = `import Joi from 'joi';
const a = Joi.string().uuid({ version: 'uuidv4' });
const b = Joi.string().uuid({ version: ['uuidv4'] }).required();`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toContain('const a = z.uuidv4();');
      expect(fixed).toContain('const b = z.uuidv4();');
    });

    it('maps any other version option to z.uuid()', async () => {
      const contents = `import Joi from 'joi';
const a = Joi.string().uuid({ version: ['uuidv1', 'uuidv4'] });
const b = Joi.string().uuid({ version: 'uuidv7' });`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toContain('const a = z.uuid();');
      expect(fixed).toContain("const b = z.uuid({ version: 'v7' });");
    });

    it('backfills z.string().uuid() in a file that still carries the joi review marker', async () => {
      const migratedBefore = `/**
 * @declapract:review — auto-migrated to zod; VERIFY these three semantics by hand:
 */
import { z } from 'zod';
const schema = z.object({ id: z.string().uuid() });`;
      expect(() => check(migratedBefore, {} as any)).not.toThrow();
      const { contents: fixed } = await fix(migratedBefore, {} as any);
      expect(fixed).toContain('id: z.guid()');
      // converged: the check skips the backfilled file, and a second pass is a no-op
      expect(() => check(fixed!, {} as any)).toThrow();
      const { contents: twice } = await fix(fixed!, {} as any);
      expect(twice).toEqual(fixed);
    });

    it('leaves a strict uuid alone in a file with no joi review marker', () => {
      const contents = `import { z } from 'zod';
const schema = z.object({ id: z.string().uuid(), other: z.uuid() });`;
      expect(() => check(contents, {} as any)).toThrow();
    });

    it('leaves a deliberate z.uuid() alone even in a marker file', () => {
      const contents = `/**
 * @declapract:review — auto-migrated to zod; VERIFY these three semantics by hand:
 */
import { z } from 'zod';
const schema = z.object({ id: z.uuid() });`;
      expect(() => check(contents, {} as any)).toThrow();
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

    it('the marker names z.coerce.number() beside z.coerce.date() (#548)', async () => {
      const contents = `import Joi from 'joi';
const schema = Joi.object({ count: Joi.number() });`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toContain('z.coerce.number()');
      expect(fixed).toContain('z.coerce.date()');
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
