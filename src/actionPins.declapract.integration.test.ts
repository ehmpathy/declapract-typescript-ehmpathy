import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = holds every third-party action ref on BOTH of this repo's github surfaces to a pinned
 *         shape — `uses: <owner>/<repo>@<40-hex sha> # <tag>`:
 *           1. `src/practices/**` — the templates a consumer receives (the deliverable)
 *           2. `.github/**`       — the workflows this repo itself runs
 * .why = the ehmpathy org sets `sha_pinning_required`, which github enforces at action lookup —
 *        before a workflow's first step runs. a tag ref does not fail a test; it stops CI from
 *        the outset, in whichever consumer repo received the template
 * .note = surface 2 is covered because it is a DELIVERY precondition, not for symmetry's sake:
 *         `publish.yml` declares `needs: [test]`, and `test` calls `./.github/workflows/.test.yml`.
 *         a tag ref there kills the release, so the templates never reach a consumer at all
 *
 * .note = this is an INTEGRATION test, and the filename is the reason. it walks the filesystem —
 *         `readdirSync` over both github surfaces, `readFileSync` on every yaml it finds — and
 *         `rule.forbid.unit.remote-boundaries` puts any test that crosses that boundary in the
 *         integration suite, with the rename as its stated remedy. it needs no credential and no
 *         network; the boundary alone is what classifies it.
 *         the bound, so a later author does not widen it: both roots are anchored on `__dirname`
 *         and land inside this repo's own committed tree. a check that wants a value from upstream
 *         github, or from a consumer repo, is a different kind of reach and needs its own thought
 *
 * .note = to derive a sha when a pin is added or bumped, read `.object.type` first, every time,
 *         and dereference it when it reads `tag`:
 *
 *           gh api -X GET repos/<owner>/<repo>/git/ref/tags/<tag> --jq .object
 *           # -> { "sha": "<x>", "type": "commit" }  ..... <x> is the pin
 *           # -> { "sha": "<y>", "type": "tag"    }  ..... <y> is not; dereference it:
 *           gh api -X GET repos/<owner>/<repo>/git/tags/<y> --jq .object.sha
 *
 *         the shortcut that skips the type check yields a tag-object sha for an annotated tag —
 *         40 hex characters that name no commit. 2 of the 12 action repos pinned here are
 *         annotated, so it is a live trap rather than a hypothetical one, and no assertion below
 *         detects it: a tag-object sha is 40-hex, carries a tag tail, and stays self-consistent
 *         across templates, so all three checks pass. github rejects it, in a consumer's repo.
 *         this note plus its reader are the guard, which is why it sits beside the clamp rather
 *         than in the route that produced it
 *
 * .note = to APPLY a derived sha, move every site of that repo in one edit. one action can hold
 *         up to 25 sites in a single file and ~34 across both surfaces, so a hand-edit is where a
 *         partial bump comes from — and a partial bump is what the drift assertion below reports.
 *         that assertion is a safety net, not a procedure; this is the procedure:
 *
 *           rhx sedreplace --old '@<sha.old> # <tag.old>' \
 *                          --new '@<sha.new> # <tag.new>' \
 *                          --glob 'src/practices/**' --mode apply
 *           rhx sedreplace --old '@<sha.old> # <tag.old>' \
 *                          --new '@<sha.new> # <tag.new>' \
 *                          --glob '.github/**' --mode apply
 *
 *         BOTH globs, always — the two surfaces are pinned in lockstep and the drift assertion
 *         reads their union, so one glob alone reports a repo pinned to two shas. run without
 *         `--mode apply` first to read the diff. match on the WHOLE `@<sha> # <tag>` string rather
 *         than the sha alone, so the tail moves with the pin and cannot go stale against it
 *
 *         the anchor is the `@<sha>` rather than `<owner>/<repo>@<sha>`, because a subaction sits
 *         at a longer path. `actions/cache` is the case: its sites are all
 *         `actions/cache/restore@…` and `actions/cache/save@…`, so the `<owner>/<repo>@` form
 *         matches none of them and reports `no files contain pattern` for a repo the pin table
 *         counts as 19 sites. the shorter anchor cannot over-reach — a sha names one upstream repo
 *
 * .note = what those globs reach, stated so it is not a surprise mid-bump. `src/practices/**` is
 *         wider than the templates: it also holds this behavior's test fixtures and the
 *         `cicd-common/__snapshots__` file, and a bump of `actions/checkout` rewrites 31 sites
 *         across 11 files rather than the 22 template sites alone. that is CORRECT — the fixture
 *         literal and the settled-file snapshot must move with the template or `[case2]` reddens
 *         on data that is merely stale. read the plan diff before `--mode apply` so the extra
 *         files are a choice rather than a discovery.
 *
 *         `.github/**` reaches 12 sites across 5 files for that same bump, so the two runs sum to
 *         43 rewritten sites across 16 files. the second glob is not a formality: skip it and the
 *         22 template sites move while this repo's own 12 stay put, which is exactly the
 *         two-shas-for-one-repo state `[case3]` reports — measured, and it reads
 *         `actions/checkout — <sha.new> vs <sha.old>`. a red there after a one-glob bump is the
 *         drift assertion correct, not a false alarm.
 *
 *         two files the globs deliberately do NOT reach, and each is a signal rather than a gap:
 *           - `src/__snapshots__/actionPins.declapract.integration.test.ts.snap` — the pin tables.
 *             they go red after a bump, and the red is the point: re-record with
 *             `rhx git.repo.test --what integration --scope 'path://actionPins' --mode apply --resnap`
 *             and READ the diff, since a site count that moved is a bump that reached more or
 *             fewer sites than intended. note the suite — this file walks the filesystem, so it
 *             lives in `integration`, not `unit`
 *           - `src/practices/cicd-common/best-practice/.github/workflows/.test.yml.declapract.test.ts`
 *             — its `@v4` strings are synthetic props, not a pin, and must stay unpinned
 */

