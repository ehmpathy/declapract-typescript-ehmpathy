# F14: does the census owe a committed test that calls real github?

## .the fork
- add an integration test that runs the census's live reads against github with a real token
- keep the verdict paths on the `gh` stub (F6), mark the exception in the vision, and add the one
  real test that needs no token: the census against the real `gh` cli with no credentials

## .taken
the second, in this pr. the token-backed live-read test goes to the commander, with a lean of yes,
as a follow-up.

- **the real test that needs no token is in:**
  `src/github.main-review.census.declapract.acceptance.test.ts` runs the skill with the real
  `gh` on PATH, an empty `GH_CONFIG_DIR`, and every github token var removed. it asserts:
  - exit 1, a MalfunctionError that names the owner, and no verdict
  - the cause is gh's own no-credentials message, and the fix names `gh auth login` / `GH_TOKEN`
  - gh ships on the ci runner (ubuntu-24.04), so it runs in ci too, with no secret
- **the vision marks the exception** (`1.vision.yield.md`, "the github mock exception"), as
  `rule.require.external-contract-integration-tests` asks
- **a token-backed live-read test cannot go green in this pr:**
  - ci's `test-integration` job passes no `GH_TOKEN` or `GITHUB_TOKEN` (`.github/workflows/.test.yml`)
  - `.agent/keyrack.yml` declares `env.test: null`
  - the token needs a repo secret and a keyrack key, which a human grants
  - the job's env lives in a practice-owned workflow
  - a test that runs only where a token exists is a skip, which is forbidden
- **the live reads are proven by pasted runs:**
  - the full 195-repo census, whose table is in the pr body
  - the facebook/react control
  - a live one-owner run

## .rework
clean. the follow-up adds one test case plus a token in ci; no prod code moves.

## .confidence
80%. the rule's escape hatch is met; the open part is whether the commander wants a ci token for a
repo-local skill.

## .verdict
open, for the commander (the token-backed live-read test).
