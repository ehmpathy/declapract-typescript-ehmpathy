import { check, fix } from './.gitignore.declapract';

describe('.gitignore best practice', () => {
  describe('check', () => {
    it('should pass when all expected ignores are present with node_modules negations at the end', () => {
      const contents = `*.bak.*
*.local.json
*.log
*.tsbuildinfo
.artifact
.env
.serverless
.temp
.terraform
.terraform.lock
.vscode
.yalc
coverage
dist
node_modules
!.test*/**/node_modules
!.test*/**/node_modules/**
`;

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should fail when node_modules negation patterns are absent', () => {
      const contents = `*.log
node_modules
`;

      expect(() => check(contents, {} as any)).toThrow();
    });
  });

  describe('fix', () => {
    it('should create file with all ignores and node_modules negations at the end when contents is null', async () => {
      const result = await fix(null, {} as any);

      // should have node_modules
      expect(result.contents).toContain('node_modules');

      // should have negation patterns after node_modules
      expect(result.contents).toContain('!.test*/**/node_modules');
      expect(result.contents).toContain('!.test*/**/node_modules/**');

      // verify order: node_modules must come before negations
      const lines = result.contents!.split('\n');
      const nodeModulesIdx = lines.indexOf('node_modules');
      const negation1Idx = lines.indexOf('!.test*/**/node_modules');
      const negation2Idx = lines.indexOf('!.test*/**/node_modules/**');

      expect(nodeModulesIdx).toBeLessThan(negation1Idx);
      expect(negation1Idx).toBeLessThan(negation2Idx);
    });

    it('should add node_modules negations when only node_modules exists', async () => {
      const contents = `*.log
node_modules
`;

      const result = await fix(contents, {} as any);

      // should have negation patterns
      expect(result.contents).toContain('!.test*/**/node_modules');
      expect(result.contents).toContain('!.test*/**/node_modules/**');

      // verify order: node_modules at end before negations
      const lines = result.contents!.split('\n');
      const nodeModulesIdx = lines.indexOf('node_modules');
      const negation1Idx = lines.indexOf('!.test*/**/node_modules');

      expect(nodeModulesIdx).toBeLessThan(negation1Idx);
    });

    it('should preserve custom ignores and append required patterns', async () => {
      const contents = `# custom project ignores
.idea
*.pyc
__pycache__
`;

      const result = await fix(contents, {} as any);

      // should preserve custom ignores
      expect(result.contents).toContain('.idea');
      expect(result.contents).toContain('*.pyc');
      expect(result.contents).toContain('__pycache__');

      // should add required ignores
      expect(result.contents).toContain('node_modules');
      expect(result.contents).toContain('!.test*/**/node_modules');
      expect(result.contents).toContain('coverage');
      expect(result.contents).toContain('dist');
    });

    it('should not duplicate node_modules negations if already present', async () => {
      const contents = `*.log
coverage
dist
node_modules
!.test*/**/node_modules
!.test*/**/node_modules/**
`;

      const result = await fix(contents, {} as any);

      // count occurrences of negation patterns
      const negation1Count = (
        result.contents!.match(/!\.test\*\/\*\*\/node_modules(?!\/)/g) || []
      ).length;
      const negation2Count = (
        result.contents!.match(/!\.test\*\/\*\*\/node_modules\/\*\*/g) || []
      ).length;

      expect(negation1Count).toBe(1);
      expect(negation2Count).toBe(1);
    });

    it('should move node_modules negations to the end if they appear in wrong position', async () => {
      // scenario: someone manually added negations in the middle
      const contents = `*.log
!.test*/**/node_modules
coverage
node_modules
`;

      const result = await fix(contents, {} as any);

      // negations should be at the end, after node_modules
      const lines = result.contents!.split('\n').filter((l) => l);
      const nodeModulesIdx = lines.indexOf('node_modules');
      const negation1Idx = lines.indexOf('!.test*/**/node_modules');

      expect(nodeModulesIdx).toBeLessThan(negation1Idx);
    });
  });
});
