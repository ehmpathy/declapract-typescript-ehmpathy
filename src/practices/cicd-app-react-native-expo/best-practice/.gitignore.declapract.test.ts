import type { FileCheckContext } from 'declapract';

import {
  check as checkOfGit,
  fix as fixOfGit,
} from '../../git/best-practice/.gitignore.declapract';
import {
  check as checkOfRhachet,
  fix as fixOfRhachet,
} from '../../rhachet/best-practice/.gitignore.declapract';
import { check, fix } from './.gitignore.declapract';

/**
 * .what = the minimal FileCheckContext these gitignore check/fix calls read
 * .why  = the git/rhachet/expo `.gitignore` declarations take no `projectPractices`
 *         branch — they read only `contents`. the single documented cast lives here
 *         (the sanctioned test-context idiom, howto.add-bad-practice.md), confined to
 *         this helper so no call site casts. removal path: drop the cast the day
 *         declapract exports a partial-context builder.
 */
const asContext = (): FileCheckContext => ({}) as unknown as FileCheckContext;

/**
 * .note = this file imports the GIT and RHACHET practice declarations on purpose.
 *         convergence is a property BETWEEN declarers, so it cannot be asserted from
 *         inside one of them. this is test-time only -- no declaration imports another at
 *         runtime; all three import the shared algorithm from `src/utils/`.
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
      const result = await fix(null, asContext());
      const lines = result.contents!.split('\n');

      expect(lines).toContain('android/');
      expect(lines).toContain('ios/');
    });

    it('should emit a declared file that matches snapshot', async () => {
      const result = await fix(null, asContext());

      expect(result.contents).toMatchSnapshot(
        'cicd-app-react-native-expo .gitignore — as declared',
      );
    });
  });

  describe('idempotency', () => {
    it('should be a fixed point', async () => {
      const once = (await fix(null, asContext())).contents!;
      const twice = (await fix(once, asContext())).contents!;

      expect(twice).toEqual(once);
    });

    it('should satisfy its own check', async () => {
      const once = (await fix(null, asContext())).contents!;

      expect(() => check(once, asContext())).not.toThrow();
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
        const fixedByGit = (await fixOfGit(thisCase.contents, asContext()))
          .contents!;
        const settled = (await fix(fixedByGit, asContext())).contents!;

        expect(() => checkOfGit(settled, asContext())).not.toThrow();
        expect(() => check(settled, asContext())).not.toThrow();
      });

      it(`the settled file should be a fixed point under BOTH, given ${thisCase.slug}`, async () => {
        const fixedByGit = (await fixOfGit(thisCase.contents, asContext()))
          .contents!;
        const settled = (await fix(fixedByGit, asContext())).contents!;

        // a second pass of either declarer must change zero bytes
        expect((await fixOfGit(settled, asContext())).contents!).toEqual(settled);
        expect((await fix(settled, asContext())).contents!).toEqual(settled);
      });

      it(`the two fixes should reach the same file, in either order, given ${thisCase.slug}`, async () => {
        const gitThenExpo = (
          await fix(
            (await fixOfGit(thisCase.contents, asContext())).contents!,
            asContext(),
          )
        ).contents!;
        const expoThenGit = (
          await fixOfGit(
            (await fix(thisCase.contents, asContext())).contents!,
            asContext(),
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
          (await fixOfGit(null, asContext())).contents!,
          asContext(),
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

  /**
   * .what = the THREE-declarer convergence clamp for the `app-react-native-expo` usecase
   * .why  = the two `convergence with the git practice` clamps (this suite + rhachet's)
   *         each prove ONE pair against git. but a real `app-react-native-expo` consumer
   *         takes `git` + `cicd-app-react-native-expo` + `rhachet` ALL AT ONCE
   *         (`src/useCases.yml`), so all three declare its repo-root `.gitignore`
   *         simultaneously. #537's lesson is exactly that a green PER-PAIR suite is not
   *         evidence of whole-set convergence -- the set must be run together. this clamp
   *         adds what the per-pair clamps lack: the rhachet+expo pair (never clamped
   *         pairwise before), and the full 3-way union in every application order.
   * .note = all three import `src/utils/defineExpectedGitignoreContents`, so they converge
   *         by construction TODAY. this clamp guards that a future edit to any one
   *         declaration (a re-derived algorithm, a drifted tail) cannot break the whole-set
   *         settle without a red test -- the guard the per-pair clamps cannot give.
   */
  describe('3-way convergence (git + cicd-app-react-native-expo + rhachet)', () => {
    const fixers = {
      git: fixOfGit,
      expo: fix,
      rhachet: fixOfRhachet,
    };
    const checkers = [checkOfGit, check, checkOfRhachet];

    // every order the three fixes could be applied in
    const orders: (keyof typeof fixers)[][] = [
      ['git', 'expo', 'rhachet'],
      ['git', 'rhachet', 'expo'],
      ['expo', 'git', 'rhachet'],
      ['expo', 'rhachet', 'git'],
      ['rhachet', 'git', 'expo'],
      ['rhachet', 'expo', 'git'],
    ];

    const applyOrder = async (
      order: (keyof typeof fixers)[],
      start: string | null,
    ): Promise<string> => {
      // fold the fixers left-to-right immutably — each await feeds the next, no reassign
      const settled = await order.reduce<Promise<string | null>>(
        async (accP, which) =>
          (await fixers[which](await accP, asContext())).contents!,
        (async () => start)(),
      );
      return settled!;
    };

    const casesToFix = [
      { slug: 'an absent file', contents: null as string | null },
      { slug: 'an unconformant file', contents: '*.log\nnode_modules\n' },
      {
        slug: 'a file with custom ignores',
        contents: '# custom project ignores\n.idea\n*.pyc\n',
      },
    ];

    casesToFix.forEach((thisCase) => {
      it(`all three checks should pass once all three have run, given ${thisCase.slug}`, async () => {
        const settled = await applyOrder(
          ['git', 'expo', 'rhachet'],
          thisCase.contents,
        );

        checkers.forEach((checker) =>
          expect(() => checker(settled, asContext())).not.toThrow(),
        );
      });

      it(`the settled file should be a fixed point under all three, given ${thisCase.slug}`, async () => {
        const settled = await applyOrder(
          ['git', 'expo', 'rhachet'],
          thisCase.contents,
        );

        // a further pass of any declarer must change zero bytes
        expect((await fixOfGit(settled, asContext())).contents!).toEqual(settled);
        expect((await fix(settled, asContext())).contents!).toEqual(settled);
        expect((await fixOfRhachet(settled, asContext())).contents!).toEqual(
          settled,
        );
      });

      it(`the three fixes should reach the SAME file in every order, given ${thisCase.slug}`, async () => {
        const settledFiles = await Promise.all(
          orders.map((order) => applyOrder(order, thisCase.contents)),
        );

        // every order must land on one identical file
        const [first, ...rest] = settledFiles;
        rest.forEach((settled) => expect(settled).toEqual(first));
      });
    });

    /**
     * .what = the rhachet+expo pair, never clamped pairwise before this
     * .why  = the extant per-pair clamps both measure AGAINST git. rhachet's `.agent/.cache/`
     *         and expo's `android/`/`ios/` are DISJOINT, and neither is a subset of the
     *         other, so this pair genuinely settles only once both have run -- the exact
     *         gap #537 warns is invisible to a per-declaration suite.
     */
    it('the rhachet+expo pair should settle to one file in either order', async () => {
      const rhachetThenExpo = (
        await fix(
          (await fixOfRhachet(null, asContext())).contents!,
          asContext(),
        )
      ).contents!;
      const expoThenRhachet = (
        await fixOfRhachet(
          (await fix(null, asContext())).contents!,
          asContext(),
        )
      ).contents!;

      expect(expoThenRhachet).toEqual(rhachetThenExpo);
    });

    /**
     * .what = the #537 failure mode named directly, at the 3-way grain
     * .why  = the order-independence assertions would also pass if the tail were present
     *         but hoisted in ALL orders. this one names it: in the fully-settled 3-declarer
     *         file, each node_modules negation must sit AFTER its target, or git drops it.
     */
    it('should keep the node_modules negations BELOW node_modules in the 3-way settled file', async () => {
      const settled = await applyOrder(['rhachet', 'expo', 'git'], null);
      const lines = settled.split('\n');

      const nodeModulesIdx = lines.indexOf('node_modules');
      const negationIdx = lines.indexOf('!.test*/**/node_modules');

      expect(nodeModulesIdx).toBeGreaterThan(-1);
      expect(negationIdx).toBeGreaterThan(-1);
      expect(nodeModulesIdx).toBeLessThan(negationIdx);
    });
  });
});
