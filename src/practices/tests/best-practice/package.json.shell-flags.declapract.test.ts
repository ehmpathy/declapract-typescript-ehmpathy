import { execSync } from 'child_process';

/**
 * Tests the shell flag expressions used in package.json test commands.
 *
 * These tests verify that env vars like RESNAP and THOROUGH produce
 * the correct flags when passed to jest via the package.json commands.
 *
 * We use a mock jest function that echoes the arguments it receives,
 * so we can verify what flags would actually be passed.
 */
describe('package.json shell flag expressions', () => {
  /**
   * Evaluates a shell command with given env vars and returns the arguments
   * that would be passed to jest (everything after the config flag).
   */
  const getJestFlags = (
    command: string,
    env: Record<string, string | undefined>,
  ): string[] => {
    // Create a clean env without CI/THOROUGH/RESNAP unless explicitly set
    const cleanEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (!['CI', 'THOROUGH', 'RESNAP'].includes(key) && value !== undefined) {
        cleanEnv[key] = value;
      }
    }
    // Overlay the test env vars (undefined means unset)
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        cleanEnv[key] = value;
      }
    }

    // Run the command with jest replaced by echo to capture args
    const result = execSync(
      `bash -c 'jest() { echo "JEST_ARGS: $*"; }; ${command}'`,
      {
        env: cleanEnv,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    // Extract the jest args from output
    const match = result.match(/JEST_ARGS: (.*)/);
    if (!match) return [];
    return match[1].split(/\s+/).filter(Boolean);
  };

  // The test:unit command from package.json best-practice
  const testUnitCommand = `set -eu && jest -c ./jest.unit.config.ts --forceExit --verbose --passWithNoTests $([ -n "\${CI:-}" ] && echo '--ci') $([ "\${THOROUGH:-}" != "true" ] && echo '--changedSince=main') $([ "\${RESNAP:-}" = "true" ] && echo '--updateSnapshot')`;

  describe('RESNAP flag', () => {
    it('should pass --updateSnapshot when RESNAP=true', () => {
      const flags = getJestFlags(testUnitCommand, { RESNAP: 'true' });
      expect(flags).toContain('--updateSnapshot');
    });

    it('should not pass --updateSnapshot when RESNAP is unset', () => {
      const flags = getJestFlags(testUnitCommand, {});
      expect(flags).not.toContain('--updateSnapshot');
    });

    it('should not pass --updateSnapshot when RESNAP=false', () => {
      const flags = getJestFlags(testUnitCommand, { RESNAP: 'false' });
      expect(flags).not.toContain('--updateSnapshot');
    });

    it('should not pass --updateSnapshot when RESNAP is empty string', () => {
      const flags = getJestFlags(testUnitCommand, { RESNAP: '' });
      expect(flags).not.toContain('--updateSnapshot');
    });

    it('should not pass --updateSnapshot when RESNAP=0', () => {
      const flags = getJestFlags(testUnitCommand, { RESNAP: '0' });
      expect(flags).not.toContain('--updateSnapshot');
    });
  });

  describe('THOROUGH flag', () => {
    it('should pass --changedSince=main when THOROUGH is unset (run only changed)', () => {
      const flags = getJestFlags(testUnitCommand, {});
      expect(flags).toContain('--changedSince=main');
    });

    it('should pass --changedSince=main when THOROUGH=false', () => {
      const flags = getJestFlags(testUnitCommand, { THOROUGH: 'false' });
      expect(flags).toContain('--changedSince=main');
    });

    it('should pass --changedSince=main when THOROUGH is empty string', () => {
      const flags = getJestFlags(testUnitCommand, { THOROUGH: '' });
      expect(flags).toContain('--changedSince=main');
    });

    it('should not pass --changedSince=main when THOROUGH=true (run all tests)', () => {
      const flags = getJestFlags(testUnitCommand, { THOROUGH: 'true' });
      expect(flags).not.toContain('--changedSince=main');
    });
  });

  describe('CI flag', () => {
    it('should pass --ci when CI=true', () => {
      const flags = getJestFlags(testUnitCommand, { CI: 'true' });
      expect(flags).toContain('--ci');
    });

    it('should pass --ci when CI=1', () => {
      const flags = getJestFlags(testUnitCommand, { CI: '1' });
      expect(flags).toContain('--ci');
    });

    it('should not pass --ci when CI is unset', () => {
      const flags = getJestFlags(testUnitCommand, {});
      expect(flags).not.toContain('--ci');
    });
  });
});
