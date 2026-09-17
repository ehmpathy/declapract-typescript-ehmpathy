import { execSync } from 'child_process';

/**
 * .what = read the whitespace-split arg list out of the stand-in jest echo output.
 * .why  = a pure transformer that names the `JEST_ARGS: …` decode, so `getJestFlags` reads
 *         what-not-how rather than an inline regex-match + positional `match[1]` a reader must
 *         simulate. no output line = an empty arg list.
 */
const asArgsFromJestEchoOutput = (input: { output: string }): string[] => {
  const found = input.output.match(/JEST_ARGS: (.*)/);
  if (!found) return [];
  return found[1].split(/\s+/).filter(Boolean);
};

/**
 * Tests the shell flag expressions used in package.json test commands.
 *
 * These tests verify that env vars like RESNAP and THOROUGH produce
 * the correct flags when passed to jest via the package.json commands.
 *
 * We use a stand-in jest function that echoes the arguments it receives,
 * so we can verify what flags would actually be passed.
 *
 * .why integration = this drives a real `bash -c` via execSync — a child-process
 *   boundary. per rule.forbid.unit.remote-boundaries a `.test.ts` (unit) may not
 *   cross a process boundary, so the shell-flag behavior is proven at the
 *   integration grain, where a real shell is the point of the test.
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
    // .note = deliberate mutation — cleanEnv is built up across two scoped local loops (base env
    //         minus the flag vars, then the test overlay); a single-threaded local zone
    //         (rule.require.immutable-vars sanctions in-place mutation with this note).
    const cleanEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (!['CI', 'THOROUGH', 'RESNAP'].includes(key) && value !== undefined) {
        cleanEnv[key] = value;
      }
    }
    // overlay the test env vars (undefined means unset)
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        cleanEnv[key] = value;
      }
    }

    // run the command with jest replaced by echo to capture args
    const result = execSync(
      `bash -c 'jest() { echo "JEST_ARGS: $*"; }; ${command}'`,
      {
        env: cleanEnv,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        // bound the call so a stuck shell fails fast rather than hangs the suite;
        // the command is a trivial echo, so 5s is generous
        timeout: 5000,
      },
    );

    // read the jest args out of the stand-in echo output (named, what-not-how)
    return asArgsFromJestEchoOutput({ output: result });
  };

  // the test:unit command from package.json best-practice
  const testUnitCommand = `set -eu && jest -c ./jest.unit.config.ts --forceExit --verbose --passWithNoTests $([ -n "\${CI:-}" ] && echo '--ci') $([ "\${THOROUGH:-}" != "true" ] && echo '--changedSince=origin/main') $([ "\${RESNAP:-}" = "true" ] && echo '--updateSnapshot')`;

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
    it('should pass --changedSince=origin/main when THOROUGH is unset (run only changed)', () => {
      const flags = getJestFlags(testUnitCommand, {});
      expect(flags).toContain('--changedSince=origin/main');
    });

    it('should pass --changedSince=origin/main when THOROUGH=false', () => {
      const flags = getJestFlags(testUnitCommand, { THOROUGH: 'false' });
      expect(flags).toContain('--changedSince=origin/main');
    });

    it('should pass --changedSince=origin/main when THOROUGH is empty string', () => {
      const flags = getJestFlags(testUnitCommand, { THOROUGH: '' });
      expect(flags).toContain('--changedSince=origin/main');
    });

    it('should not pass --changedSince=origin/main when THOROUGH=true (run all tests)', () => {
      const flags = getJestFlags(testUnitCommand, { THOROUGH: 'true' });
      expect(flags).not.toContain('--changedSince=origin/main');
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
