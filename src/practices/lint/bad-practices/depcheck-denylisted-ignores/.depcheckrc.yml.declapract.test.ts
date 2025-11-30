import { check, fix } from './.depcheckrc.yml.declapract';

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
});
