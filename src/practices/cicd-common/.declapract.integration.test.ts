import fs from 'node:fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation before the file filter narrows it)
// .note = this suite scopes each apply with `file: '.github/workflows/review.yml'`, which
//         narrows the work enough that a run settles in seconds. the cap matches the
//         single-apply suites rather than a multiple of them, so a hang surfaces promptly
//         instead of after a budget sized for a slowness we do not have.
jest.setTimeout(300_000); // 5 minutes

/**
 * .what = the template a consumer is held to, read from the practice as it ships
 * .why = read rather than transcribed. a hand-copied expectation is a SECOND source of truth
 *        that drifts the moment the template is bumped, and this repo already carries a live
 *        instance of exactly that decay: `.test.yml.declapract.test.ts` hand-writes a
 *        `templateContent` string that still says `actions/checkout@v4` while the real
 *        template says `@11d5960…`. it passes, because it only ever compares its copy to
 *        itself. read the file and the drift is unrepresentable
 */
const PATH_OF_TEMPLATE = path.join(
  __dirname,
  'best-practice/.github/workflows/review.yml',
);

const PATH_IN_CONSUMER = '.github/workflows/review.yml';

/**
 * .what = the one pinned template whose delivery runs through a HAND-WRITTEN fix
 * .why = `[case2]` exists for this file alone. see its docblock for why the tenth template
 *        cannot inherit the ninth's proof
 */
const PATH_OF_TEST_TEMPLATE = path.join(
  __dirname,
  'best-practice/.github/workflows/.test.yml',
);

const PATH_OF_TEST_IN_CONSUMER = '.github/workflows/.test.yml';

/**
 * .what = a workflow in the consumer's repo that NO practice declares
 * .why = `[case3]` proves the practice leaves it alone. it carries tag refs on purpose
 */
const PATH_OF_CONSUMER_OWNED = '.github/workflows/consumer-owned.yml';

/**
 * .what = the lines of a workflow that name a third-party action, in either yaml form —
 *         `uses: <owner>/<repo>@<ref>` and its `- uses:` sequence-item variant
 * .why = a count of these is how a TRUNCATED delivery is caught. the `@` is what bounds the
 *        set to third-party refs: a local ref (`uses: ./.github/workflows/.install.yml`)
 *        names a path rather than a version, so it carries no `@` and is never counted
 */
const getAllActionRefLines = (input: { contents: string }): string[] =>
  input.contents
    .split('\n')
    .filter((line) => /^\s*(?:-\s+)?uses:\s*\S+\/\S+@/.test(line));

/**
 * .what = the wish's second acceptance criterion, proven by an executed pipeline
 * .why = "a repo that runs the upgrade against this template comes away with its
 *        template-owned refs pinned, WITHOUT A HAND-EDIT". every other clamp on the pin is
 *        static — `src/actionPins.declapract.integration.test.ts` proves the templates in THIS repo hold
 *        pinned refs, and that is a claim about files at rest. it has no word on whether
 *        declapract delivers them
 * .why = and the delivery was, until this suite, an INFERENCE: the vision verified it by a
 *        read of declapract's source (the `EQUALS` default plus its whole-file fix), never by
 *        a run against these templates. a source read proves what the code does; it does not
 *        prove this practice is wired to that path. the two l3 reviewers named the gap
 *        independently, and they were right — a reasoned delivery is not a delivered delivery
 * .note = `review.yml` is the subject because it is the smallest template that carries a
 *         third-party ref (exactly 1, of 85). the mechanism under test is declapract's file
 *         delivery, which does not vary with a file's size — so the cheapest template proves
 *         it as well as the largest, and keeps the apply quick
 */
