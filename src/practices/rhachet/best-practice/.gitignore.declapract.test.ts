/**
 * .note = this cross-practice import is DELIBERATE -- do not "clean it up" as a stray
 *         reach into a neighbor practice. `convergence` is a property of two declarers,
 *         so no test that holds only one of them can prove it; some single file must
 *         hold both, and this is that file.
 * .note = the two practices are bound HERE at test time only. neither imports the other
 *         at runtime -- they meet solely through
 *         `src/utils/defineExpectedGitignoreContents.ts`. so this import adds no
 *         dependency between the shipped practices, and a check for cycles between them
 *         still reads clean.
 */
import {
  check as checkOfGit,
  fix as fixOfGit,
} from '../../git/best-practice/.gitignore.declapract';
import { check, fix } from './.gitignore.declapract';

describe('.gitignore best practice (rhachet)', () => {
  /**
   * .what = rhachet declares the ignore for the dir rhachet itself writes
   * .why  = rhachet boots roles into `.agent/.cache/`. a repo that takes this
   *         practice gets the ignore from the practice that caused the cruft,
   *         rather than from a neighbor practice it may not have taken.
   */
  describe('cache dir is declared', () => {
    /**
     * .note = `fix(null, …)` is the ONE call with no file contents to union in, so it
     *         reads the declared set alone. an assertion driven off a fixture would
     *         union that fixture's own lines back into the expectation, and so would
     *         pass even after the line was deleted from the declaration.
     */
    it('should declare .agent/.cache/ when there is no file to union in', async () => {
      const result = await fix(null, {} as any);
      const lines = result.contents!.split('\n');

      expect(lines).toContain('.agent/.cache/');
    });

    it('should leave .cache/ to the git practice', async () => {
      const result = await fix(null, {} as any);
      const lines = result.contents!.split('\n');

      expect(lines).not.toContain('.cache/');
    });

    /**
     * .what = the whole file a rhachet-only repo receives, as one reviewable artifact
     * .why  = `rule.require.snapshots`, and the repo's own convention for a declapract
     *         fix. this is the twin of the git practice's snapshot, and the pair is
     *         the point: read side by side, the diff between them IS the ownership
     *         split this behavior exists to establish -- rhachet declares the dir it
     *         writes, git declares the generic scratch, and both carry the identical
     *         ordered tail on which their convergence rests.
     * .note = the assertions above prove one line present and one line absent; only
     *         the snapshot shows a reviewer the file, and the tail's exact order.
     */
    it('should emit a declared file that matches snapshot', async () => {
      const result = await fix(null, {} as any);

      expect(result.contents).toMatchSnapshot(
        '.gitignore -- as declared by rhachet',
      );
    });

    /**
     * .what = the NEGATIVE half -- `check` must flag a repo that lacks the line
     * .why  = `check` is the gate: declapract runs `fix` only for a file it rejects.
     *         a `check` that passed on a file which lacks `.agent/.cache/` would
     *         leave a rhachet consumer with the dir and no ignore for it -- the exact
     *         ownership gap this declaration was added to close.
     * .note = the fixture OMITS the line on purpose. a fixture that still listed it
     *         would feed the expectation it is measured against, and so would pass
     *         even after the line was deleted from the declaration.
     */
    it('should flag an otherwise conformant file that lacks .agent/.cache/', async () => {
      const conformant = (await fix(null, {} as any)).contents!;
      const withoutTheLine = conformant
        .split('\n')
        .filter((line) => line !== '.agent/.cache/')
        .join('\n');

      expect(() => check(withoutTheLine, {} as any)).toThrow();
    });
  });

  /**
   * .what = the two halves of "findsert", stated as the wish states them:
   *         "a repo that already carries a line stays untouched -- no duplicate line",
   *         and a repo's own ignores survive
   * .why  = the git declaration clamps both at this grain (`should preserve custom
   *         ignores`, `should not duplicate ... if already present`). rhachet copied
   *         `defineExpectedContents` from it and inherited neither clamp. the copy is
   *         where a findsert is easiest to break: drop `ignoresFromFileSortable` from
   *         the union and the fix silently DELETES a consumer's custom ignores; drop
   *         `dedupe` and it silently doubles a line the repo already had.
   * .note = the integration suite proves the union half end to end. this is the unit
   *         grain, which the git declaration already holds and rhachet owed too --
   *         and it is the only grain that isolates `dedupe` from the sort.
   */
  /**
   * .what = the ordered tail, clamped on the rhachet side
   * .why  = the tail is the WHOLE safety condition of this fold-in. rhachet IMPORTS the
   *         tail rather than declares its own, for one reason: two practices that
   *         declare the same file converge only while both emit an identical ordered
   *         tail. the git declaration clamps both halves of that at this grain
   *         (`should fail when node_modules negation patterns are absent`, `should move
   *         node_modules negations to the end ...`); rhachet clamped neither, though it
   *         carries the same duty.
   * .note = the import makes the two tails identical BY CONSTRUCTION, so this clamp no
   *         longer guards against two copies that diverge -- that defect cannot be
   *         written. it guards what remains: that the shared tail is emitted correctly
   *         from THIS side. drop a negation from `ignoresOrderedForGitignore` and the
   *         suite goes red here as well as in the git suite.
   * .note = the relocation half is not hypothetical. a `fix` that left hoisted `!`
   *         lines where it found them would produce the inert-negation state that
   *         cicd-app-react-native-expo's sort produced for ~22 months (#537, fixed
   *         2026-07-30). an inert negation silently re-ignores every test-fixture
   *         node_modules the tail exists to protect, and the file still LOOKS right.
   */
  describe('the ordered tail', () => {
    it('should flag a file whose negations are absent', () => {
      const contents = `.agent/.cache/
node_modules
`;

      expect(() => check(contents, {} as any)).toThrow();
    });

    it('should move negations to the end when they appear in the wrong position', async () => {
      // scenario: someone hand-added the negation above its target, so git ignores it
      const contents = `!.test*/**/node_modules
coverage
node_modules
`;

      const result = await fix(contents, {} as any);
      const lines = result.contents!.split('\n').filter((line) => line);

      expect(lines.indexOf('node_modules')).toBeLessThan(
        lines.indexOf('!.test*/**/node_modules'),
      );
    });
  });

  describe('findsert', () => {
    it("should preserve a repo's own custom ignores", async () => {
      const result = await fix('dist\n.idea\n*.pyc\n', {} as any);
      const lines = result.contents!.split('\n');

      expect(lines).toContain('.idea');
      expect(lines).toContain('*.pyc');
      expect(lines).toContain('dist');
      expect(lines).toContain('.agent/.cache/');
    });

    it('should not duplicate .agent/.cache/ when the repo already carries it', async () => {
      const result = await fix('.agent/.cache/\ndist\n', {} as any);
      const lines = result.contents!.split('\n');

      expect(lines.filter((line) => line === '.agent/.cache/')).toHaveLength(1);
    });

    it('should not duplicate the ordered negations when they are already present', async () => {
      const conformant = (await fix(null, {} as any)).contents!;
      const lines = (await fix(conformant, {} as any)).contents!.split('\n');

      expect(lines.filter((line) => line === 'node_modules')).toHaveLength(1);
      expect(
        lines.filter((line) => line === '!.test*/**/node_modules'),
      ).toHaveLength(1);
      expect(
        lines.filter((line) => line === '!.test*/**/node_modules/**'),
      ).toHaveLength(1);
    });
  });

  /**
   * .what = idempotency has two clauses, and each one carries its own load
   * .why  = a fix that is not a fixed point churns the file on every upgrade; a check
   *         that still throws on the fix's own output makes `declapract fix` re-flag
   *         the file forever. the loop is governed by `check`, not by `fix`.
   */
  describe('idempotency', () => {
    const casesToFix = [
      { slug: 'an absent file', contents: null },
      { slug: 'an unconformant file', contents: '*.log\nnode_modules\n' },
      {
        slug: 'a file that already carries the cache line, unsorted',
        contents: 'node_modules\n.agent/.cache/\n*.log\n',
      },
    ];

    casesToFix.forEach((thisCase) => {
      it(`should be a fixed point, given ${thisCase.slug}`, async () => {
        const once = (await fix(thisCase.contents, {} as any)).contents!;
        const twice = (await fix(once, {} as any)).contents!;

        expect(twice).toEqual(once);
      });

      it(`should satisfy its own check, given ${thisCase.slug}`, async () => {
        const once = (await fix(thisCase.contents, {} as any)).contents!;

        expect(() => check(once, {} as any)).not.toThrow();
      });
    });
  });

  /**
   * .what = the convergence clamp — two practices declare the repo-root `.gitignore`
   * .why  = each unions the file's extant lines before it sorts, so once either has
   *         run, the file already holds the other's lines. that makes them converge
   *         instead of oscillate — but ONLY while both emit an identical ordered
   *         tail.
   * .note = an earlier shape copied the tail into each declaration, and this clamp's
   *         job was to catch the copies as they diverged. both now IMPORT it from
   *         `src/utils/defineExpectedGitignoreContents`, so that defect cannot be
   *         written and this clamp no longer guards it. what it still guards is what
   *         the import cannot: that a practice keeps USING the shared algorithm at all,
   *         and that the shared algorithm is itself a fixed point. re-derive either
   *         declaration by hand and these assertions go red.
   * .note = cicd-app-react-native-expo declares this file too, and for ~22 months it
   *         emitted NO ordered tail, so it could satisfy neither check here (#537,
   *         fixed 2026-07-30 by the same import). that history is why the tail is the
   *         detail that carries the load. its own suite has the mirror of this clamp.
   * .note = the two declared sets here are NOT symmetric, and the assertions reflect
   *         that. rhachet's one line is a SUBSET of git's, so git's output alone
   *         already satisfies rhachet's check. expo's set is DISJOINT from git's, so
   *         neither output alone satisfies the other and both must run first. do not
   *         copy an assertion between the two suites without that check.
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
      it(`git's fix output should satisfy rhachet's check, given ${thisCase.slug}`, async () => {
        const fixedByGit = (await fixOfGit(thisCase.contents, {} as any))
          .contents!;

        expect(() => check(fixedByGit, {} as any)).not.toThrow();
      });

      it(`rhachet's fix output should satisfy git's check... after git has run, given ${thisCase.slug}`, async () => {
        // rhachet declares a subset, so git's own lines must be present first
        const fixedByGit = (await fixOfGit(thisCase.contents, {} as any))
          .contents!;
        const fixedByRhachet = (await fix(fixedByGit, {} as any)).contents!;

        expect(() => checkOfGit(fixedByRhachet, {} as any)).not.toThrow();
      });

      it(`the two fixes should reach the same file, in either order, given ${thisCase.slug}`, async () => {
        const gitThenRhachet = (
          await fix(
            (await fixOfGit(thisCase.contents, {} as any)).contents!,
            {} as any,
          )
        ).contents!;
        const rhachetThenGit = (
          await fixOfGit(
            (await fix(thisCase.contents, {} as any)).contents!,
            {} as any,
          )
        ).contents!;

        expect(rhachetThenGit).toEqual(gitThenRhachet);
      });
    });
  });
});
