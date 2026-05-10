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

    it('should not match files without Stage enum', () => {
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

    it('should replace Stage.DEVELOPMENT with prep literal', async () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.DEVELOPMENT) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).toContain("'prep'");
      expect(result.contents).not.toContain('Stage.DEVELOPMENT');
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

    it('should remove Stage-only import', async () => {
      const contents = `
import { Stage } from './environment';
if (stage === Stage.PRODUCTION) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).not.toContain('import { Stage }');
    });

    it('should remove Stage from multi-import', async () => {
      const contents = `
import { stage, Stage } from './environment';
if (stage === Stage.TEST) doAction();
      `.trim();

      const result = await fix(contents, {} as FileCheckContext);

      expect(result.contents).toContain('import { stage } from');
      expect(result.contents).not.toContain('Stage');
    });
  });
});