describe('cicd-common workflow templates', () => {
  given('[case1] a consumer repo whose workflow still carries a tag ref', () => {
    const tempDir = genTempDir({
      slug: 'cicd-common-action-pins',
      clone:
        './src/practices/cicd-common/.test/assets/repo-with-unpinned-workflow',
      symlink: [
        { at: 'declarations', to: './.test/assets/cicd-common/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    when('[t0] before any apply', () => {
      /**
       * .why = a diff is only legible against a before, per
       *        rule.require.declapract-integration-tests. this one carries a second duty: it
       *        states that the fixture really is unpinned, so the after-assertion below is a
       *        measured CHANGE rather than a file that was already correct
       */
      then('the input file matches snapshot', async () => {
        const contents = await fs.readFile(
          path.join(tempDir, PATH_IN_CONSUMER),
          'utf-8',
        );

        expect(contents).toMatchSnapshot('review.yml -- before');
      });

      then('the consumer carries an unpinned tag ref -- the state the org control kills', async () => {
        const contents = await fs.readFile(
          path.join(tempDir, PATH_IN_CONSUMER),
          'utf-8',
        );

        expect(contents).toContain('amannn/action-semantic-pull-request@v5');
      });
    });

    when('[t1] the cicd-common practice is applied', () => {
      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'cicd-common',
          file: PATH_IN_CONSUMER,
        });
      }, 120_000);

      // .note = one read, shared across the assertions below, per
      //         rule.prefer.usethen-and-usewhen-for-shared-results. the value is wrapped in an
      //         object because useThen hands back a proxy, and a bare string proxy compares as
      //         a char-indexed object.
      const fileAfter = useThen('the apply settles', async () => ({
        contents: await fs.readFile(
          path.join(tempDir, PATH_IN_CONSUMER),
          'utf-8',
        ),
      }));

      /**
       * .what = THE acceptance criterion — the consumer's file now equals the template's
       * .why = a `toContain` on the sha would prove the pin arrived and stay silent on the rest
       *        of the file. byte-equality is the actual promise declapract's `EQUALS` default
       *        makes, and it is what lets this repo be the single place that has to be right:
       *        whatever the template says, the consumer receives
       * .note = the template is read from disk on BOTH sides, so a future bump moves the
       *         expectation with the artifact and this assertion never needs a hand-edit —
       *         which is the same property the criterion claims for the consumer
       */
      then(
        "the consumer's file is byte-identical to the template -- if red, declapract did not deliver the template verbatim",
        async () => {
          const expected = await fs.readFile(PATH_OF_TEMPLATE, 'utf-8');

          expect(fileAfter.contents).toEqual(expected);
        },
      );

      /**
       * .why = stated in its own right, rather than left implied by byte-equality. the wish is
       *        about the PIN, and a failure that names the pin sends a reader to the right
       *        place; a byte diff alone reads as "the file changed somehow"
       *        (`rule.require.errors-name-the-fix`)
       * .note = it is also the only assertion here that can see an unpinned TEMPLATE, and that
       *         asymmetry was measured rather than assumed. the two injections:
       *           apply scoped away from this file  -> 4 red, byte-equality among them
       *           template reverted to `@v5`        -> 2 red, byte-equality stays GREEN
       *         byte-equality reads the template on BOTH sides, so it proves DELIVERY and is
       *         blind to what was delivered. this line and the snapshot carry the other half.
       *         the primary guard on pinnedness is `src/actionPins.declapract.integration.test.ts`, over
       *         all 85 template refs; this is the one that catches it here, in the pipeline
       */
      then('the tag ref is gone, and a pinned ref stands where it was', () => {
        expect(fileAfter.contents).not.toContain(
          'amannn/action-semantic-pull-request@v5\n',
        );
        expect(fileAfter.contents).toContain(
          'amannn/action-semantic-pull-request@e32d7e603df1aa1ba07e981f2a23455dee596825 # v5',
        );
      });

      then('no declapract template syntax leaked into the output', () => {
        expect(fileAfter.contents).not.toContain('@declapract{');
      });

      then('the settled file matches snapshot', () => {
        expect(fileAfter.contents).toMatchSnapshot('review.yml -- after');
      });
    });

    /**
     * .what = the fixed point, per rule.require.idempotent-fixes
     * .why = a consumer runs the upgrade on every bump, not once. a fix that lands correctly
     *        and then rewrites the file on each later run would churn a diff into every
     *        consumer's repo forever, and the wish's "without a hand-edit" quietly becomes
     *        "with a hand-revert"
     */
    when('[t2] the practice is applied a second time', () => {
      const fileBefore = useBeforeAll(async () => ({
        contents: await fs.readFile(
          path.join(tempDir, PATH_IN_CONSUMER),
          'utf-8',
        ),
      }));

      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'cicd-common',
          file: PATH_IN_CONSUMER,
        });
      }, 120_000);

      then('the file is byte-identical -- the apply is a fixed point', async () => {
        const contentsAfterRerun = await fs.readFile(
          path.join(tempDir, PATH_IN_CONSUMER),
          'utf-8',
        );

        expect(contentsAfterRerun).toEqual(fileBefore.contents);
      });
    });
  });

  /**
   * .what = the same delivery proof, for the ONE template that does not take declapract's
   *         default path
   * .why = `[case1]` justified its choice of `review.yml` on the ground that "the mechanism does
   *        not vary with a file's size". that holds for 9 of the 10 pinned templates — the ones
   *        with no `.declapract.ts` companion, which all reach delivery through declapract's
   *        built-in `EQUALS` default. it does NOT hold for `.test.yml`, the tenth: it carries an
   *        explicit, HAND-WRITTEN `fix`, so its delivery runs through code this repo owns rather
   *        than code declapract owns. a source read of declapract cannot vouch for that at all
   * .why = and it is the file that matters most, not an edge case:
   *          - 25 of the 85 template pin sites live here — 29%, the largest concentration
   *          - it is the workflow the wish's `.why` is ABOUT: `publish` needs `test`, so a tag
   *            ref here kills the release before any template reaches a consumer
   *          - it is the only template whose fix could regress independently of declapract
   * .note = the custom fix returns `context.declaredFileContents ?? ''`. that `?? ''` writes an
   *         EMPTY FILE rather than fail, if the declared contents were ever absent — a fail-hide
   *         no unit test with a mocked context can see, because the mock supplies the value. this
   *         case runs the real pipeline, so an empty delivery goes red on byte-equality
   */
  given('[case2] a consumer whose .test.yml is stale, on the custom-fix path', () => {
    const tempDir = genTempDir({
      slug: 'cicd-common-action-pins-test-yml',
      clone:
        './src/practices/cicd-common/.test/assets/repo-with-unpinned-workflow',
      symlink: [
        { at: 'declarations', to: './.test/assets/cicd-common/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    when('[t0] before any apply', () => {
      then('the input file matches snapshot', async () => {
        const contents = await fs.readFile(
          path.join(tempDir, PATH_OF_TEST_IN_CONSUMER),
          'utf-8',
        );

        expect(contents).toMatchSnapshot('.test.yml -- before');
      });

      then('the consumer carries unpinned tag refs -- the state the org control kills', async () => {
        const contents = await fs.readFile(
          path.join(tempDir, PATH_OF_TEST_IN_CONSUMER),
          'utf-8',
        );

        expect(contents).toContain('actions/checkout@v4');
        expect(contents).toContain('actions/setup-node@v4');
      });
    });

    when('[t1] the cicd-common practice is applied', () => {
      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'cicd-common',
          file: PATH_OF_TEST_IN_CONSUMER,
        });
      }, 120_000);

      const fileAfter = useThen('the apply settles', async () => ({
        contents: await fs.readFile(
          path.join(tempDir, PATH_OF_TEST_IN_CONSUMER),
          'utf-8',
        ),
      }));

      /**
       * .why = the same byte-equality claim as `[case1]`, but here it clears a genuinely
       *        different mechanism: the hand-written fix, not declapract's default. it is also
       *        the assertion that catches the `?? ''` empty-file path, which would otherwise
       *        deliver a zero-byte workflow to a consumer with every unit test still green
       */
      then(
        "the consumer's file is byte-identical to the template -- if red, the custom fix did not deliver the template verbatim",
        async () => {
          const expected = await fs.readFile(PATH_OF_TEST_TEMPLATE, 'utf-8');

          expect(fileAfter.contents).toEqual(expected);
        },
      );

      /**
       * .why = stated of the pins in their own right, and over MORE than one action — this file
       *        carries 25 ref sites across 6 action repos, so a partial delivery is a shape a
       *        one-ref assertion could not see
       */
      then('every tag ref is gone, and pins stand where they were', () => {
        expect(fileAfter.contents).not.toContain('actions/checkout@v4');
        expect(fileAfter.contents).not.toContain('actions/setup-node@v4');
        expect(fileAfter.contents).toContain(
          'actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4',
        );
        expect(fileAfter.contents).toContain(
          'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4',
        );
      });

      /**
       * .why = the delivery is only worth as much as its completeness. a fix that shipped a
       *        TRUNCATED template would satisfy a `toContain` on the two refs above while it
       *        silently dropped the other 23 — and `?? ''` proves this fix has a path that
       *        returns less than the whole file
       */
      then('all 25 ref sites arrived -- if red, the fix delivered a partial file', () => {
        const sites = getAllActionRefLines({ contents: fileAfter.contents });

        expect(sites.length).toEqual(25);
      });

      then('no declapract template syntax leaked into the output', () => {
        expect(fileAfter.contents).not.toContain('@declapract{');
      });

      /**
       * .why = the wish's third acceptance criterion — "the pin is LEGIBLE: a reader can tell
       *        WHICH version each SHA corresponds to" — is the one criterion no assertion can
       *        settle, because legibility is a property a human reads rather than a machine
       *        checks. a snapshot is what puts the `@<sha> # <tag>` shape in front of a
       *        reviewer, per `rule.require.snapshots`
       * .note = and this file is the only place that criterion can be eyeballed at scale. the
       *         committed pin table in `src/actionPins.declapract.integration.test.ts` deliberately records
       *         `<repo>@<sha> — N sites` WITHOUT the tag tail, so it cannot show a tail arrive.
       *         25 sites across 6 action repos land here, in the workflow that gates `publish`
       *         — the file the wish's `.why` is about
       */
      then('the settled file matches snapshot', () => {
        expect(fileAfter.contents).toMatchSnapshot('.test.yml -- after');
      });
    });

    when('[t2] the practice is applied a second time', () => {
      const fileBefore = useBeforeAll(async () => ({
        contents: await fs.readFile(
          path.join(tempDir, PATH_OF_TEST_IN_CONSUMER),
          'utf-8',
        ),
      }));

      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'cicd-common',
          file: PATH_OF_TEST_IN_CONSUMER,
        });
      }, 120_000);

      then('the file is byte-identical -- the custom fix is a fixed point', async () => {
        const contentsAfterRerun = await fs.readFile(
          path.join(tempDir, PATH_OF_TEST_IN_CONSUMER),
          'utf-8',
        );

        expect(contentsAfterRerun).toEqual(fileBefore.contents);
      });
    });
  });

  /**
   * .what = the wish's second CONSTRAINT, which is a bound on the fix rather than a promise
   *         of it: "the template's reach ends at the refs it owns. do not silently rewrite
   *         what the practice does not own"
   * .why = every other case here proves the pin ARRIVES. this one proves it STOPS. a fix that
   *        pinned every tag ref it could find would satisfy all of them and still be wrong —
   *        it would rewrite a consumer's own workflows, which the wish forbids outright
   * .note = the apply here is deliberately UNSCOPED — no `file:` filter. a scoped apply cannot
   *         prove this: it would leave the consumer's file alone because it was told to, not
   *         because the practice declines to own it. the whole practice must run for the
   *         claim to mean what it says
   */
  given('[case3] a consumer repo that also has a workflow of its OWN', () => {
    const tempDir = genTempDir({
      slug: 'cicd-common-consumer-owned',
      clone:
        './src/practices/cicd-common/.test/assets/repo-with-unpinned-workflow',
      symlink: [
        { at: 'declarations', to: './.test/assets/cicd-common/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    when('[t0] the whole practice is applied, unscoped', () => {
      const fileBefore = useBeforeAll(async () => ({
        contents: await fs.readFile(
          path.join(tempDir, PATH_OF_CONSUMER_OWNED),
          'utf-8',
        ),
      }));

      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'cicd-common',
        });
      }, 240_000);

      then(
        "the consumer's own workflow is byte-identical -- if red, the practice rewrote a file it does not own",
        async () => {
          const contentsAfter = await fs.readFile(
            path.join(tempDir, PATH_OF_CONSUMER_OWNED),
            'utf-8',
          );

          expect(contentsAfter).toEqual(fileBefore.contents);
        },
      );

      /**
       * .why = the assertion above passes vacuously if the apply did no work at all — a
       *        misconfigured fixture, a practice that failed to evaluate, an apply that
       *        matched zero files would each leave the consumer's file untouched for the
       *        wrong reason. so the same run must be shown to have delivered elsewhere
       */
      then(
        'and the template-owned file DID change in the same run -- if red, the check above is vacuous',
        async () => {
          const contentsOfTemplateOwned = await fs.readFile(
            path.join(tempDir, PATH_IN_CONSUMER),
            'utf-8',
          );

          expect(contentsOfTemplateOwned).toContain(
            'amannn/action-semantic-pull-request@e32d7e603df1aa1ba07e981f2a23455dee596825 # v5',
          );
        },
      );

      /**
       * .why = stated of the tag refs directly, so the claim reads as what it is: the
       *        consumer's `@v4` and `@v3` are STILL THERE. byte-equality already implies it,
       *        but a reader of the failure output should not have to diff two files to see
       *        which property broke
       */
      then("the consumer's own tag refs are untouched", async () => {
        const contentsAfter = await fs.readFile(
          path.join(tempDir, PATH_OF_CONSUMER_OWNED),
          'utf-8',
        );

        expect(contentsAfter).toContain('actions/checkout@v4');
        expect(contentsAfter).toContain('actions/setup-node@v3');
      });

      /**
       * .why = `[case1]` and `[case2]` each snapshot their file before AND after, so a reviewer
       *        reads the pin arrive as a diff. this case had assertions and no snapshot, which
       *        made the ONE property the wish states as a constraint — the practice does not
       *        rewrite what it does not own — the only outcome here a reviewer could not see.
       *        `rule.require.declapract-integration-tests` asks for both, and is explicit that
       *        an assertion alone checks only the substrings its author thought of
       * .note = both halves are snapped even though byte-equality is asserted above, because a
       *         snapshot of the AFTER alone cannot show a reviewer what it was compared against.
       *         two identical blocks in the file are the legible form of "untouched"
       */
      then('and both halves of the untouched file match snapshot', async () => {
        const contentsAfter = await fs.readFile(
          path.join(tempDir, PATH_OF_CONSUMER_OWNED),
          'utf-8',
        );

        expect(fileBefore.contents).toMatchSnapshot('consumer-owned.yml -- before');
        expect(contentsAfter).toMatchSnapshot('consumer-owned.yml -- after');
      });
    });
  });

  /**
   * .what = the ABSENT-file path — a repo where the declared workflow does not exist at all
   * .why = this is the wish's FIRST acceptance criterion, and until now it had no executed
   *        proof. "a fresh scaffold's CI starts" describes a repo with no `.github/workflows/`
   *        yet; every other case here starts from a file that is already present and merely
   *        wrong. a fix that only ever REWROTE would satisfy all of them and leave a fresh
   *        scaffold with no workflow at all — which fails the criterion silently, since a repo
   *        with no workflow has no red ci to notice
   * .why = it is also the negative variant `rule.require.contract-snapshot-exhaustiveness` asks
   *        for on this contract: absent input. the error variants beside it — a malformed
   *        config, an unresolvable practice — belong to declapract's own cli and are not this
   *        behavior's to snapshot
   * .note = the file is removed from a CLONE rather than carried by a second fixture, so the
   *         before-state is derived from the same asset the cases above use. a second fixture
   *         could drift from the first and quietly cease to be the same repo
   */
  given('[case4] a consumer repo where the declared workflow is ABSENT', () => {
    const tempDir = genTempDir({
      slug: 'cicd-common-absent-workflow',
      clone:
        './src/practices/cicd-common/.test/assets/repo-with-unpinned-workflow',
      symlink: [
        { at: 'declarations', to: './.test/assets/cicd-common/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    when('[t0] before any apply, with the workflow removed', () => {
      const stateBefore = useThen('the workflow is removed', async () => {
        await fs.rm(path.join(tempDir, PATH_IN_CONSUMER));
        return {
          report: await fs
            .readFile(path.join(tempDir, PATH_IN_CONSUMER), 'utf-8')
            .then(() => 'present')
            .catch(() => 'absent'),
        };
      });

      // .why = the absent state is SNAPPED rather than only asserted, so the negative path has a
      //        recorded before to read the after against. a reviewer who sees only the after
      //        cannot tell a created file from a rewritten one
      then('the before-state reads as absent', () => {
        expect(stateBefore.report).toMatchSnapshot('review.yml -- before (absent)');
      });
    });

    when('[t1] the cicd-common practice is applied', () => {
      useBeforeAll(async () => {
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'cicd-common',
          file: PATH_IN_CONSUMER,
        });
      }, 120_000);

      const fileAfter = useThen('the apply settles', async () => ({
        contents: await fs.readFile(
          path.join(tempDir, PATH_IN_CONSUMER),
          'utf-8',
        ),
      }));

      then(
        'the workflow is CREATED, not skipped -- if red, a fresh scaffold comes away with no workflow and no red ci to reveal it',
        async () => {
          const expected = await fs.readFile(PATH_OF_TEMPLATE, 'utf-8');

          expect(fileAfter.contents).toEqual(expected);
        },
      );

      then('and it arrives already pinned', () => {
        expect(fileAfter.contents).toContain(
          'amannn/action-semantic-pull-request@e32d7e603df1aa1ba07e981f2a23455dee596825 # v5',
        );
        expect(fileAfter.contents).not.toContain(
          'amannn/action-semantic-pull-request@v5',
        );
      });

      then('the created file matches snapshot', () => {
        expect(fileAfter.contents).toMatchSnapshot('review.yml -- after (created)');
      });
    });
  });
});
