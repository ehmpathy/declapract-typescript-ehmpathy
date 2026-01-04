import { check, fix } from './*.ts.declapract';

describe('old-acceptance-import-paths', () => {
  describe('check', () => {
    it('should match files with relative acceptance/ imports', () => {
      const contents = `import { locally } from '../acceptance/environment';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files with deep relative acceptance/ imports', () => {
      const contents = `import { stage } from '../../acceptance/utils/environment';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files with absolute acceptance/ imports', () => {
      const contents = `import { locally } from 'acceptance/environment';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should not match files without acceptance/ imports', () => {
      const contents = `import { locally } from '../blackbox/environment';`;
      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });

    it('should not match files with acceptance in non-path context', () => {
      const contents = `const message = 'acceptance tests are great';`;
      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });
  });

  describe('fix', () => {
    it('should replace acceptance/ with blackbox/ in relative imports', async () => {
      const contents = `import { locally } from '../acceptance/environment';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import { locally } from '../blackbox/environment';`);
    });

    it('should replace acceptance/ with blackbox/ in deep relative imports', async () => {
      const contents = `import { stage } from '../../acceptance/utils/env';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import { stage } from '../../blackbox/utils/env';`);
    });

    it('should replace absolute acceptance/ imports', async () => {
      const contents = `import { locally } from 'acceptance/environment';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import { locally } from 'blackbox/environment';`);
    });

    it('should handle multiple imports', async () => {
      const contents = `
import { locally } from '../acceptance/environment';
import { something } from '../../acceptance/utils';
import { other } from '../blackbox/existing';
      `.trim();

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('../blackbox/environment');
      expect(fixed).toContain('../../blackbox/utils');
      expect(fixed).toContain('../blackbox/existing');
      expect(fixed).not.toContain('acceptance');
    });

    it('should handle double-quoted imports', async () => {
      const contents = `import { locally } from "../acceptance/environment";`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import { locally } from "../blackbox/environment";`);
    });
  });
});
