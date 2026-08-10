# domain.term: fixture

term.chosen   = fixture
term.kind     = noun
term.synonyms.forbidden:
- sample
- stub
- dummy
- mock

## .what

a file that exists as an **input to a test** — never delivered to a consumer, never executed as a
declaration.

the property that carries load: **a fixture may legitimately hold what a template must never
hold.** a demo repo's `.github/workflows/review.yml` carries `@v5` *on purpose* — an unpinned ref
is what the test exists to fix. so a check that reads templates must exclude fixtures, and to
every check below the walk a fixture and a defect are indistinguishable.

it is the third class beside `template` (copied to a consumer) and `declaration` (executed here).
`meta` is a fourth. the four are not distinguishable by directory — only by name and by role.

## .the two conventions

this repo holds fixtures under **two** directory names, and both must be named wherever fixtures
are excluded:

| dir | whose convention | e.g. |
|---|---|---|
| `__snapshots__` | jest's | `.test.yml.declapract.test.ts.snap` — synthetic `actions/checkout@v4` |
| `.test/assets/<repo>/` | this repo's | `cicd-common/.test/assets/repo-with-unpinned-workflow/` |

## .refs

- `src/actionPins.declapract.integration.test.ts` → `FIXTURE_DIRS` — the declared constant, both conventions
- `src/actionPins.declapract.integration.test.ts` → `getAllPathsInFixtureDirs`, `getAllGithubYamlPathsInFixtures`
- `src/practices/cicd-common/.test/assets/repo-with-unpinned-workflow/` — a demo repo the
  integration test clones; its two workflows carry unpinned refs deliberately
- `src/practices/cicd-common/best-practice/.github/workflows/__snapshots__/` — jest's, synthetic
- `term=template._.choice._.md` — where `fixture` is listed as a forbidden **synonym** of
  `template`; this cluster is the other sense, and conforms rather than disputes

## .reason

see the ref-level cluster beside this choice:
- `term=fixture._.choice.reason.md` — etymology, the conformance to `template`'s forbid, and the
  4-red defect the unnamed second convention caused
