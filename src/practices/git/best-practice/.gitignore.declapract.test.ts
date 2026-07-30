import { check, fix } from './.gitignore.declapract';

describe('.gitignore best practice', () => {
  describe('check', () => {
    it('should pass when all expected ignores are present with node_modules negations at the end', () => {
      const contents = `*.bak.*
*.local.json
*.log
*.tsbuildinfo
.agent/.cache/
.artifact
.cache/
.env
.log/slowtest/
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

  /**
   * .what = the cache-dir clamps
   * .why  = the declared set carries `.cache/` and `.agent/.cache/` so a worktree
   *         teardown is not snagged by scratch state, and so a hurried `git add .`
   *         cannot sweep a debug file that holds a secret.
   * .note = coverage of `.agent/.cache/` is only IMPLICIT today — `.cache/` has no
   *         interior slash, so git matches it at any depth. the explicit line is
   *         insurance: one edit to `.cache/` would otherwise un-ignore agent caches
   *         across every consumer at once. the path-coverage half of this proof needs
   *         a real repo, so it lives in ../.declapract.integration.test.ts.
   */
  describe('cache dirs are declared', () => {
    /**
     * .note = `fix(null, …)` is the ONE call with no file contents to union in, so it
     *         reads the declared set alone. an assertion driven off a fixture would
     *         union that fixture's own lines back into the expectation, and so would
     *         pass even after a line was deleted from the declaration.
     */
    it('should declare .cache/ and .agent/.cache/ when there is no file to union in', async () => {
      const result = await fix(null, {} as any);
      const lines = result.contents!.split('\n');

      expect(lines).toContain('.cache/');
      expect(lines).toContain('.agent/.cache/');
    });

    /**
     * .what = the whole file a fresh repo receives, as one reviewable artifact
     * .why  = `rule.require.snapshots` -- and it is the repo's own convention for a
     *         declapract fix (`format`, `cicd-common`, `tests` all snapshot theirs).
     *         the assertions above prove two lines are present; only a snapshot shows
     *         the FILE: every line, and above all the ORDER, which carries weight here
     *         because a negation hoisted above its target turns inert.
     * .why  = it also makes the maintainer's obligation visible. add a line to
     *         `ignoresSortable` and this diff shows exactly where the sort puts it --
     *         the same position that line must take in this repo's own `.gitignore`
     *         (see `.declapract.readme.md`). that position had to be derived by hand
     *         when `.agent/.cache/` was self-applied; now it is read off the diff.
     * .note = paired with the targeted assertions above, never a replacement for them
     *         -- a snapshot alone proves only that a human once blessed the bytes.
     */
    it('should emit a declared file that matches snapshot', async () => {
      const result = await fix(null, {} as any);

      expect(result.contents).toMatchSnapshot(
        '.gitignore -- as declared by git',
      );
    });

    /**
     * .what = the NEGATIVE half of the same clamp -- `check` must flag a repo that
     *         lacks a cache line
     * .why  = the wish's second criterion is "an upgrade against a repo that lacks a
     *         line adds it", and `check` is the gate that makes it happen: declapract
     *         runs `fix` only for a file `check` rejects. so a `check` that passed on
     *         a file which lacks `.agent/.cache/` would leave the line to never
     *         arrive, and the criterion would fail with every unit assertion green.
     * .note = the assertion above clamps `fix` (what we EMIT); this clamps `check`
     *         (what we REJECT). both are needed: the extant `check` cases cannot
     *         catch a deleted declaration line, because `defineExpectedContents`
     *         unions the fixture's own lines back into the expectation -- so a
     *         fixture that still lists the line feeds the very expectation it is
     *         measured against. these cases OMIT the line, which is what gives them
     *         teeth against that deletion.
     */
    const cacheLines = ['.cache/', '.agent/.cache/'];
    cacheLines.forEach((thisLine) => {
      it(`should flag an otherwise conformant file that lacks ${thisLine}`, async () => {
        const conformant = (await fix(null, {} as any)).contents!;
        const withoutTheLine = conformant
          .split('\n')
          .filter((line) => line !== thisLine)
          .join('\n');

        expect(() => check(withoutTheLine, {} as any)).toThrow();
      });
    });

    /**
     * .what = the wish's "no duplicate line", for the lines the wish is ABOUT
     * .why  = the extant `should not duplicate node_modules negations` case reads like
     *         it clamps `dedupe`. it does not. the ordered patterns are FILTERED OUT of
     *         the sortable set and appended separately, so they never pass through
     *         `dedupe` at all -- that case clamps the ordered filter instead. drop
     *         `dedupe` and it stays green, while a repo that already carries `.cache/`
     *         gets it twice on the next upgrade.
     * .note = measured, not argued: with `dedupe` removed, the negations case passed
     *         and these fail.
     */
    cacheLines.forEach((thisLine) => {
      it(`should not duplicate ${thisLine} when the repo already carries it`, async () => {
        const result = await fix(`${thisLine}\ncoverage\n`, {} as any);
        const lines = result.contents!.split('\n');

        expect(lines.filter((line) => line === thisLine)).toHaveLength(1);
      });
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
        slug: 'a file that already carries the cache lines, unsorted',
        contents: 'node_modules\n.cache/\n.agent/.cache/\n*.log\n',
      },
      {
        slug: 'a file with custom ignores',
        contents: '# custom project ignores\n.idea\n*.pyc\n',
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
});
