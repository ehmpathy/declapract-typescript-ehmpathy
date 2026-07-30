import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { check as checkOfRhachet } from '../rhachet/best-practice/.gitignore.declapract';
import { check as checkOfGit } from './best-practice/.gitignore.declapract';

// executeApply is slow (90+ seconds per invocation due to full practice evaluation)
// .note = this suite scopes each apply with `file: '.gitignore'`, which narrows the
//         work enough that a run settles in seconds. the cap matches the single-apply
//         suites rather than a multiple of them, so a hang surfaces promptly instead
//         of after a budget sized for a slowness we do not have.
jest.setTimeout(300_000); // 5 minutes

/**
 * .what = env that cuts git off from the host's user and system config
 * .why  = `rule.require.hermetic-tests`: "would this test produce the same result on a
 *         fresh CI runner with no dotfiles?" without this, NO. git resolves ignores
 *         from the repo's `.gitignore` PLUS `core.excludesFile` from the host's global
 *         gitconfig -- and `.cache/` is among the most common entries in a personal
 *         global gitignore. on such a machine every `isPathIgnored` assertion here
 *         would pass no matter WHAT the practice declares, so the clamps would be
 *         hollow and their teeth would not bite. a false green, which is worse than a
 *         false red because no one investigates it.
 * .note = latent on this host, not live -- measured: `git check-ignore -v .DS_Store
 *         foo.swp Thumbs.db .idea/x scratch~ tags` matches not one, so no global
 *         excludes file is in play here. that is exactly why it had to be closed by
 *         construction rather than by observation: the leak is invisible on the
 *         machine that would introduce it.
 * .note = `/dev/null` for both, per git >= 2.32. it also covers `git init`, which
 *         otherwise reads the host's `init.templateDir` and could seed the temp repo
 *         with hooks or an `info/exclude` of its own.
 */
const envGitHermetic = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
};

/**
 * .what = runs git with the host's user and system config cut off, always
 * .why  = the pit of success. an env passed by hand at each call site leaves the NEXT
 *         call site free to forget it and silently reopen the leak above -- and the
 *         reopened leak shows as a false GREEN, so no run would ever report it. one
 *         operation that cannot be called without the env removes the choice
 *         (`rule.prefer.prevent-over-correct`: design the error out rather than
 *         document it).
 * .note = `[case4]` deliberately does NOT route through this. it is the case that
 *         proves the env works, so it must vary the env -- the one place where the
 *         choice is the subject rather than a hazard.
 * .note = `run*` is NOT one of the sanctioned verbs, and that is deliberate.
 *         `rule.require.get-set-gen-verbs` scopes itself to `domain.operations/` and
 *         dao methods; a test-local operation is outside it, and the repo's own
 *         precedent agrees -- `runGuard` in husky's integration test, `read` and
 *         `applyForget` in persist-with-rds's. this mirrors `runGuard` on purpose.
 *         the corollary matters more than the exemption: an operation that DOES reach
 *         into the sanctioned vocabulary inherits its contract, which is why the two
 *         `get*` operations below carry the `All` cardinality the rule demands.
 */
const runGit = (input: { cwd: string; args: string[] }): string =>
  execFileSync('git', input.args, {
    cwd: input.cwd,
    env: envGitHermetic,
  }).toString();

/**
 * .what = does git actually ignore this path, per the rules in the repo?
 * .why  = line presence and path coverage are different claims. a test that only
 *         asserts `.cache/` is declared would stay green if someone re-scoped it to
 *         `/.cache/`, which would silently un-ignore `.agent/.cache/` everywhere.
 *         this asks git itself.
 * .note = execFileSync matches the repo's one prior git-in-a-tempdir precedent,
 *         src/practices/husky/check.timestamps.play.declapract.integration.test.ts
 * .note = this is a PURE query -- it creates no file and touches no disk. verified:
 *         `git check-ignore` matches a path that does not exist, dir patterns
 *         included, e.g. `zzz-absent-tree/.cache/x.json` -> `.gitignore:7:.cache/`.
 *         an earlier draft wrote a scratch file first, which made an `is*` query
 *         mutate the filesystem and let a probe under the symlinked `node_modules`
 *         write OUTSIDE the temp repo. no write, no escape, and the name is honest.
 */
const isPathIgnored = (input: { cwd: string; filepath: string }): boolean => {
  // `git check-ignore` exits 0 when ignored, 1 when not -- both are answers, not errors
  // .note = the `as` cast below is the external-boundary exemption of
  //         rule.forbid.as-cast. @types/node types the throw as plain `Error`, but
  //         `execFileSync` attaches a numeric `status` (the child's exit code) at
  //         runtime -- and here that code IS the answer. no `ExecFileSyncError` type
  //         is declared upstream, so there is no narrower type to reach for.
  // .fix  = drop the cast once @types/node types the thrown error.
  try {
    runGit({ cwd: input.cwd, args: ['check-ignore', '--', input.filepath] });
    return true;
  } catch (error) {
    if ((error as { status?: number }).status === 1) return false;
    throw error;
  }
};

