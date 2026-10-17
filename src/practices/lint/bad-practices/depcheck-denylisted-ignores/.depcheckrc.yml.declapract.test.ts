import { check, fix } from './.depcheckrc.yml.declapract';

// each `as any` context below is a documented cast (rule.forbid.as-cast): the declaration reads at
// most `declaredFileContents` off its context, which carries many other fields. removal path: a
// declapract partial-context builder.
describe('.depcheckrc.yml denylist', () => {
  describe('check', () => {
    it('should throw if no denylisted ignores present (not bad practice)', () => {
      const contents = `
ignores:
  - rhachet
  - declapract
      `.trim();

      expect(() => check(contents, {} as any)).toThrow(
        'no denylisted packages found in ignores',
      );
    });

    it('should not throw if denylisted ignores present (bad practice detected)', () => {
      const contents = `
ignores:
  - rhachet
  - date-fns
      `.trim();

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should throw if no file found', () => {
      expect(() => check(null, {} as any)).toThrow('no file found');
    });
  });

  describe('fix', () => {
    it('should remove denylisted ignores', async () => {
      const currentContents = `
ignores:
  - rhachet
  - date-fns
  - declapract
  - ts-node
    `.trim();

      const { contents: fixed } = await fix(currentContents, {} as any);

      expect(fixed).toContain('- rhachet');
      expect(fixed).toContain('- declapract');
      expect(fixed).not.toContain('- date-fns');
      expect(fixed).not.toContain('- ts-node');
    });

    it('should not modify file if no denylisted ignores present', async () => {
      const currentContents = `
ignores:
  - rhachet
  - declapract
    `.trim();

      const { contents: fixed } = await fix(currentContents, {} as any);

      expect(fixed).toBe(currentContents);
    });

    it('should preserve comments when removing denylisted ignores', async () => {
      const currentContents = `
# This is a comment
ignores:
  - rhachet # keep this
  - ts-jest
  - declapract
    `.trim();

      const { contents: fixed } = await fix(currentContents, {} as any);

      expect(fixed).toContain('# This is a comment');
      expect(fixed).toContain('# keep this');
      expect(fixed).not.toContain('ts-jest');
    });

    it('should remove all denylisted packages', async () => {
      const currentContents = `
ignores:
  - date-fns
  - procedure-fns
  - ts-node
  - ts-jest
  - core-js
  - babel-jest
  - rhachet
    `.trim();

      const { contents: fixed } = await fix(currentContents, {} as any);

      expect(fixed).toContain('- rhachet');
      expect(fixed).not.toContain('- date-fns');
      expect(fixed).not.toContain('- procedure-fns');
      expect(fixed).not.toContain('- ts-node');
      expect(fixed).not.toContain('- ts-jest');
      expect(fixed).not.toContain('- core-js');
      expect(fixed).not.toContain('- babel-jest');
    });
  });

  /**
   * .what = the twice-applied clamp (rule.require.idempotent-fixes)
   * .why  = a fix that drops only part of the denylist per pass would converge only over
   *         several `declapract fix` runs; and a check that still detects its own output
   *         would reflag the file forever. both are asserted on a file with several entries.
   */
  describe('idempotency', () => {
    const contents = `
# keep this comment
ignores:
  - rhachet
  - date-fns
  - declapract # keep this
  - ts-node
  - core-js
    `.trim();

    it('fix(fix(x)) === fix(x) — the second pass changes zero', async () => {
      const { contents: once } = await fix(contents, {} as any);
      const { contents: twice } = await fix(once, {} as any);
      expect(twice).toEqual(once);
    });

    it('check throws on the fixed output — the bad practice is no longer detected', async () => {
      const { contents: once } = await fix(contents, {} as any);
      expect(() => check(once, {} as any)).toThrow(
        'no denylisted packages found in ignores',
      );
    });

    it('the fixed output keeps every non-denylisted entry and comment', async () => {
      const { contents: once } = await fix(contents, {} as any);
      expect(once).toContain('- rhachet');
      expect(once).toContain('- declapract # keep this');
      expect(once).toContain('# keep this comment');
      expect(once).toMatchSnapshot('.depcheckrc.yml — after one fix');
    });
  });
});