/**
 * .what = this repo's root, the base every reported path is relativized against
 * .why = a failure names a ref site, and a name a maintainer can act on is a repo path — not
 *        one that carries the home directory of whichever machine ran the suite
 *        (`rule.require.errors-name-the-fix`)
 */
const REPO_ROOT = join(__dirname, '..');

/**
 * .what = the root under which every declared workflow template lives
 * .why = a template is copied verbatim to a consumer, so its pin must be a literal here.
 *        a template cannot import, so no shared constant can hold the sha for it
 * .note = anchored on `__dirname` rather than cwd, so the walk holds wherever jest is
 *         invoked from — the same guarantee `git/.declapract.integration.test.ts` states
 */
const PRACTICES_DIR = join(__dirname, 'practices');

/**
 * .what = the root under which this repo's OWN workflows live
 * .why = this repo consumes its own practices, so it meets the same org control its templates
 *        teach — and it meets it first, since `publish` needs `test` and `test` dies at action
 *        lookup on a tag ref. `..` from `src/` is the repo root
 */
const REPO_GITHUB_DIR = join(__dirname, '..', '.github');

/**
 * .what = the two .github subtrees github reads workflow and action definitions from
 * .why = a ref anywhere else in a practice is not a workflow ref, so it is out of the
 *        org control's reach and out of this clamp's
 */
const GITHUB_SUBTREES = ['.github/workflows', '.github/actions'];

/**
 * .what = the directory names that hold test fixtures, for BOTH conventions this repo uses
 * .why = a fixture is an INPUT to a test, not a template a consumer receives — and several hold
 *        an unpinned ref on purpose, so a walk that reached one would go red on a non-defect
 * .note = the two conventions, and why the list must carry both:
 *           `__snapshots__` — jest's own dir; `.test.yml.declapract.test.ts.snap` holds a
 *                             synthetic `actions/checkout@v4` as hand-written fixture data
 *           `.test`         — this repo's demo-repo convention, `<practice>/.test/assets/<repo>/`.
 *                             a demo repo that proves an apply must carry the STALE, unpinned
 *                             file as its before-state — see `cicd-common/.declapract.integration.test.ts`
 * .note = only `__snapshots__` was declared at first, and the omission was not theoretical: the
 *         demo repo above went red on 4 assertions the moment it landed, naming a fixture that is
 *         SUPPOSED to hold `@v5`. a fixture and a defect are indistinguishable to every check
 *         below, so the walk is the only layer that can tell them apart
 */
const FIXTURE_DIRS = ['__snapshots__', '.test'];

/**
 * .what = a `uses:` ref site, with enough context to name it in a failure
 */
interface ActionRef {
  path: string;
  line: number;
  ref: string;
  comment: string;
}

/**
 * .what = every file path under a directory, walked with node's own readdir
 * .why = most of the workflow templates are dot-prefixed (`.test.yml`, `.install.yml`).
 *        a glob library that omits dotfiles by default would silently walk a third of
 *        the tree and pass vacuously — readdir has no such blind spot
 * .note = the fixtures skip stays here, in the walk, because it is a TRAVERSAL decision — do not
 *         descend — rather than a selection one. every selection lives in the transformers below
 */