/**
 * .what = what git reports as untracked or modified, one porcelain line per path
 * .why  = `isPathIgnored` is a PURE query -- it asks git about a path that does not
 *         exist, one path at a time. this asks about the tree as it ACTUALLY stands,
 *         with the scratch materialized and every rule integrated into one answer.
 *         that is the precondition `git tree del` refuses on, and it is the
 *         instrument the wish's fourth acceptance criterion names by name.
 * .note = an earlier draft justified this by claiming check-ignore and status diverge
 *         on a TRACKED path -- that check-ignore would call it ignored while status
 *         still listed it. that is backwards, and measured so:
 *           tracked `.route/.bouncer.cache.json`, default  -> exit 1, NOT ignored
 *           the same path, `--no-index`                    -> ignored by `.route/.gitignore:2:*`
 *         check-ignore consults the index, so a tracked path reports NOT ignored and
 *         the suite's `isPathIgnored(...) === true` assertions would go RED. the #514
 *         already-committed case is therefore covered, and needs no clamp of its own.
 * .note = `--porcelain` rather than `--short` because its format is a documented
 *         stability guarantee across git versions; `--short` is for humans.
 */
const getAllStatusLines = (input: { cwd: string }): string[] =>
  runGit({ cwd: input.cwd, args: ['status', '--porcelain'] })
    .split('\n')
    .filter((line) => !!line);

/**
 * .what = the lines a file repeats, if any
 * .why  = the wish's first acceptance clause is "a repo that already carries a line
 *         stays untouched -- NO DUPLICATE LINE". the unit clamps prove that for the
 *         cache lines and for rhachet's own set; this states it of the whole settled
 *         file, at the grain where two practices each append an ordered tail.
 * .note = returns the repeated lines rather than a boolean, so a failure names WHICH
 *         line duplicated instead of only that one did.
 */
const getAllLinesDuplicated = (input: { contents: string }): string[] => {
  const lines = input.contents.split('\n').filter((line) => !!line);

  return lines.filter((line, index) => lines.indexOf(line) !== index);
};

/**
 * .what = end to end proof of the gitignore practices against a real declapract run
 * .why  = the unit clamps prove each `fix` in isolation. they cannot see the pipeline:
 *         whether declapract wires the declared path to the target file, whether
 *         `check` gates `fix`, and -- above all -- what happens when TWO practices
 *         declare the same repo-root `.gitignore`. only a real run answers that.
 */
