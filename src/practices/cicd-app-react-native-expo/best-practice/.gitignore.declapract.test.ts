import {
  check as checkOfGit,
  fix as fixOfGit,
} from '../../git/best-practice/.gitignore.declapract';
import { check, fix } from './.gitignore.declapract';

/**
 * .note = this file imports the GIT practice's declaration on purpose. convergence is a
 *         property BETWEEN declarers, so it cannot be asserted from inside one of them.
 *         this is test-time only -- neither declaration imports the other at runtime;
 *         both import the shared algorithm from `src/utils/`.
 */
describe('.gitignore best practice (cicd-app-react-native-expo)', () => {
  /**
   * .what = the expo build output this practice declares
   * .why  = `android/` and `ios/` are emitted by `expo prebuild`.
   */
  describe('build dirs are declared', () => {
    /**
     * .note = `fix(null, …)` is the ONE call with no file contents to union in, so it
     *         reads the declared set alone. an assertion driven off a fixture would
     *         union that fixture's own lines back into the expectation, and so would
     *         pass even after the line was deleted from the declaration.
     */
    it('should declare android/ and ios/ when there is no file to union in', async () => {
      const result = await fix(null, {} as any);
      const lines = result.contents!.split('\n');

      expect(lines).toContain('android/');
      expect(lines).toContain('ios/');
    });

    it('should emit a declared file that matches snapshot', async () => {
      const result = await fix(null, {} as any);

      expect(result.contents).toMatchSnapshot(
        'cicd-app-react-native-expo .gitignore — as declared',
      );
    });
  });

  describe('idempotency', () => {
    it('should be a fixed point', async () => {
      const once = (await fix(null, {} as any)).contents!;
      const twice = (await fix(once, {} as any)).contents!;

      expect(twice).toEqual(once);
    });

    it('should satisfy its own check', async () => {
      const once = (await fix(null, {} as any)).contents!;

      expect(() => check(once, {} as any)).not.toThrow();
    });
  });

  /**
   * .what = the convergence clamp for the pair that #537 suspected of oscillation
   * .why  = every repo in the `app-react-native-expo` use case takes BOTH this practice
   *         and `git` (`src/useCases.yml`), so both declare the repo-root `.gitignore`.
   *         before this clamp, THIS practice sorted every line with no ordered tail --
   *         so `!` (0x21) sorted above `node_modules`, which hoisted the negations above
   *         their target and turned them INERT. the file still read as correct while
   *         every test-fixture `node_modules` the tail protects was silently re-ignored.
   * .note = the cause was staleness, not design: this declaration dates to 2024-09-11,
   *         and git did not gain its ordered tail until 2026-01-31 (#404). this practice
   *         was cloned from the older git shape and never caught up.
   * .note = the fix was to IMPORT `src/utils/defineExpectedGitignoreContents` rather than
   *         re-derive the union/sort/tail. consumers see no content change -- they
   *         already received the tail from `git` -- what changes is that this practice
   *         no longer HOISTS it.
   * .note = these assertions ARE the "verify by run, first" that #537 asked for.
   *         re-derive this declaration by hand and they go red.
   */
  describe('convergence with the git practice', () => {
    const casesToFix = [
      { slug: 'an absent file', contents: null },
      { slug: 'an unconformant file', contents: '*.log\nnode_modules\n' },
      {
        slug: 'a file with custom ignores',
        contents: '# custom project ignores\n.idea\n*.pyc\n',
      },
    ];

    casesToFix.forEach((thisCase) => {
      /**
       * .note = both declarers must have run before EITHER check can pass, and that is
       *         correct rather than a weakness. expo's set (`android/`, `ios/`) and
       *         git's are DISJOINT -- neither contains the other -- so git's output
       *         alone genuinely lacks expo's lines, and expo's check rightly rejects it.
       *         (contrast rhachet, whose one line git also declares, so git's output
       *         satisfies rhachet's check unaided.)
       *
       *         convergence never claimed one declarer alone suffices. it claims the
       *         file SETTLES once both have run -- and stays settled, in either order.
       *         that is what these three assert.
       */
      it(`both checks should pass once both have run, given ${thisCase.slug}`, async () => {
        const fixedByGit = (await fixOfGit(thisCase.contents, {} as any))
          .contents!;
        const settled = (await fix(fixedByGit, {} as any)).contents!;

        expect(() => checkOfGit(settled, {} as any)).not.toThrow();
        expect(() => check(settled, {} as any)).not.toThrow();
      });

      it(`the settled file should be a fixed point under BOTH, given ${thisCase.slug}`, async () => {
        const fixedByGit = (await fixOfGit(thisCase.contents, {} as any))
          .contents!;
        const settled = (await fix(fixedByGit, {} as any)).contents!;

        // a second pass of either declarer must change zero bytes
        expect((await fixOfGit(settled, {} as any)).contents!).toEqual(settled);
        expect((await fix(settled, {} as any)).contents!).toEqual(settled);
      });

      it(`the two fixes should reach the same file, in either order, given ${thisCase.slug}`, async () => {
        const gitThenExpo = (
          await fix(
            (await fixOfGit(thisCase.contents, {} as any)).contents!,
            {} as any,
          )
        ).contents!;
        const expoThenGit = (
          await fixOfGit(
            (await fix(thisCase.contents, {} as any)).contents!,
            {} as any,
          )
        ).contents!;

        expect(expoThenGit).toEqual(gitThenExpo);
      });
    });

    /**
     * .what = the specific defect #537 named, asserted directly rather than implied
     * .why  = the three assertions above would also pass if the tail were merely
     *         PRESENT but misordered. this one names the failure mode: a negation must
     *         sit AFTER the pattern it negates, or git drops it silently.
     */
    it('should keep the node_modules negations BELOW node_modules', async () => {
      const settled = (
        await fix(
          (await fixOfGit(null, {} as any)).contents!,
          {} as any,
        )
      ).contents!;
      const lines = settled.split('\n');

      const nodeModulesIdx = lines.indexOf('node_modules');
      const negationIdx = lines.indexOf('!.test*/**/node_modules');

      expect(nodeModulesIdx).toBeGreaterThan(-1);
      expect(negationIdx).toBeGreaterThan(-1);
      expect(nodeModulesIdx).toBeLessThan(negationIdx);
    });
  });
});