const getAllPathsUnderDir = (input: { dir: string; skip: string[] }): string[] =>
  readdirSync(input.dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${input.dir}/${entry.name}`;
    if (!entry.isDirectory()) return [path];
    return input.skip.includes(entry.name)
      ? []
      : getAllPathsUnderDir({ dir: path, skip: input.skip });
  });

/**
 * .what = the yaml among a set of paths
 * .why = kept out of the walk so the walk performs i/o only, and this stays pure. a workflow is
 *        yaml; the `.declapract.ts` declarations that sit in the same directories are not
 */
const getAllYamlPaths = (input: { paths: string[] }): string[] =>
  input.paths.filter((path) => /\.ya?ml$/.test(basename(path)));

/**
 * .what = the paths that live inside one `.github` subtree
 * .why = named once and called by both the walk and the walk's own blind-spot assertion, so the
 *        assertion cannot test a rule the walk does not use
 */
const getAllPathsInSubtree = (input: { paths: string[]; subtree: string }): string[] =>
  input.paths.filter((path) => path.includes(`/${input.subtree}/`));

/**
 * .what = the paths that live inside a fixture directory, of either convention
 * .why = named once and called by the walk's own blind-spot assertion, so the assertion reads the
 *        same list the walk skips on — a third convention added to `FIXTURE_DIRS` is guarded the
 *        moment it is declared, with no second edit to remember
 */
const getAllPathsInFixtureDirs = (input: { paths: string[] }): string[] =>
  input.paths.filter((path) =>
    FIXTURE_DIRS.some((dir) => path.includes(`/${dir}/`)),
  );

/**
 * .what = every workflow or action definition under a root, whatever else that root holds
 * .why = both surfaces are walked by the same code on purpose. a laxer walk over this repo's
 *        own workflows is exactly the defect this file exists to catch, and two walks are two
 *        places for that laxness to creep in
 * .note = sorted, so a failure report reads in a stable order
 */
const getAllGithubYamlPathsUnderRoot = (input: { root: string }): string[] => {
  const paths = getAllYamlPaths({
    paths: getAllPathsUnderDir({ dir: input.root, skip: FIXTURE_DIRS }),
  });
  return GITHUB_SUBTREES.flatMap((subtree) => getAllPathsInSubtree({ paths, subtree })).sort();
};

/**
 * .what = the workflow yaml the walk above deliberately SKIPS — the fixtures
 * .why = to prove the skip guards a real file. the exclusion assertion is a `toEqual([])`, which
 *        a trivially satisfied predicate also passes; if every fixture were pinned, moved, or
 *        deleted, it would stay green while it guarded not one file, and the next fixture to land
 *        would reopen the hole in silence
 * .note = `skip: []` is the whole difference from the walk above. it is expressed as an ARGUMENT
 *         rather than a second walk, so the two cannot drift apart except on the skip itself —
 *         the same one-source discipline `GITHUB_SUBTREES` gets
 * .note = generic on purpose. an earlier form named one practice's fixture path outright, which
 *         put knowledge of `cicd-common`'s private test layout inside a cross-practice invariant.
 *         this form extends to every fixture any practice adds, with no edit here
 */
const getAllGithubYamlPathsInFixtures = (input: { root: string }): string[] => {
  const paths = getAllYamlPaths({
    paths: getAllPathsUnderDir({ dir: input.root, skip: [] }),
  });
  const inSubtrees = GITHUB_SUBTREES.flatMap((subtree) =>
    getAllPathsInSubtree({ paths, subtree }),
  );
  return getAllPathsInFixtureDirs({ paths: inSubtrees }).sort();
};

/**
 * .what = the lines of a text, whatever line endings it was saved with
 * .why = a `\r` left on a line breaks the ref pattern below — js regex `.` excludes line
 *        terminators, so `(.*)$` cannot consume it, the match fails, and the ref site is dropped
 *        with no signal. the drop is selective: a line with a `# <tag>` tail is lost while an
 *        untailed one survives, so a crlf file sheds exactly the pinned refs and leaves every
 *        check below green over what remains. clamped by `[case4]`
 */
const asLinesFromText = (input: { text: string }): string[] => input.text.split(/\r?\n/);

/**
 * .what = the lines of one file
 * .why = kept as its own communicator so the split and the parse beside it stay pure and can be
 *        exercised against a literal text, with no file on disk
 */
const getAllLinesInPath = (input: { path: string }): string[] =>
  asLinesFromText({ text: readFileSync(input.path, 'utf-8') });

/**
 * .what = the `uses:` ref sites among a file's lines
 * .why = the pin lives in a line of yaml, not in a parsed document — so a line read is both
 *        sufficient and the only way to keep the line number a failure must name
 * .note = the ref appears in two yaml shapes — `uses:` under a named step, and `- uses:`
 *         as the list item itself. a pattern anchored on `uses:` alone misses the second
 * .note = `path` is carried through rather than read here, so this stays pure: it labels each
 *         ref with the file it came from without any knowledge of how that file was obtained
 */
const asActionRefsFromLines = (input: { path: string; lines: string[] }): ActionRef[] =>
  input.lines.flatMap((text, index) => {
    const [, ref, comment] = /^\s*(?:-\s+)?uses:\s*(\S+)\s*(.*)$/.exec(text) ?? [];
    if (!ref) return [];
    return [{ path: input.path, line: index + 1, ref, comment: (comment ?? '').trim() }];
  });

/**
 * .what = every `uses:` ref site declared in one template
 * .why = the one place the read and the parse meet — each line names what happens, never how
 */
const getAllActionRefsInPath = (input: { path: string }): ActionRef[] =>
  asActionRefsFromLines({ path: input.path, lines: getAllLinesInPath(input) });

/**
 * .what = whether the ref points at a file in the consumer's own repo
 * .why = a local ref carries no supply chain, so github's pin control exempts it
 */
const isActionRefLocal = (input: { ref: ActionRef }): boolean => input.ref.ref.startsWith('./');

/**
 * .what = every third-party ref site under a root, with the local ones dropped
 * .why = every assertion below reads this same set, and a local `./` ref carries no supply
 *        chain — github's control exempts it, so a clamp that flagged one would be wrong
 */
const getAllRemoteActionRefsUnderRoot = (input: { root: string }): ActionRef[] =>
  getAllGithubYamlPathsUnderRoot(input)
    .flatMap((path) => getAllActionRefsInPath({ path }))
    .filter((ref) => !isActionRefLocal({ ref }));

/**
 * .what = the two halves of a ref — what it points at, and which commit it is fixed to
 * .why = both halves are read by two assertions apiece, and an index into a `split('@')`
 *        result reads as decode-friction wherever it appears
 */
const asActionRefParts = (input: { ref: ActionRef }): { path: string; version: string } => {
  const [path = '', version = ''] = input.ref.ref.split('@');
  return { path, version };
};

/**
 * .what = the action repo a ref names, without the subpath
 * .why = `actions/cache/restore` and `actions/cache/save` are two paths into ONE repo, so
 *        they must map to one sha. a key on the full path would let them drift apart
 */
const asActionRepo = (input: { ref: ActionRef }): string =>
  asActionRefParts(input).path.split('/').slice(0, 2).join('/');

/**
 * .what = the tag the sha was derived from, read off the comment beside it
 * .why = the tag records provenance, not a version — which mutable tag this immutable sha
 *        was derived from, on the day it was derived. github never reads it; a human does
 * .note = the tag is a PREFIX of the comment, not the whole of it — one ref site carries a
 *         marketplace url after its tag
 */
const asActionRefTag = (input: { ref: ActionRef }): string | null =>
  /^#\s*(\S+)/.exec(input.ref.comment)?.[1] ?? null;

/**
 * .what = whether the ref names a full-length commit sha rather than a tag
 * .why = both surfaces are held to ONE predicate, not to two that read alike. a check that
 *        drifted laxer on this repo's own workflows would break the release with a green suite
 */
const isActionRefPinned = (input: { ref: ActionRef }): boolean =>
  /^[\w.-]+\/[\w.-]+(?:\/[\w.-]+)*@[0-9a-f]{40}$/.test(input.ref.ref);

/**
 * .what = whether the ref records which tag its sha came from
 * .why = the sha alone is unreadable; the tail is what lets a human map it back to a version
 * .note = a sha repeated as its own tag records no provenance, so it reads as untailed
 */
const isActionRefTailed = (input: { ref: ActionRef }): boolean => {
  const tag = asActionRefTag(input);
  return !!tag && !/^[0-9a-f]{40}$/.test(tag);
};

/**
 * .what = a ref site named as `<path>:<line> — <ref>`, path relative to the repo root
 * .why = a failure prints a list of these, so each entry must be enough to open the file at
 *        the exact line without a search (`rule.require.errors-name-the-fix`)
 * .note = the path is RELATIVIZED, and that is not cosmetic. an absolute path names the machine
 *         that ran the suite, so the same defect reads differently for every maintainer and for
 *         ci, and the prefix that carries no information is the widest part of the line. a
 *         reviewer who reads a ci log wants `src/practices/…/review.yml:18`, which is also what
 *         an editor and a `git` path accept verbatim
 */
const asRefLabel = (input: { ref: ActionRef }): string =>
  `${relative(REPO_ROOT, input.ref.path)}:${input.ref.line} — ${input.ref.ref}`;

/**
 * .what = each action repo named once, however many ref sites point at it
 * .why = the one-sha-per-repo check iterates repos, not refs — 85 ref sites collapse to 12 repos,
 *        and a repo named twice would compare its shas against themselves
 */
const getAllActionRepos = (input: { refs: ActionRef[] }): string[] => [
  ...new Set(input.refs.map((ref) => asActionRepo({ ref }))),
];

/**
 * .what = every ref site that points at one action repo
 * .why = two readers need this set — the sha check and the site count — and a predicate copied
 *        into both is a predicate that can drift between them
 */
const getAllRefsForActionRepo = (input: { refs: ActionRef[]; repo: string }): ActionRef[] =>
  input.refs.filter((ref) => asActionRepo({ ref }) === input.repo);

/**
 * .what = every distinct sha that one action repo is pinned to, sorted
 * .why = a repo pinned consistently yields exactly one; two or more is the drift. sorted, so a
 *        failure reports the pair in a stable order rather than in file-walk order
 */
const getAllShasForActionRepo = (input: { refs: ActionRef[]; repo: string }): string[] =>
  [
    ...new Set(
      getAllRefsForActionRepo(input).map((ref) => asActionRefParts({ ref }).version),
    ),
  ].sort();

/**
 * .what = one line per action repo — `<repo>@<sha> — N sites`
 * .why = the six other assertions are booleans over derived sets, so a reviewer sees that they
 *        passed and never sees WHAT they passed over. this is the artifact a human reads: a bump
 *        shows as a moved sha and a site count, rather than as an opaque green tick
 * .note = the site count is a second, differently-derived witness to the ref total — it is summed
 *         per repo here, and counted per file by the walk
 */
const asPinTable = (input: { refs: ActionRef[] }): string[] =>
  getAllActionRepos(input)
    .sort()
    .map((repo) => {
      const shas = getAllShasForActionRepo({ refs: input.refs, repo });
      const sites = getAllRefsForActionRepo({ refs: input.refs, repo }).length;
      return `${repo}@${shas.join(' + ')} — ${sites} site${sites === 1 ? '' : 's'}`;
    });

/**
 * .what = the pinned templates whose delivery runs through a HAND-WRITTEN fix, rather than
 *         declapract's built-in `EQUALS` default
 * .why = a template with no `.declapract.ts` companion is delivered by declapract's own code, and
 *        one integration proof covers the whole class. a template WITH one is delivered by code
 *        this repo owns, so it can regress on its own and needs its own proof
 * .note = detected from the filesystem rather than listed, so the question is asked of the tree
 *         as it stands. the alternative — a hand-kept list — would answer for the tree as it stood
 *         when someone last remembered to edit it
 */
const getAllTemplatesWithCustomFix = (input: { paths: string[] }): string[] =>
  input.paths.filter((path) => existsSync(`${path}.declapract.ts`));

/**
 * .what = every action repo pinned to more than one sha, named with the shas that disagree
 * .why = the drift that actually happens is a bump that reaches some ref sites and misses others
 * .note = this runs over the UNION of both surfaces, so a template bumped without this repo's own
 *         workflow (or the reverse) is caught — which is the drift a per-surface check cannot see
 * .note = only PINNED refs are compared, so this reports one cause and names one remedy. an
 *         unpinned `@v4` is a different defect with a different repair, and each surface already
 *         has an assertion built for it that names the ref site — so to compare tags here would
 *         re-report a caught defect under a remedy that does not apply to it ("move every site of
 *         that repo together" when no bump ever ran). measured: a new template with two tag refs
 *         goes red on the unpinned assertions, and the shape of that red says `pin them`, which is
 *         the true move. no coverage is lost — a repo with zero pinned sites cannot drift, and a
 *         repo with some sites pinned and some not is caught by the unpinned assertion, at its
 *         exact line
 */
const getAllDriftedActionRepos = (input: { refs: ActionRef[] }): string[] => {
  const refsPinned = input.refs.filter((ref) => isActionRefPinned({ ref }));
  return getAllActionRepos({ refs: refsPinned })
    .map((repo) => ({ repo, shas: getAllShasForActionRepo({ refs: refsPinned, repo }) }))
    .filter(({ shas }) => shas.length > 1)
    .map(({ repo, shas }) => `${repo} — ${shas.join(' vs ')}`);
};

/**
 * .note = the test NAMES below carry the remedy, deliberately — the same discipline
 *         `git/.declapract.integration.test.ts` states for its own assertions. jest prints
 *         the full `given > when > then` path on failure, so the one string a reader is
 *         guaranteed to see must say WHAT TO DO, not only what broke
 *         (`rule.require.errors-name-the-fix`). the diff names WHICH ref site; the test
 *         name names the move.
 */
describe('action pins', () => {
  given('[case1] every yaml template declared under a practice .github tree', () => {
    const scene = useBeforeAll(() => ({
      paths: getAllGithubYamlPathsUnderRoot({ root: PRACTICES_DIR }),
      refsRemote: getAllRemoteActionRefsUnderRoot({ root: PRACTICES_DIR }),
    }));

    when('[t0] the walk itself is checked for blind spots', () => {
      then(
        'it reaches the dot-prefixed templates -- if red, the walk went dot-blind; use readdir, not a glob library',
        () => {
          const names = scene.paths.map((path) => basename(path));
          expect(names).toContain('.test.yml');
          expect(names).toContain('.install.yml');
          expect(names).toContain('.declastruct.yml');
        },
      );

      then(
        'it reaches the composite action definitions -- if red, `.github/actions` fell out of the subtree list; a `uses:` added there would go unguarded',
        () => {
          // those definitions carry zero refs today, so every OTHER assertion passes over them
          // vacuously. this one fails loudly the moment the subtree drops out of the walk, which
          // is the only moment that vacuity could turn into a hole. `GITHUB_SUBTREES` is shared
          // by both surfaces, so one assertion guards the constant for both
          const actionPaths = getAllPathsInSubtree({
            paths: scene.paths,
            subtree: '.github/actions',
          });
          expect(actionPaths).not.toEqual([]);
        },
      );

      then(
        'it excludes the test fixtures of BOTH conventions -- if red, the walk reached a fixture; those hold unpinned refs on purpose',
        () => {
          expect(getAllPathsInFixtureDirs({ paths: scene.paths })).toEqual([]);
        },
      );

      /**
       * .what = the fixtures the walk skips really do carry an unpinned ref
       * .why = the exclusion above is a `toEqual([])`, which a trivially satisfied predicate also
       *        passes. if every fixture were pinned — or deleted, or moved — that assertion would
       *        stay green while it guarded not one file, and the NEXT fixture to land would reopen
       *        the hole with no signal. this states the precondition the exclusion exists for, so
       *        the pair cannot go quietly vacuous
       * .note = the claim is "at least one", not "none pinned". a future fixture may legitimately
       *         hold a pinned ref (an after-state, say), and this must not forbid that — what it
       *         demands is that the skip has real work to do
       */
      then(
        'the fixtures it excludes are genuinely unpinned -- if red, the exclusion above now guards an empty set',
        () => {
          const refsInFixtures = getAllGithubYamlPathsInFixtures({
            root: PRACTICES_DIR,
          })
            .flatMap((path) => getAllActionRefsInPath({ path }))
            .filter((ref) => !isActionRefLocal({ ref }));

          expect(
            refsInFixtures.filter((ref) => !isActionRefPinned({ ref })).length,
          ).toBeGreaterThan(0);
        },
      );

      then('it finds third-party refs to check -- if red, the walk reaches no template at all', () => {
        expect(scene.refsRemote.length).toBeGreaterThan(0);
      });

      /**
       * .what = the CLASS guard on delivery coverage — every pinned template that ships through a
       *         hand-written fix is one an integration test actually exercises
       * .why = twice now, a delivery gap has been found one file at a time: i004 proved
       *         `review.yml`, and i005 found the identical gap at `.test.yml`. a third custom-fix
       *         template would reopen it a third time, and the review round that catches it may
       *         not come. this asserts the SET rather than its members, so a new one fails here —
       *         at author time — rather than in a consumer's dead CI
       * .why = the allowlist is short because the property is rare, and that rarity is the point:
       *         9 of the 10 pinned templates take declapract's default path and are covered as a
       *         class by any one proof of it. only a hand-written fix escapes that
       * .note = the paths are relativized so a failure reads as a repo path rather than as this
       *         machine's home directory (`rule.require.errors-name-the-fix` — a name a reader can
       *         act on)
       */
      then(
        'every pinned template with a custom fix has integration coverage -- if red, add a case to that practice\'s .declapract.integration.test.ts, then add it here',
        () => {
          const pathsPinned = [
            ...new Set(scene.refsRemote.map((ref) => ref.path)),
          ];
          const withCustomFix = getAllTemplatesWithCustomFix({
            paths: pathsPinned,
          })
            .map((path) => relative(REPO_ROOT, path))
            .sort();

          expect(withCustomFix).toEqual([
            // covered by `[case2]` of src/practices/cicd-common/.declapract.integration.test.ts
            'src/practices/cicd-common/best-practice/.github/workflows/.test.yml',
          ]);
        },
      );
    });

    when('[t1] each third-party ref is read on its own', () => {
      then(
        'it names a 40-hex commit sha -- if red, derive it per the `.how` note atop this file; an annotated tag needs a deref',
        () => {
          const unpinned = scene.refsRemote.filter((ref) => !isActionRefPinned({ ref }));
          expect(unpinned.map((ref) => asRefLabel({ ref }))).toEqual([]);
        },
      );

      then(
        'it carries the tag the sha was derived from -- if red, append `# <tag>` beside the sha, so the pin stays legible',
        () => {
          const untailed = scene.refsRemote.filter((ref) => !isActionRefTailed({ ref }));
          expect(untailed.map((ref) => asRefLabel({ ref }))).toEqual([]);
        },
      );
    });

    when('[t2] the refs are read together', () => {
      then(
        'the pin table reads as declared -- if the diff surprises you, a bump reached more or fewer sites than intended',
        () => {
          expect(asPinTable({ refs: scene.refsRemote })).toMatchSnapshot();
        },
      );
    });
  });

  given("[case2] every yaml under this repo's own .github tree", () => {
    const scene = useBeforeAll(() => ({
      paths: getAllGithubYamlPathsUnderRoot({ root: REPO_GITHUB_DIR }),
      refsRemote: getAllRemoteActionRefsUnderRoot({ root: REPO_GITHUB_DIR }),
    }));

    when('[t0] the walk itself is checked for blind spots', () => {
      then(
        "it reaches this repo's release path -- if red, the walk missed the workflows that ship the package",
        () => {
          const names = scene.paths.map((path) => basename(path));
          expect(names).toContain('publish.yml');
          expect(names).toContain('.test.yml');
        },
      );

      then('it finds third-party refs to check -- if red, the walk reaches no workflow at all', () => {
        expect(scene.refsRemote.length).toBeGreaterThan(0);
      });
    });

    when('[t1] each third-party ref is read on its own', () => {
      then(
        'it names a 40-hex commit sha -- if red, this repo cannot release; `publish` needs `test`, and `test` dies at action lookup',
        () => {
          const unpinned = scene.refsRemote.filter((ref) => !isActionRefPinned({ ref }));
          expect(unpinned.map((ref) => asRefLabel({ ref }))).toEqual([]);
        },
      );

      then(
        'it carries the tag the sha was derived from -- if red, append `# <tag>` beside the sha, so the pin stays legible',
        () => {
          const untailed = scene.refsRemote.filter((ref) => !isActionRefTailed({ ref }));
          expect(untailed.map((ref) => asRefLabel({ ref }))).toEqual([]);
        },
      );
    });

    when('[t2] the refs are read together', () => {
      then(
        'the pin table reads as declared -- if the diff surprises you, a bump reached more or fewer sites than intended',
        () => {
          expect(asPinTable({ refs: scene.refsRemote })).toMatchSnapshot();
        },
      );
    });
  });

  given('[case3] both surfaces read as one corpus', () => {
    const scene = useBeforeAll(() => ({
      refsRemote: [
        ...getAllRemoteActionRefsUnderRoot({ root: PRACTICES_DIR }),
        ...getAllRemoteActionRefsUnderRoot({ root: REPO_GITHUB_DIR }),
      ],
    }));

    when('[t0] every ref site is compared against every other', () => {
      then(
        'each action repo maps to exactly one sha -- if red, a bump reached some ref sites and missed others; move every site of that repo together',
        () => {
          expect(getAllDriftedActionRepos({ refs: scene.refsRemote })).toEqual([]);
        },
      );
    });
  });

  given('[case4] a workflow file saved with crlf endings', () => {
    // exercised through the same two operations the walk composes -- text -> lines -> refs -- so
    // this holds the pipeline a real crlf file would take, not one layer of it in isolation.
    // no `.gitattributes` rule in this repo enforces lf for `*.yml`, so a file can arrive so
    const text = [
      '      - name: checkout',
      '        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4',
      '        uses: ./.github/workflows/.test.yml',
    ].join('\r\n');

    when('[t0] the text is read as refs', () => {
      const refs = asActionRefsFromLines({ path: 'demo.yml', lines: asLinesFromText({ text }) });

      then(
        'every ref site is still found -- if red, a crlf file drops its tailed refs in silence and every check above passes vacuously over them',
        () => {
          expect(refs.map((ref) => ref.ref)).toEqual([
            'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
            './.github/workflows/.test.yml',
          ]);
        },
      );

      then(
        'the tag tail is read without the carriage return -- if red, the tail check would reject a legitimately pinned ref',
        () => {
          const [refTailed] = refs;
          expect(refTailed && asActionRefTag({ ref: refTailed })).toEqual('v4');
        },
      );

      then('the line numbers a failure would name are still right', () => {
        expect(refs.map((ref) => ref.line)).toEqual([2, 3]);
      });
    });
  });

  given('[case5] a ref site whose comment carries more than the tag', () => {
    // .why = the tag is a PREFIX of the comment, not the whole of it. exactly one real ref site
    //        is shaped so -- `.deploy-sls.yml:110`, which kept its marketplace link after the tag
    //        -- and `[case1][t1]` walks straight past it, because a parse that swallowed the
    //        whole comment would still read as tailed (a url is not a 40-hex sha). so the corpus
    //        exercises this shape without ever judgment on it. this case judges it.
    const text = [
      '      - name: alert pagerduty',
      '        uses: Entle/action-pagerduty-alert@e6ca54cd88948b8a50f5bb1071dfa5bdb149ce7e # 0.2.0 — https://github.com/marketplace/actions/pagerduty-alert',
    ].join('\n');

    when('[t0] the tag is read off the comment', () => {
      const refs = asActionRefsFromLines({ path: 'demo.yml', lines: asLinesFromText({ text }) });

      then(
        'the tag is the prefix alone -- if red, the whole comment is read as the tag and a bump would match on a url',
        () => {
          const [ref] = refs;
          expect(ref && asActionRefTag({ ref })).toEqual('0.2.0');
        },
      );

      then('and the ref still reads as tailed', () => {
        const [ref] = refs;
        expect(ref && isActionRefTailed({ ref })).toEqual(true);
      });
    });
  });

  given('[case6] a corpus that is defective on purpose, one line per defect', () => {
    // .why = every assertion above proves the GREEN state — the list is empty, the table reads as
    //        declared. not one of them proves what a maintainer READS when it goes red, and that
    //        text is the entire ergonomic surface of this clamp: it is what a ci log carries at
    //        the moment someone has to act on it. so this case builds the red state deliberately
    //        and snapshots the failure output itself, per `rule.require.contract-snapshot-exhaustiveness`.
    // .note = the shas below are SYNTHETIC and unmistakably so (`deadbeef…`, `cafebabe…`). they
    //         are chosen to be greppable, so a reader who meets one in a diff can confirm in one
    //         search that no template carries it. `11d5960a…` is the one real sha here, present so
    //         the drift pair reads as a real bump half-applied rather than as two fakes.
    // .note = the path is a REAL path under this repo's tree, and that is the point. `asRefLabel`
    //         relativizes against the repo root, so a snapshot that stays byte-stable across
    //         machines IS the proof of that relativization. before it was relativized, this
    //         snapshot would have carried whoever last ran the suite — their home directory,
    //         committed, and re-recorded by the next maintainer as a phantom diff
    const path = join(PRACTICES_DIR, 'cicd-demo/best-practice/.github/workflows/deploy.yml');
    const text = [
      '      - uses: actions/checkout@v4',
      '      - uses: actions/setup-node@cafebabecafebabecafebabecafebabecafebabe',
      '      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4',
      '      - uses: actions/checkout@deadbeefdeadbeefdeadbeefdeadbeefdeadbeef # v4',
      '      - uses: pnpm/action-setup@b906aff # v4',
      '      - uses: ./.github/actions/bundle',
    ].join('\n');

    when('[t0] the defective corpus is read the way the walk reads a real one', () => {
      const refs = asActionRefsFromLines({ path, lines: asLinesFromText({ text }) }).filter(
        (ref) => !isActionRefLocal({ ref }),
      );

      then(
        'the unpinned report names each offender with a path an editor accepts -- if this snapshot ever carries an absolute path, the label named the machine that ran the suite',
        () => {
          expect(
            refs.filter((ref) => !isActionRefPinned({ ref })).map((ref) => asRefLabel({ ref })),
          ).toMatchSnapshot('unpinned -- the report a tag ref and a short sha produce');
        },
      );

      then('the untailed report names each ref whose sha records no provenance', () => {
        expect(
          refs.filter((ref) => !isActionRefTailed({ ref })).map((ref) => asRefLabel({ ref })),
        ).toMatchSnapshot('untailed -- the report a bare sha produces');
      });

      then(
        'the drift report names the repo and both shas -- which is what tells a maintainer the bump reached some sites and missed others',
        () => {
          expect(getAllDriftedActionRepos({ refs })).toMatchSnapshot(
            'drifted -- the report a half-applied bump produces',
          );
        },
      );

      then('and the pin table still reads, defects and all', () => {
        expect(asPinTable({ refs })).toMatchSnapshot('the pin table over a defective corpus');
      });
    });

    when('[t1] the corpus is empty', () => {
      // .why = the edge a fresh practice with no workflows hits, and the one shape under which
      //        every check above passes over a set of zero. it is snapped rather than asserted
      //        empty so the four reports are shown to be EMPTY, not ABSENT — a report that
      //        vanished on an empty corpus would read as the same green as one that found no
      //        offender at all
      const refs: ActionRef[] = [];

      then('every report reads as empty rather than absent', () => {
        expect({
          unpinned: refs
            .filter((ref) => !isActionRefPinned({ ref }))
            .map((ref) => asRefLabel({ ref })),
          untailed: refs
            .filter((ref) => !isActionRefTailed({ ref }))
            .map((ref) => asRefLabel({ ref })),
          drifted: getAllDriftedActionRepos({ refs }),
          table: asPinTable({ refs }),
        }).toMatchSnapshot('the reports over a corpus of zero refs');
      });
    });
  });
});