describe('gitignore practices', () => {
  given('[case1] a repo whose .gitignore lacks both cache dirs', () => {
    const tempDir = genTempDir({
      slug: 'git-cache-dirs',
      clone: './src/practices/git/.test/assets/repo-without-cache-ignores',
      symlink: [
        { at: 'declarations', to: './.test/assets/git/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    useBeforeAll(async () => {
      // git init so `git check-ignore` has a repo to answer within
      // .note = `-q` matches the husky precedent; without it the init banner
      //         pollutes the test run's stdout
      runGit({ cwd: tempDir, args: ['init', '-q'] });
    }, 30_000);

    when('[t0] before any apply', () => {
      /**
       * .why = a diff is only legible against a before. the after-snapshot in [t3]
       *        shows what settled; this one shows what it settled FROM.
       */
      then('the input file matches snapshot', async () => {
        const contents = await fs.readFile(
          path.join(tempDir, '.gitignore'),
          'utf-8',
        );

        expect(contents).toMatchSnapshot('.gitignore -- before');
      });

      then('neither cache dir is ignored yet', () => {
        expect(
          isPathIgnored({ cwd: tempDir, filepath: '.cache/scratch.json' }),
        ).toEqual(false);
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: '.agent/.cache/roles.json',
          }),
        ).toEqual(false);
      });
    });

    when('[t1] the git practice is applied', () => {
      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'git',
          file: '.gitignore',
        });
      }, 120_000);

      // .note = one read, shared across the assertions below, per
      //         rule.prefer.usethen-and-usewhen-for-shared-results. the value is
      //         wrapped in an object because useThen hands back a proxy, and a bare
      //         string proxy compares as a char-indexed object.
      const fileAfter = useThen('the apply settles', async () => ({
        lines: (
          await fs.readFile(path.join(tempDir, '.gitignore'), 'utf-8')
        ).split('\n'),
      }));

      then('both cache dirs are declared', () => {
        expect(fileAfter.lines).toContain('.cache/');
        expect(fileAfter.lines).toContain('.agent/.cache/');
      });

      then('both cache PATHS are ignored by git itself', () => {
        expect(
          isPathIgnored({ cwd: tempDir, filepath: '.cache/scratch.json' }),
        ).toEqual(true);
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: '.agent/.cache/roles.json',
          }),
        ).toEqual(true);
      });

      then("the repo's own custom ignores survive the union", () => {
        expect(fileAfter.lines).toContain('.idea');
      });

      then('the node_modules negations stay after their target', () => {
        expect(fileAfter.lines.indexOf('node_modules')).toBeLessThan(
          fileAfter.lines.indexOf('!.test*/**/node_modules'),
        );
      });

      /**
       * .what = the negation is LIVE, not merely last
       * .why  = line order and rule effect are different claims, the same way line
       *         presence and path coverage are (see `both cache PATHS are ignored`).
       *         the index assertion above is a proxy: it reads the file, never git.
       *         a negation that git does not honor -- because it was hoisted above
       *         its target, or because the target pattern was re-scoped -- still
       *         satisfies the proxy while it silently re-ignores every test-fixture
       *         node_modules the tail exists to protect. this asks git instead.
       * .note = the hoist is not hypothetical. cicd-app-react-native-expo declared
       *         this same file with no ordered tail for ~22 months, so its sort put
       *         `!` above the alphanumerics -- exactly the inert-negation state
       *         (#537, fixed 2026-07-30). re-derive any declaration of this file by
       *         hand and this assertion reproduces the state on demand.
       */
      then('the node_modules negation is honored by git itself', () => {
        // a plain node_modules is ignored, as the target pattern demands
        // .note = probed at depth, not at the root -- the temp repo mounts its root
        //         `node_modules` as a symlink, and git refuses a pathspec that
        //         traverses one ("beyond a symbolic link")
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: 'packages/demo/node_modules/pkg.js',
          }),
        ).toEqual(true);

        // ...but a test-fixture one is re-included, because the negation is live
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: '.test/assets/node_modules/pkg.js',
          }),
        ).toEqual(false);
      });

      then('no declapract template syntax leaked into the output', () => {
        expect(fileAfter.lines.join('\n')).not.toContain('@declapract{');
      });
    });

    when('[t2] the rhachet practice is applied on top', () => {
      // .note = useBeforeAll hands back a proxy, so the value must be reached through
      //         a property. a bare string proxy compares as a char-indexed object.
      const fileBefore = useBeforeAll(async () => ({
        contents: await fs.readFile(path.join(tempDir, '.gitignore'), 'utf-8'),
      }));

      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'rhachet',
          file: '.gitignore',
        });
      }, 120_000);

      // .note = one read, shared across the assertions below, per
      //         rule.prefer.usethen-and-usewhen-for-shared-results
      const fileAfterRhachet = useThen('the second apply settles', async () => ({
        lines: (
          await fs.readFile(path.join(tempDir, '.gitignore'), 'utf-8')
        ).split('\n'),
      }));

      /**
       * .what = the convergence proof, at the pipeline grain
       * .why  = both practices declare this one file. they converge only because each
       *         unions the file's extant lines AND emits an identical ordered tail.
       *         if that ever drifts, `declapract fix` rewrites the file on every run,
       *         forever -- and a hoisted negation turns inert, which silently
       *         un-ignores the test-fixture node_modules the tail exists to protect.
       */
      then('the file is byte-identical -- the practices converge', async () => {
        const contentsAfterRhachet = await fs.readFile(
          path.join(tempDir, '.gitignore'),
          'utf-8',
        );

        expect(contentsAfterRhachet).toEqual(fileBefore.contents);
      });

      then('both cache paths are still ignored', () => {
        expect(
          isPathIgnored({ cwd: tempDir, filepath: '.cache/scratch.json' }),
        ).toEqual(true);
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: '.agent/.cache/roles.json',
          }),
        ).toEqual(true);
      });

      /**
       * .what = the union and the tail, asked after the SECOND declarer has run
       * .why  = the same step-axis blind spot the leak check had. `[t1]` asks these of
       *         git's output; rhachet then rewrites this file at `[t2]` from a wholly
       *         different input -- one already full of git's 17 lines, rather than the
       *         3-line file `[case2]` hands it. a union or tail defect can behave
       *         differently on that input, and this is the only place it is reachable.
       * .note = `the practices converge` would go red too, but only as a DISAGREEMENT
       *         between the two declarers. a reader who saw that alone would look at
       *         the ordered tail, not at lost lines. these name the actual loss.
       */
      then("the repo's own custom ignores survive the second apply", () => {
        expect(fileAfterRhachet.lines).toContain('.idea');
      });

      /**
       * .what = the wish's "no duplicate line", where it is most at risk
       * .why  = this is the step where a SECOND declarer appends an ordered tail to a
       *         file that already carries one. the tail is filtered out before the
       *         sort and appended after, so it never passes through `dedupe` (the same
       *         fact gap 8 turned up at the unit grain) -- which means its safety here
       *         rests entirely on that filter, not on dedupe. if the filter ever
       *         stopped matching, `node_modules` and both negations would double, and
       *         a doubled `!` line is how #537's inert-negation hazard begins.
       */
      then('no line appears twice after the second declarer', () => {
        expect(
          getAllLinesDuplicated({ contents: fileAfterRhachet.lines.join('\n') }),
        ).toEqual([]);
      });

      then('the negation is still live after the second apply', () => {
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: 'packages/demo/node_modules/pkg.js',
          }),
        ).toEqual(true);
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: '.test/assets/node_modules/pkg.js',
          }),
        ).toEqual(false);
      });

      /**
       * .what = the leak check, asked AFTER the second declarer has run
       * .why  = `[t1]`'s leak check runs before this apply, so it can only ever see
       *         what `git` emitted. a leak introduced by `rhachet` reaches this file
       *         at THIS step, and `[t1]` is already past. measured: with a
       *         `@declapract{variable.*}` injected into the rhachet declaration,
       *         `[t1]`'s check stayed green and only `[case2]`'s caught it -- so this
       *         fixture, the one that exercises BOTH declarers, was blind to a leak
       *         from the second of them.
       * .note = a leak check belongs after each apply, not once per fixture.
       */
      then('no declapract template syntax leaked from either practice', async () => {
        const contents = await fs.readFile(
          path.join(tempDir, '.gitignore'),
          'utf-8',
        );

        expect(contents).not.toContain('@declapract{');
      });
    });

    when('[t3] both practices are applied a second time', () => {
      const fileBefore = useBeforeAll(async () => ({
        contents: await fs.readFile(path.join(tempDir, '.gitignore'), 'utf-8'),
      }));

      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'git',
          file: '.gitignore',
        });
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'rhachet',
          file: '.gitignore',
        });
      }, 120_000);

      /**
       * .note = this is the acceptance criterion, in its provable form. the wish asked
       *         for `fix(x) == x` given a repo that "already carries a line", which is
       *         false: `fix` always sorts and always relocates the negations, so a
       *         file that merely carries a line is still rewritten. the true claim is
       *         the FIXED POINT -- `fix(fix(x)) == fix(x)`.
       */
      then('the file is byte-identical -- the apply is a fixed point', async () => {
        const contentsAfterRerun = await fs.readFile(
          path.join(tempDir, '.gitignore'),
          'utf-8',
        );

        expect(contentsAfterRerun).toEqual(fileBefore.contents);
      });

      /**
       * .what = the GATE clause of idempotency, asked of the BYTES ON DISK
       * .why  = rule.require.idempotent-fixes calls a check that still flags its own
       *         fixed output a blocker -- `declapract fix` would reflag the file
       *         forever. the unit clamps assert `check(fix(x))`, which is the value
       *         `fix` RETURNS. that is not what lands: declapract writes through
       *         `writeFileAsync`, which rewrites the final newline
       *         (`content.replace(/\n$/, '') + '\n'`). so `fix`'s return can satisfy
       *         `check` while the bytes on disk do not, and every unit test stays
       *         green while the real pipeline loops.
       * .note = both declarers are asked, because either one that rejects the settled
       *         file is enough to make the loop.
       */
      then('both practices accept the settled file on disk', async () => {
        const settled = await fs.readFile(
          path.join(tempDir, '.gitignore'),
          'utf-8',
        );

        expect(() => checkOfGit(settled, {} as any)).not.toThrow();
        expect(() => checkOfRhachet(settled, {} as any)).not.toThrow();
      });

      then('the settled file matches snapshot', async () => {
        const contentsAfterRerun = await fs.readFile(
          path.join(tempDir, '.gitignore'),
          'utf-8',
        );

        expect(contentsAfterRerun).toMatchSnapshot('.gitignore -- settled');
      });

    });

    /**
     * .what = the wish's FOURTH acceptance criterion, asked in its own instrument
     * .why  = "a fresh worktree shows a clean `git status` after a role boot". every
     *         other path assertion in this suite reaches `git check-ignore` through
     *         `isPathIgnored`, which is a PURE query -- deliberately so, per its own
     *         note -- and therefore only ever asks about paths that DO NOT EXIST.
     *         this is the one place the scratch is real on disk and git is asked about
     *         the tree as it stands. a rule can match a path pattern while the
     *         materialized tree still reports a line: a non-ignored neighbor under
     *         `.agent/`, or a negation that re-includes. status integrates every rule
     *         over the actual tree into one answer, which is what the beaver gets at
     *         teardown.
     * .why  = a `when` of its own, rather than a fourth `then` under `[t3]`. the boot
     *         is an ACTION that mutates the tree, and an action inside a `then` is a
     *         hidden side effect (`rule.forbid.hidden-side-effects`) that would make
     *         any later `then` order-dependent (`rule.forbid.order-dependence`). every
     *         other action in this suite already sits in a `useBeforeAll`; this one was
     *         the exception until r8 gap 16.
     * .note = the scratch is written here rather than shipped in the fixture, because
     *         that is what a role boot does -- it creates these dirs AFTER the upgrade
     *         has settled. a fixture that carried them would prove a different claim.
     */
    when('[t4] a rhachet role boots and writes its scratch', () => {
      useBeforeAll(async () => {
        await fs.mkdir(path.join(tempDir, '.agent', '.cache'), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(tempDir, '.agent', '.cache', 'roles.json'),
          '{}',
        );
        await fs.mkdir(path.join(tempDir, '.cache'), { recursive: true });
        await fs.writeFile(path.join(tempDir, '.cache', 'scratch.json'), '{}');
      }, 30_000);

      /**
       * .note = the filter is the assertion, not a retreat from it. the tree still
       *         holds the fixture's own untracked files (`git init`, never committed),
       *         so a bare `toEqual([])` would fail for reasons unrelated to this
       *         practice. the claim is that git has NO WORD on either cache dir.
       * .note = teeth, measured: with `.cache/` renamed in the git declaration, this
       *         goes red with `+ "?? .cache/"` -- the exact untracked line that makes
       *         `git tree del` refuse to fell a worktree.
       */
      then('git reports no line about either cache dir', () => {
        const statusLines = getAllStatusLines({ cwd: tempDir });

        expect(statusLines.filter((line) => line.includes('cache'))).toEqual(
          [],
        );
      });

      /**
       * .what = the scratch really is on disk, so the assertion above is not vacuous
       * .why  = `git status` reports no cache line BOTH when the dirs are ignored and
       *         when they were never created. without this, a broken `useBeforeAll` --
       *         a bad path, a swallowed error -- would leave the clamp green while it
       *         proved not one claim. the same self-referential-fixture trap as
       *         edgecase 6, in a new place.
       */
      then('the scratch it wrote is genuinely present', async () => {
        expect(
          await fs.readFile(
            path.join(tempDir, '.agent', '.cache', 'roles.json'),
            'utf-8',
          ),
        ).toEqual('{}');
        expect(
          await fs.readFile(
            path.join(tempDir, '.cache', 'scratch.json'),
            'utf-8',
          ),
        ).toEqual('{}');
      });
    });
  });

  /**
   * .what = a repo that takes `rhachet` WITHOUT `git`
   * .why  = this is the case that motivates the rhachet declaration at all. every
   *         real use-case pairs the two today, so the gap is latent -- which means
   *         prod can never reveal it and only a test can. absent this case, the
   *         rhachet declaration is justified by an argument rather than a proof.
   */
  given('[case2] a repo whose use case has rhachet but NOT git', () => {
    const tempDir = genTempDir({
      slug: 'git-rhachet-only',
      clone: './src/practices/git/.test/assets/repo-with-rhachet-only',
      symlink: [
        { at: 'declarations', to: './.test/assets/git/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    useBeforeAll(async () => {
      runGit({ cwd: tempDir, args: ['init', '-q'] });
    }, 30_000);

    when('[t0] before any apply', () => {
      /**
       * .why = rule.require.declapract-integration-tests asks for the BEFORE contents
       *        of each input file, so the after-diff is legible. this demo repo is a
       *        second input file, so it owes its own before-snapshot -- `[case1][t0]`
       *        has one, and the standard applies per fixture, not per suite.
       */
      then('the input file matches snapshot', async () => {
        const contents = await fs.readFile(
          path.join(tempDir, '.gitignore'),
          'utf-8',
        );

        expect(contents).toMatchSnapshot('.gitignore -- rhachet only -- before');
      });

      then('the agent cache is not ignored yet', () => {
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: '.agent/.cache/roles.json',
          }),
        ).toEqual(false);
      });
    });

    when('[t1] the rhachet practice is applied', () => {
      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'rhachet',
          file: '.gitignore',
        });
      }, 120_000);

      // .note = one read, shared across the assertions below, per
      //         rule.prefer.usethen-and-usewhen-for-shared-results
      const fileAfter = useThen('the apply settles', async () => ({
        lines: (
          await fs.readFile(path.join(tempDir, '.gitignore'), 'utf-8')
        ).split('\n'),
      }));

      then('the agent cache path is ignored, with no help from git', () => {
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: '.agent/.cache/roles.json',
          }),
        ).toEqual(true);
      });

      then('rhachet declares only the dir rhachet writes', () => {
        expect(fileAfter.lines).toContain('.agent/.cache/');
        // `.cache/` is generic tool scratch and belongs to the git practice
        expect(fileAfter.lines).not.toContain('.cache/');
      });

      /**
       * .what = the wish's "no duplicate line", on the solo path
       * .why  = this fixture's `.gitignore` ALREADY carries `node_modules`, and
       *         rhachet's ordered tail declares it too -- so this step is a genuine
       *         findsert collision, not a hypothetical one. it is also the first apply
       *         the rhachet declaration ever performs on a real repo, which is the
       *         codepath this behavior ADDS rather than inherits.
       */
      then('no line appears twice', () => {
        expect(
          getAllLinesDuplicated({ contents: fileAfter.lines.join('\n') }),
        ).toEqual([]);
      });

      /**
       * .what = the findsert half of the contract -- a repo's own lines are UNIONED
       *         in, never replaced
       * .why  = `[case1][t1]` proves this for the git declaration. rhachet is the new
       *         declaration this behavior adds, and it needs the proof more, not less:
       *         its declared set is a single line, so a `defineExpectedContents` that
       *         was mis-copied without the extant-lines union would emit that one line
       *         plus the tail and DELETE every custom ignore a consumer wrote.
       * .note = injected and observed, not predicted. under that wipe the fixed point
       *         in `[t2]` stays GREEN (a wipe is idempotent), `declares only the dir
       *         rhachet writes` stays GREEN (the wipe declares exactly that), and so
       *         does `the agent cache path is ignored`. within this fixture -- the one
       *         that exercises rhachet ALONE -- the sole other catch is the settled
       *         snapshot, and a snapshot can be blessed away by a `--resnap`. so this
       *         is the only NAMED assertion here that states the union as an intent.
       *         `[case1]` does catch it, via convergence, but only incidentally: there
       *         the git apply re-unions the lines, so what goes red is the two
       *         practices' disagreement, not the lost lines.
       */
      then("the repo's own custom ignores survive the union", () => {
        expect(fileAfter.lines).toContain('.idea');
        expect(fileAfter.lines).toContain('dist');
      });

      then('the node_modules negations are declared even here', () => {
        expect(fileAfter.lines.indexOf('node_modules')).toBeLessThan(
          fileAfter.lines.indexOf('!.test*/**/node_modules'),
        );
      });

      /**
       * .why = the tail is the whole safety condition of the fold-in, so its effect
       *        must be proven where rhachet declares it ALONE. with git present, a
       *        live negation could be credited to git; here only rhachet can own it.
       * .note = rhachet IMPORTS the tail from `src/utils/defineExpectedGitignoreContents`
       *         rather than declares its own, so this proves the import reaches a
       *         consumer intact -- a shared constant that never lands in the emitted
       *         file would satisfy every unit assertion and fail right here.
       */
      then('the negation rhachet imports is honored by git itself', () => {
        // .note = probed at depth, not at the root -- git refuses a pathspec that
        //         traverses the symlinked root `node_modules`
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: 'packages/demo/node_modules/pkg.js',
          }),
        ).toEqual(true);
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: '.test/assets/node_modules/pkg.js',
          }),
        ).toEqual(false);
      });

      // .why = the same leak check `[case1][t1]` makes. a template that resolves under
      //        one use case can still leak under another, since substitution is
      //        per-use-case -- so the assertion belongs to each fixture, not the suite.
      then('no declapract template syntax leaked into the output', () => {
        expect(fileAfter.lines.join('\n')).not.toContain('@declapract{');
      });

      then('the settled file matches snapshot', () => {
        expect(fileAfter.lines.join('\n')).toMatchSnapshot(
          '.gitignore -- rhachet only',
        );
      });
    });

    when('[t2] the rhachet practice is applied a second time', () => {
      const fileBefore = useBeforeAll(async () => ({
        contents: await fs.readFile(path.join(tempDir, '.gitignore'), 'utf-8'),
      }));

      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'rhachet',
          file: '.gitignore',
        });
      }, 120_000);

      /**
       * .what = the fixed point, on the solo path
       * .why  = [case1][t3] proves the fixed point where BOTH practices declare the
       *         file -- the arrangement that predates this behavior. the solo path
       *         is the one the rhachet declaration was added to serve, and it settles
       *         from a different input: no git lines are present, so rhachet's own
       *         union is the sole source of the sorted set. a fix that is a fixed
       *         point on one input is not thereby a fixed point on the other, so the
       *         wish's "prove it, do not assert it" stays unmet here until it is run.
       * .note = the unit clamp asserts `fix(fix(x)) == fix(x)` for this declaration,
       *         but per rule.require.declapract-integration-tests a unit test of the
       *         exported fix is "necessary but NOT sufficient" -- only the pipeline
       *         shows whether a re-run of `declapract fix` settles or churns.
       */
      then('the file is byte-identical -- the solo apply is a fixed point', async () => {
        const contentsAfterRerun = await fs.readFile(
          path.join(tempDir, '.gitignore'),
          'utf-8',
        );

        expect(contentsAfterRerun).toEqual(fileBefore.contents);
      });

      // .why = the gate clause, on the solo path. `[case1][t3]` asks it where both
      //        practices declare the file; here rhachet's `check` is the only gate,
      //        so a `check` that never agreed would loop with no neighbor to mask it.
      //        only rhachet is asked, since git is absent from this use case.
      then('rhachet accepts the settled file on disk', async () => {
        const settled = await fs.readFile(
          path.join(tempDir, '.gitignore'),
          'utf-8',
        );

        expect(() => checkOfRhachet(settled, {} as any)).not.toThrow();
      });

      then('the agent cache path is still ignored', () => {
        expect(
          isPathIgnored({
            cwd: tempDir,
            filepath: '.agent/.cache/roles.json',
          }),
        ).toEqual(true);
      });
    });
  });

  /**
   * .what = THIS repo satisfies the declarations THIS repo ships
   * .why  = this repo is a consumer of its own practices: `declapract.use.yml` sets
   *         `useCase: npm-package`, which extends `typescript-project`, which carries
   *         both `git` and `rhachet`. yet no command runs `check` against it --
   *         `package.json` runs `declapract validate`, which only asserts the
   *         declaration set is well formed, never that this repo conforms to it.
   * .why  = so self-application drift is silent, and it has already happened once:
   *         #435 added `.cache/` to the template AND to this repo's file, but #477
   *         added `.agent/.cache/` to the template ALONE. that line stayed absent here
   *         for seven weeks with every gate green. move 2 of this behavior repaired the
   *         drift; this assertion is what keeps it repaired.
   * .note = a filesystem read, so it belongs at this grain per
   *         rule.forbid.unit.remote-boundaries. the path is resolved from `__dirname`
   *         rather than cwd, so the assertion holds wherever jest is invoked from.
   */
  given('[case3] this repo, which consumes the practices it declares', () => {
    const fileOwn = useBeforeAll(async () => ({
      contents: await fs.readFile(
        path.join(__dirname, '..', '..', '..', '.gitignore'),
        'utf-8',
      ),
    }));

    when('[t0] the shipped declarations are asked about it', () => {
      /**
       * .note = the test NAMES below carry the fix, deliberately. jest prints the full
       *         `given > when > then` path on failure, and little else of use here --
       *         `expect(fn).not.toThrow()` reports a symptom ("it threw"), never a
       *         remedy. and this assertion is built to fire on someone who does NOT
       *         know this behavior's history: it caught a drift that already went
       *         unnoticed for seven weeks (#477), and the next one will land on
       *         whoever next edits `ignoresSortable`, months from now.
       *         so the remedy rides in the one string the runner is guaranteed to
       *         print (`rule.require.errors-name-the-fix`). the diff in the throw says
       *         WHICH line; the name says WHAT TO DO about it.
       */
      then(
        'the git practice is satisfied -- if red, add the absent line to the repo-root .gitignore, where the sort puts it',
        () => {
          expect(() => checkOfGit(fileOwn.contents, {} as any)).not.toThrow();
        },
      );

      then(
        'the rhachet practice is satisfied -- if red, add the absent line to the repo-root .gitignore, where the sort puts it',
        () => {
          expect(() => checkOfRhachet(fileOwn.contents, {} as any)).not.toThrow();
        },
      );

      then('both cache dirs are ignored in this very repo', () => {
        const repoRoot = path.join(__dirname, '..', '..', '..');

        expect(
          isPathIgnored({ cwd: repoRoot, filepath: '.cache/scratch.json' }),
        ).toEqual(true);
        expect(
          isPathIgnored({
            cwd: repoRoot,
            filepath: '.agent/.cache/roles.json',
          }),
        ).toEqual(true);
      });
    });
  });

  /**
   * .what = a clamp on the ORACLE, not on the practices
   * .why  = every path assertion above trusts `git check-ignore` to report the repo's
   *         rules. git also folds in `core.excludesFile` from the host's global
   *         gitconfig, and `.cache/` is among the most common entries in a personal
   *         global gitignore. on such a machine those assertions would pass no matter
   *         what the practice declares -- a FALSE GREEN, which no one investigates.
   *         `envGitHermetic` closes that channel; this case proves the channel is real
   *         and that closing it works.
   * .why  = without this, `envGitHermetic` is a rationale in a comment, and a future
   *         reader who finds it needless can delete it with no signal at all. the
   *         guard on the oracle needs a guard of its own.
   * .note = the A/B is the honest form of this proof. a real dev machine's leak cannot
   *         be reproduced on a runner that lacks the dotfile, so the CONTROL simulates
   *         the hostile host by a `GIT_CONFIG_GLOBAL` that points at a fake, and the
   *         TREATMENT is the exact env every git query in this file uses.
   */
  given('[case4] a host whose global gitconfig ignores paths of its own', () => {
    /**
     * .note = this fixture carries NO symlinks, unlike every other case here. the
     *         `declarations` and `node_modules` links exist so `executeApply` can
     *         look up the declaration set and load declapract from the temp root --
     *         and this case never calls it. a copied-in `node_modules` link would be
     *         worse than idle: git refuses a pathspec that traverses a symlink, which
     *         is the trap `[case1]` already had to probe at depth to dodge. this case
     *         runs git alone, so it carries only what git needs.
     * .note = the clone STAYS. the oracle this case guards is the one the other cases
     *         use, and they use it inside a cloned repo that carries its own
     *         `.gitignore`. guarding it in a bare dir would guard a simpler oracle
     *         than the one in play.
     */
    const tempDir = genTempDir({
      slug: 'git-hermetic-oracle',
      clone: './src/practices/git/.test/assets/repo-with-rhachet-only',
    });

    const scene = useBeforeAll(async () => {
      runGit({ cwd: tempDir, args: ['init', '-q'] });

      // a global gitignore of the kind a developer keeps in their home dir
      const pathOfExcludes = path.join(tempDir, 'fake-global.gitignore');
      const pathOfConfig = path.join(tempDir, 'fake-global.gitconfig');
      await fs.writeFile(pathOfExcludes, 'zzz-host-only-pattern/\n');
      await fs.writeFile(
        pathOfConfig,
        `[core]\n\texcludesFile = ${pathOfExcludes}\n`,
      );

      return { pathOfConfig };
    }, 30_000);

    /**
     * .what = ask git the same question under two envs, and compare
     * .why  = the probe path appears in NO `.gitignore` in the repo, so any match can
     *         only have come from the simulated host config. that makes the control a
     *         direct measurement of the leak channel rather than an argument about it.
     * .note = this is the ONE place that calls `execFileSync` rather than `runGit`,
     *         and deliberately so: `runGit` exists to make the hermetic env
     *         unforgettable, but this case's whole subject IS the env, so it must be
     *         able to vary it. every other git call in this file goes through
     *         `runGit` and cannot opt out.
     */
    const askUnder = (input: { env: NodeJS.ProcessEnv }): boolean => {
      try {
        execFileSync(
          'git',
          ['check-ignore', '--', 'zzz-host-only-pattern/x.json'],
          { cwd: tempDir, env: input.env },
        );
        return true;
      } catch (error) {
        // .note = `as` cast at an external boundary, per rule.forbid.as-cast's one
        //         exemption. node types `execFileSync`'s throw as plain `Error`, but
        //         it attaches a numeric `status` (the child's exit code) at runtime --
        //         which is the ANSWER here, not a failure: check-ignore exits 1 for
        //         "not ignored". @types/node declares no `ExecFileSyncError`, so there
        //         is no type to reach for.
        // .fix  = drop the cast when @types/node types the thrown error.
        if ((error as { status?: number }).status === 1) return false;
        throw error;
      }
    };

    when('[t0] the oracle is asked with the host config in play', () => {
      then('the host rule LEAKS in -- the channel is real', () => {
        expect(
          askUnder({
            env: { ...process.env, GIT_CONFIG_GLOBAL: scene.pathOfConfig },
          }),
        ).toEqual(true);
      });
    });

    /**
     * .why = the hostile env is spread FIRST and `envGitHermetic` LAST, on purpose.
     *        a first draft asked `askUnder(envGitHermetic)` alone -- and that is a
     *        clamp with no teeth: `envGitHermetic` spreads `process.env`, which on a
     *        clean host carries no `GIT_CONFIG_GLOBAL` at all, so delete the override
     *        and the query still finds no host rule and still returns false. GREEN
     *        under the very defect it exists to catch.
     *        spread in this order, a deleted override leaves the hostile value in
     *        place, because an absent key cannot overwrite a present one. that is the
     *        scenario that matters anyway: the host HAS the config, and our env must
     *        beat it rather than merely coexist with its absence.
     */
    when('[t1] the same host, asked with the env every query here uses', () => {
      then('the host rule is shut out -- the channel is closed', () => {
        const envHostile = {
          ...process.env,
          GIT_CONFIG_GLOBAL: scene.pathOfConfig,
        };

        expect(
          askUnder({ env: { ...envHostile, ...envGitHermetic } }),
        ).toEqual(false);
      });
    });
  });
});
